use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    errors::ApiError,
    models::{
        transaction::TransactionType,
        transfer::{TransferRecord, TransferRow},
    },
    schema::transfer::{CreateTransferRequest, TransferResponse},
    services::{
        accounts::ensure_account_ownership, ensure_positive_amount, normalize_optional_text,
    },
};

fn map_transfer(row: TransferRow) -> TransferResponse {
    TransferResponse {
        id: row.id,
        from_account_id: row.from_account_id,
        to_account_id: row.to_account_id,
        from_account_name: row.from_account_name,
        to_account_name: row.to_account_name,
        amount: row.amount,
        date: row.date,
        note: row.note,
        created_at: row.created_at,
    }
}

pub async fn list_transfers(
    pool: &PgPool,
    user_id: Uuid,
) -> Result<Vec<TransferResponse>, ApiError> {
    let rows = sqlx::query_as::<_, TransferRow>(
        "SELECT
            tr.id,
            tr.from_account_id,
            tr.to_account_id,
            tr.amount,
            tr.date,
            tr.note,
            tr.created_at,
            from_account.name AS from_account_name,
            to_account.name AS to_account_name
         FROM transfers tr
         INNER JOIN accounts from_account ON from_account.id = tr.from_account_id
         INNER JOIN accounts to_account ON to_account.id = tr.to_account_id
         WHERE tr.user_id = $1
         ORDER BY tr.date DESC, tr.created_at DESC",
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;

    Ok(rows.into_iter().map(map_transfer).collect())
}

pub async fn create_transfer(
    pool: &PgPool,
    user_id: Uuid,
    payload: CreateTransferRequest,
) -> Result<TransferResponse, ApiError> {
    if payload.from_account_id == payload.to_account_id {
        return Err(ApiError::bad_request("Transfer accounts must be different"));
    }

    ensure_positive_amount(payload.amount, "Amount")?;

    let from_account = ensure_account_ownership(pool, user_id, payload.from_account_id).await?;
    let to_account = ensure_account_ownership(pool, user_id, payload.to_account_id).await?;
    let note = normalize_optional_text(&payload.note);

    let mut transaction = pool.begin().await?;

    let transfer = sqlx::query_as::<_, TransferRecord>(
        "INSERT INTO transfers (user_id, from_account_id, to_account_id, amount, date, note)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, from_account_id, to_account_id, amount, date, note, created_at",
    )
    .bind(user_id)
    .bind(from_account.id)
    .bind(to_account.id)
    .bind(payload.amount)
    .bind(payload.date)
    .bind(note.clone())
    .fetch_one(&mut *transaction)
    .await?;

    sqlx::query(
        "INSERT INTO transactions (user_id, account_id, transfer_id, amount, type, category, note, date)
         VALUES
         ($1, $2, $3, $4, $5, 'Transfer Out', $6, $7),
         ($1, $8, $3, $4, $9, 'Transfer In', $10, $7)",
    )
    .bind(user_id)
    .bind(from_account.id)
    .bind(transfer.id)
    .bind(payload.amount)
    .bind(TransactionType::Expense)
    .bind(
        note.clone()
            .unwrap_or_else(|| format!("Transfer to {}", to_account.name)),
    )
    .bind(payload.date)
    .bind(to_account.id)
    .bind(TransactionType::Income)
    .bind(
        note.clone()
            .unwrap_or_else(|| format!("Transfer from {}", from_account.name)),
    )
    .execute(&mut *transaction)
    .await?;

    transaction.commit().await?;

    Ok(TransferResponse {
        id: transfer.id,
        from_account_id: transfer.from_account_id,
        to_account_id: transfer.to_account_id,
        from_account_name: from_account.name,
        to_account_name: to_account.name,
        amount: transfer.amount,
        date: transfer.date,
        note: transfer.note,
        created_at: transfer.created_at,
    })
}

pub async fn delete_transfer(
    pool: &PgPool,
    user_id: Uuid,
    transfer_id: Uuid,
) -> Result<(), ApiError> {
    let result = sqlx::query("DELETE FROM transfers WHERE id = $1 AND user_id = $2")
        .bind(transfer_id)
        .bind(user_id)
        .execute(pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(ApiError::not_found("Transfer not found"));
    }

    Ok(())
}
