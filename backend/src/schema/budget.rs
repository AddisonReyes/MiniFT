use chrono::{DateTime, NaiveDate, Utc};
use rocket::form::FromForm;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
#[allow(unused_imports)]
use serde_json::json;
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

#[derive(Debug, Deserialize, ToSchema)]
#[schema(example = json!({
    "category": "Groceries",
    "limit_amount": "600.00",
    "month": "2026-05-01"
}))]
pub struct CreateBudgetRequest {
    /// Expense category this budget applies to.
    #[schema(min_length = 1, example = "Groceries")]
    pub category: String,
    /// Positive monthly spending cap.
    #[schema(example = "600.00")]
    pub limit_amount: Decimal,
    /// Month anchor in `YYYY-MM-DD` format. The day portion is normalized to the first of the month.
    #[schema(example = "2026-05-01")]
    pub month: NaiveDate,
}

#[derive(Debug, Deserialize, ToSchema)]
#[schema(example = json!({
    "category": "Dining out",
    "limit_amount": "250.00",
    "month": "2026-05-01"
}))]
pub struct UpdateBudgetRequest {
    /// Expense category this budget applies to.
    #[schema(min_length = 1, example = "Dining out")]
    pub category: String,
    /// Positive monthly spending cap.
    #[schema(example = "250.00")]
    pub limit_amount: Decimal,
    /// Month anchor in `YYYY-MM-DD` format. The day portion is normalized to the first of the month.
    #[schema(example = "2026-05-01")]
    pub month: NaiveDate,
}

#[derive(Debug, Clone, FromForm, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct BudgetFilters {
    /// Optional month anchor in `YYYY-MM-DD` format.
    #[param(
        value_type = String,
        format = Date,
        pattern = "^\\d{4}-\\d{2}-\\d{2}$",
        example = "2026-05-01"
    )]
    pub month: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
#[schema(example = json!({
    "id": "e705f7ec-46e0-4253-8ef7-95c33db37001",
    "category": "Groceries",
    "limit_amount": "600.00",
    "month": "2026-05-01",
    "created_at": "2026-05-01T11:00:00Z",
    "spent_amount": "412.35",
    "remaining_amount": "187.65"
}))]
pub struct BudgetResponse {
    /// Stable unique identifier for the budget.
    #[schema(example = "e705f7ec-46e0-4253-8ef7-95c33db37001")]
    pub id: Uuid,
    /// Expense category this budget applies to.
    #[schema(example = "Groceries")]
    pub category: String,
    /// Configured monthly spending cap.
    #[schema(example = "600.00")]
    pub limit_amount: Decimal,
    /// First day of the budget month.
    #[schema(example = "2026-05-01")]
    pub month: NaiveDate,
    /// Timestamp when the budget was created.
    #[schema(example = "2026-05-01T11:00:00Z")]
    pub created_at: DateTime<Utc>,
    /// Expense total currently attributed to the category and month.
    #[schema(example = "412.35")]
    pub spent_amount: Decimal,
    /// `limit_amount - spent_amount`.
    #[schema(example = "187.65")]
    pub remaining_amount: Decimal,
}
