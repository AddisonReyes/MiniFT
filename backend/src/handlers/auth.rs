use rocket::{
    http::{Cookie, CookieJar},
    serde::json::Json,
    State,
};

use crate::{
    config::AppState,
    errors::ApiError,
    guards::AuthUser,
    models::auth::UserProfile,
    schema::{
        auth::{AuthResponse, LoginRequest, RegisterRequest, UpdateDefaultCurrencyRequest},
        common::MessageResponse,
    },
    services::auth,
};

fn add_auth_cookie(
    cookies: &CookieJar<'_>,
    state: &AppState,
    name: &str,
    value: &str,
    max_age: rocket::time::Duration,
) {
    let mut builder = Cookie::build((name.to_string(), value.to_string()))
        .path("/")
        .http_only(true)
        .same_site(state.auth.cookie_same_site)
        .secure(state.auth.cookie_secure)
        .max_age(max_age);

    if let Some(domain) = &state.auth.cookie_domain {
        builder = builder.domain(domain.clone());
    }

    cookies.add(builder.build());
}

fn remove_auth_cookie(cookies: &CookieJar<'_>, state: &AppState, name: &str) {
    let mut cookie = Cookie::build((name.to_string(), String::new()))
        .path("/")
        .http_only(true)
        .same_site(state.auth.cookie_same_site)
        .secure(state.auth.cookie_secure);

    if let Some(domain) = &state.auth.cookie_domain {
        cookie = cookie.domain(domain.clone());
    }

    let mut cookie = cookie.build();
    cookie.make_removal();
    cookies.add(cookie);
}

fn set_auth_cookies(cookies: &CookieJar<'_>, state: &AppState, session: &auth::IssuedAuthSession) {
    add_auth_cookie(
        cookies,
        state,
        &state.auth.access_cookie_name,
        &session.access_token,
        rocket::time::Duration::minutes(state.auth.access_token_ttl_minutes),
    );
    add_auth_cookie(
        cookies,
        state,
        &state.auth.refresh_cookie_name,
        &session.refresh_token,
        rocket::time::Duration::days(state.auth.refresh_token_ttl_days),
    );
}

fn clear_auth_cookies(cookies: &CookieJar<'_>, state: &AppState) {
    remove_auth_cookie(cookies, state, &state.auth.access_cookie_name);
    remove_auth_cookie(cookies, state, &state.auth.refresh_cookie_name);
}

#[post("/api/auth/register", format = "json", data = "<payload>")]
pub async fn register(
    state: &State<AppState>,
    cookies: &CookieJar<'_>,
    payload: Json<RegisterRequest>,
) -> Result<Json<AuthResponse>, ApiError> {
    let session = auth::register_user(&state.pool, &state.auth, payload.into_inner()).await?;
    set_auth_cookies(cookies, state, &session);
    Ok(Json(auth::auth_response(&session)))
}

#[post("/api/auth/login", format = "json", data = "<payload>")]
pub async fn login(
    state: &State<AppState>,
    cookies: &CookieJar<'_>,
    payload: Json<LoginRequest>,
) -> Result<Json<AuthResponse>, ApiError> {
    let session = auth::login_user(&state.pool, &state.auth, payload.into_inner()).await?;
    set_auth_cookies(cookies, state, &session);
    Ok(Json(auth::auth_response(&session)))
}

#[post("/api/auth/refresh")]
pub async fn refresh(
    state: &State<AppState>,
    cookies: &CookieJar<'_>,
) -> Result<Json<AuthResponse>, ApiError> {
    let refresh_token = cookies
        .get(state.auth.refresh_cookie_name.as_str())
        .map(|cookie| cookie.value().to_string())
        .ok_or_else(|| ApiError::unauthorized("Refresh token is required"))?;

    let session = auth::refresh_session(&state.pool, &state.auth, &refresh_token).await?;
    set_auth_cookies(cookies, state, &session);
    Ok(Json(auth::auth_response(&session)))
}

#[post("/api/auth/logout")]
pub async fn logout(
    state: &State<AppState>,
    cookies: &CookieJar<'_>,
) -> Result<Json<MessageResponse>, ApiError> {
    let refresh_token = cookies
        .get(state.auth.refresh_cookie_name.as_str())
        .map(|cookie| cookie.value().to_string());

    auth::logout_session(&state.pool, refresh_token.as_deref()).await?;
    clear_auth_cookies(cookies, state);

    Ok(Json(MessageResponse::new("Signed out")))
}

#[get("/api/auth/me")]
pub async fn me(state: &State<AppState>, user: AuthUser) -> Result<Json<UserProfile>, ApiError> {
    Ok(Json(
        auth::get_user_profile(&state.pool, user.user_id).await?,
    ))
}

#[put("/api/auth/me", format = "json", data = "<payload>")]
pub async fn update_me(
    state: &State<AppState>,
    user: AuthUser,
    payload: Json<UpdateDefaultCurrencyRequest>,
) -> Result<Json<UserProfile>, ApiError> {
    Ok(Json(
        auth::update_default_currency(&state.pool, user.user_id, payload.into_inner()).await?,
    ))
}
