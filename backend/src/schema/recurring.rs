use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
#[allow(unused_imports)]
use serde_json::json;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::{models::recurring::RecurringFrequency, models::transaction::TransactionType};

#[derive(Debug, Deserialize, ToSchema)]
#[schema(example = json!({
    "account_id": "d5dcbe8d-bb41-49c4-939f-9adf5a8c6001",
    "amount": "2500.00",
    "type": "income",
    "category": "Salary",
    "note": "Monthly payroll",
    "frequency": "monthly",
    "next_run_date": "2026-06-01"
}))]
pub struct CreateRecurringTransactionRequest {
    /// Account that will receive the generated transaction.
    #[schema(example = "d5dcbe8d-bb41-49c4-939f-9adf5a8c6001")]
    pub account_id: Uuid,
    /// Positive amount in the account currency.
    #[schema(example = "2500.00")]
    pub amount: Decimal,
    /// Recurring transaction kind. `transfer` is not supported.
    pub r#type: TransactionType,
    /// Category label.
    #[schema(min_length = 1, max_length = 32, example = "Salary")]
    pub category: String,
    /// Optional free-form note.
    #[schema(max_length = 128, example = "Monthly payroll")]
    pub note: Option<String>,
    /// Recurrence cadence.
    pub frequency: RecurringFrequency,
    /// Next execution date in `YYYY-MM-DD` format.
    #[schema(example = "2026-06-01")]
    pub next_run_date: NaiveDate,
}

#[derive(Debug, Deserialize, ToSchema)]
#[schema(example = json!({
    "account_id": "d5dcbe8d-bb41-49c4-939f-9adf5a8c6001",
    "amount": "45.00",
    "type": "expense",
    "category": "Streaming",
    "note": "Monthly subscriptions",
    "frequency": "monthly",
    "next_run_date": "2026-06-05"
}))]
pub struct UpdateRecurringTransactionRequest {
    /// Account that will receive the generated transaction.
    #[schema(example = "d5dcbe8d-bb41-49c4-939f-9adf5a8c6001")]
    pub account_id: Uuid,
    /// Positive amount in the account currency.
    #[schema(example = "45.00")]
    pub amount: Decimal,
    /// Recurring transaction kind. `transfer` is not supported.
    pub r#type: TransactionType,
    /// Category label.
    #[schema(min_length = 1, max_length = 32, example = "Streaming")]
    pub category: String,
    /// Optional free-form note.
    #[schema(max_length = 128, example = "Monthly subscriptions")]
    pub note: Option<String>,
    /// Recurrence cadence.
    pub frequency: RecurringFrequency,
    /// Next execution date in `YYYY-MM-DD` format.
    #[schema(example = "2026-06-05")]
    pub next_run_date: NaiveDate,
}

#[derive(Debug, Serialize, ToSchema)]
#[schema(example = json!({
    "id": "8d61d276-1a7c-4af7-8fb4-27dbf9d39001",
    "account_id": "d5dcbe8d-bb41-49c4-939f-9adf5a8c6001",
    "account_name": "Primary checking",
    "account_currency": "USD",
    "amount": "2500.00",
    "type": "income",
    "category": "Salary",
    "note": "Monthly payroll",
    "frequency": "monthly",
    "next_run_date": "2026-06-01",
    "created_at": "2026-05-01T12:30:00Z"
}))]
pub struct RecurringTransactionResponse {
    /// Stable unique identifier for the recurring rule.
    #[schema(example = "8d61d276-1a7c-4af7-8fb4-27dbf9d39001")]
    pub id: Uuid,
    /// Account that will receive the generated transaction.
    #[schema(example = "d5dcbe8d-bb41-49c4-939f-9adf5a8c6001")]
    pub account_id: Uuid,
    /// Account display name at read time.
    #[schema(example = "Primary checking")]
    pub account_name: String,
    /// Account currency at read time.
    #[schema(pattern = "^[A-Za-z]{3}$", example = "USD")]
    pub account_currency: String,
    /// Positive amount in the account currency.
    #[schema(example = "2500.00")]
    pub amount: Decimal,
    /// Recurring transaction kind.
    pub r#type: TransactionType,
    /// Category label.
    #[schema(example = "Salary")]
    pub category: String,
    /// Optional free-form note.
    #[schema(example = "Monthly payroll")]
    pub note: Option<String>,
    /// Recurrence cadence.
    pub frequency: RecurringFrequency,
    /// Next execution date in `YYYY-MM-DD` format.
    #[schema(example = "2026-06-01")]
    pub next_run_date: NaiveDate,
    /// Timestamp when the recurring rule was created.
    #[schema(example = "2026-05-01T12:30:00Z")]
    pub created_at: DateTime<Utc>,
}
