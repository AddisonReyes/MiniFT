use std::time::Duration;

use chrono::{DateTime, Utc};
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use percent_encoding::{utf8_percent_encode, NON_ALPHANUMERIC};
use reqwest::{Client, Response};
use rust_decimal::Decimal;
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use serde_json::json;
use sqlx::{PgPool, Postgres, Transaction};
use uuid::Uuid;

use crate::{
    config::{AppState, GoogleIntegrationConfig},
    email::{
        parse_gmail_message, GmailListMessagesResponse, GmailMessage, GmailMessageListItem,
        GmailProfileResponse, ParsedEmail,
    },
    errors::ApiError,
    logging::{self, field},
    models::{
        account::AccountRecord,
        integration::{
            EmailImportStatus, EmailTransactionImportRecord, EmailTransactionImportRow,
            GmailConnectionRecord, GmailConnectionStatusRow,
        },
        transaction::TransactionType,
    },
    parsers::{infer_category, parse_email_with_registered_parser, ParsedTransaction},
    schema::{
        imports::{
            ApproveImportRequest, EmailTransactionImportResponse, ImportListQuery,
            LinkAccountRequest, ParsedTransactionPayload, RejectImportRequest,
        },
        integration::GmailIntegrationStatusResponse,
    },
    services::{
        accounts::ensure_account_ownership, normalize_optional_text_with_max_length,
        normalize_required_text_with_max_length, CATEGORY_MAX_LENGTH, NOTE_MAX_LENGTH,
    },
};

const GOOGLE_AUTH_BASE_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
const GOOGLE_REVOKE_URL: &str = "https://oauth2.googleapis.com/revoke";
const GMAIL_API_BASE_URL: &str = "https://gmail.googleapis.com/gmail/v1/users/me";
const IMPORT_SOURCE: &str = "gmail_import";

#[derive(Debug, Clone)]
struct GmailSyncSummary {
    processed: usize,
    imported: usize,
    pending_review: usize,
    failed: usize,
    duplicates: usize,
    gmail_api_errors: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct GoogleOAuthStateClaims {
    sub: Uuid,
    intent: String,
    exp: usize,
    iat: usize,
}

#[derive(Debug, Clone, Deserialize)]
struct GoogleTokenResponse {
    access_token: String,
    expires_in: i64,
    refresh_token: Option<String>,
    scope: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct MutableParsedTransaction {
    amount: Decimal,
    currency: String,
    merchant: String,
    transaction_type: TransactionType,
    account_hint: Option<String>,
    card_last4: Option<String>,
    transaction_datetime: DateTime<Utc>,
}

pub async fn integration_status(
    state: &AppState,
    user_id: Uuid,
) -> Result<GmailIntegrationStatusResponse, ApiError> {
    if !state.google.is_configured() {
        return Ok(GmailIntegrationStatusResponse {
            configured: false,
            connected: false,
            connection_id: None,
            google_email: None,
            sync_enabled: false,
            sync_in_progress: false,
            scopes: Vec::new(),
            last_sync_started_at: None,
            last_synced_at: None,
            last_error: None,
            imported_count: 0,
            pending_review_count: 0,
            failed_count: 0,
            connect_url: None,
        });
    }

    let connection = sqlx::query_as::<_, GmailConnectionStatusRow>(
        "SELECT
            gc.id,
            gc.google_email,
            gc.scopes,
            gc.sync_enabled,
            gc.sync_in_progress,
            gc.last_sync_started_at,
            gc.last_synced_at,
            gc.last_error,
            COALESCE(SUM(CASE WHEN eti.status = 'imported' THEN 1 ELSE 0 END), 0)::bigint AS imported_count,
            COALESCE(SUM(CASE WHEN eti.status = 'pending_review' THEN 1 ELSE 0 END), 0)::bigint AS pending_review_count,
            COALESCE(SUM(CASE WHEN eti.status = 'failed' THEN 1 ELSE 0 END), 0)::bigint AS failed_count
         FROM gmail_connections gc
         LEFT JOIN email_transaction_imports eti ON eti.user_id = gc.user_id
         WHERE gc.user_id = $1
         GROUP BY
           gc.id,
           gc.google_email,
           gc.scopes,
           gc.sync_enabled,
           gc.sync_in_progress,
           gc.last_sync_started_at,
           gc.last_synced_at,
           gc.last_error",
    )
    .bind(user_id)
    .fetch_optional(&state.pool)
    .await?;

    Ok(match connection {
        Some(connection) => GmailIntegrationStatusResponse {
            configured: true,
            connected: true,
            connection_id: Some(connection.id),
            google_email: Some(connection.google_email),
            sync_enabled: connection.sync_enabled,
            sync_in_progress: connection.sync_in_progress,
            scopes: split_scopes(&connection.scopes),
            last_sync_started_at: connection.last_sync_started_at,
            last_synced_at: connection.last_synced_at,
            last_error: connection.last_error,
            imported_count: connection.imported_count,
            pending_review_count: connection.pending_review_count,
            failed_count: connection.failed_count,
            connect_url: Some("/api/integrations/google/connect".to_string()),
        },
        None => GmailIntegrationStatusResponse {
            configured: true,
            connected: false,
            connection_id: None,
            google_email: None,
            sync_enabled: false,
            sync_in_progress: false,
            scopes: vec![state.google.gmail_readonly_scope.clone()],
            last_sync_started_at: None,
            last_synced_at: None,
            last_error: None,
            imported_count: 0,
            pending_review_count: 0,
            failed_count: 0,
            connect_url: Some("/api/integrations/google/connect".to_string()),
        },
    })
}

pub fn google_connect_url(state: &AppState, user_id: Uuid) -> Result<String, ApiError> {
    ensure_google_configured(&state.google)?;

    let issued_at = Utc::now();
    let claims = GoogleOAuthStateClaims {
        sub: user_id,
        intent: "gmail_connect".to_string(),
        exp: (issued_at + chrono::Duration::minutes(10)).timestamp() as usize,
        iat: issued_at.timestamp() as usize,
    };
    let state_token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(state.auth.jwt_secret.as_bytes()),
    )
    .map_err(|_| ApiError::internal("Unable to initialize Google OAuth state"))?;

    let client_id = state
        .google
        .client_id
        .as_deref()
        .ok_or_else(|| ApiError::internal("Google OAuth is not configured"))?;
    let redirect_url = state
        .google
        .redirect_url
        .as_deref()
        .ok_or_else(|| ApiError::internal("Google OAuth is not configured"))?;

    let query = [
        ("client_id", client_id.to_string()),
        ("redirect_uri", redirect_url.to_string()),
        ("response_type", "code".to_string()),
        ("access_type", "offline".to_string()),
        ("prompt", "consent".to_string()),
        ("include_granted_scopes", "true".to_string()),
        ("scope", state.google.gmail_readonly_scope.clone()),
        ("state", state_token),
    ]
    .into_iter()
    .map(|(key, value)| {
        format!(
            "{}={}",
            utf8_percent_encode(key, NON_ALPHANUMERIC),
            utf8_percent_encode(&value, NON_ALPHANUMERIC)
        )
    })
    .collect::<Vec<_>>()
    .join("&");

    Ok(format!("{GOOGLE_AUTH_BASE_URL}?{query}"))
}

pub async fn handle_google_callback(
    state: AppState,
    code: &str,
    state_token: &str,
) -> Result<String, ApiError> {
    ensure_google_configured(&state.google)?;

    let claims = decode_google_state(&state, state_token)?;
    let token_response = exchange_oauth_code(&state.google, code).await?;
    let profile =
        fetch_gmail_profile(&google_client(&state.google)?, &token_response.access_token).await?;

    upsert_gmail_connection(
        &state,
        claims.sub,
        &profile.email_address,
        &token_response,
        Some(profile.history_id.parse::<i64>().unwrap_or_default()),
    )
    .await?;

    logging::info(
        "integrations.google.connected",
        &[
            field("user_id", claims.sub),
            field("google_email", profile.email_address),
        ],
    );

    let user_id = claims.sub;
    let worker_state = state.clone();
    tokio::spawn(async move {
        if let Err(error) = sync_user_connection(worker_state.clone(), user_id).await {
            logging::error(
                "integrations.gmail.initial_sync.failed",
                &[field("user_id", user_id), field("error", error.message)],
            );
        }
    });

    Ok(format!(
        "{}/settings/integrations?google=connected",
        state.google.app_base_url
    ))
}

pub async fn disconnect_google_connection(state: &AppState, user_id: Uuid) -> Result<(), ApiError> {
    ensure_google_configured(&state.google)?;

    let connection = get_connection_for_user(&state.pool, user_id)
        .await?
        .ok_or_else(|| ApiError::not_found("No Gmail connection found"))?;
    let refresh_token = decrypt_token(&state.google, &connection.refresh_token)?;
    let client = google_client(&state.google)?;
    let _ = revoke_google_token(&client, &refresh_token).await;

    sqlx::query(
        "DELETE FROM gmail_connections
         WHERE user_id = $1",
    )
    .bind(user_id)
    .execute(&state.pool)
    .await?;

    logging::info(
        "integrations.google.disconnected",
        &[
            field("user_id", user_id),
            field("google_email", connection.google_email),
        ],
    );

    Ok(())
}

pub async fn trigger_manual_sync(
    state: AppState,
    user_id: Uuid,
) -> Result<GmailIntegrationStatusResponse, ApiError> {
    ensure_google_configured(&state.google)?;

    let connection = get_connection_for_user(&state.pool, user_id)
        .await?
        .ok_or_else(|| ApiError::not_found("No Gmail connection found"))?;
    enforce_manual_sync_rate_limit(&state.google, &connection)?;

    let worker_state = state.clone();
    tokio::spawn(async move {
        if let Err(error) = sync_user_connection(worker_state.clone(), user_id).await {
            logging::error(
                "integrations.gmail.manual_sync.failed",
                &[field("user_id", user_id), field("error", error.message)],
            );
        }
    });

    integration_status(&state, user_id).await
}

pub async fn run_worker(state: AppState) {
    let interval_seconds = state.google.sync_interval_seconds.max(60);
    let mut interval = tokio::time::interval(Duration::from_secs(interval_seconds));

    loop {
        interval.tick().await;

        if !state.google.is_configured() {
            continue;
        }

        let rows = match sqlx::query_scalar::<_, Uuid>(
            "SELECT user_id
             FROM gmail_connections
             WHERE sync_enabled = TRUE",
        )
        .fetch_all(&state.pool)
        .await
        {
            Ok(rows) => rows,
            Err(error) => {
                logging::error(
                    "integrations.gmail.worker.load_connections_failed",
                    &[field("error", error.to_string())],
                );
                continue;
            }
        };

        for user_id in rows {
            if let Err(error) = sync_user_connection(state.clone(), user_id).await {
                logging::error(
                    "integrations.gmail.worker.sync_failed",
                    &[field("user_id", user_id), field("error", error.message)],
                );
            }
        }
    }
}

pub async fn list_imports(
    pool: &PgPool,
    user_id: Uuid,
    query: ImportListQuery,
) -> Result<Vec<EmailTransactionImportResponse>, ApiError> {
    let status_filter = query.status;
    let limit = query.limit.unwrap_or(50).clamp(1, 200) as i64;

    let rows = if let Some(status) = status_filter {
        sqlx::query_as::<_, EmailTransactionImportRow>(
            "SELECT
                eti.id,
                eti.gmail_message_id,
                eti.gmail_thread_id,
                eti.bank_name,
                eti.sender_email,
                eti.email_subject,
                eti.email_date,
                eti.parsed_successfully,
                eti.parsing_error,
                eti.raw_email_snippet,
                eti.parsed_transaction,
                eti.status,
                eti.matched_account_id,
                a.name AS matched_account_name,
                eti.created_transaction_id,
                eti.created_at
             FROM email_transaction_imports eti
             LEFT JOIN accounts a ON a.id = eti.matched_account_id
             WHERE eti.user_id = $1 AND eti.status = $2
             ORDER BY eti.email_date DESC, eti.created_at DESC
             LIMIT $3",
        )
        .bind(user_id)
        .bind(status)
        .bind(limit)
        .fetch_all(pool)
        .await?
    } else {
        sqlx::query_as::<_, EmailTransactionImportRow>(
            "SELECT
                eti.id,
                eti.gmail_message_id,
                eti.gmail_thread_id,
                eti.bank_name,
                eti.sender_email,
                eti.email_subject,
                eti.email_date,
                eti.parsed_successfully,
                eti.parsing_error,
                eti.raw_email_snippet,
                eti.parsed_transaction,
                eti.status,
                eti.matched_account_id,
                a.name AS matched_account_name,
                eti.created_transaction_id,
                eti.created_at
             FROM email_transaction_imports eti
             LEFT JOIN accounts a ON a.id = eti.matched_account_id
             WHERE eti.user_id = $1
             ORDER BY eti.email_date DESC, eti.created_at DESC
             LIMIT $2",
        )
        .bind(user_id)
        .bind(limit)
        .fetch_all(pool)
        .await?
    };

    Ok(rows.into_iter().map(map_import_row).collect())
}

pub async fn link_import_account(
    pool: &PgPool,
    user_id: Uuid,
    import_id: Uuid,
    payload: LinkAccountRequest,
) -> Result<EmailTransactionImportResponse, ApiError> {
    let import = get_import_for_user(pool, user_id, import_id).await?;
    let parsed = parse_import_payload(&import)?;
    let account = ensure_account_ownership(pool, user_id, payload.account_id).await?;

    sqlx::query(
        "UPDATE email_transaction_imports
         SET matched_account_id = $1
         WHERE id = $2 AND user_id = $3",
    )
    .bind(account.id)
    .bind(import_id)
    .bind(user_id)
    .execute(pool)
    .await?;

    if payload.persist_mapping.unwrap_or(true) {
        if let Some(card_last4) = parsed.card_last4.as_deref() {
            upsert_bank_account_mapping(pool, user_id, &import.bank_name, card_last4, account.id)
                .await?;
        }
    }

    logging::info(
        "integrations.gmail.import.account_linked",
        &[
            field("user_id", user_id),
            field("import_id", import_id),
            field("account_id", account.id),
            field("bank_name", import.bank_name),
        ],
    );

    get_import_response(pool, user_id, import_id).await
}

pub async fn approve_import(
    pool: &PgPool,
    user_id: Uuid,
    import_id: Uuid,
    payload: ApproveImportRequest,
) -> Result<EmailTransactionImportResponse, ApiError> {
    let import = get_import_for_user(pool, user_id, import_id).await?;
    let mut parsed = parse_import_payload(&import)?;
    let account_id = payload
        .account_id
        .or(import.matched_account_id)
        .ok_or_else(|| ApiError::bad_request("Link an account before approving this import"))?;
    let account = ensure_account_ownership(pool, user_id, account_id).await?;

    if let Some(merchant) = payload.merchant.as_deref() {
        parsed.merchant = merchant.trim().to_string();
    }

    let default_category = infer_category(&ParsedTransaction {
        amount: parsed.amount,
        currency: parsed.currency.clone(),
        merchant: parsed.merchant.clone(),
        transaction_type: parsed.transaction_type,
        account_hint: parsed.account_hint.clone(),
        card_last4: parsed.card_last4.clone(),
        transaction_datetime: parsed.transaction_datetime,
    });
    let category = normalize_required_text_with_max_length(
        payload.category.as_deref().unwrap_or(&default_category),
        "Category",
        CATEGORY_MAX_LENGTH,
    )?;
    let note = normalize_optional_text_with_max_length(
        &Some(
            payload
                .note
                .unwrap_or_else(|| format!("{} via Gmail import", parsed.merchant)),
        ),
        "Note",
        NOTE_MAX_LENGTH,
    )?;

    let mut transaction = pool.begin().await?;
    let transaction_id = create_imported_transaction(
        &mut transaction,
        user_id,
        &account,
        &import,
        &parsed,
        &category,
        &note,
    )
    .await?;

    sqlx::query(
        "UPDATE email_transaction_imports
         SET
           parsed_transaction = $1,
           matched_account_id = $2,
           created_transaction_id = $3,
           status = 'imported',
           reviewed_at = NOW(),
           parsed_successfully = TRUE,
           parsing_error = NULL
         WHERE id = $4 AND user_id = $5",
    )
    .bind(
        serde_json::to_value(&parsed)
            .map_err(|_| ApiError::internal("Unable to store parsed import"))?,
    )
    .bind(account.id)
    .bind(transaction_id)
    .bind(import_id)
    .bind(user_id)
    .execute(&mut *transaction)
    .await?;

    if payload.create_mapping.unwrap_or(true) {
        if let Some(card_last4) = parsed.card_last4.as_deref() {
            upsert_bank_account_mapping_in_transaction(
                &mut transaction,
                user_id,
                &import.bank_name,
                card_last4,
                account.id,
            )
            .await?;
        }
    }

    transaction.commit().await?;

    logging::info(
        "integrations.gmail.import.approved",
        &[
            field("user_id", user_id),
            field("import_id", import_id),
            field("account_id", account.id),
            field("transaction_id", transaction_id),
            field("bank_name", import.bank_name),
        ],
    );

    get_import_response(pool, user_id, import_id).await
}

pub async fn reject_import(
    pool: &PgPool,
    user_id: Uuid,
    import_id: Uuid,
    payload: RejectImportRequest,
) -> Result<EmailTransactionImportResponse, ApiError> {
    sqlx::query(
        "UPDATE email_transaction_imports
         SET
           status = 'ignored',
           reviewed_at = NOW(),
           parsing_error = COALESCE($1, parsing_error)
         WHERE id = $2 AND user_id = $3",
    )
    .bind(payload.reason)
    .bind(import_id)
    .bind(user_id)
    .execute(pool)
    .await?;

    logging::info(
        "integrations.gmail.import.rejected",
        &[field("user_id", user_id), field("import_id", import_id)],
    );

    get_import_response(pool, user_id, import_id).await
}

async fn sync_user_connection(
    state: AppState,
    user_id: Uuid,
) -> Result<GmailSyncSummary, ApiError> {
    let mut connection = match get_connection_for_user(&state.pool, user_id).await? {
        Some(connection) => connection,
        None => {
            return Ok(GmailSyncSummary {
                processed: 0,
                imported: 0,
                pending_review: 0,
                failed: 0,
                duplicates: 0,
                gmail_api_errors: 0,
            })
        }
    };

    if !connection.sync_enabled {
        return Ok(GmailSyncSummary {
            processed: 0,
            imported: 0,
            pending_review: 0,
            failed: 0,
            duplicates: 0,
            gmail_api_errors: 0,
        });
    }

    if !mark_sync_started(&state.pool, user_id).await? {
        return Ok(GmailSyncSummary {
            processed: 0,
            imported: 0,
            pending_review: 0,
            failed: 0,
            duplicates: 0,
            gmail_api_errors: 0,
        });
    }

    let sync_result: Result<GmailSyncSummary, ApiError> = async {
        let client = google_client(&state.google)?;
        connection = ensure_valid_access_token(&state, connection).await?;
        let access_token = decrypt_token(&state.google, &connection.access_token)?;
        let message_refs = list_candidate_messages(&client, &state, &access_token).await?;
        let mut summary = GmailSyncSummary {
            processed: 0,
            imported: 0,
            pending_review: 0,
            failed: 0,
            duplicates: 0,
            gmail_api_errors: 0,
        };
        let last_synced_at = connection.last_synced_at;
        let mut latest_history_id = connection.gmail_history_id;

        for message_ref in message_refs {
            if import_exists(&state.pool, &message_ref.id).await? {
                continue;
            }

            summary.processed += 1;
            match fetch_gmail_message(&client, &access_token, &message_ref.id).await {
                Ok(message) => {
                    latest_history_id = message
                        .history_id
                        .as_deref()
                        .and_then(|value| value.parse::<i64>().ok())
                        .or(latest_history_id);

                    let parsed_email =
                        parse_gmail_message(&message).map_err(ApiError::bad_request)?;
                    if let Some(last_synced_at) = last_synced_at {
                        if parsed_email.sent_at <= last_synced_at
                            && import_exists(&state.pool, &parsed_email.gmail_message_id).await?
                        {
                            continue;
                        }
                    }

                    match process_single_email(&state.pool, user_id, parsed_email).await? {
                        EmailImportStatus::Imported => summary.imported += 1,
                        EmailImportStatus::PendingReview => summary.pending_review += 1,
                        EmailImportStatus::Ignored => summary.duplicates += 1,
                        EmailImportStatus::Failed => summary.failed += 1,
                    }
                }
                Err(error) => {
                    summary.gmail_api_errors += 1;
                    logging::warn(
                        "integrations.gmail.message_fetch.failed",
                        &[
                            field("user_id", user_id),
                            field("gmail_message_id", message_ref.id),
                            field("error", error.message),
                        ],
                    );
                }
            }
        }

        update_connection_after_sync(&state.pool, user_id, latest_history_id, None).await?;

        Ok(summary)
    }
    .await;

    match sync_result {
        Ok(summary) => {
            logging::info(
                "integrations.gmail.sync.completed",
                &[
                    field("user_id", user_id),
                    field("emails_processed", summary.processed),
                    field("imported_count", summary.imported),
                    field("pending_review_count", summary.pending_review),
                    field("failed_count", summary.failed),
                    field("duplicate_count", summary.duplicates),
                    field("gmail_api_errors", summary.gmail_api_errors),
                ],
            );
            mark_sync_finished(&state.pool, user_id, None).await?;
            Ok(summary)
        }
        Err(error) => {
            mark_sync_finished(&state.pool, user_id, Some(error.message.clone())).await?;
            Err(error)
        }
    }
}

async fn process_single_email(
    pool: &PgPool,
    user_id: Uuid,
    parsed_email: ParsedEmail,
) -> Result<EmailImportStatus, ApiError> {
    let (bank_name, parsed_transaction) = match parse_email_with_registered_parser(&parsed_email) {
        Ok(result) => result,
        Err(error) => {
            insert_import_record(
                pool,
                user_id,
                &parsed_email,
                "Unknown",
                None,
                EmailImportStatus::Failed,
                None,
                Some(error),
                None,
                None,
            )
            .await?;
            return Ok(EmailImportStatus::Failed);
        }
    };

    let transaction_hash = build_transaction_hash(&parsed_transaction);
    let duplicate_exists = import_hash_exists(pool, user_id, &transaction_hash).await?;
    let matched_account_id = match parsed_transaction.card_last4.as_deref() {
        Some(card_last4) => find_account_mapping(pool, user_id, bank_name, card_last4)
            .await?
            .map(|account| account.id),
        None => None,
    };

    if duplicate_exists {
        insert_import_record(
            pool,
            user_id,
            &parsed_email,
            bank_name,
            Some(parsed_transaction),
            EmailImportStatus::Ignored,
            matched_account_id,
            Some("Duplicate transaction hash matched a prior import".to_string()),
            None,
            None,
        )
        .await?;
        return Ok(EmailImportStatus::Ignored);
    }

    let mut transaction = pool.begin().await?;
    let import_id = insert_import_record_in_transaction(
        &mut transaction,
        user_id,
        &parsed_email,
        bank_name,
        Some(parsed_transaction.clone()),
        if matched_account_id.is_some() {
            EmailImportStatus::Imported
        } else {
            EmailImportStatus::PendingReview
        },
        matched_account_id,
        None,
        Some(transaction_hash),
        None,
    )
    .await?;

    if let Some(account_id) = matched_account_id {
        let account = ensure_account_ownership(pool, user_id, account_id).await?;
        let category = normalize_required_text_with_max_length(
            &infer_category(&parsed_transaction),
            "Category",
            CATEGORY_MAX_LENGTH,
        )?;
        let note = normalize_optional_text_with_max_length(
            &Some(format!("{} via Gmail import", parsed_transaction.merchant)),
            "Note",
            NOTE_MAX_LENGTH,
        )?;
        let transaction_id = create_imported_transaction(
            &mut transaction,
            user_id,
            &account,
            &EmailTransactionImportRecord {
                id: import_id,
                user_id,
                gmail_message_id: parsed_email.gmail_message_id.clone(),
                gmail_thread_id: parsed_email.gmail_thread_id.clone(),
                bank_name: bank_name.to_string(),
                sender_email: parsed_email.sender.clone(),
                email_subject: parsed_email.subject.clone(),
                email_date: parsed_email.sent_at,
                parsed_successfully: true,
                parsing_error: None,
                raw_email_snippet: parsed_email.raw_email_snippet.clone(),
                parsed_transaction: Some(
                    serde_json::to_value(&parsed_transaction)
                        .map_err(|_| ApiError::internal("Unable to store parsed import"))?,
                ),
                transaction_hash: None,
                status: EmailImportStatus::Imported,
                matched_account_id: Some(account.id),
                created_transaction_id: None,
                sync_attempt_count: 1,
                reviewed_at: None,
                created_at: Utc::now(),
            },
            &MutableParsedTransaction {
                amount: parsed_transaction.amount,
                currency: parsed_transaction.currency.clone(),
                merchant: parsed_transaction.merchant.clone(),
                transaction_type: parsed_transaction.transaction_type,
                account_hint: parsed_transaction.account_hint.clone(),
                card_last4: parsed_transaction.card_last4.clone(),
                transaction_datetime: parsed_transaction.transaction_datetime,
            },
            &category,
            &note,
        )
        .await?;

        sqlx::query(
            "UPDATE email_transaction_imports
             SET created_transaction_id = $1, status = 'imported'
             WHERE id = $2 AND user_id = $3",
        )
        .bind(transaction_id)
        .bind(import_id)
        .bind(user_id)
        .execute(&mut *transaction)
        .await?;

        transaction.commit().await?;
        Ok(EmailImportStatus::Imported)
    } else {
        transaction.commit().await?;
        Ok(EmailImportStatus::PendingReview)
    }
}

async fn insert_import_record(
    pool: &PgPool,
    user_id: Uuid,
    parsed_email: &ParsedEmail,
    bank_name: &str,
    parsed_transaction: Option<ParsedTransaction>,
    status: EmailImportStatus,
    matched_account_id: Option<Uuid>,
    parsing_error: Option<String>,
    transaction_hash: Option<String>,
    created_transaction_id: Option<Uuid>,
) -> Result<Uuid, ApiError> {
    let mut transaction = pool.begin().await?;
    let id = insert_import_record_in_transaction(
        &mut transaction,
        user_id,
        parsed_email,
        bank_name,
        parsed_transaction,
        status,
        matched_account_id,
        parsing_error,
        transaction_hash,
        created_transaction_id,
    )
    .await?;
    transaction.commit().await?;
    Ok(id)
}

async fn insert_import_record_in_transaction(
    transaction: &mut Transaction<'_, Postgres>,
    user_id: Uuid,
    parsed_email: &ParsedEmail,
    bank_name: &str,
    parsed_transaction: Option<ParsedTransaction>,
    status: EmailImportStatus,
    matched_account_id: Option<Uuid>,
    parsing_error: Option<String>,
    transaction_hash: Option<String>,
    created_transaction_id: Option<Uuid>,
) -> Result<Uuid, ApiError> {
    let parsed_json = parsed_transaction
        .map(|value| serde_json::to_value(value))
        .transpose()
        .map_err(|_| ApiError::internal("Unable to serialize parsed import"))?;
    let snippet = parsed_email
        .raw_email_snippet
        .as_deref()
        .map(|value| value.chars().take(512).collect::<String>());

    let import_id = sqlx::query_scalar(
        "INSERT INTO email_transaction_imports (
            user_id,
            gmail_message_id,
            gmail_thread_id,
            bank_name,
            sender_email,
            email_subject,
            email_date,
            parsed_successfully,
            parsing_error,
            raw_email_snippet,
            parsed_transaction,
            transaction_hash,
            status,
            matched_account_id,
            created_transaction_id,
            sync_attempt_count
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 1)
         RETURNING id",
    )
    .bind(user_id)
    .bind(&parsed_email.gmail_message_id)
    .bind(&parsed_email.gmail_thread_id)
    .bind(bank_name)
    .bind(&parsed_email.sender)
    .bind(&parsed_email.subject)
    .bind(parsed_email.sent_at)
    .bind(parsing_error.is_none() && parsed_json.is_some())
    .bind(parsing_error)
    .bind(snippet)
    .bind(parsed_json)
    .bind(transaction_hash)
    .bind(status)
    .bind(matched_account_id)
    .bind(created_transaction_id)
    .fetch_one(&mut **transaction)
    .await?;

    Ok(import_id)
}

async fn create_imported_transaction(
    transaction: &mut Transaction<'_, Postgres>,
    user_id: Uuid,
    account: &AccountRecord,
    import: &EmailTransactionImportRecord,
    parsed: &MutableParsedTransaction,
    category: &str,
    note: &Option<String>,
) -> Result<Uuid, ApiError> {
    let transaction_id = sqlx::query_scalar(
        "INSERT INTO transactions (
            user_id,
            account_id,
            amount,
            type,
            category,
            note,
            date,
            source,
            source_metadata
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id",
    )
    .bind(user_id)
    .bind(account.id)
    .bind(parsed.amount)
    .bind(parsed.transaction_type)
    .bind(category)
    .bind(note)
    .bind(parsed.transaction_datetime.date_naive())
    .bind(IMPORT_SOURCE)
    .bind(json!({
        "bank": import.bank_name,
        "email_import_id": import.id,
        "card_last4": parsed.card_last4,
    }))
    .fetch_one(&mut **transaction)
    .await?;

    Ok(transaction_id)
}

async fn upsert_bank_account_mapping(
    pool: &PgPool,
    user_id: Uuid,
    bank_name: &str,
    card_last4: &str,
    account_id: Uuid,
) -> Result<(), ApiError> {
    let mut transaction = pool.begin().await?;
    upsert_bank_account_mapping_in_transaction(
        &mut transaction,
        user_id,
        bank_name,
        card_last4,
        account_id,
    )
    .await?;
    transaction.commit().await?;
    Ok(())
}

async fn upsert_bank_account_mapping_in_transaction(
    transaction: &mut Transaction<'_, Postgres>,
    user_id: Uuid,
    bank_name: &str,
    card_last4: &str,
    account_id: Uuid,
) -> Result<(), ApiError> {
    sqlx::query(
        "INSERT INTO bank_account_mappings (user_id, bank_name, card_last4, minift_account_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, bank_name, card_last4)
         DO UPDATE SET minift_account_id = EXCLUDED.minift_account_id",
    )
    .bind(user_id)
    .bind(bank_name)
    .bind(card_last4)
    .bind(account_id)
    .execute(&mut **transaction)
    .await?;

    Ok(())
}

async fn find_account_mapping(
    pool: &PgPool,
    user_id: Uuid,
    bank_name: &str,
    card_last4: &str,
) -> Result<Option<AccountRecord>, ApiError> {
    sqlx::query_as::<_, AccountRecord>(
        "SELECT a.id, a.name, a.type, a.currency, a.created_at
         FROM bank_account_mappings bam
         INNER JOIN accounts a ON a.id = bam.minift_account_id
         WHERE bam.user_id = $1
           AND bam.bank_name = $2
           AND bam.card_last4 = $3",
    )
    .bind(user_id)
    .bind(bank_name)
    .bind(card_last4)
    .fetch_optional(pool)
    .await
    .map_err(ApiError::from)
}

async fn import_hash_exists(
    pool: &PgPool,
    user_id: Uuid,
    transaction_hash: &str,
) -> Result<bool, ApiError> {
    Ok(sqlx::query_scalar(
        "SELECT EXISTS(
            SELECT 1
            FROM email_transaction_imports
            WHERE user_id = $1
              AND transaction_hash = $2
         )",
    )
    .bind(user_id)
    .bind(transaction_hash)
    .fetch_one(pool)
    .await?)
}

fn build_transaction_hash(parsed: &ParsedTransaction) -> String {
    use sha2::{Digest, Sha256};

    let payload = format!(
        "{}|{}|{}|{}",
        parsed.amount.normalize(),
        parsed.transaction_datetime.to_rfc3339(),
        parsed.merchant.to_ascii_lowercase(),
        parsed.currency
    );

    format!("{:x}", Sha256::digest(payload.as_bytes()))
}

async fn get_connection_for_user(
    pool: &PgPool,
    user_id: Uuid,
) -> Result<Option<GmailConnectionRecord>, ApiError> {
    sqlx::query_as::<_, GmailConnectionRecord>(
        "SELECT
            id,
            user_id,
            google_email,
            access_token,
            refresh_token,
            expires_at,
            scopes,
            sync_enabled,
            gmail_history_id,
            sync_in_progress,
            last_sync_started_at,
            last_synced_at,
            last_error,
            created_at,
            updated_at
         FROM gmail_connections
         WHERE user_id = $1",
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await
    .map_err(ApiError::from)
}

async fn ensure_valid_access_token(
    state: &AppState,
    connection: GmailConnectionRecord,
) -> Result<GmailConnectionRecord, ApiError> {
    if connection.expires_at > Utc::now() + chrono::Duration::minutes(2) {
        return Ok(connection);
    }

    let refresh_token = decrypt_token(&state.google, &connection.refresh_token)?;
    let refreshed = refresh_access_token(&state.google, &refresh_token).await?;
    upsert_gmail_connection(
        state,
        connection.user_id,
        &connection.google_email,
        &refreshed,
        connection.gmail_history_id,
    )
    .await?;

    logging::info(
        "integrations.google.token_refreshed",
        &[
            field("user_id", connection.user_id),
            field("google_email", connection.google_email),
        ],
    );

    get_connection_for_user(&state.pool, connection.user_id)
        .await?
        .ok_or_else(|| ApiError::internal("Refreshed Gmail connection could not be loaded"))
}

async fn upsert_gmail_connection(
    state: &AppState,
    user_id: Uuid,
    google_email: &str,
    token_response: &GoogleTokenResponse,
    history_id: Option<i64>,
) -> Result<(), ApiError> {
    let encrypted_access_token = encrypt_token(&state.google, &token_response.access_token)?;
    let maybe_existing = get_connection_for_user(&state.pool, user_id).await?;
    let refresh_token_plaintext = match token_response.refresh_token.as_deref() {
        Some(token) => token.to_string(),
        None => maybe_existing
            .as_ref()
            .map(|connection| decrypt_token(&state.google, &connection.refresh_token))
            .transpose()?
            .ok_or_else(|| ApiError::bad_request("Google did not return a refresh token"))?,
    };
    let encrypted_refresh_token = encrypt_token(&state.google, &refresh_token_plaintext)?;
    let scopes = token_response
        .scope
        .clone()
        .unwrap_or_else(|| state.google.gmail_readonly_scope.clone());
    let expires_at = Utc::now() + chrono::Duration::seconds(token_response.expires_in.max(60));

    sqlx::query(
        "INSERT INTO gmail_connections (
            user_id,
            google_email,
            access_token,
            refresh_token,
            expires_at,
            scopes,
            sync_enabled,
            gmail_history_id,
            last_error,
            updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, NULL, NOW())
         ON CONFLICT (user_id)
         DO UPDATE SET
           google_email = EXCLUDED.google_email,
           access_token = EXCLUDED.access_token,
           refresh_token = EXCLUDED.refresh_token,
           expires_at = EXCLUDED.expires_at,
           scopes = EXCLUDED.scopes,
           sync_enabled = TRUE,
           gmail_history_id = COALESCE(EXCLUDED.gmail_history_id, gmail_connections.gmail_history_id),
           last_error = NULL,
           updated_at = NOW()",
    )
    .bind(user_id)
    .bind(google_email)
    .bind(encrypted_access_token)
    .bind(encrypted_refresh_token)
    .bind(expires_at)
    .bind(scopes)
    .bind(history_id)
    .execute(&state.pool)
    .await?;

    Ok(())
}

fn ensure_google_configured(config: &GoogleIntegrationConfig) -> Result<(), ApiError> {
    if config.is_configured() {
        Ok(())
    } else {
        Err(ApiError::internal(
            "Google Gmail integration is not configured on this deployment",
        ))
    }
}

fn google_client(config: &GoogleIntegrationConfig) -> Result<Client, ApiError> {
    Client::builder()
        .timeout(Duration::from_secs(config.request_timeout_seconds.max(5)))
        .build()
        .map_err(|_| ApiError::internal("Unable to initialize Google HTTP client"))
}

fn decode_google_state(
    state: &AppState,
    state_token: &str,
) -> Result<GoogleOAuthStateClaims, ApiError> {
    let mut validation = Validation::new(Algorithm::HS256);
    validation.validate_exp = true;

    let claims = decode::<GoogleOAuthStateClaims>(
        state_token,
        &DecodingKey::from_secret(state.auth.jwt_secret.as_bytes()),
        &validation,
    )
    .map_err(|_| ApiError::unauthorized("Invalid or expired Google OAuth state"))?
    .claims;

    if claims.intent != "gmail_connect" {
        return Err(ApiError::unauthorized("Invalid Google OAuth state"));
    }

    Ok(claims)
}

async fn exchange_oauth_code(
    config: &GoogleIntegrationConfig,
    code: &str,
) -> Result<GoogleTokenResponse, ApiError> {
    let client = google_client(config)?;
    let client_id = config
        .client_id
        .as_deref()
        .ok_or_else(|| ApiError::internal("Google OAuth is not configured"))?;
    let client_secret = config
        .client_secret
        .as_deref()
        .ok_or_else(|| ApiError::internal("Google OAuth is not configured"))?;
    let redirect_url = config
        .redirect_url
        .as_deref()
        .ok_or_else(|| ApiError::internal("Google OAuth is not configured"))?;

    let response = execute_with_retry(
        || {
            client.post(GOOGLE_TOKEN_URL).form(&[
                ("code", code),
                ("client_id", client_id),
                ("client_secret", client_secret),
                ("redirect_uri", redirect_url),
                ("grant_type", "authorization_code"),
            ])
        },
        "integrations.google.oauth.exchange_failed",
    )
    .await?;

    parse_json_response(response, "Unable to complete Google OAuth exchange").await
}

async fn refresh_access_token(
    config: &GoogleIntegrationConfig,
    refresh_token: &str,
) -> Result<GoogleTokenResponse, ApiError> {
    let client = google_client(config)?;
    let client_id = config
        .client_id
        .as_deref()
        .ok_or_else(|| ApiError::internal("Google OAuth is not configured"))?;
    let client_secret = config
        .client_secret
        .as_deref()
        .ok_or_else(|| ApiError::internal("Google OAuth is not configured"))?;

    let response = execute_with_retry(
        || {
            client.post(GOOGLE_TOKEN_URL).form(&[
                ("client_id", client_id),
                ("client_secret", client_secret),
                ("refresh_token", refresh_token),
                ("grant_type", "refresh_token"),
            ])
        },
        "integrations.google.token_refresh.failed",
    )
    .await?;

    parse_json_response(response, "Unable to refresh the Google access token").await
}

async fn revoke_google_token(client: &Client, token: &str) -> Result<(), ApiError> {
    let response = execute_with_retry(
        || client.post(GOOGLE_REVOKE_URL).form(&[("token", token)]),
        "integrations.google.revoke.failed",
    )
    .await?;

    if response.status().is_success() {
        Ok(())
    } else {
        Err(ApiError::bad_request(
            "Unable to revoke the Google connection",
        ))
    }
}

async fn fetch_gmail_profile(
    client: &Client,
    access_token: &str,
) -> Result<GmailProfileResponse, ApiError> {
    let response = execute_with_retry(
        || {
            client
                .get(format!("{GMAIL_API_BASE_URL}/profile"))
                .bearer_auth(access_token)
        },
        "integrations.gmail.profile_fetch.failed",
    )
    .await?;

    parse_json_response(response, "Unable to load the Gmail profile").await
}

async fn list_candidate_messages(
    client: &Client,
    state: &AppState,
    access_token: &str,
) -> Result<Vec<GmailMessageListItem>, ApiError> {
    let mut results = Vec::new();
    let mut next_page_token: Option<String> = None;
    let query = "from:(popular OR popularenlinea OR banreservas OR bhd OR qik OR scotiabank OR apap OR cibao OR santacruz OR \"santa cruz\") newer_than:30d";

    while results.len() < state.google.max_sync_messages_per_run {
        let page_token = next_page_token.clone();
        let remaining = (state.google.max_sync_messages_per_run - results.len()).min(100);
        let response = execute_with_retry(
            || {
                let mut request = client
                    .get(format!("{GMAIL_API_BASE_URL}/messages"))
                    .bearer_auth(access_token)
                    .query(&[
                        ("q", query.to_string()),
                        ("maxResults", remaining.to_string()),
                    ]);

                if let Some(page_token) = page_token.clone() {
                    request = request.query(&[("pageToken", page_token)]);
                }

                request
            },
            "integrations.gmail.message_list.failed",
        )
        .await?;
        let payload: GmailListMessagesResponse =
            parse_json_response(response, "Unable to list Gmail messages").await?;

        if let Some(messages) = payload.messages {
            results.extend(messages);
        }

        next_page_token = payload.next_page_token;
        if next_page_token.is_none() {
            break;
        }
    }

    Ok(results)
}

async fn fetch_gmail_message(
    client: &Client,
    access_token: &str,
    message_id: &str,
) -> Result<GmailMessage, ApiError> {
    let response = execute_with_retry(
        || {
            client
                .get(format!("{GMAIL_API_BASE_URL}/messages/{message_id}"))
                .bearer_auth(access_token)
                .query(&[("format", "full")])
        },
        "integrations.gmail.message_get.failed",
    )
    .await?;

    parse_json_response(response, "Unable to load Gmail message details").await
}

async fn execute_with_retry<F>(mut build_request: F, log_event: &str) -> Result<Response, ApiError>
where
    F: FnMut() -> reqwest::RequestBuilder,
{
    let mut delay_ms = 500u64;
    let mut last_error = None;

    for attempt in 1..=3 {
        match build_request().send().await {
            Ok(response) if response.status().is_success() => return Ok(response),
            Ok(response)
                if attempt < 3
                    && (response.status().as_u16() == 429
                        || response.status().is_server_error()) =>
            {
                last_error = Some(format!("status {}", response.status()));
            }
            Ok(response) => {
                let status = response.status();
                let body = response.text().await.unwrap_or_default();
                logging::warn(
                    log_event,
                    &[
                        field("attempt", attempt),
                        field("status", status.as_u16()),
                        field("body", body.chars().take(200).collect::<String>()),
                    ],
                );
                return Err(ApiError::bad_request(
                    "Google returned an unexpected response",
                ));
            }
            Err(error) if attempt < 3 => {
                last_error = Some(error.to_string());
            }
            Err(error) => {
                logging::error(
                    log_event,
                    &[field("attempt", attempt), field("error", error.to_string())],
                );
                return Err(ApiError::internal("Unable to reach Google right now"));
            }
        }

        tokio::time::sleep(Duration::from_millis(delay_ms)).await;
        delay_ms *= 2;
    }

    logging::warn(
        log_event,
        &[field(
            "error",
            last_error.unwrap_or_else(|| "retry_exhausted".to_string()),
        )],
    );
    Err(ApiError::internal("Google request retries were exhausted"))
}

async fn parse_json_response<T: DeserializeOwned>(
    response: Response,
    failure_message: &str,
) -> Result<T, ApiError> {
    response
        .json::<T>()
        .await
        .map_err(|_| ApiError::internal(failure_message))
}

async fn import_exists(pool: &PgPool, gmail_message_id: &str) -> Result<bool, ApiError> {
    Ok(sqlx::query_scalar(
        "SELECT EXISTS(
            SELECT 1
            FROM email_transaction_imports
            WHERE gmail_message_id = $1
         )",
    )
    .bind(gmail_message_id)
    .fetch_one(pool)
    .await?)
}

async fn mark_sync_started(pool: &PgPool, user_id: Uuid) -> Result<bool, ApiError> {
    let result = sqlx::query(
        "UPDATE gmail_connections
         SET sync_in_progress = TRUE, last_sync_started_at = NOW(), last_error = NULL, updated_at = NOW()
         WHERE user_id = $1 AND sync_in_progress = FALSE",
    )
    .bind(user_id)
    .execute(pool)
    .await?;

    Ok(result.rows_affected() > 0)
}

async fn update_connection_after_sync(
    pool: &PgPool,
    user_id: Uuid,
    history_id: Option<i64>,
    last_error: Option<String>,
) -> Result<(), ApiError> {
    sqlx::query(
        "UPDATE gmail_connections
         SET
           gmail_history_id = COALESCE($1, gmail_history_id),
           last_error = $2,
           updated_at = NOW()
         WHERE user_id = $3",
    )
    .bind(history_id)
    .bind(last_error)
    .bind(user_id)
    .execute(pool)
    .await?;

    Ok(())
}

async fn mark_sync_finished(
    pool: &PgPool,
    user_id: Uuid,
    last_error: Option<String>,
) -> Result<(), ApiError> {
    sqlx::query(
        "UPDATE gmail_connections
         SET
           sync_in_progress = FALSE,
           last_synced_at = NOW(),
           last_error = $2,
           updated_at = NOW()
         WHERE user_id = $1",
    )
    .bind(user_id)
    .bind(last_error)
    .execute(pool)
    .await?;

    Ok(())
}

fn enforce_manual_sync_rate_limit(
    config: &GoogleIntegrationConfig,
    connection: &GmailConnectionRecord,
) -> Result<(), ApiError> {
    if let Some(last_sync_started_at) = connection.last_sync_started_at {
        let cooldown = chrono::Duration::seconds(config.min_manual_sync_interval_seconds as i64);
        if last_sync_started_at + cooldown > Utc::now() {
            return Err(ApiError::bad_request(
                "Please wait a moment before starting another sync",
            ));
        }
    }

    Ok(())
}

fn split_scopes(scopes: &str) -> Vec<String> {
    scopes
        .split_whitespace()
        .map(|scope| scope.to_string())
        .collect()
}

fn encrypt_token(config: &GoogleIntegrationConfig, token: &str) -> Result<String, ApiError> {
    config
        .token_cipher
        .as_ref()
        .ok_or_else(|| ApiError::internal("Google token encryption is not configured"))?
        .encrypt(token)
        .map_err(ApiError::internal)
}

fn decrypt_token(config: &GoogleIntegrationConfig, payload: &str) -> Result<String, ApiError> {
    config
        .token_cipher
        .as_ref()
        .ok_or_else(|| ApiError::internal("Google token encryption is not configured"))?
        .decrypt(payload)
        .map_err(ApiError::internal)
}

async fn get_import_for_user(
    pool: &PgPool,
    user_id: Uuid,
    import_id: Uuid,
) -> Result<EmailTransactionImportRecord, ApiError> {
    sqlx::query_as::<_, EmailTransactionImportRecord>(
        "SELECT
            id,
            user_id,
            gmail_message_id,
            gmail_thread_id,
            bank_name,
            sender_email,
            email_subject,
            email_date,
            parsed_successfully,
            parsing_error,
            raw_email_snippet,
            parsed_transaction,
            transaction_hash,
            status,
            matched_account_id,
            created_transaction_id,
            sync_attempt_count,
            reviewed_at,
            created_at
         FROM email_transaction_imports
         WHERE id = $1 AND user_id = $2",
    )
    .bind(import_id)
    .bind(user_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| ApiError::not_found("Import not found"))
}

async fn get_import_response(
    pool: &PgPool,
    user_id: Uuid,
    import_id: Uuid,
) -> Result<EmailTransactionImportResponse, ApiError> {
    let row = sqlx::query_as::<_, EmailTransactionImportRow>(
        "SELECT
            eti.id,
            eti.gmail_message_id,
            eti.gmail_thread_id,
            eti.bank_name,
            eti.sender_email,
            eti.email_subject,
            eti.email_date,
            eti.parsed_successfully,
            eti.parsing_error,
            eti.raw_email_snippet,
            eti.parsed_transaction,
            eti.status,
            eti.matched_account_id,
            a.name AS matched_account_name,
            eti.created_transaction_id,
            eti.created_at
         FROM email_transaction_imports eti
         LEFT JOIN accounts a ON a.id = eti.matched_account_id
         WHERE eti.id = $1 AND eti.user_id = $2",
    )
    .bind(import_id)
    .bind(user_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| ApiError::not_found("Import not found"))?;

    Ok(map_import_row(row))
}

fn parse_import_payload(
    import: &EmailTransactionImportRecord,
) -> Result<MutableParsedTransaction, ApiError> {
    let value = import.parsed_transaction.clone().ok_or_else(|| {
        ApiError::bad_request("This import does not contain parsed transaction details")
    })?;

    serde_json::from_value(value)
        .map_err(|_| ApiError::internal("Unable to read the parsed transaction payload"))
}

fn map_import_row(row: EmailTransactionImportRow) -> EmailTransactionImportResponse {
    EmailTransactionImportResponse {
        id: row.id,
        gmail_message_id: row.gmail_message_id,
        gmail_thread_id: row.gmail_thread_id,
        bank_name: row.bank_name,
        sender_email: row.sender_email,
        email_subject: row.email_subject,
        email_date: row.email_date,
        parsed_successfully: row.parsed_successfully,
        parsing_error: row.parsing_error,
        raw_email_snippet: row.raw_email_snippet,
        parsed_transaction: row
            .parsed_transaction
            .and_then(|value| serde_json::from_value::<ParsedTransactionPayload>(value).ok()),
        status: row.status,
        matched_account_id: row.matched_account_id,
        matched_account_name: row.matched_account_name,
        created_transaction_id: row.created_transaction_id,
        created_at: row.created_at,
    }
}
