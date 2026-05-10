use chrono::{DateTime, NaiveDate, Utc};
use rocket::form::FromForm;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
#[allow(unused_imports)]
use serde_json::json;
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

use crate::models::transaction::TransactionType;

#[derive(Debug, Deserialize, ToSchema)]
#[schema(example = json!({
    "account_id": "d5dcbe8d-bb41-49c4-939f-9adf5a8c6001",
    "amount": "125.50",
    "type": "expense",
    "category": "Groceries",
    "note": "Weekly supermarket run",
    "date": "2026-05-01"
}))]
pub struct CreateTransactionRequest {
    /// Optional account id. When omitted, the first cash account is used.
    #[schema(example = "d5dcbe8d-bb41-49c4-939f-9adf5a8c6001")]
    pub account_id: Option<Uuid>,
    /// Positive amount in the account currency.
    #[schema(example = "125.50")]
    pub amount: Decimal,
    /// Transaction kind. Use the transfers endpoints for transfer creation.
    pub r#type: TransactionType,
    /// Category label.
    #[schema(min_length = 1, max_length = 32, example = "Groceries")]
    pub category: String,
    /// Optional free-form note.
    #[schema(max_length = 128, example = "Weekly supermarket run")]
    pub note: Option<String>,
    /// Booking date in `YYYY-MM-DD` format.
    #[schema(example = "2026-05-01")]
    pub date: NaiveDate,
}

#[derive(Debug, Deserialize, ToSchema)]
#[schema(example = json!({
    "account_id": "d5dcbe8d-bb41-49c4-939f-9adf5a8c6001",
    "amount": "89.99",
    "type": "expense",
    "category": "Utilities",
    "note": "Electricity bill",
    "date": "2026-05-03"
}))]
pub struct UpdateTransactionRequest {
    /// Optional account id. When omitted, the first cash account is used.
    #[schema(example = "d5dcbe8d-bb41-49c4-939f-9adf5a8c6001")]
    pub account_id: Option<Uuid>,
    /// Positive amount in the account currency.
    #[schema(example = "89.99")]
    pub amount: Decimal,
    /// Transaction kind. Use the transfers endpoints for transfer creation.
    pub r#type: TransactionType,
    /// Category label.
    #[schema(min_length = 1, max_length = 32, example = "Utilities")]
    pub category: String,
    /// Optional free-form note.
    #[schema(max_length = 128, example = "Electricity bill")]
    pub note: Option<String>,
    /// Booking date in `YYYY-MM-DD` format.
    #[schema(example = "2026-05-03")]
    pub date: NaiveDate,
}

#[derive(Debug, Clone, Default, FromForm, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct TransactionFilters {
    /// Filter by `income`, `expense`, or `transfer`.
    #[param(example = "expense")]
    pub r#type: Option<TransactionType>,
    /// Case-insensitive partial category match.
    #[param(example = "grocer")]
    pub category: Option<String>,
    /// Only return transactions linked to a specific account.
    #[param(example = "d5dcbe8d-bb41-49c4-939f-9adf5a8c6001")]
    pub account_id: Option<Uuid>,
    /// Inclusive start date in `YYYY-MM-DD` format.
    #[param(
        value_type = String,
        format = Date,
        pattern = "^\\d{4}-\\d{2}-\\d{2}$",
        example = "2026-05-01"
    )]
    pub start_date: Option<String>,
    /// Inclusive end date in `YYYY-MM-DD` format.
    #[param(
        value_type = String,
        format = Date,
        pattern = "^\\d{4}-\\d{2}-\\d{2}$",
        example = "2026-05-31"
    )]
    pub end_date: Option<String>,
    /// Maximum number of transactions to return.
    #[param(example = 20, minimum = 1, maximum = 200)]
    pub limit: Option<u32>,
}

#[derive(Debug, Serialize, ToSchema)]
#[schema(example = json!({
    "id": "4d6bc7f8-2110-49f2-8685-bbf6626f7001",
    "account_id": "d5dcbe8d-bb41-49c4-939f-9adf5a8c6001",
    "account_name": "Primary checking",
    "account_currency": "USD",
    "amount": "125.50",
    "type": "expense",
    "display_type": "expense",
    "category": "Groceries",
    "note": "Weekly supermarket run",
    "date": "2026-05-01",
    "created_at": "2026-05-01T14:05:00Z",
    "transfer_id": null
}))]
pub struct TransactionResponse {
    /// Stable unique identifier for the transaction entry.
    #[schema(example = "4d6bc7f8-2110-49f2-8685-bbf6626f7001")]
    pub id: Uuid,
    /// Owning account id when the entry belongs to an account.
    #[schema(example = "d5dcbe8d-bb41-49c4-939f-9adf5a8c6001")]
    pub account_id: Option<Uuid>,
    /// Account display name at read time.
    #[schema(example = "Primary checking")]
    pub account_name: Option<String>,
    /// Account currency at read time.
    #[schema(pattern = "^[A-Za-z]{3}$", example = "USD")]
    pub account_currency: Option<String>,
    /// Positive transaction amount in the entry currency.
    #[schema(example = "125.50")]
    pub amount: Decimal,
    /// Stored transaction kind.
    pub r#type: TransactionType,
    /// Display transaction kind, including `transfer` for mirrored transfer entries.
    pub display_type: TransactionType,
    /// Category label.
    #[schema(example = "Groceries")]
    pub category: String,
    /// Optional free-form note.
    #[schema(example = "Weekly supermarket run")]
    pub note: Option<String>,
    /// Booking date in `YYYY-MM-DD` format.
    #[schema(example = "2026-05-01")]
    pub date: NaiveDate,
    /// Timestamp when the entry was created.
    #[schema(example = "2026-05-01T14:05:00Z")]
    pub created_at: DateTime<Utc>,
    /// Transfer id when the entry was generated by a transfer.
    #[schema(example = "a7ac0a95-f5e2-45b9-9f07-4717f6c98001")]
    pub transfer_id: Option<Uuid>,
}

#[derive(Debug, Serialize, ToSchema)]
#[schema(example = json!({
    "month": "2026-05-01",
    "income_total": "3200.00",
    "expense_total": "1875.40",
    "net_total": "1324.60"
}))]
pub struct MonthlySummaryResponse {
    /// First day of the summarized month.
    #[schema(example = "2026-05-01")]
    pub month: NaiveDate,
    /// Total income excluding transfer mirrors.
    #[schema(example = "3200.00")]
    pub income_total: Decimal,
    /// Total expense excluding transfer mirrors.
    #[schema(example = "1875.40")]
    pub expense_total: Decimal,
    /// `income_total - expense_total`.
    #[schema(example = "1324.60")]
    pub net_total: Decimal,
}

#[derive(Debug, Clone, Default, FromForm, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct CategorySummaryQuery {
    /// Month anchor in `YYYY-MM-DD` format. The day portion is normalized to the first of the month.
    #[param(
        value_type = String,
        format = Date,
        pattern = "^\\d{4}-\\d{2}-\\d{2}$",
        example = "2026-05-01"
    )]
    pub month: Option<String>,
    /// Summary type. Defaults to `expense`.
    #[param(example = "expense")]
    pub r#type: Option<TransactionType>,
}

#[derive(Debug, Serialize, ToSchema)]
#[schema(example = json!({
    "category": "Groceries",
    "total": "540.20",
    "percentage": 28.81
}))]
pub struct CategorySummaryItem {
    /// Category label.
    #[schema(example = "Groceries")]
    pub category: String,
    /// Total amount aggregated for the category.
    #[schema(example = "540.20")]
    pub total: Decimal,
    /// Percentage of the month's grand total.
    #[schema(example = 28.81)]
    pub percentage: f64,
}

#[derive(Debug, Serialize, ToSchema)]
#[schema(example = json!({
    "month": "2026-05-01",
    "type": "expense",
    "items": [
        {
            "category": "Groceries",
            "total": "540.20",
            "percentage": 28.81
        },
        {
            "category": "Utilities",
            "total": "310.00",
            "percentage": 16.53
        }
    ]
}))]
pub struct CategorySummaryResponse {
    /// First day of the summarized month.
    #[schema(example = "2026-05-01")]
    pub month: NaiveDate,
    /// Summary type that was aggregated.
    pub r#type: TransactionType,
    /// Category totals sorted by amount descending.
    pub items: Vec<CategorySummaryItem>,
}
