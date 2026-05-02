use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct ExchangeRateInput {
    pub from_currency: String,
    pub to_currency: String,
    pub rate: Decimal,
}

#[derive(Debug, Deserialize)]
pub struct ReplaceExchangeRatesRequest {
    pub rates: Vec<ExchangeRateInput>,
}

#[derive(Debug, Serialize)]
pub struct ExchangeRateResponse {
    pub from_currency: String,
    pub to_currency: String,
    pub rate: Decimal,
    pub is_manual: bool,
    pub provider_rate: Option<Decimal>,
}
