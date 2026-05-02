use rocket::{serde::json::Json, State};

use crate::{
    config::AppState,
    errors::ApiError,
    guards::AuthUser,
    schema::exchange_rate::{ExchangeRateResponse, ReplaceExchangeRatesRequest},
    services::exchange_rates,
};

#[get("/api/exchange-rates?<currencies>")]
pub async fn list(
    state: &State<AppState>,
    user: AuthUser,
    currencies: Option<String>,
) -> Result<Json<Vec<ExchangeRateResponse>>, ApiError> {
    let requested_currencies = exchange_rates::parse_requested_currencies(currencies.as_deref())?;

    Ok(Json(
        exchange_rates::list_exchange_rates(
            &state.pool,
            user.user_id,
            &state.exchange_rates,
            requested_currencies,
        )
        .await?,
    ))
}

#[put("/api/exchange-rates", format = "json", data = "<payload>")]
pub async fn replace(
    state: &State<AppState>,
    user: AuthUser,
    payload: Json<ReplaceExchangeRatesRequest>,
) -> Result<Json<Vec<ExchangeRateResponse>>, ApiError> {
    Ok(Json(
        exchange_rates::replace_exchange_rates(
            &state.pool,
            user.user_id,
            payload.into_inner().rates,
        )
        .await?,
    ))
}
