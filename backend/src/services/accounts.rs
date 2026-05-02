use rust_decimal::Decimal;
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    errors::ApiError,
    models::account::{AccountBalanceRow, AccountRecord, AccountType},
    schema::account::{AccountResponse, CreateAccountRequest, UpdateAccountRequest},
    services::{normalize_currency_code, normalize_required_text},
};

const LIST_ACCOUNTS_QUERY: &str = "SELECT
    a.id,
    a.name,
    a.type,
    a.currency,
    a.created_at,
    COALESCE(
      SUM(
        CASE
          WHEN t.type = 'expense' THEN -t.amount
          ELSE t.amount
        END
      ),
      0::numeric
    ) AS balance
 FROM accounts a
 LEFT JOIN transactions t
   ON t.account_id = a.id
 WHERE a.user_id = $1
 GROUP BY a.id, a.name, a.type, a.currency, a.created_at
 ORDER BY
   CASE
     WHEN a.type = 'cash' THEN 0
     WHEN a.type = 'bank_account' THEN 1
     WHEN a.type = 'credit_card' THEN 2
     WHEN a.type = 'loan' THEN 3
     ELSE 4
   END,
   a.created_at ASC";

const GET_ACCOUNT_QUERY: &str = "SELECT
    a.id,
    a.name,
    a.type,
    a.currency,
    a.created_at,
    COALESCE(
      SUM(
        CASE
          WHEN t.type = 'expense' THEN -t.amount
          ELSE t.amount
        END
      ),
      0::numeric
    ) AS balance
 FROM accounts a
 LEFT JOIN transactions t
   ON t.account_id = a.id
 WHERE a.user_id = $1
   AND a.id = $2
 GROUP BY a.id, a.name, a.type, a.currency, a.created_at";

fn map_account(row: AccountBalanceRow) -> AccountResponse {
    AccountResponse {
        id: row.id,
        name: row.name,
        r#type: row.r#type,
        currency: row.currency,
        created_at: row.created_at,
        balance: row.balance,
    }
}

fn map_new_account(record: AccountRecord) -> AccountResponse {
    AccountResponse {
        id: record.id,
        name: record.name,
        r#type: record.r#type,
        currency: record.currency,
        created_at: record.created_at,
        balance: Decimal::ZERO,
    }
}

async fn get_account_row(
    pool: &PgPool,
    user_id: Uuid,
    account_id: Uuid,
) -> Result<AccountRecord, ApiError> {
    sqlx::query_as::<_, AccountRecord>(
        "SELECT id, name, type, currency, created_at
         FROM accounts
         WHERE id = $1 AND user_id = $2",
    )
    .bind(account_id)
    .bind(user_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| ApiError::not_found("Account not found"))
}

async fn get_account_balance_row(
    pool: &PgPool,
    user_id: Uuid,
    account_id: Uuid,
) -> Result<AccountBalanceRow, ApiError> {
    sqlx::query_as::<_, AccountBalanceRow>(GET_ACCOUNT_QUERY)
        .bind(user_id)
        .bind(account_id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| ApiError::not_found("Account not found"))
}

async fn get_user_default_currency(pool: &PgPool, user_id: Uuid) -> Result<String, ApiError> {
    sqlx::query_scalar(
        "SELECT currency
         FROM users
         WHERE id = $1",
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| ApiError::not_found("User not found"))
}

async fn count_accounts(pool: &PgPool, user_id: Uuid) -> Result<i64, ApiError> {
    Ok(sqlx::query_scalar(
        "SELECT COUNT(*)::bigint
         FROM accounts
         WHERE user_id = $1",
    )
    .bind(user_id)
    .fetch_one(pool)
    .await?)
}

async fn count_cash_accounts(pool: &PgPool, user_id: Uuid) -> Result<i64, ApiError> {
    Ok(sqlx::query_scalar(
        "SELECT COUNT(*)::bigint
         FROM accounts
         WHERE user_id = $1 AND type = 'cash'",
    )
    .bind(user_id)
    .fetch_one(pool)
    .await?)
}

async fn account_has_dependencies(
    pool: &PgPool,
    user_id: Uuid,
    account_id: Uuid,
) -> Result<bool, ApiError> {
    Ok(sqlx::query_scalar(
        "SELECT
           EXISTS(
             SELECT 1 FROM transactions
             WHERE account_id = $1 AND user_id = $2
           )
           OR EXISTS(
             SELECT 1 FROM recurring_transactions
             WHERE account_id = $1 AND user_id = $2
           )
           OR EXISTS(
             SELECT 1 FROM transfers
             WHERE user_id = $2 AND (from_account_id = $1 OR to_account_id = $1)
           )",
    )
    .bind(account_id)
    .bind(user_id)
    .fetch_one(pool)
    .await?)
}

fn ensure_multiple_accounts(total_accounts: i64) -> Result<(), ApiError> {
    if total_accounts <= 1 {
        return Err(ApiError::bad_request(
            "At least one account must remain available",
        ));
    }

    Ok(())
}

fn ensure_multiple_cash_accounts(total_cash_accounts: i64) -> Result<(), ApiError> {
    if total_cash_accounts <= 1 {
        return Err(ApiError::bad_request(
            "At least one cash account must remain available",
        ));
    }

    Ok(())
}

pub async fn list_accounts(pool: &PgPool, user_id: Uuid) -> Result<Vec<AccountResponse>, ApiError> {
    let rows = sqlx::query_as::<_, AccountBalanceRow>(LIST_ACCOUNTS_QUERY)
        .bind(user_id)
        .fetch_all(pool)
        .await?;

    Ok(rows.into_iter().map(map_account).collect())
}

pub async fn get_account(
    pool: &PgPool,
    user_id: Uuid,
    account_id: Uuid,
) -> Result<AccountResponse, ApiError> {
    let row = get_account_balance_row(pool, user_id, account_id).await?;
    Ok(map_account(row))
}

pub async fn create_account(
    pool: &PgPool,
    user_id: Uuid,
    payload: CreateAccountRequest,
) -> Result<AccountResponse, ApiError> {
    let name = normalize_required_text(&payload.name, "Account name")?;
    let currency = match payload.currency {
        Some(currency) => normalize_currency_code(&currency, "Account currency")?,
        None => get_user_default_currency(pool, user_id).await?,
    };

    let account = sqlx::query_as::<_, AccountRecord>(
        "INSERT INTO accounts (user_id, name, type, currency)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, type, currency, created_at",
    )
    .bind(user_id)
    .bind(name)
    .bind(payload.r#type)
    .bind(currency)
    .fetch_one(pool)
    .await?;

    Ok(map_new_account(account))
}

pub async fn update_account(
    pool: &PgPool,
    user_id: Uuid,
    account_id: Uuid,
    payload: UpdateAccountRequest,
) -> Result<AccountResponse, ApiError> {
    let existing = get_account_row(pool, user_id, account_id).await?;
    let name = normalize_required_text(&payload.name, "Account name")?;
    let currency = normalize_currency_code(&payload.currency, "Account currency")?;

    let is_converting_last_cash_account =
        existing.r#type == AccountType::Cash && payload.r#type != AccountType::Cash;

    if is_converting_last_cash_account {
        ensure_multiple_cash_accounts(count_cash_accounts(pool, user_id).await?)?;
    }

    sqlx::query(
        "UPDATE accounts
         SET name = $1, type = $2, currency = $3
         WHERE id = $4 AND user_id = $5",
    )
    .bind(name)
    .bind(payload.r#type)
    .bind(currency)
    .bind(account_id)
    .bind(user_id)
    .execute(pool)
    .await?;

    get_account(pool, user_id, account_id).await
}

pub async fn delete_account(
    pool: &PgPool,
    user_id: Uuid,
    account_id: Uuid,
) -> Result<(), ApiError> {
    let account = get_account_row(pool, user_id, account_id).await?;

    ensure_multiple_accounts(count_accounts(pool, user_id).await?)?;

    if account.r#type == AccountType::Cash {
        ensure_multiple_cash_accounts(count_cash_accounts(pool, user_id).await?)?;
    }

    if account_has_dependencies(pool, user_id, account_id).await? {
        return Err(ApiError::bad_request(
            "Accounts with activity cannot be deleted",
        ));
    }

    sqlx::query("DELETE FROM accounts WHERE id = $1 AND user_id = $2")
        .bind(account_id)
        .bind(user_id)
        .execute(pool)
        .await?;

    Ok(())
}

pub async fn ensure_account_ownership(
    pool: &PgPool,
    user_id: Uuid,
    account_id: Uuid,
) -> Result<AccountRecord, ApiError> {
    get_account_row(pool, user_id, account_id).await
}
