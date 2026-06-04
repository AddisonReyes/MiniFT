use rocket::{serde::json::Json, State};
use uuid::Uuid;

use crate::{
    config::AppState,
    errors::{ApiError, ErrorResponse},
    guards::{AuthUser, MutatingOrigin},
    schema::{
        common::MessageResponse,
        recurring::{
            CreateRecurringTransactionRequest, RecurringTransactionResponse,
            UpdateRecurringTransactionRequest,
        },
    },
    services::recurring,
};

#[utoipa::path(
    get,
    operation_id = "recurring_list",
    path = "/api/recurring-transactions",
    tag = "recurring",
    summary = "List recurring rules",
    security(
        ("bearer_auth" = []),
        ("access_cookie_auth" = [])
    ),
    responses(
        (status = 200, description = "Recurring rules owned by the authenticated user", body = [RecurringTransactionResponse]),
        (status = 401, description = "Authentication required or access token invalid", body = ErrorResponse),
        (status = 500, description = "Server error", body = ErrorResponse)
    )
)]
#[get("/api/recurring-transactions")]
pub async fn list(
    state: &State<AppState>,
    user: AuthUser,
) -> Result<Json<Vec<RecurringTransactionResponse>>, ApiError> {
    Ok(Json(
        recurring::list_recurring_transactions(&state.pool, user.user_id).await?,
    ))
}

#[utoipa::path(
    post,
    operation_id = "recurring_create",
    path = "/api/recurring-transactions",
    tag = "recurring",
    summary = "Create a recurring rule",
    description = "Creates a recurring income or expense rule. Generated transactions are materialized later by the background worker.",
    security(
        ("bearer_auth" = []),
        ("access_cookie_auth" = [])
    ),
    request_body = CreateRecurringTransactionRequest,
    responses(
        (status = 200, description = "Recurring rule created successfully", body = RecurringTransactionResponse),
        (status = 400, description = "Invalid recurring payload or unsupported transfer type", body = ErrorResponse),
        (status = 401, description = "Authentication required or access token invalid", body = ErrorResponse),
        (status = 404, description = "Referenced account not found", body = ErrorResponse),
        (status = 500, description = "Server error", body = ErrorResponse)
    )
)]
#[post("/api/recurring-transactions", format = "json", data = "<payload>")]
pub async fn create(
    state: &State<AppState>,
    user: AuthUser,
    _origin: MutatingOrigin,
    payload: Json<CreateRecurringTransactionRequest>,
) -> Result<Json<RecurringTransactionResponse>, ApiError> {
    Ok(Json(
        recurring::create_recurring_transaction(&state.pool, user.user_id, payload.into_inner())
            .await?,
    ))
}

#[utoipa::path(
    put,
    operation_id = "recurring_update",
    path = "/api/recurring-transactions/{recurring_id}",
    tag = "recurring",
    summary = "Update a recurring rule",
    security(
        ("bearer_auth" = []),
        ("access_cookie_auth" = [])
    ),
    params(
        ("recurring_id" = Uuid, Path, description = "Recurring rule identifier")
    ),
    request_body = UpdateRecurringTransactionRequest,
    responses(
        (status = 200, description = "Recurring rule updated successfully", body = RecurringTransactionResponse),
        (status = 400, description = "Invalid recurring payload or unsupported transfer type", body = ErrorResponse),
        (status = 401, description = "Authentication required or access token invalid", body = ErrorResponse),
        (status = 404, description = "Recurring rule or referenced account not found", body = ErrorResponse),
        (status = 500, description = "Server error", body = ErrorResponse)
    )
)]
#[put(
    "/api/recurring-transactions/<recurring_id>",
    format = "json",
    data = "<payload>"
)]
pub async fn update(
    state: &State<AppState>,
    user: AuthUser,
    recurring_id: Uuid,
    _origin: MutatingOrigin,
    payload: Json<UpdateRecurringTransactionRequest>,
) -> Result<Json<RecurringTransactionResponse>, ApiError> {
    Ok(Json(
        recurring::update_recurring_transaction(
            &state.pool,
            user.user_id,
            recurring_id,
            payload.into_inner(),
        )
        .await?,
    ))
}

#[utoipa::path(
    delete,
    operation_id = "recurring_delete",
    path = "/api/recurring-transactions/{recurring_id}",
    tag = "recurring",
    summary = "Delete a recurring rule",
    security(
        ("bearer_auth" = []),
        ("access_cookie_auth" = [])
    ),
    params(
        ("recurring_id" = Uuid, Path, description = "Recurring rule identifier")
    ),
    responses(
        (status = 200, description = "Recurring rule deleted successfully", body = MessageResponse),
        (status = 401, description = "Authentication required or access token invalid", body = ErrorResponse),
        (status = 404, description = "Recurring rule not found", body = ErrorResponse),
        (status = 500, description = "Server error", body = ErrorResponse)
    )
)]
#[delete("/api/recurring-transactions/<recurring_id>")]
pub async fn delete(
    state: &State<AppState>,
    user: AuthUser,
    _origin: MutatingOrigin,
    recurring_id: Uuid,
) -> Result<Json<MessageResponse>, ApiError> {
    recurring::delete_recurring_transaction(&state.pool, user.user_id, recurring_id).await?;
    Ok(Json(MessageResponse::new("Recurring transaction deleted")))
}
