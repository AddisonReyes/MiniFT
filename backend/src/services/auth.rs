use argon2::{
    password_hash::{
        rand_core::{OsRng, RngCore},
        PasswordHash, PasswordHasher, PasswordVerifier, SaltString,
    },
    Argon2,
};
use chrono::{Duration, Utc};
use jsonwebtoken::{encode, EncodingKey, Header};
use sqlx::{PgPool, Postgres, Transaction};
use uuid::Uuid;

use crate::{
    config::AuthConfig,
    errors::ApiError,
    logging::{self, field},
    models::{
        account::AccountType,
        auth::{
            EmailChallengePurpose, EmailChallengeRecord, RefreshSessionRecord, TokenClaims,
            TokenKind, UserProfile, UserRecord,
        },
    },
    schema::auth::{
        AuthResponse, ConfirmPasswordChangeRequest, ConfirmPasswordResetRequest, LoginRequest,
        RegisterRequest, UpdateDefaultCurrencyRequest,
    },
    services::normalize_currency_code,
};

const PASSWORD_CODE_MAX_ATTEMPTS: i32 = 5;
const EMAIL_CHALLENGE_REQUEST_COOLDOWN_SECONDS: i64 = 60;

#[derive(Debug, Clone)]
pub struct IssuedAuthSession {
    pub user: UserProfile,
    pub access_token: String,
    pub refresh_token: String,
}

#[derive(Debug, Clone)]
pub struct RegistrationResult {
    pub user: UserProfile,
    pub verification_token: String,
}

#[derive(Debug, Clone)]
pub struct VerificationEmailDelivery {
    pub email: String,
    pub verification_token: String,
}

#[derive(Debug, Clone)]
pub struct PasswordCodeDelivery {
    pub email: String,
    pub code: String,
}

fn normalize_email(email: &str) -> Result<String, ApiError> {
    let email = email.trim().to_lowercase();

    if email.is_empty() || !email.contains('@') {
        return Err(ApiError::bad_request("A valid email address is required"));
    }

    Ok(email)
}

fn validate_password(password: &str) -> Result<(), ApiError> {
    if password.len() < 8 {
        return Err(ApiError::bad_request(
            "Password must be at least 8 characters long",
        ));
    }

    Ok(())
}

fn validate_password_confirmation(
    password: &str,
    password_confirmation: &str,
) -> Result<(), ApiError> {
    validate_password(password)?;

    if password != password_confirmation {
        return Err(ApiError::bad_request("Passwords do not match"));
    }

    Ok(())
}

fn hash_secret(secret: &str) -> Result<String, ApiError> {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(secret.as_bytes(), &salt)
        .map(|hash| hash.to_string())
        .map_err(|_| ApiError::internal("Unable to securely process credentials"))
}

fn verify_secret(secret: &str, hash: &str, failure_message: &str) -> Result<(), ApiError> {
    let parsed_hash =
        PasswordHash::new(hash).map_err(|_| ApiError::unauthorized(failure_message))?;

    Argon2::default()
        .verify_password(secret.as_bytes(), &parsed_hash)
        .map_err(|_| ApiError::unauthorized(failure_message))
}

fn ensure_user_email_verified(user: &UserRecord) -> Result<(), ApiError> {
    if user.email_verified_at.is_none() {
        return Err(ApiError::forbidden(
            "Please verify your email before signing in",
        ));
    }

    Ok(())
}

fn encode_token(
    user: &UserRecord,
    auth: &AuthConfig,
    token_kind: TokenKind,
    ttl: Duration,
) -> Result<String, ApiError> {
    let issued_at = Utc::now();
    let expires_at = issued_at + ttl;
    let claims = TokenClaims {
        sub: user.id,
        email: user.email.clone(),
        token_kind,
        exp: expires_at.timestamp() as usize,
        iat: issued_at.timestamp() as usize,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(auth.jwt_secret.as_bytes()),
    )
    .map_err(|_| ApiError::internal("Unable to issue authentication tokens"))
}

fn issue_session(
    user: &UserRecord,
    auth: &AuthConfig,
    refresh_token: String,
) -> Result<IssuedAuthSession, ApiError> {
    let access_token = encode_token(
        user,
        auth,
        TokenKind::Access,
        Duration::minutes(auth.access_token_ttl_minutes),
    )?;

    Ok(IssuedAuthSession {
        user: UserProfile::from(user),
        access_token,
        refresh_token,
    })
}

fn map_auth_response(session: &IssuedAuthSession) -> AuthResponse {
    AuthResponse {
        user: session.user.clone(),
    }
}

fn is_unique_violation(error: &sqlx::Error) -> bool {
    match error {
        sqlx::Error::Database(db_error) => db_error.code().as_deref() == Some("23505"),
        _ => false,
    }
}

fn invalid_refresh_token() -> ApiError {
    ApiError::unauthorized("Invalid or expired refresh token")
}

fn invalid_verification_link() -> ApiError {
    ApiError::unauthorized("Invalid or expired verification link")
}

fn invalid_password_code() -> ApiError {
    ApiError::unauthorized("Invalid or expired code")
}

fn parse_refresh_token(raw_token: &str) -> Result<(Uuid, String), ApiError> {
    let (session_id, secret) = raw_token
        .split_once('.')
        .ok_or_else(invalid_refresh_token)?;
    let session_id = Uuid::parse_str(session_id).map_err(|_| invalid_refresh_token())?;

    if secret.trim().is_empty() {
        return Err(invalid_refresh_token());
    }

    Ok((session_id, secret.to_string()))
}

fn parse_challenge_token(raw_token: &str) -> Result<(Uuid, String), ApiError> {
    let (challenge_id, secret) = raw_token
        .split_once('.')
        .ok_or_else(invalid_verification_link)?;
    let challenge_id = Uuid::parse_str(challenge_id).map_err(|_| invalid_verification_link())?;

    if secret.trim().is_empty() {
        return Err(invalid_verification_link());
    }

    Ok((challenge_id, secret.to_string()))
}

fn build_refresh_cookie_value(session_id: Uuid, secret: &str) -> String {
    format!("{session_id}.{secret}")
}

fn build_challenge_token(challenge_id: Uuid, secret: &str) -> String {
    format!("{challenge_id}.{secret}")
}

fn create_refresh_secret() -> String {
    SaltString::generate(&mut OsRng).to_string()
}

fn create_email_verification_secret() -> String {
    Uuid::new_v4().simple().to_string()
}

fn create_password_code() -> String {
    let mut bytes = [0u8; 4];
    OsRng.fill_bytes(&mut bytes);
    let value = u32::from_le_bytes(bytes) % 1_000_000;
    format!("{value:06}")
}

async fn find_user_by_email(pool: &PgPool, email: &str) -> Result<Option<UserRecord>, ApiError> {
    sqlx::query_as::<_, UserRecord>(
        "SELECT id, email, password_hash, currency, created_at, email_verified_at
         FROM users
         WHERE email = $1",
    )
    .bind(email)
    .fetch_optional(pool)
    .await
    .map_err(ApiError::from)
}

async fn find_user_by_email_in_transaction(
    transaction: &mut Transaction<'_, Postgres>,
    email: &str,
) -> Result<Option<UserRecord>, ApiError> {
    sqlx::query_as::<_, UserRecord>(
        "SELECT id, email, password_hash, currency, created_at, email_verified_at
         FROM users
         WHERE email = $1
         FOR UPDATE",
    )
    .bind(email)
    .fetch_optional(&mut **transaction)
    .await
    .map_err(ApiError::from)
}

async fn find_user_by_id(pool: &PgPool, user_id: Uuid) -> Result<Option<UserRecord>, ApiError> {
    sqlx::query_as::<_, UserRecord>(
        "SELECT id, email, password_hash, currency, created_at, email_verified_at
         FROM users
         WHERE id = $1",
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await
    .map_err(ApiError::from)
}

async fn find_user_by_id_in_transaction(
    transaction: &mut Transaction<'_, Postgres>,
    user_id: Uuid,
) -> Result<Option<UserRecord>, ApiError> {
    sqlx::query_as::<_, UserRecord>(
        "SELECT id, email, password_hash, currency, created_at, email_verified_at
         FROM users
         WHERE id = $1
         FOR UPDATE",
    )
    .bind(user_id)
    .fetch_optional(&mut **transaction)
    .await
    .map_err(ApiError::from)
}

async fn find_refresh_session_for_update(
    transaction: &mut Transaction<'_, Postgres>,
    session_id: Uuid,
) -> Result<Option<RefreshSessionRecord>, ApiError> {
    sqlx::query_as::<_, RefreshSessionRecord>(
        "SELECT id, user_id, token_hash, expires_at, created_at, revoked_at, replaced_by_session_id
         FROM refresh_sessions
         WHERE id = $1
         FOR UPDATE",
    )
    .bind(session_id)
    .fetch_optional(&mut **transaction)
    .await
    .map_err(ApiError::from)
}

async fn find_email_challenge_for_update(
    transaction: &mut Transaction<'_, Postgres>,
    challenge_id: Uuid,
    purpose: EmailChallengePurpose,
) -> Result<Option<EmailChallengeRecord>, ApiError> {
    sqlx::query_as::<_, EmailChallengeRecord>(
        "SELECT id, user_id, purpose, secret_hash, expires_at, created_at, used_at, revoked_at,
                failed_attempts, max_attempts
         FROM email_challenges
         WHERE id = $1
           AND purpose = $2
         FOR UPDATE",
    )
    .bind(challenge_id)
    .bind(purpose)
    .fetch_optional(&mut **transaction)
    .await
    .map_err(ApiError::from)
}

async fn find_active_email_challenge_for_update(
    transaction: &mut Transaction<'_, Postgres>,
    user_id: Uuid,
    purpose: EmailChallengePurpose,
) -> Result<Option<EmailChallengeRecord>, ApiError> {
    sqlx::query_as::<_, EmailChallengeRecord>(
        "SELECT id, user_id, purpose, secret_hash, expires_at, created_at, used_at, revoked_at,
                failed_attempts, max_attempts
         FROM email_challenges
         WHERE user_id = $1
           AND purpose = $2
           AND used_at IS NULL
           AND revoked_at IS NULL
         ORDER BY created_at DESC
         LIMIT 1
         FOR UPDATE",
    )
    .bind(user_id)
    .bind(purpose)
    .fetch_optional(&mut **transaction)
    .await
    .map_err(ApiError::from)
}

async fn find_recent_active_email_challenge(
    pool: &PgPool,
    user_id: Uuid,
    purpose: EmailChallengePurpose,
    cooldown_seconds: i64,
) -> Result<bool, ApiError> {
    Ok(sqlx::query_scalar(
        "SELECT EXISTS(
           SELECT 1
           FROM email_challenges
           WHERE user_id = $1
             AND purpose = $2
             AND used_at IS NULL
             AND revoked_at IS NULL
             AND created_at > NOW() - ($3::text || ' seconds')::interval
         )",
    )
    .bind(user_id)
    .bind(purpose)
    .bind(cooldown_seconds)
    .fetch_one(pool)
    .await?)
}

async fn revoke_active_email_challenges(
    transaction: &mut Transaction<'_, Postgres>,
    user_id: Uuid,
    purpose: EmailChallengePurpose,
) -> Result<(), ApiError> {
    sqlx::query(
        "UPDATE email_challenges
         SET revoked_at = COALESCE(revoked_at, NOW())
         WHERE user_id = $1
           AND purpose = $2
           AND used_at IS NULL
           AND revoked_at IS NULL",
    )
    .bind(user_id)
    .bind(purpose)
    .execute(&mut **transaction)
    .await?;

    Ok(())
}

async fn mark_email_challenge_used(
    transaction: &mut Transaction<'_, Postgres>,
    challenge_id: Uuid,
) -> Result<(), ApiError> {
    sqlx::query(
        "UPDATE email_challenges
         SET used_at = COALESCE(used_at, NOW())
         WHERE id = $1",
    )
    .bind(challenge_id)
    .execute(&mut **transaction)
    .await?;

    Ok(())
}

async fn revoke_email_challenge(
    transaction: &mut Transaction<'_, Postgres>,
    challenge_id: Uuid,
) -> Result<(), ApiError> {
    sqlx::query(
        "UPDATE email_challenges
         SET revoked_at = COALESCE(revoked_at, NOW())
         WHERE id = $1",
    )
    .bind(challenge_id)
    .execute(&mut **transaction)
    .await?;

    Ok(())
}

async fn record_email_challenge_failed_attempt(
    transaction: &mut Transaction<'_, Postgres>,
    challenge: &EmailChallengeRecord,
) -> Result<i32, ApiError> {
    let failed_attempts = sqlx::query_scalar(
        "UPDATE email_challenges
         SET failed_attempts = failed_attempts + 1
         WHERE id = $1
         RETURNING failed_attempts",
    )
    .bind(challenge.id)
    .fetch_one(&mut **transaction)
    .await?;

    if failed_attempts >= challenge.max_attempts {
        revoke_email_challenge(transaction, challenge.id).await?;
    }

    Ok(failed_attempts)
}

async fn insert_email_challenge(
    transaction: &mut Transaction<'_, Postgres>,
    user_id: Uuid,
    purpose: EmailChallengePurpose,
    secret: &str,
    expires_at: chrono::DateTime<Utc>,
    max_attempts: i32,
) -> Result<Uuid, ApiError> {
    let challenge_id = Uuid::new_v4();
    let secret_hash = hash_secret(secret)?;

    sqlx::query(
        "INSERT INTO email_challenges (id, user_id, purpose, secret_hash, expires_at, max_attempts)
         VALUES ($1, $2, $3, $4, $5, $6)",
    )
    .bind(challenge_id)
    .bind(user_id)
    .bind(purpose)
    .bind(secret_hash)
    .bind(expires_at)
    .bind(max_attempts)
    .execute(&mut **transaction)
    .await?;

    Ok(challenge_id)
}

async fn create_email_verification_challenge(
    transaction: &mut Transaction<'_, Postgres>,
    user_id: Uuid,
    verification_ttl_hours: i64,
) -> Result<String, ApiError> {
    revoke_active_email_challenges(transaction, user_id, EmailChallengePurpose::VerifyEmail)
        .await?;

    let secret = create_email_verification_secret();
    let expires_at = Utc::now() + Duration::hours(verification_ttl_hours.max(1));
    let challenge_id = insert_email_challenge(
        transaction,
        user_id,
        EmailChallengePurpose::VerifyEmail,
        &secret,
        expires_at,
        PASSWORD_CODE_MAX_ATTEMPTS,
    )
    .await?;

    Ok(build_challenge_token(challenge_id, &secret))
}

async fn create_password_code_challenge(
    transaction: &mut Transaction<'_, Postgres>,
    user_id: Uuid,
    purpose: EmailChallengePurpose,
    ttl_minutes: i64,
) -> Result<String, ApiError> {
    revoke_active_email_challenges(transaction, user_id, purpose).await?;

    let code = create_password_code();
    let expires_at = Utc::now() + Duration::minutes(ttl_minutes.max(1));
    insert_email_challenge(
        transaction,
        user_id,
        purpose,
        &code,
        expires_at,
        PASSWORD_CODE_MAX_ATTEMPTS,
    )
    .await?;

    Ok(code)
}

async fn insert_refresh_session(
    transaction: &mut Transaction<'_, Postgres>,
    user_id: Uuid,
    auth: &AuthConfig,
) -> Result<(Uuid, String), ApiError> {
    let session_id = Uuid::new_v4();
    let secret = create_refresh_secret();
    let token_hash = hash_secret(&secret)?;
    let expires_at = Utc::now() + Duration::days(auth.refresh_token_ttl_days);

    sqlx::query(
        "INSERT INTO refresh_sessions (id, user_id, token_hash, expires_at)
         VALUES ($1, $2, $3, $4)",
    )
    .bind(session_id)
    .bind(user_id)
    .bind(token_hash)
    .bind(expires_at)
    .execute(&mut **transaction)
    .await?;

    Ok((session_id, build_refresh_cookie_value(session_id, &secret)))
}

async fn create_refresh_session(
    pool: &PgPool,
    user_id: Uuid,
    auth: &AuthConfig,
) -> Result<String, ApiError> {
    let mut transaction = pool.begin().await?;
    let (_, refresh_token) = insert_refresh_session(&mut transaction, user_id, auth).await?;
    transaction.commit().await?;
    Ok(refresh_token)
}

async fn revoke_refresh_session(
    transaction: &mut Transaction<'_, Postgres>,
    session_id: Uuid,
    replaced_by_session_id: Option<Uuid>,
) -> Result<(), ApiError> {
    sqlx::query(
        "UPDATE refresh_sessions
         SET revoked_at = COALESCE(revoked_at, NOW()),
             replaced_by_session_id = COALESCE(replaced_by_session_id, $2)
         WHERE id = $1",
    )
    .bind(session_id)
    .bind(replaced_by_session_id)
    .execute(&mut **transaction)
    .await?;

    Ok(())
}

async fn revoke_all_refresh_sessions_for_user(
    transaction: &mut Transaction<'_, Postgres>,
    user_id: Uuid,
) -> Result<(), ApiError> {
    sqlx::query(
        "UPDATE refresh_sessions
         SET revoked_at = COALESCE(revoked_at, NOW())
         WHERE user_id = $1
           AND revoked_at IS NULL",
    )
    .bind(user_id)
    .execute(&mut **transaction)
    .await?;

    Ok(())
}

async fn issue_auth_session(
    pool: &PgPool,
    auth: &AuthConfig,
    user: &UserRecord,
) -> Result<IssuedAuthSession, ApiError> {
    ensure_user_email_verified(user)?;
    let refresh_token = create_refresh_session(pool, user.id, auth).await?;
    issue_session(user, auth, refresh_token)
}

async fn mark_user_email_verified_in_transaction(
    transaction: &mut Transaction<'_, Postgres>,
    user_id: Uuid,
) -> Result<(), ApiError> {
    sqlx::query(
        "UPDATE users
         SET email_verified_at = COALESCE(email_verified_at, NOW())
         WHERE id = $1",
    )
    .bind(user_id)
    .execute(&mut **transaction)
    .await?;

    Ok(())
}

async fn update_password_hash(
    transaction: &mut Transaction<'_, Postgres>,
    user_id: Uuid,
    password_hash: &str,
) -> Result<(), ApiError> {
    sqlx::query(
        "UPDATE users
         SET password_hash = $1
         WHERE id = $2",
    )
    .bind(password_hash)
    .bind(user_id)
    .execute(&mut **transaction)
    .await?;

    Ok(())
}

pub async fn register_user(
    pool: &PgPool,
    verification_ttl_hours: i64,
    payload: RegisterRequest,
) -> Result<RegistrationResult, ApiError> {
    let email = normalize_email(&payload.email)?;
    validate_password(&payload.password)?;
    let currency = normalize_currency_code(
        payload.currency.as_deref().unwrap_or("USD"),
        "Default currency",
    )?;

    let password_hash = hash_secret(&payload.password)?;
    let mut transaction = pool.begin().await?;

    let user = sqlx::query_as::<_, UserRecord>(
        "INSERT INTO users (email, password_hash, currency)
         VALUES ($1, $2, $3)
         RETURNING id, email, password_hash, currency, created_at, email_verified_at",
    )
    .bind(&email)
    .bind(password_hash)
    .bind(&currency)
    .fetch_one(&mut *transaction)
    .await
    .map_err(|error| {
        if is_unique_violation(&error) {
            logging::warn(
                "auth.register.failed",
                &[field("reason", "email_already_registered")],
            );
            ApiError::conflict("Email is already registered")
        } else {
            ApiError::from(error)
        }
    })?;

    sqlx::query(
        "INSERT INTO accounts (user_id, name, type, currency)
         VALUES ($1, 'Cash', $2, $3)",
    )
    .bind(user.id)
    .bind(AccountType::Cash)
    .bind(&currency)
    .execute(&mut *transaction)
    .await?;

    let verification_token =
        create_email_verification_challenge(&mut transaction, user.id, verification_ttl_hours)
            .await?;

    transaction.commit().await?;

    let profile = UserProfile::from(&user);

    logging::info(
        "auth.register.succeeded",
        &[
            field("user_id", profile.id),
            field("currency", &profile.currency),
            field("email_verified", profile.email_verified_at.is_some()),
        ],
    );

    Ok(RegistrationResult {
        user: profile,
        verification_token,
    })
}

pub async fn prepare_verification_email(
    pool: &PgPool,
    email: &str,
    verification_ttl_hours: i64,
) -> Result<Option<VerificationEmailDelivery>, ApiError> {
    let email = normalize_email(email)?;

    let Some(user) = find_user_by_email(pool, &email).await? else {
        logging::info(
            "auth.verification.resend.skipped",
            &[field("reason", "user_not_found")],
        );
        return Ok(None);
    };

    if user.email_verified_at.is_some() {
        logging::info(
            "auth.verification.resend.skipped",
            &[
                field("user_id", user.id),
                field("reason", "already_verified"),
            ],
        );
        return Ok(None);
    }

    if find_recent_active_email_challenge(
        pool,
        user.id,
        EmailChallengePurpose::VerifyEmail,
        EMAIL_CHALLENGE_REQUEST_COOLDOWN_SECONDS,
    )
    .await?
    {
        logging::info(
            "auth.verification.resend.skipped",
            &[
                field("user_id", user.id),
                field("reason", "cooldown_active"),
            ],
        );
        return Ok(None);
    }

    let mut transaction = pool.begin().await?;
    let verification_token =
        create_email_verification_challenge(&mut transaction, user.id, verification_ttl_hours)
            .await?;
    transaction.commit().await?;

    logging::info(
        "auth.verification.resend.prepared",
        &[field("user_id", user.id)],
    );

    Ok(Some(VerificationEmailDelivery {
        email: user.email,
        verification_token,
    }))
}

pub async fn verify_email_token(
    pool: &PgPool,
    auth: &AuthConfig,
    token: &str,
) -> Result<IssuedAuthSession, ApiError> {
    let (challenge_id, secret) = match parse_challenge_token(token) {
        Ok(value) => value,
        Err(error) => {
            logging::warn(
                "auth.verification.failed",
                &[field("reason", "invalid_token_format")],
            );
            return Err(error);
        }
    };
    let mut transaction = pool.begin().await?;
    let challenge = find_email_challenge_for_update(
        &mut transaction,
        challenge_id,
        EmailChallengePurpose::VerifyEmail,
    )
    .await?
    .ok_or_else(|| {
        logging::warn(
            "auth.verification.failed",
            &[
                field("challenge_id", challenge_id),
                field("reason", "challenge_not_found"),
            ],
        );
        invalid_verification_link()
    })?;

    if challenge.used_at.is_some()
        || challenge.revoked_at.is_some()
        || challenge.expires_at <= Utc::now()
    {
        revoke_email_challenge(&mut transaction, challenge.id).await?;
        transaction.commit().await?;
        logging::warn(
            "auth.verification.failed",
            &[
                field("challenge_id", challenge.id),
                field("user_id", challenge.user_id),
                field("reason", "challenge_expired_or_inactive"),
            ],
        );
        return Err(invalid_verification_link());
    }

    if let Err(error) = verify_secret(
        &secret,
        &challenge.secret_hash,
        "Invalid or expired verification link",
    ) {
        logging::warn(
            "auth.verification.failed",
            &[
                field("challenge_id", challenge.id),
                field("user_id", challenge.user_id),
                field("reason", "secret_mismatch"),
            ],
        );
        return Err(error);
    }

    mark_email_challenge_used(&mut transaction, challenge.id).await?;
    mark_user_email_verified_in_transaction(&mut transaction, challenge.user_id).await?;
    let user = find_user_by_id_in_transaction(&mut transaction, challenge.user_id)
        .await?
        .ok_or_else(|| ApiError::not_found("User not found"))?;

    transaction.commit().await?;

    let session = issue_auth_session(pool, auth, &user).await?;

    logging::info(
        "auth.verification.succeeded",
        &[
            field("user_id", session.user.id),
            field("challenge_id", challenge.id),
        ],
    );

    Ok(session)
}

pub async fn login_user(
    pool: &PgPool,
    auth: &AuthConfig,
    payload: LoginRequest,
) -> Result<IssuedAuthSession, ApiError> {
    let email = normalize_email(&payload.email)?;

    let user = match find_user_by_email(pool, &email).await? {
        Some(user) => user,
        None => {
            logging::warn("auth.login.failed", &[field("reason", "user_not_found")]);
            return Err(ApiError::unauthorized("Invalid credentials"));
        }
    };

    if let Err(error) = verify_secret(
        &payload.password,
        &user.password_hash,
        "Invalid credentials",
    ) {
        logging::warn(
            "auth.login.failed",
            &[
                field("user_id", user.id),
                field("reason", "invalid_password"),
            ],
        );
        return Err(error);
    }

    if let Err(error) = ensure_user_email_verified(&user) {
        logging::warn(
            "auth.login.failed",
            &[
                field("user_id", user.id),
                field("reason", "email_not_verified"),
            ],
        );
        return Err(error);
    }

    let session = issue_auth_session(pool, auth, &user).await?;

    logging::info("auth.login.succeeded", &[field("user_id", session.user.id)]);

    Ok(session)
}

pub async fn refresh_session(
    pool: &PgPool,
    auth: &AuthConfig,
    refresh_token: &str,
) -> Result<IssuedAuthSession, ApiError> {
    let (session_id, secret) = match parse_refresh_token(refresh_token) {
        Ok(value) => value,
        Err(error) => {
            logging::warn(
                "auth.refresh.failed",
                &[field("reason", "invalid_refresh_token_format")],
            );
            return Err(error);
        }
    };
    let mut transaction = pool.begin().await?;
    let session = find_refresh_session_for_update(&mut transaction, session_id)
        .await?
        .ok_or_else(|| {
            logging::warn(
                "auth.refresh.failed",
                &[
                    field("session_id", session_id),
                    field("reason", "refresh_session_not_found"),
                ],
            );
            invalid_refresh_token()
        })?;

    if session.revoked_at.is_some() || session.expires_at <= Utc::now() {
        revoke_refresh_session(&mut transaction, session.id, None).await?;
        transaction.commit().await?;
        logging::warn(
            "auth.refresh.failed",
            &[
                field("session_id", session.id),
                field("user_id", session.user_id),
                field("reason", "refresh_session_revoked_or_expired"),
            ],
        );
        return Err(invalid_refresh_token());
    }

    if let Err(error) = verify_secret(
        &secret,
        &session.token_hash,
        "Invalid or expired refresh token",
    ) {
        logging::warn(
            "auth.refresh.failed",
            &[
                field("session_id", session.id),
                field("user_id", session.user_id),
                field("reason", "refresh_secret_mismatch"),
            ],
        );
        return Err(error);
    }

    let user = find_user_by_id_in_transaction(&mut transaction, session.user_id)
        .await?
        .ok_or_else(|| {
            logging::warn(
                "auth.refresh.failed",
                &[
                    field("session_id", session.id),
                    field("user_id", session.user_id),
                    field("reason", "user_not_found"),
                ],
            );
            ApiError::unauthorized("User not found")
        })?;

    if let Err(error) = ensure_user_email_verified(&user) {
        revoke_refresh_session(&mut transaction, session.id, None).await?;
        transaction.commit().await?;
        logging::warn(
            "auth.refresh.failed",
            &[
                field("session_id", session.id),
                field("user_id", session.user_id),
                field("reason", "email_not_verified"),
            ],
        );
        return Err(error);
    }

    let (replacement_session_id, replacement_token) =
        insert_refresh_session(&mut transaction, session.user_id, auth).await?;
    revoke_refresh_session(&mut transaction, session.id, Some(replacement_session_id)).await?;

    transaction.commit().await?;

    let issued_session = issue_session(&user, auth, replacement_token)?;

    logging::info(
        "auth.refresh.succeeded",
        &[
            field("user_id", issued_session.user.id),
            field("previous_session_id", session.id),
            field("replacement_session_id", replacement_session_id),
        ],
    );

    Ok(issued_session)
}

pub async fn logout_session(pool: &PgPool, refresh_token: Option<&str>) -> Result<(), ApiError> {
    let Some(refresh_token) = refresh_token else {
        logging::info("auth.logout.completed", &[field("session_revoked", false)]);
        return Ok(());
    };

    let Ok((session_id, _)) = parse_refresh_token(refresh_token) else {
        logging::warn(
            "auth.logout.skipped",
            &[field("reason", "invalid_refresh_token_format")],
        );
        return Ok(());
    };

    let mut transaction = pool.begin().await?;

    if let Some(session) = find_refresh_session_for_update(&mut transaction, session_id).await? {
        revoke_refresh_session(&mut transaction, session.id, None).await?;
        logging::info(
            "auth.logout.completed",
            &[
                field("session_revoked", true),
                field("session_id", session.id),
                field("user_id", session.user_id),
            ],
        );
    } else {
        logging::info(
            "auth.logout.completed",
            &[
                field("session_revoked", false),
                field("session_id", session_id),
            ],
        );
    }

    transaction.commit().await?;

    Ok(())
}

pub async fn request_password_reset_code(
    pool: &PgPool,
    email: &str,
    ttl_minutes: i64,
) -> Result<Option<PasswordCodeDelivery>, ApiError> {
    let email = normalize_email(email)?;

    let Some(user) = find_user_by_email(pool, &email).await? else {
        logging::info(
            "auth.password_reset.request.skipped",
            &[field("reason", "user_not_found")],
        );
        return Ok(None);
    };

    if find_recent_active_email_challenge(
        pool,
        user.id,
        EmailChallengePurpose::PasswordReset,
        EMAIL_CHALLENGE_REQUEST_COOLDOWN_SECONDS,
    )
    .await?
    {
        logging::info(
            "auth.password_reset.request.skipped",
            &[
                field("user_id", user.id),
                field("reason", "cooldown_active"),
            ],
        );
        return Ok(None);
    }

    let mut transaction = pool.begin().await?;
    let code = create_password_code_challenge(
        &mut transaction,
        user.id,
        EmailChallengePurpose::PasswordReset,
        ttl_minutes,
    )
    .await?;
    transaction.commit().await?;

    logging::info(
        "auth.password_reset.request.prepared",
        &[field("user_id", user.id)],
    );

    Ok(Some(PasswordCodeDelivery {
        email: user.email,
        code,
    }))
}

pub async fn confirm_password_reset(
    pool: &PgPool,
    payload: ConfirmPasswordResetRequest,
) -> Result<(), ApiError> {
    let email = normalize_email(&payload.email)?;
    let code = payload.code.trim().to_string();
    validate_password_confirmation(&payload.password, &payload.password_confirmation)?;

    if code.is_empty() {
        return Err(ApiError::bad_request("Code is required"));
    }

    let mut transaction = pool.begin().await?;
    let user = find_user_by_email_in_transaction(&mut transaction, &email)
        .await?
        .ok_or_else(invalid_password_code)?;
    let challenge = find_active_email_challenge_for_update(
        &mut transaction,
        user.id,
        EmailChallengePurpose::PasswordReset,
    )
    .await?
    .ok_or_else(invalid_password_code)?;

    if challenge.used_at.is_some()
        || challenge.revoked_at.is_some()
        || challenge.expires_at <= Utc::now()
    {
        revoke_email_challenge(&mut transaction, challenge.id).await?;
        transaction.commit().await?;
        logging::warn(
            "auth.password_reset.confirm.failed",
            &[
                field("user_id", user.id),
                field("reason", "challenge_expired_or_inactive"),
            ],
        );
        return Err(invalid_password_code());
    }

    if challenge.failed_attempts >= challenge.max_attempts {
        revoke_email_challenge(&mut transaction, challenge.id).await?;
        transaction.commit().await?;
        logging::warn(
            "auth.password_reset.confirm.failed",
            &[
                field("user_id", user.id),
                field("reason", "challenge_attempts_exhausted"),
            ],
        );
        return Err(invalid_password_code());
    }

    if let Err(error) = verify_secret(&code, &challenge.secret_hash, "Invalid or expired code") {
        let failed_attempts =
            record_email_challenge_failed_attempt(&mut transaction, &challenge).await?;
        transaction.commit().await?;
        logging::warn(
            "auth.password_reset.confirm.failed",
            &[
                field("user_id", user.id),
                field("reason", "secret_mismatch"),
                field("failed_attempts", failed_attempts),
                field("max_attempts", challenge.max_attempts),
            ],
        );
        return Err(error);
    }

    let password_hash = hash_secret(&payload.password)?;
    update_password_hash(&mut transaction, user.id, &password_hash).await?;
    mark_email_challenge_used(&mut transaction, challenge.id).await?;
    revoke_all_refresh_sessions_for_user(&mut transaction, user.id).await?;
    transaction.commit().await?;

    logging::info(
        "auth.password_reset.confirm.succeeded",
        &[field("user_id", user.id)],
    );

    Ok(())
}

pub async fn request_password_change_code(
    pool: &PgPool,
    user_id: Uuid,
    ttl_minutes: i64,
) -> Result<PasswordCodeDelivery, ApiError> {
    let user = find_user_by_id(pool, user_id)
        .await?
        .ok_or_else(|| ApiError::not_found("User not found"))?;

    if find_recent_active_email_challenge(
        pool,
        user.id,
        EmailChallengePurpose::PasswordChange,
        EMAIL_CHALLENGE_REQUEST_COOLDOWN_SECONDS,
    )
    .await?
    {
        logging::warn(
            "auth.password_change.request.rejected",
            &[
                field("user_id", user.id),
                field("reason", "cooldown_active"),
            ],
        );
        return Err(ApiError::too_many_requests(
            "Please wait before requesting another confirmation code",
        ));
    }

    let mut transaction = pool.begin().await?;
    let code = create_password_code_challenge(
        &mut transaction,
        user.id,
        EmailChallengePurpose::PasswordChange,
        ttl_minutes,
    )
    .await?;
    transaction.commit().await?;

    logging::info(
        "auth.password_change.request.prepared",
        &[field("user_id", user.id)],
    );

    Ok(PasswordCodeDelivery {
        email: user.email,
        code,
    })
}

pub async fn confirm_password_change(
    pool: &PgPool,
    auth: &AuthConfig,
    user_id: Uuid,
    payload: ConfirmPasswordChangeRequest,
) -> Result<IssuedAuthSession, ApiError> {
    let code = payload.code.trim().to_string();
    validate_password_confirmation(&payload.password, &payload.password_confirmation)?;

    if code.is_empty() {
        return Err(ApiError::bad_request("Code is required"));
    }

    let mut transaction = pool.begin().await?;
    let user = find_user_by_id_in_transaction(&mut transaction, user_id)
        .await?
        .ok_or_else(|| ApiError::not_found("User not found"))?;
    let challenge = find_active_email_challenge_for_update(
        &mut transaction,
        user.id,
        EmailChallengePurpose::PasswordChange,
    )
    .await?
    .ok_or_else(invalid_password_code)?;

    if challenge.used_at.is_some()
        || challenge.revoked_at.is_some()
        || challenge.expires_at <= Utc::now()
    {
        revoke_email_challenge(&mut transaction, challenge.id).await?;
        transaction.commit().await?;
        logging::warn(
            "auth.password_change.confirm.failed",
            &[
                field("user_id", user.id),
                field("reason", "challenge_expired_or_inactive"),
            ],
        );
        return Err(invalid_password_code());
    }

    if challenge.failed_attempts >= challenge.max_attempts {
        revoke_email_challenge(&mut transaction, challenge.id).await?;
        transaction.commit().await?;
        logging::warn(
            "auth.password_change.confirm.failed",
            &[
                field("user_id", user.id),
                field("reason", "challenge_attempts_exhausted"),
            ],
        );
        return Err(invalid_password_code());
    }

    if let Err(error) = verify_secret(&code, &challenge.secret_hash, "Invalid or expired code") {
        let failed_attempts =
            record_email_challenge_failed_attempt(&mut transaction, &challenge).await?;
        transaction.commit().await?;
        logging::warn(
            "auth.password_change.confirm.failed",
            &[
                field("user_id", user.id),
                field("reason", "secret_mismatch"),
                field("failed_attempts", failed_attempts),
                field("max_attempts", challenge.max_attempts),
            ],
        );
        return Err(error);
    }

    let password_hash = hash_secret(&payload.password)?;
    update_password_hash(&mut transaction, user.id, &password_hash).await?;
    mark_email_challenge_used(&mut transaction, challenge.id).await?;
    revoke_all_refresh_sessions_for_user(&mut transaction, user.id).await?;
    transaction.commit().await?;

    logging::info(
        "auth.password_change.confirm.succeeded",
        &[field("user_id", user.id)],
    );

    issue_auth_session(pool, auth, &user).await
}

pub async fn get_user_profile(pool: &PgPool, user_id: Uuid) -> Result<UserProfile, ApiError> {
    let user = find_user_by_id(pool, user_id)
        .await?
        .ok_or_else(|| ApiError::not_found("User not found"))?;

    let profile = UserProfile::from(&user);

    logging::info(
        "auth.profile.read",
        &[
            field("user_id", profile.id),
            field("currency", &profile.currency),
            field("email_verified", profile.email_verified_at.is_some()),
        ],
    );

    Ok(profile)
}

pub async fn update_default_currency(
    pool: &PgPool,
    user_id: Uuid,
    payload: UpdateDefaultCurrencyRequest,
) -> Result<UserProfile, ApiError> {
    let currency = normalize_currency_code(&payload.currency, "Default currency")?;

    let result = sqlx::query(
        "UPDATE users
         SET currency = $1
         WHERE id = $2",
    )
    .bind(currency)
    .bind(user_id)
    .execute(pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(ApiError::not_found("User not found"));
    }

    let profile = get_user_profile(pool, user_id).await?;

    logging::info(
        "auth.default_currency.updated",
        &[
            field("user_id", profile.id),
            field("currency", &profile.currency),
        ],
    );

    Ok(profile)
}

pub async fn mark_user_email_verified(pool: &PgPool, user_id: Uuid) -> Result<(), ApiError> {
    let result = sqlx::query(
        "UPDATE users
         SET email_verified_at = COALESCE(email_verified_at, NOW())
         WHERE id = $1",
    )
    .bind(user_id)
    .execute(pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(ApiError::not_found("User not found"));
    }

    Ok(())
}

pub fn auth_response(session: &IssuedAuthSession) -> AuthResponse {
    map_auth_response(session)
}

#[cfg(test)]
mod tests {
    use uuid::Uuid;

    use super::{
        normalize_email, parse_challenge_token, parse_refresh_token, validate_password,
        validate_password_confirmation,
    };

    #[test]
    fn normalizes_email_by_trimming_and_lowercasing() {
        let email = normalize_email("  USER@Example.COM  ").expect("email should normalize");

        assert_eq!(email, "user@example.com");
    }

    #[test]
    fn rejects_invalid_email_without_separator() {
        let error = normalize_email("invalid-email").expect_err("email should fail");

        assert_eq!(error.message, "A valid email address is required");
    }

    #[test]
    fn validates_password_minimum_length() {
        let error = validate_password("short").expect_err("password should fail");

        assert_eq!(error.message, "Password must be at least 8 characters long");
    }

    #[test]
    fn rejects_mismatched_password_confirmation() {
        let error = validate_password_confirmation("password123", "password456")
            .expect_err("password confirmation should fail");

        assert_eq!(error.message, "Passwords do not match");
    }

    #[test]
    fn parses_refresh_tokens_into_session_id_and_secret() {
        let session_id = Uuid::new_v4();
        let parsed = parse_refresh_token(&format!("{session_id}.secret-token"))
            .expect("refresh token should parse");

        assert_eq!(parsed.0, session_id);
        assert_eq!(parsed.1, "secret-token");
    }

    #[test]
    fn rejects_refresh_tokens_without_both_parts() {
        let error = parse_refresh_token("missing-secret").expect_err("token should fail");

        assert_eq!(error.message, "Invalid or expired refresh token");
    }

    #[test]
    fn parses_challenge_tokens_into_challenge_id_and_secret() {
        let challenge_id = Uuid::new_v4();
        let parsed = parse_challenge_token(&format!("{challenge_id}.challenge-secret"))
            .expect("challenge token should parse");

        assert_eq!(parsed.0, challenge_id);
        assert_eq!(parsed.1, "challenge-secret");
    }
}
