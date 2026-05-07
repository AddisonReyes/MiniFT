use rocket::{serde::json::Json, State};
use uuid::Uuid;

use crate::{
    config::AppState,
    errors::{ApiError, ErrorResponse},
    guards::AuthUser,
    schema::{
        budget::{BudgetFilters, BudgetResponse, CreateBudgetRequest, UpdateBudgetRequest},
        common::MessageResponse,
    },
    services::budgets,
};

#[utoipa::path(
    get,
    path = "/api/budgets",
    tag = "budgets",
    security(
        ("bearer_auth" = []),
        ("access_cookie_auth" = [])
    ),
    params(BudgetFilters),
    responses(
        (status = 200, description = "Budgets matching the supplied month filter", body = [BudgetResponse]),
        (status = 400, description = "Invalid month filter", body = ErrorResponse),
        (status = 401, description = "Authentication required or access token invalid", body = ErrorResponse),
        (status = 500, description = "Server error", body = ErrorResponse)
    )
)]
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

#[utoipa::path(
    post,
    path = "/api/budgets",
    tag = "budgets",
    security(
        ("bearer_auth" = []),
        ("access_cookie_auth" = [])
    ),
    request_body = CreateBudgetRequest,
    responses(
        (status = 200, description = "Budget created successfully", body = BudgetResponse),
        (status = 400, description = "Invalid budget payload", body = ErrorResponse),
        (status = 401, description = "Authentication required or access token invalid", body = ErrorResponse),
        (status = 409, description = "Budget already exists for the category and month", body = ErrorResponse),
        (status = 500, description = "Server error", body = ErrorResponse)
    )
)]
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

#[utoipa::path(
    get,
    path = "/api/budgets/{budget_id}",
    tag = "budgets",
    security(
        ("bearer_auth" = []),
        ("access_cookie_auth" = [])
    ),
    params(
        ("budget_id" = Uuid, Path, description = "Budget identifier")
    ),
    responses(
        (status = 200, description = "Single budget with computed spent and remaining amounts", body = BudgetResponse),
        (status = 401, description = "Authentication required or access token invalid", body = ErrorResponse),
        (status = 404, description = "Budget not found", body = ErrorResponse),
        (status = 500, description = "Server error", body = ErrorResponse)
    )
)]
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

#[utoipa::path(
    put,
    path = "/api/budgets/{budget_id}",
    tag = "budgets",
    security(
        ("bearer_auth" = []),
        ("access_cookie_auth" = [])
    ),
    params(
        ("budget_id" = Uuid, Path, description = "Budget identifier")
    ),
    request_body = UpdateBudgetRequest,
    responses(
        (status = 200, description = "Budget updated successfully", body = BudgetResponse),
        (status = 400, description = "Invalid budget payload", body = ErrorResponse),
        (status = 401, description = "Authentication required or access token invalid", body = ErrorResponse),
        (status = 404, description = "Budget not found", body = ErrorResponse),
        (status = 409, description = "Budget already exists for the category and month", body = ErrorResponse),
        (status = 500, description = "Server error", body = ErrorResponse)
    )
)]
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

#[utoipa::path(
    delete,
    path = "/api/budgets/{budget_id}",
    tag = "budgets",
    security(
        ("bearer_auth" = []),
        ("access_cookie_auth" = [])
    ),
    params(
        ("budget_id" = Uuid, Path, description = "Budget identifier")
    ),
    responses(
        (status = 200, description = "Budget deleted successfully", body = MessageResponse),
        (status = 401, description = "Authentication required or access token invalid", body = ErrorResponse),
        (status = 404, description = "Budget not found", body = ErrorResponse),
        (status = 500, description = "Server error", body = ErrorResponse)
    )
)]
#[delete("/api/budgets/<budget_id>")]
pub async fn delete(
    state: &State<AppState>,
    user: AuthUser,
    budget_id: Uuid,
) -> Result<Json<MessageResponse>, ApiError> {
    budgets::delete_budget(&state.pool, user.user_id, budget_id).await?;
    Ok(Json(MessageResponse::new("Budget deleted")))
}
