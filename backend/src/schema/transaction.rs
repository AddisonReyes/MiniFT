use chrono::{DateTime, NaiveDate, Utc};
use rocket::form::FromForm;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::models::transaction::TransactionType;

#[derive(Debug, Deserialize)]
pub struct CreateTransactionRequest {
    pub account_id: Option<Uuid>,
    pub amount: Decimal,
    pub r#type: TransactionType,
    pub category: String,
    pub note: Option<String>,
    pub date: NaiveDate,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTransactionRequest {
    pub account_id: Option<Uuid>,
    pub amount: Decimal,
    pub r#type: TransactionType,
    pub category: String,
    pub note: Option<String>,
    pub date: NaiveDate,
}

#[derive(Debug, Clone, FromForm)]
pub struct TransactionFilters {
    pub r#type: Option<TransactionType>,
    pub category: Option<String>,
    pub account_id: Option<Uuid>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TransactionResponse {
    pub id: Uuid,
    pub account_id: Option<Uuid>,
    pub account_name: Option<String>,
    pub amount: Decimal,
    pub r#type: TransactionType,
    pub display_type: TransactionType,
    pub category: String,
    pub note: Option<String>,
    pub date: NaiveDate,
    pub created_at: DateTime<Utc>,
    pub transfer_id: Option<Uuid>,
}

#[derive(Debug, Serialize)]
pub struct MonthlySummaryResponse {
    pub month: NaiveDate,
    pub income_total: Decimal,
    pub expense_total: Decimal,
    pub net_total: Decimal,
}

#[derive(Debug, Clone, FromForm)]
pub struct CategorySummaryQuery {
    pub month: Option<String>,
    pub r#type: Option<TransactionType>,
}

#[derive(Debug, Serialize)]
pub struct CategorySummaryItem {
    pub category: String,
    pub total: Decimal,
    pub percentage: f64,
}

#[derive(Debug, Serialize)]
pub struct CategorySummaryResponse {
    pub month: NaiveDate,
    pub r#type: TransactionType,
    pub items: Vec<CategorySummaryItem>,
}
