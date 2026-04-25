use rocket::{serde::json::Json, State};
use uuid::Uuid;

use crate::{
    config::AppState,
    errors::ApiError,
    guards::AuthUser,
    schema::{
        account::{AccountResponse, CreateAccountRequest, UpdateAccountRequest},
        common::MessageResponse,
    },
    services::accounts,
};

#[get("/api/accounts")]
pub async fn list(
    state: &State<AppState>,
    user: AuthUser,
) -> Result<Json<Vec<AccountResponse>>, ApiError> {
    Ok(Json(
        accounts::list_accounts(&state.pool, user.user_id).await?,
    ))
}

#[get("/api/accounts/<account_id>")]
pub async fn get(
    state: &State<AppState>,
    user: AuthUser,
    account_id: Uuid,
) -> Result<Json<AccountResponse>, ApiError> {
    Ok(Json(
        accounts::get_account(&state.pool, user.user_id, account_id).await?,
    ))
}

#[post("/api/accounts", format = "json", data = "<payload>")]
pub async fn create(
    state: &State<AppState>,
    user: AuthUser,
    payload: Json<CreateAccountRequest>,
) -> Result<Json<AccountResponse>, ApiError> {
    Ok(Json(
        accounts::create_account(&state.pool, user.user_id, payload.into_inner()).await?,
    ))
}

#[put("/api/accounts/<account_id>", format = "json", data = "<payload>")]
pub async fn update(
    state: &State<AppState>,
    user: AuthUser,
    account_id: Uuid,
    payload: Json<UpdateAccountRequest>,
) -> Result<Json<AccountResponse>, ApiError> {
    Ok(Json(
        accounts::update_account(&state.pool, user.user_id, account_id, payload.into_inner())
            .await?,
    ))
}

#[delete("/api/accounts/<account_id>")]
pub async fn delete(
    state: &State<AppState>,
    user: AuthUser,
    account_id: Uuid,
) -> Result<Json<MessageResponse>, ApiError> {
    accounts::delete_account(&state.pool, user.user_id, account_id).await?;
    Ok(Json(MessageResponse::new("Account deleted")))
}
