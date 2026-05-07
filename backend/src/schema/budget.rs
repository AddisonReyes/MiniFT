use chrono::{DateTime, NaiveDate, Utc};
use rocket::form::FromForm;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateBudgetRequest {
    /// Expense category this budget applies to.
    pub category: String,
    /// Positive monthly spending cap.
    pub limit_amount: Decimal,
    /// Month anchor in `YYYY-MM-DD` format. The day portion is normalized to the first of the month.
    pub month: NaiveDate,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateBudgetRequest {
    /// Expense category this budget applies to.
    pub category: String,
    /// Positive monthly spending cap.
    pub limit_amount: Decimal,
    /// Month anchor in `YYYY-MM-DD` format. The day portion is normalized to the first of the month.
    pub month: NaiveDate,
}

#[derive(Debug, Clone, FromForm, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct BudgetFilters {
    /// Optional month anchor in `YYYY-MM-DD` format.
    pub month: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct BudgetResponse {
    /// Stable unique identifier for the budget.
    pub id: Uuid,
    /// Expense category this budget applies to.
    pub category: String,
    /// Configured monthly spending cap.
    pub limit_amount: Decimal,
    /// First day of the budget month.
    pub month: NaiveDate,
    /// Timestamp when the budget was created.
    pub created_at: DateTime<Utc>,
    /// Expense total currently attributed to the category and month.
    pub spent_amount: Decimal,
    /// `limit_amount - spent_amount`.
    pub remaining_amount: Decimal,
}
