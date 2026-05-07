use rocket::{serde::json::Json, State};
use uuid::Uuid;

use crate::{
    config::AppState,
    errors::{ApiError, ErrorResponse},
    guards::AuthUser,
    schema::{
        common::MessageResponse,
        transfer::{CreateTransferRequest, TransferResponse},
    },
    services::transfers,
};

#[utoipa::path(
    get,
    operation_id = "transfers_list",
    path = "/api/transfers",
    tag = "transfers",
    security(
        ("bearer_auth" = []),
        ("access_cookie_auth" = [])
    ),
    responses(
        (status = 200, description = "Transfers owned by the authenticated user", body = [TransferResponse]),
        (status = 401, description = "Authentication required or access token invalid", body = ErrorResponse),
        (status = 500, description = "Server error", body = ErrorResponse)
    )
)]
#[get("/api/transfers")]
pub async fn list(
    state: &State<AppState>,
    user: AuthUser,
) -> Result<Json<Vec<TransferResponse>>, ApiError> {
    Ok(Json(
        transfers::list_transfers(&state.pool, user.user_id).await?,
    ))
}

#[utoipa::path(
    post,
    operation_id = "transfers_create",
    path = "/api/transfers",
    tag = "transfers",
    security(
        ("bearer_auth" = []),
        ("access_cookie_auth" = [])
    ),
    request_body = CreateTransferRequest,
    responses(
        (status = 200, description = "Transfer created and mirrored transaction entries inserted", body = TransferResponse),
        (status = 400, description = "Invalid transfer payload or missing effective exchange rate", body = ErrorResponse),
        (status = 401, description = "Authentication required or access token invalid", body = ErrorResponse),
        (status = 404, description = "Source or destination account not found", body = ErrorResponse),
        (status = 500, description = "Server error", body = ErrorResponse)
    )
)]
#[post("/api/transfers", format = "json", data = "<payload>")]
pub async fn create(
    state: &State<AppState>,
    user: AuthUser,
    payload: Json<CreateTransferRequest>,
) -> Result<Json<TransferResponse>, ApiError> {
    Ok(Json(
        transfers::create_transfer(
            &state.pool,
            user.user_id,
            &state.exchange_rates,
            payload.into_inner(),
        )
        .await?,
    ))
}

#[utoipa::path(
    delete,
    operation_id = "transfers_delete",
    path = "/api/transfers/{transfer_id}",
    tag = "transfers",
    security(
        ("bearer_auth" = []),
        ("access_cookie_auth" = [])
    ),
    params(
        ("transfer_id" = Uuid, Path, description = "Transfer identifier")
    ),
    responses(
        (status = 200, description = "Transfer deleted successfully", body = MessageResponse),
        (status = 401, description = "Authentication required or access token invalid", body = ErrorResponse),
        (status = 404, description = "Transfer not found", body = ErrorResponse),
        (status = 500, description = "Server error", body = ErrorResponse)
    )
)]
#[delete("/api/transfers/<transfer_id>")]
pub async fn delete(
    state: &State<AppState>,
    user: AuthUser,
    transfer_id: Uuid,
) -> Result<Json<MessageResponse>, ApiError> {
    transfers::delete_transfer(&state.pool, user.user_id, transfer_id).await?;
    Ok(Json(MessageResponse::new("Transfer deleted")))
}
