use rocket::{serde::json::Json, State};

use crate::{
    config::AppState,
    errors::ApiError,
    guards::AuthUser,
    schema::exchange_rate::{ExchangeRateResponse, ReplaceExchangeRatesRequest},
    services::exchange_rates,
};

#[get("/api/exchange-rates")]
pub async fn list(
    state: &State<AppState>,
    user: AuthUser,
) -> Result<Json<Vec<ExchangeRateResponse>>, ApiError> {
    Ok(Json(
        exchange_rates::list_exchange_rates(&state.pool, user.user_id).await?,
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
