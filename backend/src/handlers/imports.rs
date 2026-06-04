use rocket::{serde::json::Json, State};
use uuid::Uuid;

use crate::{
    config::AppState,
    errors::{ApiError, ErrorResponse},
    guards::{AuthUser, MutatingOrigin},
    schema::imports::{
        ApproveImportRequest, ApproveReadyImportsResponse, EmailTransactionImportResponse,
        ImportListQuery, LinkAccountRequest, RejectImportRequest,
    },
    services::gmail_sync_service,
};

#[utoipa::path(
    get,
    operation_id = "imports_list",
    path = "/api/imports",
    tag = "imports",
    security(
        ("bearer_auth" = []),
        ("access_cookie_auth" = [])
    ),
    params(ImportListQuery),
    responses(
        (status = 200, description = "Imported Gmail transaction candidates", body = [EmailTransactionImportResponse]),
        (status = 401, description = "Authentication required", body = ErrorResponse)
    )
)]
#[get("/api/imports?<query..>")]
pub async fn list(
    state: &State<AppState>,
    user: AuthUser,
    query: Option<ImportListQuery>,
) -> Result<Json<Vec<EmailTransactionImportResponse>>, ApiError> {
    Ok(Json(
        gmail_sync_service::list_imports(&state.pool, user.user_id, query.unwrap_or_default())
            .await?,
    ))
}

#[utoipa::path(
    post,
    operation_id = "imports_approve",
    path = "/api/imports/{import_id}/approve",
    tag = "imports",
    security(
        ("bearer_auth" = []),
        ("access_cookie_auth" = [])
    ),
    request_body = ApproveImportRequest,
    responses(
        (status = 200, description = "Import approved and transaction created", body = EmailTransactionImportResponse),
        (status = 400, description = "Import cannot be approved yet", body = ErrorResponse),
        (status = 401, description = "Authentication required", body = ErrorResponse),
        (status = 404, description = "Import not found", body = ErrorResponse)
    )
)]
#[post(
    "/api/imports/<import_id>/approve",
    format = "json",
    data = "<payload>"
)]
pub async fn approve(
    state: &State<AppState>,
    user: AuthUser,
    import_id: Uuid,
    _origin: MutatingOrigin,
    payload: Json<ApproveImportRequest>,
) -> Result<Json<EmailTransactionImportResponse>, ApiError> {
    Ok(Json(
        gmail_sync_service::approve_import(
            &state.pool,
            user.user_id,
            import_id,
            payload.into_inner(),
        )
        .await?,
    ))
}

#[utoipa::path(
    post,
    operation_id = "imports_reject",
    path = "/api/imports/{import_id}/reject",
    tag = "imports",
    security(
        ("bearer_auth" = []),
        ("access_cookie_auth" = [])
    ),
    request_body = RejectImportRequest,
    responses(
        (status = 200, description = "Import ignored", body = EmailTransactionImportResponse),
        (status = 401, description = "Authentication required", body = ErrorResponse),
        (status = 404, description = "Import not found", body = ErrorResponse)
    )
)]
#[post("/api/imports/<import_id>/reject", format = "json", data = "<payload>")]
pub async fn reject(
    state: &State<AppState>,
    user: AuthUser,
    import_id: Uuid,
    _origin: MutatingOrigin,
    payload: Json<RejectImportRequest>,
) -> Result<Json<EmailTransactionImportResponse>, ApiError> {
    Ok(Json(
        gmail_sync_service::reject_import(
            &state.pool,
            user.user_id,
            import_id,
            payload.into_inner(),
        )
        .await?,
    ))
}

#[utoipa::path(
    post,
    operation_id = "imports_link_account",
    path = "/api/imports/{import_id}/link-account",
    tag = "imports",
    security(
        ("bearer_auth" = []),
        ("access_cookie_auth" = [])
    ),
    request_body = LinkAccountRequest,
    responses(
        (status = 200, description = "Import linked to a MiniFT account", body = EmailTransactionImportResponse),
        (status = 401, description = "Authentication required", body = ErrorResponse),
        (status = 404, description = "Import not found", body = ErrorResponse)
    )
)]
#[post(
    "/api/imports/<import_id>/link-account",
    format = "json",
    data = "<payload>"
)]
pub async fn link_account(
    state: &State<AppState>,
    user: AuthUser,
    import_id: Uuid,
    _origin: MutatingOrigin,
    payload: Json<LinkAccountRequest>,
) -> Result<Json<EmailTransactionImportResponse>, ApiError> {
    Ok(Json(
        gmail_sync_service::link_import_account(
            &state.pool,
            user.user_id,
            import_id,
            payload.into_inner(),
        )
        .await?,
    ))
}

#[utoipa::path(
    post,
    operation_id = "imports_approve_ready",
    path = "/api/imports/approve-ready",
    tag = "imports",
    security(
        ("bearer_auth" = []),
        ("access_cookie_auth" = [])
    ),
    responses(
        (status = 200, description = "Approved all pending imports that are ready", body = ApproveReadyImportsResponse),
        (status = 401, description = "Authentication required", body = ErrorResponse)
    )
)]
#[post("/api/imports/approve-ready")]
pub async fn approve_ready(
    state: &State<AppState>,
    user: AuthUser,
    _origin: MutatingOrigin,
) -> Result<Json<ApproveReadyImportsResponse>, ApiError> {
    Ok(Json(
        gmail_sync_service::approve_ready_imports(&state.pool, user.user_id).await?,
    ))
}
