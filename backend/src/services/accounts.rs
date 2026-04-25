use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    errors::ApiError,
    models::account::{AccountBalanceRow, AccountRecord, AccountType},
    schema::account::{AccountResponse, CreateAccountRequest, UpdateAccountRequest},
    services::normalize_required_text,
};

fn map_account(row: AccountBalanceRow) -> AccountResponse {
    AccountResponse {
        id: row.id,
        name: row.name,
        r#type: row.r#type,
        created_at: row.created_at,
        balance: row.balance,
    }
}

async fn get_account_row(
    pool: &PgPool,
    user_id: Uuid,
    account_id: Uuid,
) -> Result<AccountRecord, ApiError> {
    sqlx::query_as::<_, AccountRecord>(
        "SELECT id, user_id, name, type, created_at
         FROM accounts
         WHERE id = $1 AND user_id = $2",
    )
    .bind(account_id)
    .bind(user_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| ApiError::not_found("Account not found"))
}

pub async fn list_accounts(pool: &PgPool, user_id: Uuid) -> Result<Vec<AccountResponse>, ApiError> {
    let rows = sqlx::query_as::<_, AccountBalanceRow>(
        "SELECT
            a.id,
            a.name,
            a.type,
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
         GROUP BY a.id, a.name, a.type, a.created_at
         ORDER BY CASE WHEN a.type = 'cash' THEN 0 ELSE 1 END, a.created_at ASC",
    )
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
    let row = sqlx::query_as::<_, AccountBalanceRow>(
        "SELECT
            a.id,
            a.name,
            a.type,
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
         GROUP BY a.id, a.name, a.type, a.created_at",
    )
    .bind(user_id)
    .bind(account_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| ApiError::not_found("Account not found"))?;

    Ok(map_account(row))
}

pub async fn create_account(
    pool: &PgPool,
    user_id: Uuid,
    payload: CreateAccountRequest,
) -> Result<AccountResponse, ApiError> {
    let name = normalize_required_text(&payload.name, "Account name")?;

    let account = sqlx::query_as::<_, AccountRecord>(
        "INSERT INTO accounts (user_id, name, type)
         VALUES ($1, $2, $3)
         RETURNING id, user_id, name, type, created_at",
    )
    .bind(user_id)
    .bind(name)
    .bind(payload.r#type)
    .fetch_one(pool)
    .await?;

    Ok(AccountResponse {
        id: account.id,
        name: account.name,
        r#type: account.r#type,
        created_at: account.created_at,
        balance: rust_decimal::Decimal::ZERO,
    })
}

pub async fn update_account(
    pool: &PgPool,
    user_id: Uuid,
    account_id: Uuid,
    payload: UpdateAccountRequest,
) -> Result<AccountResponse, ApiError> {
    let existing = get_account_row(pool, user_id, account_id).await?;
    let name = normalize_required_text(&payload.name, "Account name")?;

    if existing.r#type == AccountType::Cash && payload.r#type != AccountType::Cash {
        let cash_accounts: i64 = sqlx::query_scalar(
            "SELECT COUNT(*)::bigint
             FROM accounts
             WHERE user_id = $1 AND type = 'cash'",
        )
        .bind(user_id)
        .fetch_one(pool)
        .await?;

        if cash_accounts <= 1 {
            return Err(ApiError::bad_request(
                "At least one cash account must remain available",
            ));
        }
    }

    sqlx::query(
        "UPDATE accounts
         SET name = $1, type = $2
         WHERE id = $3 AND user_id = $4",
    )
    .bind(name)
    .bind(payload.r#type)
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

    let total_accounts: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)::bigint
         FROM accounts
         WHERE user_id = $1",
    )
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    if total_accounts <= 1 {
        return Err(ApiError::bad_request(
            "At least one account must remain available",
        ));
    }

    if account.r#type == AccountType::Cash {
        let cash_accounts: i64 = sqlx::query_scalar(
            "SELECT COUNT(*)::bigint
             FROM accounts
             WHERE user_id = $1 AND type = 'cash'",
        )
        .bind(user_id)
        .fetch_one(pool)
        .await?;

        if cash_accounts <= 1 {
            return Err(ApiError::bad_request(
                "At least one cash account must remain available",
            ));
        }
    }

    let has_dependencies: bool = sqlx::query_scalar(
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
    .await?;

    if has_dependencies {
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
