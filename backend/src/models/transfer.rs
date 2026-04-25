use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow)]
pub struct TransferRecord {
    pub id: Uuid,
    pub from_account_id: Uuid,
    pub to_account_id: Uuid,
    pub amount: Decimal,
    pub date: NaiveDate,
    pub note: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow)]
pub struct TransferRow {
    pub id: Uuid,
    pub from_account_id: Uuid,
    pub to_account_id: Uuid,
    pub amount: Decimal,
    pub date: NaiveDate,
    pub note: Option<String>,
    pub created_at: DateTime<Utc>,
    pub from_account_name: String,
    pub to_account_name: String,
}
