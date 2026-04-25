use std::time::Duration;

use chrono::{Months, NaiveDate, Utc};
use rust_decimal::Decimal;
use sqlx::{PgPool, Postgres, Transaction as DbTransaction};
use uuid::Uuid;

use crate::{
    config::AppState,
    errors::ApiError,
    models::{
        recurring::{RecurringFrequency, RecurringTransactionRecord, RecurringTransactionRow},
        transaction::TransactionType,
    },
    schema::recurring::{
        CreateRecurringTransactionRequest, RecurringTransactionResponse,
        UpdateRecurringTransactionRequest,
    },
    services::{
        accounts::ensure_account_ownership, ensure_positive_amount, normalize_optional_text,
        normalize_required_text,
    },
};

const RECURRING_TRANSFER_ERROR: &str = "Recurring transfers are not supported";

struct RecurringWriteInput {
    account_id: Uuid,
    account_name: String,
    amount: Decimal,
    transaction_type: TransactionType,
    category: String,
    note: Option<String>,
    frequency: RecurringFrequency,
    next_run_date: NaiveDate,
}

fn advance_date(date: NaiveDate, frequency: RecurringFrequency) -> Result<NaiveDate, ApiError> {
    match frequency {
        RecurringFrequency::Daily => date
            .succ_opt()
            .ok_or_else(|| ApiError::bad_request("Invalid daily recurrence date")),
        RecurringFrequency::Weekly => date
            .checked_add_days(chrono::Days::new(7))
            .ok_or_else(|| ApiError::bad_request("Invalid weekly recurrence date")),
        RecurringFrequency::Monthly => date
            .checked_add_months(Months::new(1))
            .ok_or_else(|| ApiError::bad_request("Invalid monthly recurrence date")),
    }
}

fn ensure_supported_recurring_type(transaction_type: TransactionType) -> Result<(), ApiError> {
    if transaction_type == TransactionType::Transfer {
        return Err(ApiError::bad_request(RECURRING_TRANSFER_ERROR));
    }

    Ok(())
}

fn map_recurring_record(
    record: RecurringTransactionRecord,
    account_name: String,
) -> RecurringTransactionResponse {
    RecurringTransactionResponse {
        id: record.id,
        account_id: record.account_id,
        account_name,
        amount: record.amount,
        r#type: record.r#type,
        category: record.category,
        note: record.note,
        frequency: record.frequency,
        next_run_date: record.next_run_date,
        created_at: record.created_at,
    }
}

fn map_recurring_row(row: RecurringTransactionRow) -> RecurringTransactionResponse {
    RecurringTransactionResponse {
        id: row.id,
        account_id: row.account_id,
        account_name: row.account_name,
        amount: row.amount,
        r#type: row.r#type,
        category: row.category,
        note: row.note,
        frequency: row.frequency,
        next_run_date: row.next_run_date,
        created_at: row.created_at,
    }
}

async fn get_recurring(
    pool: &PgPool,
    user_id: Uuid,
    recurring_id: Uuid,
) -> Result<RecurringTransactionRecord, ApiError> {
    sqlx::query_as::<_, RecurringTransactionRecord>(
        "SELECT
            id,
            user_id,
            account_id,
            amount,
            type,
            category,
            note,
            frequency,
            next_run_date,
            created_at
         FROM recurring_transactions
         WHERE id = $1 AND user_id = $2",
    )
    .bind(recurring_id)
    .bind(user_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| ApiError::not_found("Recurring transaction not found"))
}

async fn build_recurring_write_input(
    pool: &PgPool,
    user_id: Uuid,
    account_id: Uuid,
    amount: Decimal,
    transaction_type: TransactionType,
    category: &str,
    note: &Option<String>,
    frequency: RecurringFrequency,
    next_run_date: NaiveDate,
) -> Result<RecurringWriteInput, ApiError> {
    ensure_supported_recurring_type(transaction_type)?;
    ensure_positive_amount(amount, "Amount")?;

    let account = ensure_account_ownership(pool, user_id, account_id).await?;

    Ok(RecurringWriteInput {
        account_id: account.id,
        account_name: account.name,
        amount,
        transaction_type,
        category: normalize_required_text(category, "Category")?,
        note: normalize_optional_text(note),
        frequency,
        next_run_date,
    })
}

async fn insert_materialized_transaction(
    transaction: &mut DbTransaction<'_, Postgres>,
    recurring: &RecurringTransactionRecord,
    run_date: NaiveDate,
) -> Result<(), ApiError> {
    sqlx::query(
        "INSERT INTO transactions (user_id, account_id, amount, type, category, note, date)
         VALUES ($1, $2, $3, $4, $5, $6, $7)",
    )
    .bind(recurring.user_id)
    .bind(recurring.account_id)
    .bind(recurring.amount)
    .bind(recurring.r#type)
    .bind(&recurring.category)
    .bind(&recurring.note)
    .bind(run_date)
    .execute(&mut **transaction)
    .await?;

    Ok(())
}

async fn update_next_run_date(
    transaction: &mut DbTransaction<'_, Postgres>,
    recurring_id: Uuid,
    next_run_date: NaiveDate,
) -> Result<(), ApiError> {
    sqlx::query(
        "UPDATE recurring_transactions
         SET next_run_date = $1
         WHERE id = $2",
    )
    .bind(next_run_date)
    .bind(recurring_id)
    .execute(&mut **transaction)
    .await?;

    Ok(())
}

async fn materialize_due_occurrences(
    transaction: &mut DbTransaction<'_, Postgres>,
    recurring: &RecurringTransactionRecord,
    today: NaiveDate,
) -> Result<NaiveDate, ApiError> {
    let mut next_run_date = recurring.next_run_date;

    while next_run_date <= today {
        insert_materialized_transaction(transaction, recurring, next_run_date).await?;
        next_run_date = advance_date(next_run_date, recurring.frequency)?;
    }

    Ok(next_run_date)
}

pub async fn list_recurring_transactions(
    pool: &PgPool,
    user_id: Uuid,
) -> Result<Vec<RecurringTransactionResponse>, ApiError> {
    let rows = sqlx::query_as::<_, RecurringTransactionRow>(
        "SELECT
            rt.id,
            rt.account_id,
            rt.amount,
            rt.type,
            rt.category,
            rt.note,
            rt.frequency,
            rt.next_run_date,
            rt.created_at,
            a.name AS account_name
         FROM recurring_transactions rt
         INNER JOIN accounts a ON a.id = rt.account_id
         WHERE rt.user_id = $1
         ORDER BY rt.next_run_date ASC, rt.created_at ASC",
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;

    Ok(rows.into_iter().map(map_recurring_row).collect())
}

pub async fn create_recurring_transaction(
    pool: &PgPool,
    user_id: Uuid,
    payload: CreateRecurringTransactionRequest,
) -> Result<RecurringTransactionResponse, ApiError> {
    let input = build_recurring_write_input(
        pool,
        user_id,
        payload.account_id,
        payload.amount,
        payload.r#type,
        &payload.category,
        &payload.note,
        payload.frequency,
        payload.next_run_date,
    )
    .await?;

    let record = sqlx::query_as::<_, RecurringTransactionRecord>(
        "INSERT INTO recurring_transactions
           (user_id, account_id, amount, type, category, note, frequency, next_run_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING
           id,
           user_id,
           account_id,
           amount,
           type,
           category,
           note,
           frequency,
           next_run_date,
           created_at",
    )
    .bind(user_id)
    .bind(input.account_id)
    .bind(input.amount)
    .bind(input.transaction_type)
    .bind(input.category)
    .bind(input.note)
    .bind(input.frequency)
    .bind(input.next_run_date)
    .fetch_one(pool)
    .await?;

    Ok(map_recurring_record(record, input.account_name))
}

pub async fn update_recurring_transaction(
    pool: &PgPool,
    user_id: Uuid,
    recurring_id: Uuid,
    payload: UpdateRecurringTransactionRequest,
) -> Result<RecurringTransactionResponse, ApiError> {
    get_recurring(pool, user_id, recurring_id).await?;

    let input = build_recurring_write_input(
        pool,
        user_id,
        payload.account_id,
        payload.amount,
        payload.r#type,
        &payload.category,
        &payload.note,
        payload.frequency,
        payload.next_run_date,
    )
    .await?;

    sqlx::query(
        "UPDATE recurring_transactions
         SET account_id = $1,
             amount = $2,
             type = $3,
             category = $4,
             note = $5,
             frequency = $6,
             next_run_date = $7
         WHERE id = $8 AND user_id = $9",
    )
    .bind(input.account_id)
    .bind(input.amount)
    .bind(input.transaction_type)
    .bind(input.category)
    .bind(input.note)
    .bind(input.frequency)
    .bind(input.next_run_date)
    .bind(recurring_id)
    .bind(user_id)
    .execute(pool)
    .await?;

    let record = get_recurring(pool, user_id, recurring_id).await?;
    Ok(map_recurring_record(record, input.account_name))
}

pub async fn delete_recurring_transaction(
    pool: &PgPool,
    user_id: Uuid,
    recurring_id: Uuid,
) -> Result<(), ApiError> {
    let result = sqlx::query("DELETE FROM recurring_transactions WHERE id = $1 AND user_id = $2")
        .bind(recurring_id)
        .bind(user_id)
        .execute(pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(ApiError::not_found("Recurring transaction not found"));
    }

    Ok(())
}

pub async fn run_worker(state: AppState) {
    let interval = Duration::from_secs(state.worker.interval_seconds.max(15));

    loop {
        if let Err(error) = process_due_transactions(&state.pool).await {
            eprintln!("recurring worker failed: {error:?}");
        }

        tokio::time::sleep(interval).await;
    }
}

pub async fn process_due_transactions(pool: &PgPool) -> Result<(), ApiError> {
    let mut transaction = pool.begin().await?;
    let today = Utc::now().date_naive();

    let rows = sqlx::query_as::<_, RecurringTransactionRecord>(
        "SELECT
            id,
            user_id,
            account_id,
            amount,
            type,
            category,
            note,
            frequency,
            next_run_date,
            created_at
         FROM recurring_transactions
         WHERE next_run_date <= CURRENT_DATE
         ORDER BY next_run_date ASC
         FOR UPDATE SKIP LOCKED",
    )
    .fetch_all(&mut *transaction)
    .await?;

    for recurring in rows {
        let next_run_date = materialize_due_occurrences(&mut transaction, &recurring, today).await?;
        update_next_run_date(&mut transaction, recurring.id, next_run_date).await?;
    }

    transaction.commit().await?;

    Ok(())
}
