use rust_decimal::Decimal;
use sqlx::{PgPool, Postgres, QueryBuilder};
use uuid::Uuid;

use crate::{
    errors::ApiError,
    models::{
        account::AccountRecord,
        transaction::{
            CategorySummaryRow, MonthlySummaryRow, TransactionRecord, TransactionRow,
            TransactionType,
        },
    },
    schema::transaction::{
        CategorySummaryItem, CategorySummaryQuery, CategorySummaryResponse,
        CreateTransactionRequest, MonthlySummaryResponse, TransactionFilters, TransactionResponse,
        UpdateTransactionRequest,
    },
    services::{
        accounts::ensure_account_ownership, ensure_positive_amount, month_bounds,
        normalize_optional_text, normalize_required_text, parse_optional_date,
    },
};

fn map_transaction(row: TransactionRow) -> TransactionResponse {
    TransactionResponse {
        id: row.id,
        account_id: row.account_id,
        account_name: row.account_name,
        amount: row.amount,
        r#type: row.r#type,
        display_type: if row.transfer_id.is_some() {
            TransactionType::Transfer
        } else {
            row.r#type
        },
        category: row.category,
        note: row.note,
        date: row.date,
        created_at: row.created_at,
        transfer_id: row.transfer_id,
    }
}

pub async fn resolve_account_or_default_cash(
    pool: &PgPool,
    user_id: Uuid,
    account_id: Option<Uuid>,
) -> Result<AccountRecord, ApiError> {
    match account_id {
        Some(account_id) => ensure_account_ownership(pool, user_id, account_id).await,
        None => sqlx::query_as::<_, AccountRecord>(
            "SELECT id, name, type, currency, created_at
             FROM accounts
             WHERE user_id = $1 AND type = 'cash'
             ORDER BY created_at ASC
             LIMIT 1",
        )
        .bind(user_id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| ApiError::bad_request("A cash account is required")),
    }
}

async fn find_transaction(
    pool: &PgPool,
    user_id: Uuid,
    transaction_id: Uuid,
) -> Result<TransactionRecord, ApiError> {
    sqlx::query_as::<_, TransactionRecord>(
        "SELECT transfer_id
         FROM transactions
         WHERE id = $1 AND user_id = $2",
    )
    .bind(transaction_id)
    .bind(user_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| ApiError::not_found("Transaction not found"))
}

pub async fn list_transactions(
    pool: &PgPool,
    user_id: Uuid,
    filters: TransactionFilters,
) -> Result<Vec<TransactionResponse>, ApiError> {
    let mut builder = QueryBuilder::<Postgres>::new(
        "SELECT
            t.id,
            t.account_id,
            t.transfer_id,
            t.amount,
            t.type,
            t.category,
            t.note,
            t.date,
            t.created_at,
            a.name AS account_name
         FROM transactions t
         LEFT JOIN accounts a ON a.id = t.account_id
         WHERE t.user_id = ",
    );

    builder.push_bind(user_id);

    if let Some(transaction_type) = filters.r#type {
        match transaction_type {
            TransactionType::Transfer => {
                builder.push(" AND t.transfer_id IS NOT NULL");
            }
            TransactionType::Income | TransactionType::Expense => {
                builder.push(" AND t.transfer_id IS NULL AND t.type = ");
                builder.push_bind(transaction_type);
            }
        }
    }

    if let Some(category) = filters.category {
        builder.push(" AND t.category ILIKE ");
        builder.push_bind(format!("%{}%", category.trim()));
    }

    if let Some(account_id) = filters.account_id {
        builder.push(" AND t.account_id = ");
        builder.push_bind(account_id);
    }

    if let Some(start_date) = parse_optional_date(filters.start_date, "start date")? {
        builder.push(" AND t.date >= ");
        builder.push_bind(start_date);
    }

    if let Some(end_date) = parse_optional_date(filters.end_date, "end date")? {
        builder.push(" AND t.date <= ");
        builder.push_bind(end_date);
    }

    builder.push(" ORDER BY t.date DESC, t.created_at DESC");

    let rows = builder
        .build_query_as::<TransactionRow>()
        .fetch_all(pool)
        .await?;

    Ok(rows.into_iter().map(map_transaction).collect())
}

pub async fn get_transaction(
    pool: &PgPool,
    user_id: Uuid,
    transaction_id: Uuid,
) -> Result<TransactionResponse, ApiError> {
    let row = sqlx::query_as::<_, TransactionRow>(
        "SELECT
            t.id,
            t.account_id,
            t.transfer_id,
            t.amount,
            t.type,
            t.category,
            t.note,
            t.date,
            t.created_at,
            a.name AS account_name
         FROM transactions t
         LEFT JOIN accounts a ON a.id = t.account_id
         WHERE t.user_id = $1 AND t.id = $2",
    )
    .bind(user_id)
    .bind(transaction_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| ApiError::not_found("Transaction not found"))?;

    Ok(map_transaction(row))
}

pub async fn create_transaction(
    pool: &PgPool,
    user_id: Uuid,
    payload: CreateTransactionRequest,
) -> Result<TransactionResponse, ApiError> {
    if payload.r#type == TransactionType::Transfer {
        return Err(ApiError::bad_request(
            "Use the transfers endpoint to create transfers",
        ));
    }

    ensure_positive_amount(payload.amount, "Amount")?;
    let category = normalize_required_text(&payload.category, "Category")?;
    let note = normalize_optional_text(&payload.note);
    let account = resolve_account_or_default_cash(pool, user_id, payload.account_id).await?;

    let created = sqlx::query_as::<_, TransactionRow>(
        "INSERT INTO transactions (user_id, account_id, amount, type, category, note, date)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING
           id,
           account_id,
           transfer_id,
           amount,
           type,
           category,
           note,
           date,
           created_at,
           $8::text AS account_name",
    )
    .bind(user_id)
    .bind(account.id)
    .bind(payload.amount)
    .bind(payload.r#type)
    .bind(category)
    .bind(note)
    .bind(payload.date)
    .bind(account.name)
    .fetch_one(pool)
    .await?;

    Ok(map_transaction(created))
}

pub async fn update_transaction(
    pool: &PgPool,
    user_id: Uuid,
    transaction_id: Uuid,
    payload: UpdateTransactionRequest,
) -> Result<TransactionResponse, ApiError> {
    let existing = find_transaction(pool, user_id, transaction_id).await?;

    if existing.transfer_id.is_some() {
        return Err(ApiError::bad_request(
            "Transfer entries must be managed through the transfers endpoint",
        ));
    }

    if payload.r#type == TransactionType::Transfer {
        return Err(ApiError::bad_request(
            "Use the transfers endpoint to create transfers",
        ));
    }

    ensure_positive_amount(payload.amount, "Amount")?;
    let category = normalize_required_text(&payload.category, "Category")?;
    let note = normalize_optional_text(&payload.note);
    let account = resolve_account_or_default_cash(pool, user_id, payload.account_id).await?;

    sqlx::query(
        "UPDATE transactions
         SET account_id = $1, amount = $2, type = $3, category = $4, note = $5, date = $6
         WHERE id = $7 AND user_id = $8",
    )
    .bind(account.id)
    .bind(payload.amount)
    .bind(payload.r#type)
    .bind(category)
    .bind(note)
    .bind(payload.date)
    .bind(transaction_id)
    .bind(user_id)
    .execute(pool)
    .await?;

    get_transaction(pool, user_id, transaction_id).await
}

pub async fn delete_transaction(
    pool: &PgPool,
    user_id: Uuid,
    transaction_id: Uuid,
) -> Result<(), ApiError> {
    let existing = find_transaction(pool, user_id, transaction_id).await?;

    if existing.transfer_id.is_some() {
        return Err(ApiError::bad_request(
            "Transfer entries must be removed through the transfers endpoint",
        ));
    }

    sqlx::query("DELETE FROM transactions WHERE id = $1 AND user_id = $2")
        .bind(transaction_id)
        .bind(user_id)
        .execute(pool)
        .await?;

    Ok(())
}

pub async fn monthly_summary(
    pool: &PgPool,
    user_id: Uuid,
    month: Option<String>,
) -> Result<MonthlySummaryResponse, ApiError> {
    let (month_start, next_month) = month_bounds(parse_optional_date(month, "month")?)?;

    let row = sqlx::query_as::<_, MonthlySummaryRow>(
        "SELECT
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0::numeric) AS income_total,
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0::numeric) AS expense_total
         FROM transactions
         WHERE user_id = $1
           AND transfer_id IS NULL
           AND date >= $2
           AND date < $3",
    )
    .bind(user_id)
    .bind(month_start)
    .bind(next_month)
    .fetch_one(pool)
    .await?;

    Ok(MonthlySummaryResponse {
        month: month_start,
        income_total: row.income_total,
        expense_total: row.expense_total,
        net_total: row.income_total - row.expense_total,
    })
}

pub async fn category_summary(
    pool: &PgPool,
    user_id: Uuid,
    query: CategorySummaryQuery,
) -> Result<CategorySummaryResponse, ApiError> {
    let summary_type = query.r#type.unwrap_or(TransactionType::Expense);

    if summary_type == TransactionType::Transfer {
        return Err(ApiError::bad_request(
            "Category summaries support income or expense only",
        ));
    }

    let (month_start, next_month) = month_bounds(parse_optional_date(query.month, "month")?)?;

    let rows = sqlx::query_as::<_, CategorySummaryRow>(
        "SELECT
            category,
            SUM(amount) AS total
         FROM transactions
         WHERE user_id = $1
           AND transfer_id IS NULL
           AND type = $2
           AND date >= $3
           AND date < $4
         GROUP BY category
         ORDER BY total DESC, category ASC",
    )
    .bind(user_id)
    .bind(summary_type)
    .bind(month_start)
    .bind(next_month)
    .fetch_all(pool)
    .await?;

    let grand_total = rows
        .iter()
        .fold(Decimal::ZERO, |acc, item| acc + item.total);

    let items = rows
        .into_iter()
        .map(|row| CategorySummaryItem {
            category: row.category,
            total: row.total,
            percentage: if grand_total.is_zero() {
                0.0
            } else {
                ((row.total / grand_total) * Decimal::from(100))
                    .round_dp(2)
                    .to_string()
                    .parse()
                    .unwrap_or(0.0)
            },
        })
        .collect();

    Ok(CategorySummaryResponse {
        month: month_start,
        r#type: summary_type,
        items,
    })
}
