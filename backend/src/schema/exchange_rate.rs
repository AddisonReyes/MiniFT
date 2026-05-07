use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Deserialize, ToSchema)]
pub struct ExchangeRateInput {
    /// Source ISO 4217 currency code.
    pub from_currency: String,
    /// Destination ISO 4217 currency code.
    pub to_currency: String,
    /// Positive conversion rate from the source currency to the destination currency.
    pub rate: Decimal,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ReplaceExchangeRatesRequest {
    /// Full manual override set to persist for the user.
    pub rates: Vec<ExchangeRateInput>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ExchangeRateResponse {
    /// Source ISO 4217 currency code.
    pub from_currency: String,
    /// Destination ISO 4217 currency code.
    pub to_currency: String,
    /// Effective rate used by the backend.
    pub rate: Decimal,
    /// Indicates whether `rate` is coming from a user-managed manual override.
    pub is_manual: bool,
    /// Provider fallback rate when one exists.
    pub provider_rate: Option<Decimal>,
}
