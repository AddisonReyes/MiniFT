use rocket::{response::Redirect, serde::json::Json, State};

use crate::{
    config::AppState,
    errors::{ApiError, ErrorResponse},
    guards::AuthUser,
    schema::{common::MessageResponse, integration::GmailIntegrationStatusResponse},
    services::gmail_sync_service,
};

#[derive(FromForm)]
pub struct GoogleCallbackQuery {
    pub code: String,
    pub state: String,
}

#[utoipa::path(
    get,
    operation_id = "google_connect",
    path = "/api/integrations/google/connect",
    tag = "integrations",
    security(
        ("bearer_auth" = []),
        ("access_cookie_auth" = [])
    ),
    responses(
        (status = 303, description = "Redirects to the Google OAuth consent screen"),
        (status = 401, description = "Authentication required", body = ErrorResponse),
        (status = 500, description = "Google integration is unavailable", body = ErrorResponse)
    )
)]
#[get("/api/integrations/google/connect")]
pub async fn connect(state: &State<AppState>, user: AuthUser) -> Result<Redirect, ApiError> {
    let url = gmail_sync_service::google_connect_url(state, user.user_id)?;
    Ok(Redirect::to(url))
}

#[utoipa::path(
    get,
    operation_id = "google_callback",
    path = "/api/integrations/google/callback",
    tag = "integrations",
    params(
        ("code" = String, Query, description = "Google authorization code"),
        ("state" = String, Query, description = "Signed OAuth state token")
    ),
    responses(
        (status = 303, description = "Redirects back to the MiniFT integrations page"),
        (status = 401, description = "Invalid or expired OAuth state", body = ErrorResponse),
        (status = 500, description = "OAuth exchange failed", body = ErrorResponse)
    )
)]
#[get("/api/integrations/google/callback?<query..>")]
pub async fn callback(
    state: &State<AppState>,
    query: GoogleCallbackQuery,
) -> Result<Redirect, ApiError> {
    let redirect_url = gmail_sync_service::handle_google_callback(
        state.inner().clone(),
        &query.code,
        &query.state,
    )
    .await?;

    Ok(Redirect::to(redirect_url))
}

#[utoipa::path(
    delete,
    operation_id = "google_disconnect",
    path = "/api/integrations/google/disconnect",
    tag = "integrations",
    security(
        ("bearer_auth" = []),
        ("access_cookie_auth" = [])
    ),
    responses(
        (status = 200, description = "Google connection removed", body = MessageResponse),
        (status = 401, description = "Authentication required", body = ErrorResponse),
        (status = 404, description = "Connection not found", body = ErrorResponse)
    )
)]
#[delete("/api/integrations/google/disconnect")]
pub async fn disconnect(
    state: &State<AppState>,
    user: AuthUser,
) -> Result<Json<MessageResponse>, ApiError> {
    gmail_sync_service::disconnect_google_connection(state, user.user_id).await?;
    Ok(Json(MessageResponse::new("Google connection removed")))
}

#[utoipa::path(
    get,
    operation_id = "google_status",
    path = "/api/integrations/google/status",
    tag = "integrations",
    security(
        ("bearer_auth" = []),
        ("access_cookie_auth" = [])
    ),
    responses(
        (status = 200, description = "Google Gmail integration state", body = GmailIntegrationStatusResponse),
        (status = 401, description = "Authentication required", body = ErrorResponse)
    )
)]
#[get("/api/integrations/google/status")]
pub async fn google_status(
    state: &State<AppState>,
    user: AuthUser,
) -> Result<Json<GmailIntegrationStatusResponse>, ApiError> {
    Ok(Json(
        gmail_sync_service::integration_status(state, user.user_id).await?,
    ))
}

#[utoipa::path(
    get,
    operation_id = "gmail_status",
    path = "/api/integrations/gmail",
    tag = "integrations",
    security(
        ("bearer_auth" = []),
        ("access_cookie_auth" = [])
    ),
    responses(
        (status = 200, description = "Gmail integration state", body = GmailIntegrationStatusResponse),
        (status = 401, description = "Authentication required", body = ErrorResponse)
    )
)]
#[get("/api/integrations/gmail")]
pub async fn gmail_status(
    state: &State<AppState>,
    user: AuthUser,
) -> Result<Json<GmailIntegrationStatusResponse>, ApiError> {
    Ok(Json(
        gmail_sync_service::integration_status(state, user.user_id).await?,
    ))
}

#[utoipa::path(
    post,
    operation_id = "gmail_sync",
    path = "/api/integrations/gmail/sync",
    tag = "integrations",
    security(
        ("bearer_auth" = []),
        ("access_cookie_auth" = [])
    ),
    responses(
        (status = 200, description = "Manual Gmail sync requested", body = GmailIntegrationStatusResponse),
        (status = 400, description = "Manual sync rate-limited or connection missing", body = ErrorResponse),
        (status = 401, description = "Authentication required", body = ErrorResponse)
    )
)]
#[post("/api/integrations/gmail/sync")]
pub async fn sync_now(
    state: &State<AppState>,
    user: AuthUser,
) -> Result<Json<GmailIntegrationStatusResponse>, ApiError> {
    Ok(Json(
        gmail_sync_service::trigger_manual_sync(state.inner().clone(), user.user_id).await?,
    ))
}
