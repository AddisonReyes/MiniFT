use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
#[allow(unused_imports)]
use serde_json::json;
use utoipa::ToSchema;

#[derive(Debug, Deserialize, ToSchema)]
#[schema(example = json!({
    "from_currency": "USD",
    "to_currency": "DOP",
    "rate": "58.75"
}))]
pub struct ExchangeRateInput {
    /// Source ISO 4217 currency code.
    #[schema(pattern = "^[A-Za-z]{3}$", example = "USD")]
    pub from_currency: String,
    /// Destination ISO 4217 currency code.
    #[schema(pattern = "^[A-Za-z]{3}$", example = "DOP")]
    pub to_currency: String,
    /// Positive conversion rate from the source currency to the destination currency.
    #[schema(example = "58.75")]
    pub rate: Decimal,
}

#[derive(Debug, Deserialize, ToSchema)]
#[schema(example = json!({
    "rates": [
        {
            "from_currency": "USD",
            "to_currency": "DOP",
            "rate": "58.75"
        },
        {
            "from_currency": "EUR",
            "to_currency": "USD",
            "rate": "1.08"
        }
    ]
}))]
pub struct ReplaceExchangeRatesRequest {
    /// Full manual override set to persist for the user.
    pub rates: Vec<ExchangeRateInput>,
}

#[derive(Debug, Serialize, ToSchema)]
#[schema(example = json!({
    "from_currency": "USD",
    "to_currency": "DOP",
    "rate": "58.75",
    "is_manual": true,
    "provider_rate": "58.60"
}))]
pub struct ExchangeRateResponse {
    /// Source ISO 4217 currency code.
    #[schema(pattern = "^[A-Za-z]{3}$", example = "USD")]
    pub from_currency: String,
    /// Destination ISO 4217 currency code.
    #[schema(pattern = "^[A-Za-z]{3}$", example = "DOP")]
    pub to_currency: String,
    /// Effective rate used by the backend.
    #[schema(example = "58.75")]
    pub rate: Decimal,
    /// Indicates whether `rate` is coming from a user-managed manual override.
    #[schema(example = true)]
    pub is_manual: bool,
    /// Provider fallback rate when one exists.
    #[schema(example = "58.60")]
    pub provider_rate: Option<Decimal>,
}
