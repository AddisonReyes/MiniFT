use rocket::{serde::json::Json, State};
use uuid::Uuid;

use crate::{
    config::AppState,
    errors::{ApiError, ErrorResponse},
    guards::AuthUser,
    schema::{
        account::{AccountResponse, CreateAccountRequest, UpdateAccountRequest},
        common::MessageResponse,
    },
    services::accounts,
};

#[utoipa::path(
    get,
    operation_id = "accounts_list",
    path = "/api/accounts",
    tag = "accounts",
    security(
        ("bearer_auth" = []),
        ("access_cookie_auth" = [])
    ),
    responses(
        (status = 200, description = "Accounts owned by the authenticated user", body = [AccountResponse]),
        (status = 401, description = "Authentication required or access token invalid", body = ErrorResponse),
        (status = 500, description = "Server error", body = ErrorResponse)
    )
)]
#[get("/api/accounts")]
pub async fn list(
    state: &State<AppState>,
    user: AuthUser,
) -> Result<Json<Vec<AccountResponse>>, ApiError> {
    Ok(Json(
        accounts::list_accounts(&state.pool, user.user_id).await?,
    ))
}

#[utoipa::path(
    get,
    operation_id = "accounts_get",
    path = "/api/accounts/{account_id}",
    tag = "accounts",
    security(
        ("bearer_auth" = []),
        ("access_cookie_auth" = [])
    ),
    params(
        ("account_id" = Uuid, Path, description = "Account identifier")
    ),
    responses(
        (status = 200, description = "Single account with computed balance", body = AccountResponse),
        (status = 401, description = "Authentication required or access token invalid", body = ErrorResponse),
        (status = 404, description = "Account not found", body = ErrorResponse),
        (status = 500, description = "Server error", body = ErrorResponse)
    )
)]
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

#[utoipa::path(
    post,
    operation_id = "accounts_create",
    path = "/api/accounts",
    tag = "accounts",
    security(
        ("bearer_auth" = []),
        ("access_cookie_auth" = [])
    ),
    request_body = CreateAccountRequest,
    responses(
        (status = 200, description = "Account created successfully", body = AccountResponse),
        (status = 400, description = "Invalid account payload", body = ErrorResponse),
        (status = 401, description = "Authentication required or access token invalid", body = ErrorResponse),
        (status = 404, description = "User not found", body = ErrorResponse),
        (status = 500, description = "Server error", body = ErrorResponse)
    )
)]
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

#[utoipa::path(
    put,
    operation_id = "accounts_update",
    path = "/api/accounts/{account_id}",
    tag = "accounts",
    security(
        ("bearer_auth" = []),
        ("access_cookie_auth" = [])
    ),
    params(
        ("account_id" = Uuid, Path, description = "Account identifier")
    ),
    request_body = UpdateAccountRequest,
    responses(
        (status = 200, description = "Account updated successfully", body = AccountResponse),
        (status = 400, description = "Invalid account payload or operation would remove the last cash account", body = ErrorResponse),
        (status = 401, description = "Authentication required or access token invalid", body = ErrorResponse),
        (status = 404, description = "Account not found", body = ErrorResponse),
        (status = 500, description = "Server error", body = ErrorResponse)
    )
)]
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

#[utoipa::path(
    delete,
    operation_id = "accounts_delete",
    path = "/api/accounts/{account_id}",
    tag = "accounts",
    security(
        ("bearer_auth" = []),
        ("access_cookie_auth" = [])
    ),
    params(
        ("account_id" = Uuid, Path, description = "Account identifier")
    ),
    responses(
        (status = 200, description = "Account deleted successfully", body = MessageResponse),
        (status = 400, description = "Account cannot be removed because it is the last required account or has related activity", body = ErrorResponse),
        (status = 401, description = "Authentication required or access token invalid", body = ErrorResponse),
        (status = 404, description = "Account not found", body = ErrorResponse),
        (status = 500, description = "Server error", body = ErrorResponse)
    )
)]
#[delete("/api/accounts/<account_id>")]
pub async fn delete(
    state: &State<AppState>,
    user: AuthUser,
    account_id: Uuid,
) -> Result<Json<MessageResponse>, ApiError> {
    accounts::delete_account(&state.pool, user.user_id, account_id).await?;
    Ok(Json(MessageResponse::new("Account deleted")))
}
