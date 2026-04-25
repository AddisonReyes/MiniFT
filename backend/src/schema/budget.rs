use chrono::{DateTime, NaiveDate, Utc};
use rocket::form::FromForm;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct CreateBudgetRequest {
    pub category: String,
    pub limit_amount: Decimal,
    pub month: NaiveDate,
}

#[derive(Debug, Deserialize)]
pub struct UpdateBudgetRequest {
    pub category: String,
    pub limit_amount: Decimal,
    pub month: NaiveDate,
}

#[derive(Debug, Clone, FromForm)]
pub struct BudgetFilters {
    pub month: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct BudgetResponse {
    pub id: Uuid,
    pub category: String,
    pub limit_amount: Decimal,
    pub month: NaiveDate,
    pub created_at: DateTime<Utc>,
    pub spent_amount: Decimal,
    pub remaining_amount: Decimal,
}
