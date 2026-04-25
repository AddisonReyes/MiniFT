use chrono::{DateTime, NaiveDate, Utc};
use rocket::form::FromFormField;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Type};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type, FromFormField)]
#[serde(rename_all = "lowercase")]
#[sqlx(type_name = "transaction_type", rename_all = "lowercase")]
pub enum TransactionType {
    #[field(value = "income")]
    Income,
    #[field(value = "expense")]
    Expense,
    #[field(value = "transfer")]
    Transfer,
}

#[derive(Debug, Clone, FromRow)]
pub struct TransactionRecord {
    pub id: Uuid,
    pub user_id: Uuid,
    pub account_id: Option<Uuid>,
    pub transfer_id: Option<Uuid>,
    pub amount: Decimal,
    pub r#type: TransactionType,
    pub category: String,
    pub note: Option<String>,
    pub date: NaiveDate,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow)]
pub struct TransactionRow {
    pub id: Uuid,
    pub account_id: Option<Uuid>,
    pub transfer_id: Option<Uuid>,
    pub amount: Decimal,
    pub r#type: TransactionType,
    pub category: String,
    pub note: Option<String>,
    pub date: NaiveDate,
    pub created_at: DateTime<Utc>,
    pub account_name: Option<String>,
}

#[derive(Debug, Clone, FromRow)]
pub struct MonthlySummaryRow {
    pub income_total: Decimal,
    pub expense_total: Decimal,
}

#[derive(Debug, Clone, FromRow)]
pub struct CategorySummaryRow {
    pub category: String,
    pub total: Decimal,
}
