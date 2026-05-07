use rocket::{serde::json::Json, State};
use uuid::Uuid;

use crate::{
    config::AppState,
    errors::{ApiError, ErrorResponse},
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

#[utoipa::path(
    get,
    path = "/api/transactions",
    tag = "transactions",
    security(
        ("bearer_auth" = []),
        ("access_cookie_auth" = [])
    ),
    params(TransactionFilters),
    responses(
        (status = 200, description = "Transactions matching the supplied filters", body = [TransactionResponse]),
        (status = 400, description = "Invalid query filter values", body = ErrorResponse),
        (status = 401, description = "Authentication required or access token invalid", body = ErrorResponse),
        (status = 500, description = "Server error", body = ErrorResponse)
    )
)]
#[get("/api/transactions?<filters..>")]
pub async fn list(
    state: &State<AppState>,
    user: AuthUser,
    filters: Option<TransactionFilters>,
) -> Result<Json<Vec<TransactionResponse>>, ApiError> {
    Ok(Json(
        transactions::list_transactions(&state.pool, user.user_id, filters.unwrap_or_default())
            .await?,
    ))
}

#[utoipa::path(
    post,
    path = "/api/transactions",
    tag = "transactions",
    security(
        ("bearer_auth" = []),
        ("access_cookie_auth" = [])
    ),
    request_body = CreateTransactionRequest,
    responses(
        (status = 200, description = "Transaction created successfully", body = TransactionResponse),
        (status = 400, description = "Invalid transaction payload or transfer type submitted to the wrong endpoint", body = ErrorResponse),
        (status = 401, description = "Authentication required or access token invalid", body = ErrorResponse),
        (status = 404, description = "Referenced account not found", body = ErrorResponse),
        (status = 500, description = "Server error", body = ErrorResponse)
    )
)]
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

#[utoipa::path(
    get,
    path = "/api/transactions/{transaction_id}",
    tag = "transactions",
    security(
        ("bearer_auth" = []),
        ("access_cookie_auth" = [])
    ),
    params(
        ("transaction_id" = Uuid, Path, description = "Transaction identifier")
    ),
    responses(
        (status = 200, description = "Single transaction entry", body = TransactionResponse),
        (status = 401, description = "Authentication required or access token invalid", body = ErrorResponse),
        (status = 404, description = "Transaction not found", body = ErrorResponse),
        (status = 500, description = "Server error", body = ErrorResponse)
    )
)]
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

#[utoipa::path(
    put,
    path = "/api/transactions/{transaction_id}",
    tag = "transactions",
    security(
        ("bearer_auth" = []),
        ("access_cookie_auth" = [])
    ),
    params(
        ("transaction_id" = Uuid, Path, description = "Transaction identifier")
    ),
    request_body = UpdateTransactionRequest,
    responses(
        (status = 200, description = "Transaction updated successfully", body = TransactionResponse),
        (status = 400, description = "Invalid transaction payload or attempted transfer modification", body = ErrorResponse),
        (status = 401, description = "Authentication required or access token invalid", body = ErrorResponse),
        (status = 404, description = "Transaction or referenced account not found", body = ErrorResponse),
        (status = 500, description = "Server error", body = ErrorResponse)
    )
)]
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

#[utoipa::path(
    delete,
    path = "/api/transactions/{transaction_id}",
    tag = "transactions",
    security(
        ("bearer_auth" = []),
        ("access_cookie_auth" = [])
    ),
    params(
        ("transaction_id" = Uuid, Path, description = "Transaction identifier")
    ),
    responses(
        (status = 200, description = "Transaction deleted successfully", body = MessageResponse),
        (status = 400, description = "Transfer-mirrored entries must be deleted through the transfers endpoint", body = ErrorResponse),
        (status = 401, description = "Authentication required or access token invalid", body = ErrorResponse),
        (status = 404, description = "Transaction not found", body = ErrorResponse),
        (status = 500, description = "Server error", body = ErrorResponse)
    )
)]
#[delete("/api/transactions/<transaction_id>")]
pub async fn delete(
    state: &State<AppState>,
    user: AuthUser,
    transaction_id: Uuid,
) -> Result<Json<MessageResponse>, ApiError> {
    transactions::delete_transaction(&state.pool, user.user_id, transaction_id).await?;
    Ok(Json(MessageResponse::new("Transaction deleted")))
}

#[utoipa::path(
    get,
    path = "/api/transactions/summary/month",
    tag = "transactions",
    security(
        ("bearer_auth" = []),
        ("access_cookie_auth" = [])
    ),
    params(MonthQuery),
    responses(
        (status = 200, description = "Income, expense, and net totals for a month", body = MonthlySummaryResponse),
        (status = 400, description = "Invalid month value", body = ErrorResponse),
        (status = 401, description = "Authentication required or access token invalid", body = ErrorResponse),
        (status = 500, description = "Server error", body = ErrorResponse)
    )
)]
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

#[utoipa::path(
    get,
    path = "/api/transactions/summary/categories",
    tag = "transactions",
    security(
        ("bearer_auth" = []),
        ("access_cookie_auth" = [])
    ),
    params(CategorySummaryQuery),
    responses(
        (status = 200, description = "Category totals and percentages for a month", body = CategorySummaryResponse),
        (status = 400, description = "Invalid month or unsupported transaction type", body = ErrorResponse),
        (status = 401, description = "Authentication required or access token invalid", body = ErrorResponse),
        (status = 500, description = "Server error", body = ErrorResponse)
    )
)]
#[get("/api/transactions/summary/categories?<query..>")]
pub async fn category_summary(
    state: &State<AppState>,
    user: AuthUser,
    query: Option<CategorySummaryQuery>,
) -> Result<Json<CategorySummaryResponse>, ApiError> {
    Ok(Json(
        transactions::category_summary(&state.pool, user.user_id, query.unwrap_or_default())
            .await?,
    ))
}
