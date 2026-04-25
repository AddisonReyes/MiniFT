use rocket::{serde::json::Json, State};
use uuid::Uuid;

use crate::{
    config::AppState,
    errors::ApiError,
    guards::AuthUser,
    schema::{
        common::{MessageResponse, MonthQuery},
        transaction::{
            CategorySummaryQuery, CategorySummaryResponse, CreateTransactionRequest,
            MonthlySummaryResponse, TransactionFilters, TransactionResponse,
            UpdateTransactionRequest,
        },
    },
    services::transactions,
};

#[get("/api/transactions?<filters..>")]
pub async fn list(
    state: &State<AppState>,
    user: AuthUser,
    filters: Option<TransactionFilters>,
) -> Result<Json<Vec<TransactionResponse>>, ApiError> {
    Ok(Json(
        transactions::list_transactions(
            &state.pool,
            user.user_id,
            filters.unwrap_or(TransactionFilters {
                r#type: None,
                category: None,
                account_id: None,
                start_date: None,
                end_date: None,
            }),
        )
        .await?,
    ))
}

#[post("/api/transactions", format = "json", data = "<payload>")]
pub async fn create(
    state: &State<AppState>,
    user: AuthUser,
    payload: Json<CreateTransactionRequest>,
) -> Result<Json<TransactionResponse>, ApiError> {
    Ok(Json(
        transactions::create_transaction(&state.pool, user.user_id, payload.into_inner()).await?,
    ))
}

#[get("/api/transactions/<transaction_id>")]
pub async fn get(
    state: &State<AppState>,
    user: AuthUser,
    transaction_id: Uuid,
) -> Result<Json<TransactionResponse>, ApiError> {
    Ok(Json(
        transactions::get_transaction(&state.pool, user.user_id, transaction_id).await?,
    ))
}

#[put(
    "/api/transactions/<transaction_id>",
    format = "json",
    data = "<payload>"
)]
pub async fn update(
    state: &State<AppState>,
    user: AuthUser,
    transaction_id: Uuid,
    payload: Json<UpdateTransactionRequest>,
) -> Result<Json<TransactionResponse>, ApiError> {
    Ok(Json(
        transactions::update_transaction(
            &state.pool,
            user.user_id,
            transaction_id,
            payload.into_inner(),
        )
        .await?,
    ))
}

#[delete("/api/transactions/<transaction_id>")]
pub async fn delete(
    state: &State<AppState>,
    user: AuthUser,
    transaction_id: Uuid,
) -> Result<Json<MessageResponse>, ApiError> {
    transactions::delete_transaction(&state.pool, user.user_id, transaction_id).await?;
    Ok(Json(MessageResponse::new("Transaction deleted")))
}

#[get("/api/transactions/summary/month?<query..>")]
pub async fn monthly_summary(
    state: &State<AppState>,
    user: AuthUser,
    query: Option<MonthQuery>,
) -> Result<Json<MonthlySummaryResponse>, ApiError> {
    Ok(Json(
        transactions::monthly_summary(
            &state.pool,
            user.user_id,
            query.and_then(|query| query.month),
        )
        .await?,
    ))
}

#[get("/api/transactions/summary/categories?<query..>")]
pub async fn category_summary(
    state: &State<AppState>,
    user: AuthUser,
    query: Option<CategorySummaryQuery>,
) -> Result<Json<CategorySummaryResponse>, ApiError> {
    Ok(Json(
        transactions::category_summary(
            &state.pool,
            user.user_id,
            query.unwrap_or(CategorySummaryQuery {
                month: None,
                r#type: None,
            }),
        )
        .await?,
    ))
}
