use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow)]
pub struct BudgetRow {
    pub id: Uuid,
    pub category: String,
    pub limit_amount: Decimal,
    pub month: NaiveDate,
    pub created_at: DateTime<Utc>,
    pub spent_amount: Decimal,
}
