use chrono::{DateTime, NaiveDate, Utc};
use rocket::form::FromFormField;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Type};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::models::transaction::TransactionType;

#[derive(
    Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type, FromFormField, ToSchema,
)]
#[serde(rename_all = "lowercase")]
#[sqlx(type_name = "recurring_frequency", rename_all = "lowercase")]
pub enum RecurringFrequency {
    /// Run once per day.
    #[field(value = "daily")]
    Daily,
    /// Run once every seven days.
    #[field(value = "weekly")]
    Weekly,
    /// Run once per calendar month.
    #[field(value = "monthly")]
    Monthly,
}

#[derive(Debug, Clone, FromRow)]
pub struct RecurringTransactionRecord {
    pub id: Uuid,
    pub user_id: Uuid,
    pub account_id: Uuid,
    pub amount: Decimal,
    pub r#type: TransactionType,
    pub category: String,
    pub note: Option<String>,
    pub frequency: RecurringFrequency,
    pub next_run_date: NaiveDate,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow)]
pub struct RecurringTransactionRow {
    pub id: Uuid,
    pub account_id: Uuid,
    pub amount: Decimal,
    pub r#type: TransactionType,
    pub category: String,
    pub note: Option<String>,
    pub frequency: RecurringFrequency,
    pub next_run_date: NaiveDate,
    pub created_at: DateTime<Utc>,
    pub account_name: String,
    pub account_currency: String,
}
