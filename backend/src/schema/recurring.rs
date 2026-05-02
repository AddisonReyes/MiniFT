use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{models::recurring::RecurringFrequency, models::transaction::TransactionType};

#[derive(Debug, Deserialize)]
pub struct CreateRecurringTransactionRequest {
    pub account_id: Uuid,
    pub amount: Decimal,
    pub r#type: TransactionType,
    pub category: String,
    pub note: Option<String>,
    pub frequency: RecurringFrequency,
    pub next_run_date: NaiveDate,
}

#[derive(Debug, Deserialize)]
pub struct UpdateRecurringTransactionRequest {
    pub account_id: Uuid,
    pub amount: Decimal,
    pub r#type: TransactionType,
    pub category: String,
    pub note: Option<String>,
    pub frequency: RecurringFrequency,
    pub next_run_date: NaiveDate,
}

#[derive(Debug, Serialize)]
pub struct RecurringTransactionResponse {
    pub id: Uuid,
    pub account_id: Uuid,
    pub account_name: String,
    pub account_currency: String,
    pub amount: Decimal,
    pub r#type: TransactionType,
    pub category: String,
    pub note: Option<String>,
    pub frequency: RecurringFrequency,
    pub next_run_date: NaiveDate,
    pub created_at: DateTime<Utc>,
}
