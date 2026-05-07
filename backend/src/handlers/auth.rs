use rocket::{
    http::{Cookie, CookieJar},
    serde::json::Json,
    State,
};

use crate::{
    config::AppState,
    errors::{ApiError, ErrorResponse},
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

#[utoipa::path(
    post,
    operation_id = "auth_register",
    path = "/api/auth/register",
    tag = "auth",
    summary = "Register a new user",
    description = "Creates a user, provisions the default cash account, and signs the user in by setting both HttpOnly auth cookies.",
    request_body = RegisterRequest,
    responses(
        (
            status = 200,
            description = "User registered and auth cookies issued",
            body = AuthResponse,
            headers(
                ("Set-Cookie" = String, description = "Sets two HttpOnly cookies: the access cookie and the refresh cookie.")
            )
        ),
        (status = 400, description = "Invalid registration payload", body = ErrorResponse),
        (status = 409, description = "Email already registered", body = ErrorResponse),
        (status = 500, description = "Server error", body = ErrorResponse)
    )
)]
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

#[utoipa::path(
    post,
    operation_id = "auth_login",
    path = "/api/auth/login",
    tag = "auth",
    summary = "Authenticate an existing user",
    description = "Validates credentials and signs the user in by setting both HttpOnly auth cookies.",
    request_body = LoginRequest,
    responses(
        (
            status = 200,
            description = "User authenticated and auth cookies issued",
            body = AuthResponse,
            headers(
                ("Set-Cookie" = String, description = "Sets two HttpOnly cookies: the access cookie and the refresh cookie.")
            )
        ),
        (status = 400, description = "Invalid login payload", body = ErrorResponse),
        (status = 401, description = "Invalid credentials", body = ErrorResponse),
        (status = 500, description = "Server error", body = ErrorResponse)
    )
)]
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

#[utoipa::path(
    post,
    operation_id = "auth_refresh",
    path = "/api/auth/refresh",
    tag = "auth",
    summary = "Rotate the current session",
    description = "Reads the refresh cookie, rotates the persisted refresh session, and sends back fresh auth cookies. This endpoint does not accept a JSON request body.",
    security(
        ("refresh_cookie_auth" = [])
    ),
    responses(
        (
            status = 200,
            description = "Access and refresh cookies rotated successfully",
            body = AuthResponse,
            headers(
                ("Set-Cookie" = String, description = "Sets fresh HttpOnly access and refresh cookies for the rotated session.")
            )
        ),
        (status = 401, description = "Refresh cookie missing, invalid, or expired", body = ErrorResponse),
        (status = 500, description = "Server error", body = ErrorResponse)
    )
)]
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

#[utoipa::path(
    post,
    operation_id = "auth_logout",
    path = "/api/auth/logout",
    tag = "auth",
    summary = "Sign out the current browser session",
    description = "Clears both auth cookies. If a valid refresh cookie is present, its persisted refresh session is revoked as well.",
    responses(
        (
            status = 200,
            description = "Auth cookies cleared and refresh session revoked when present",
            body = MessageResponse,
            headers(
                ("Set-Cookie" = String, description = "Clears the HttpOnly access and refresh cookies from the client.")
            )
        ),
        (status = 500, description = "Server error", body = ErrorResponse)
    )
)]
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

#[utoipa::path(
    get,
    operation_id = "auth_me",
    path = "/api/auth/me",
    tag = "auth",
    summary = "Get the current user profile",
    description = "Returns the authenticated user's profile. Accepts either a Bearer access token or the access cookie.",
    security(
        ("bearer_auth" = []),
        ("access_cookie_auth" = [])
    ),
    responses(
        (status = 200, description = "Current authenticated user profile", body = UserProfile),
        (status = 401, description = "Authentication required or access token invalid", body = ErrorResponse),
        (status = 500, description = "Server error", body = ErrorResponse)
    )
)]
#[get("/api/auth/me")]
pub async fn me(state: &State<AppState>, user: AuthUser) -> Result<Json<UserProfile>, ApiError> {
    Ok(Json(
        auth::get_user_profile(&state.pool, user.user_id).await?,
    ))
}

#[utoipa::path(
    put,
    operation_id = "auth_update_me",
    path = "/api/auth/me",
    tag = "auth",
    summary = "Update the current user's default currency",
    description = "Updates the workspace currency stored on the user profile. This value is also used as the default currency for new accounts.",
    security(
        ("bearer_auth" = []),
        ("access_cookie_auth" = [])
    ),
    request_body = UpdateDefaultCurrencyRequest,
    responses(
        (status = 200, description = "Default user currency updated", body = UserProfile),
        (status = 400, description = "Invalid currency code", body = ErrorResponse),
        (status = 401, description = "Authentication required or access token invalid", body = ErrorResponse),
        (status = 404, description = "User not found", body = ErrorResponse),
        (status = 500, description = "Server error", body = ErrorResponse)
    )
)]
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
