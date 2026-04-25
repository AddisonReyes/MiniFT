use rocket::{serde::json::Json, State};
use uuid::Uuid;

use crate::{
    config::AppState,
    errors::ApiError,
    guards::AuthUser,
    schema::{
        common::MessageResponse,
        recurring::{
            CreateRecurringTransactionRequest, RecurringTransactionResponse,
            UpdateRecurringTransactionRequest,
        },
    },
    services::recurring,
};

#[get("/api/recurring-transactions")]
pub async fn list(
    state: &State<AppState>,
    user: AuthUser,
) -> Result<Json<Vec<RecurringTransactionResponse>>, ApiError> {
    Ok(Json(
        recurring::list_recurring_transactions(&state.pool, user.user_id).await?,
    ))
}

#[post("/api/recurring-transactions", format = "json", data = "<payload>")]
pub async fn create(
    state: &State<AppState>,
    user: AuthUser,
    payload: Json<CreateRecurringTransactionRequest>,
) -> Result<Json<RecurringTransactionResponse>, ApiError> {
    Ok(Json(
        recurring::create_recurring_transaction(&state.pool, user.user_id, payload.into_inner())
            .await?,
    ))
}

#[put(
    "/api/recurring-transactions/<recurring_id>",
    format = "json",
    data = "<payload>"
)]
pub async fn update(
    state: &State<AppState>,
    user: AuthUser,
    recurring_id: Uuid,
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

#[delete("/api/recurring-transactions/<recurring_id>")]
pub async fn delete(
    state: &State<AppState>,
    user: AuthUser,
    recurring_id: Uuid,
) -> Result<Json<MessageResponse>, ApiError> {
    recurring::delete_recurring_transaction(&state.pool, user.user_id, recurring_id).await?;
    Ok(Json(MessageResponse::new("Recurring transaction deleted")))
}
