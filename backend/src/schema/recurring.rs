use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::{models::recurring::RecurringFrequency, models::transaction::TransactionType};

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateRecurringTransactionRequest {
    /// Account that will receive the generated transaction.
    pub account_id: Uuid,
    /// Positive amount in the account currency.
    pub amount: Decimal,
    /// Recurring transaction kind. `transfer` is not supported.
    pub r#type: TransactionType,
    /// Category label.
    pub category: String,
    /// Optional free-form note.
    pub note: Option<String>,
    /// Recurrence cadence.
    pub frequency: RecurringFrequency,
    /// Next execution date in `YYYY-MM-DD` format.
    pub next_run_date: NaiveDate,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateRecurringTransactionRequest {
    /// Account that will receive the generated transaction.
    pub account_id: Uuid,
    /// Positive amount in the account currency.
    pub amount: Decimal,
    /// Recurring transaction kind. `transfer` is not supported.
    pub r#type: TransactionType,
    /// Category label.
    pub category: String,
    /// Optional free-form note.
    pub note: Option<String>,
    /// Recurrence cadence.
    pub frequency: RecurringFrequency,
    /// Next execution date in `YYYY-MM-DD` format.
    pub next_run_date: NaiveDate,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct RecurringTransactionResponse {
    /// Stable unique identifier for the recurring rule.
    pub id: Uuid,
    /// Account that will receive the generated transaction.
    pub account_id: Uuid,
    /// Account display name at read time.
    pub account_name: String,
    /// Account currency at read time.
    pub account_currency: String,
    /// Positive amount in the account currency.
    pub amount: Decimal,
    /// Recurring transaction kind.
    pub r#type: TransactionType,
    /// Category label.
    pub category: String,
    /// Optional free-form note.
    pub note: Option<String>,
    /// Recurrence cadence.
    pub frequency: RecurringFrequency,
    /// Next execution date in `YYYY-MM-DD` format.
    pub next_run_date: NaiveDate,
    /// Timestamp when the recurring rule was created.
    pub created_at: DateTime<Utc>,
}
