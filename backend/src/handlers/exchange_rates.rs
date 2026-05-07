use rocket::{serde::json::Json, State};

use crate::{
    config::AppState,
    errors::{ApiError, ErrorResponse},
    guards::AuthUser,
    schema::exchange_rate::{ExchangeRateResponse, ReplaceExchangeRatesRequest},
    services::exchange_rates,
};

#[utoipa::path(
    get,
    operation_id = "exchange_rates_list",
    path = "/api/exchange-rates",
    tag = "exchange_rates",
    security(
        ("bearer_auth" = []),
        ("access_cookie_auth" = [])
    ),
    params(
        ("currencies" = Option<String>, Query, description = "Optional comma-separated ISO 4217 currency codes used to scope the returned pairs")
    ),
    responses(
        (status = 200, description = "Effective exchange rates for the authenticated user", body = [ExchangeRateResponse]),
        (status = 400, description = "Invalid currency filter", body = ErrorResponse),
        (status = 401, description = "Authentication required or access token invalid", body = ErrorResponse),
        (status = 500, description = "Server error", body = ErrorResponse)
    )
)]
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

#[utoipa::path(
    put,
    operation_id = "exchange_rates_replace",
    path = "/api/exchange-rates",
    tag = "exchange_rates",
    security(
        ("bearer_auth" = []),
        ("access_cookie_auth" = [])
    ),
    request_body = ReplaceExchangeRatesRequest,
    responses(
        (status = 200, description = "Manual exchange-rate overrides replaced successfully", body = [ExchangeRateResponse]),
        (status = 400, description = "Invalid exchange-rate payload", body = ErrorResponse),
        (status = 401, description = "Authentication required or access token invalid", body = ErrorResponse),
        (status = 500, description = "Server error", body = ErrorResponse)
    )
)]
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
