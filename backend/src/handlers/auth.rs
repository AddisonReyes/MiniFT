use rocket::{serde::json::Json, State};

use crate::{
    config::AppState,
    errors::ApiError,
    guards::AuthUser,
    models::auth::UserProfile,
    schema::auth::{AuthResponse, LoginRequest, RefreshRequest, RegisterRequest},
    services::auth,
};

#[post("/api/auth/register", format = "json", data = "<payload>")]
pub async fn register(
    state: &State<AppState>,
    payload: Json<RegisterRequest>,
) -> Result<Json<AuthResponse>, ApiError> {
    Ok(Json(
        auth::register_user(&state.pool, &state.auth, payload.into_inner()).await?,
    ))
}

#[post("/api/auth/login", format = "json", data = "<payload>")]
pub async fn login(
    state: &State<AppState>,
    payload: Json<LoginRequest>,
) -> Result<Json<AuthResponse>, ApiError> {
    Ok(Json(
        auth::login_user(&state.pool, &state.auth, payload.into_inner()).await?,
    ))
}

#[post("/api/auth/refresh", format = "json", data = "<payload>")]
pub async fn refresh(
    state: &State<AppState>,
    payload: Json<RefreshRequest>,
) -> Result<Json<AuthResponse>, ApiError> {
    Ok(Json(
        auth::refresh_session(&state.pool, &state.auth, payload.into_inner()).await?,
    ))
}

#[get("/api/auth/me")]
pub async fn me(state: &State<AppState>, user: AuthUser) -> Result<Json<UserProfile>, ApiError> {
    Ok(Json(
        auth::get_user_profile(&state.pool, user.user_id).await?,
    ))
}
