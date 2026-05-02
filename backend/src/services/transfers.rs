use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    errors::ApiError,
    models::account::AccountRecord,
    models::{
        transaction::TransactionType,
        transfer::{TransferRecord, TransferRow},
    },
    schema::transfer::{CreateTransferRequest, TransferResponse},
    services::{ensure_positive_amount, normalize_optional_text},
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

async fn get_transfer_accounts(
    pool: &PgPool,
    user_id: Uuid,
    from_account_id: Uuid,
    to_account_id: Uuid,
) -> Result<(AccountRecord, AccountRecord), ApiError> {
    let rows = sqlx::query_as::<_, AccountRecord>(
        "SELECT id, name, type, currency, created_at
         FROM accounts
         WHERE user_id = $1
           AND (id = $2 OR id = $3)",
    )
    .bind(user_id)
    .bind(from_account_id)
    .bind(to_account_id)
    .fetch_all(pool)
    .await?;

    if rows.len() != 2 {
        return Err(ApiError::not_found("One or both accounts not found"));
    }

    let from_account = rows
        .iter()
        .find(|account| account.id == from_account_id)
        .cloned()
        .ok_or_else(|| ApiError::not_found("Source account not found"))?;
    let to_account = rows
        .iter()
        .find(|account| account.id == to_account_id)
        .cloned()
        .ok_or_else(|| ApiError::not_found("Destination account not found"))?;

    Ok((from_account, to_account))
}

fn build_transfer_note(note: &Option<String>, fallback_label: &str, account_name: &str) -> String {
    note.clone()
        .unwrap_or_else(|| format!("{fallback_label} {account_name}"))
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

    let (from_account, to_account) = get_transfer_accounts(
        pool,
        user_id,
        payload.from_account_id,
        payload.to_account_id,
    )
    .await?;
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
    .bind(build_transfer_note(&note, "Transfer to", &to_account.name))
    .bind(payload.date)
    .bind(to_account.id)
    .bind(TransactionType::Income)
    .bind(build_transfer_note(&note, "Transfer from", &from_account.name))
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

#[cfg(test)]
mod tests {
    use super::build_transfer_note;

    #[test]
    fn reuses_custom_transfer_note_when_present() {
        let note = Some("Manual transfer memo".to_string());

        assert_eq!(
            build_transfer_note(&note, "Transfer to", "Savings"),
            "Manual transfer memo"
        );
    }

    #[test]
    fn builds_fallback_transfer_note_from_label_and_account_name() {
        let note = None;

        assert_eq!(
            build_transfer_note(&note, "Transfer from", "Checking"),
            "Transfer from Checking"
        );
    }
}
