use rocket::{serde::json::Json, State};
use uuid::Uuid;

use crate::{
    config::AppState,
    errors::ApiError,
    guards::AuthUser,
    schema::{
        common::MessageResponse,
        transfer::{CreateTransferRequest, TransferResponse},
    },
    services::transfers,
};

#[get("/api/transfers")]
pub async fn list(
    state: &State<AppState>,
    user: AuthUser,
) -> Result<Json<Vec<TransferResponse>>, ApiError> {
    Ok(Json(
        transfers::list_transfers(&state.pool, user.user_id).await?,
    ))
}

#[post("/api/transfers", format = "json", data = "<payload>")]
pub async fn create(
    state: &State<AppState>,
    user: AuthUser,
    payload: Json<CreateTransferRequest>,
) -> Result<Json<TransferResponse>, ApiError> {
    Ok(Json(
        transfers::create_transfer(&state.pool, user.user_id, payload.into_inner()).await?,
    ))
}

#[delete("/api/transfers/<transfer_id>")]
pub async fn delete(
    state: &State<AppState>,
    user: AuthUser,
    transfer_id: Uuid,
) -> Result<Json<MessageResponse>, ApiError> {
    transfers::delete_transfer(&state.pool, user.user_id, transfer_id).await?;
    Ok(Json(MessageResponse::new("Transfer deleted")))
}
