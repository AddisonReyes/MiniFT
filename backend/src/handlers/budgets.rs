use rocket::{serde::json::Json, State};
use uuid::Uuid;

use crate::{
    config::AppState,
    errors::ApiError,
    guards::AuthUser,
    schema::{
        budget::{BudgetFilters, BudgetResponse, CreateBudgetRequest, UpdateBudgetRequest},
        common::MessageResponse,
    },
    services::budgets,
};

#[get("/api/budgets?<filters..>")]
pub async fn list(
    state: &State<AppState>,
    user: AuthUser,
    filters: Option<BudgetFilters>,
) -> Result<Json<Vec<BudgetResponse>>, ApiError> {
    Ok(Json(
        budgets::list_budgets(
            &state.pool,
            user.user_id,
            filters.unwrap_or(BudgetFilters { month: None }),
        )
        .await?,
    ))
}

#[post("/api/budgets", format = "json", data = "<payload>")]
pub async fn create(
    state: &State<AppState>,
    user: AuthUser,
    payload: Json<CreateBudgetRequest>,
) -> Result<Json<BudgetResponse>, ApiError> {
    Ok(Json(
        budgets::create_budget(&state.pool, user.user_id, payload.into_inner()).await?,
    ))
}

#[get("/api/budgets/<budget_id>")]
pub async fn get(
    state: &State<AppState>,
    user: AuthUser,
    budget_id: Uuid,
) -> Result<Json<BudgetResponse>, ApiError> {
    Ok(Json(
        budgets::get_budget(&state.pool, user.user_id, budget_id).await?,
    ))
}

#[put("/api/budgets/<budget_id>", format = "json", data = "<payload>")]
pub async fn update(
    state: &State<AppState>,
    user: AuthUser,
    budget_id: Uuid,
    payload: Json<UpdateBudgetRequest>,
) -> Result<Json<BudgetResponse>, ApiError> {
    Ok(Json(
        budgets::update_budget(&state.pool, user.user_id, budget_id, payload.into_inner()).await?,
    ))
}

#[delete("/api/budgets/<budget_id>")]
pub async fn delete(
    state: &State<AppState>,
    user: AuthUser,
    budget_id: Uuid,
) -> Result<Json<MessageResponse>, ApiError> {
    budgets::delete_budget(&state.pool, user.user_id, budget_id).await?;
    Ok(Json(MessageResponse::new("Budget deleted")))
}
