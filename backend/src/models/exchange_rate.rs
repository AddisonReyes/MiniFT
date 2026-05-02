use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use sqlx::FromRow;

#[derive(Debug, Clone, FromRow)]
pub struct ExchangeRateRecord {
    pub from_currency: String,
    pub to_currency: String,
    pub rate: Decimal,
    pub source: String,
    pub updated_at: DateTime<Utc>,
}
