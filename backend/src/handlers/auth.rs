use rocket::{
    http::{Cookie, CookieJar},
    serde::json::Json,
    State,
};

use crate::{
    config::AppState,
    errors::{ApiError, ErrorResponse},
    guards::AuthUser,
    logging::{self, field},
    models::auth::UserProfile,
    schema::{
        auth::{
            AuthResponse, ConfirmPasswordChangeRequest, ConfirmPasswordResetRequest, LoginRequest,
            PasswordResetRequest, RegisterRequest, RegistrationResponse, ResendVerificationRequest,
            UpdateDefaultCurrencyRequest, VerifyEmailRequest,
        },
        common::MessageResponse,
    },
    services::{auth, email, email::PasswordCodeEmailKind},
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
    description = "Creates a user, provisions the default cash account, and sends a verification email. The browser session is created only after the verification link is completed.",
    request_body = RegisterRequest,
    responses(
        (
            status = 200,
            description = "User created and verification email flow started",
            body = RegistrationResponse
        ),
        (status = 400, description = "Invalid registration payload", body = ErrorResponse),
        (status = 409, description = "Email already registered", body = ErrorResponse),
        (status = 500, description = "Server error", body = ErrorResponse)
    )
)]
#[post("/api/auth/register", format = "json", data = "<payload>")]
pub async fn register(
    state: &State<AppState>,
    payload: Json<RegisterRequest>,
) -> Result<Json<RegistrationResponse>, ApiError> {
    let registration = auth::register_user(
        &state.pool,
        state.email.config.verification_ttl_hours,
        payload.into_inner(),
    )
    .await?;
    let email_address = registration.user.email.clone();
    let message = match email::send_verification_email(
        &state.email,
        &email_address,
        &registration.verification_token,
    )
    .await
    {
        Ok(()) => "Account created. Check your email to verify it.".to_string(),
        Err(error) => {
            logging::error(
                "auth.register.verification_email.failed",
                &[
                    field("email", &email_address),
                    field("error", &error.message),
                ],
            );
            "Account created, but the verification email could not be sent yet. Request a new verification link from the app."
                .to_string()
        }
    };

    Ok(Json(RegistrationResponse {
        message,
        email: email_address,
    }))
}

#[utoipa::path(
    post,
    operation_id = "auth_resend_verification",
    path = "/api/auth/register/resend-verification",
    tag = "auth",
    summary = "Resend a verification email",
    description = "If the email belongs to an existing unverified account, a fresh verification link is generated and sent.",
    request_body = ResendVerificationRequest,
    responses(
        (status = 200, description = "Resend request accepted", body = MessageResponse),
        (status = 400, description = "Invalid email address", body = ErrorResponse),
        (status = 500, description = "Server error", body = ErrorResponse)
    )
)]
#[post(
    "/api/auth/register/resend-verification",
    format = "json",
    data = "<payload>"
)]
pub async fn resend_verification(
    state: &State<AppState>,
    payload: Json<ResendVerificationRequest>,
) -> Result<Json<MessageResponse>, ApiError> {
    let email_address = payload.email.clone();

    if let Some(delivery) = auth::prepare_verification_email(
        &state.pool,
        &email_address,
        state.email.config.verification_ttl_hours,
    )
    .await?
    {
        email::send_verification_email(&state.email, &delivery.email, &delivery.verification_token)
            .await?;
    }

    Ok(Json(MessageResponse::new(
        "If an unverified account exists for that email, a new verification link has been sent.",
    )))
}

#[utoipa::path(
    post,
    operation_id = "auth_verify_email",
    path = "/api/auth/verify-email",
    tag = "auth",
    summary = "Verify an email address and start a browser session",
    description = "Consumes the verification token from the email link, marks the user as verified, and signs the browser in by setting both HttpOnly auth cookies.",
    request_body = VerifyEmailRequest,
    responses(
        (
            status = 200,
            description = "Email verified and auth cookies issued",
            body = AuthResponse,
            headers(
                ("Set-Cookie" = String, description = "Sets two HttpOnly cookies: the access cookie and the refresh cookie.")
            )
        ),
        (status = 401, description = "Verification token missing, invalid, or expired", body = ErrorResponse),
        (status = 404, description = "User not found", body = ErrorResponse),
        (status = 500, description = "Server error", body = ErrorResponse)
    )
)]
#[post("/api/auth/verify-email", format = "json", data = "<payload>")]
pub async fn verify_email(
    state: &State<AppState>,
    cookies: &CookieJar<'_>,
    payload: Json<VerifyEmailRequest>,
) -> Result<Json<AuthResponse>, ApiError> {
    let session = auth::verify_email_token(&state.pool, &state.auth, &payload.token).await?;
    set_auth_cookies(cookies, state, &session);
    Ok(Json(auth::auth_response(&session)))
}

#[utoipa::path(
    post,
    operation_id = "auth_login",
    path = "/api/auth/login",
    tag = "auth",
    summary = "Authenticate an existing user",
    description = "Validates credentials and signs the user in by setting both HttpOnly auth cookies. Email verification must be completed before login succeeds.",
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
        (status = 403, description = "Email address has not been verified yet", body = ErrorResponse),
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
    operation_id = "auth_request_password_reset",
    path = "/api/auth/password/reset/request",
    tag = "auth",
    summary = "Request a password reset code",
    description = "If the email belongs to an account, a one-time reset code is sent to that address.",
    request_body = PasswordResetRequest,
    responses(
        (status = 200, description = "Reset request accepted", body = MessageResponse),
        (status = 400, description = "Invalid email address", body = ErrorResponse),
        (status = 500, description = "Server error", body = ErrorResponse)
    )
)]
#[post(
    "/api/auth/password/reset/request",
    format = "json",
    data = "<payload>"
)]
pub async fn request_password_reset(
    state: &State<AppState>,
    payload: Json<PasswordResetRequest>,
) -> Result<Json<MessageResponse>, ApiError> {
    if let Some(delivery) = auth::request_password_reset_code(
        &state.pool,
        &payload.email,
        state.email.config.password_reset_code_ttl_minutes,
    )
    .await?
    {
        email::send_password_code_email(
            &state.email,
            &delivery.email,
            &delivery.code,
            PasswordCodeEmailKind::Reset,
        )
        .await?;
    }

    Ok(Json(MessageResponse::new(
        "If that email exists in MiniFT, a reset code has been sent.",
    )))
}

#[utoipa::path(
    post,
    operation_id = "auth_confirm_password_reset",
    path = "/api/auth/password/reset/confirm",
    tag = "auth",
    summary = "Confirm a password reset with an emailed code",
    description = "Consumes the latest active reset code for the email address, updates the password, and revokes existing refresh sessions.",
    request_body = ConfirmPasswordResetRequest,
    responses(
        (status = 200, description = "Password updated successfully", body = MessageResponse),
        (status = 400, description = "Invalid input or mismatched passwords", body = ErrorResponse),
        (status = 401, description = "Reset code missing, invalid, or expired", body = ErrorResponse),
        (status = 500, description = "Server error", body = ErrorResponse)
    )
)]
#[post(
    "/api/auth/password/reset/confirm",
    format = "json",
    data = "<payload>"
)]
pub async fn confirm_password_reset(
    state: &State<AppState>,
    payload: Json<ConfirmPasswordResetRequest>,
) -> Result<Json<MessageResponse>, ApiError> {
    auth::confirm_password_reset(&state.pool, payload.into_inner()).await?;

    Ok(Json(MessageResponse::new(
        "Password updated. You can now sign in with the new password.",
    )))
}

#[utoipa::path(
    post,
    operation_id = "auth_request_password_change",
    path = "/api/auth/password/change/request",
    tag = "auth",
    summary = "Send a password change code to the current user",
    description = "Generates a one-time code and emails it to the authenticated user's address.",
    security(
        ("bearer_auth" = []),
        ("access_cookie_auth" = [])
    ),
    responses(
        (status = 200, description = "Change code sent", body = MessageResponse),
        (status = 401, description = "Authentication required or access token invalid", body = ErrorResponse),
        (status = 404, description = "User not found", body = ErrorResponse),
        (status = 500, description = "Server error", body = ErrorResponse)
    )
)]
#[post("/api/auth/password/change/request")]
pub async fn request_password_change(
    state: &State<AppState>,
    user: AuthUser,
) -> Result<Json<MessageResponse>, ApiError> {
    let delivery = auth::request_password_change_code(
        &state.pool,
        user.user_id,
        state.email.config.password_reset_code_ttl_minutes,
    )
    .await?;

    email::send_password_code_email(
        &state.email,
        &delivery.email,
        &delivery.code,
        PasswordCodeEmailKind::Change,
    )
    .await?;

    Ok(Json(MessageResponse::new(
        "A confirmation code has been sent to your email.",
    )))
}

#[utoipa::path(
    post,
    operation_id = "auth_confirm_password_change",
    path = "/api/auth/password/change/confirm",
    tag = "auth",
    summary = "Confirm a password change from settings",
    description = "Consumes the latest active password-change code, updates the password, revokes previous refresh sessions, and issues a fresh browser session for the current client.",
    security(
        ("bearer_auth" = []),
        ("access_cookie_auth" = [])
    ),
    request_body = ConfirmPasswordChangeRequest,
    responses(
        (
            status = 200,
            description = "Password changed and fresh auth cookies issued",
            body = AuthResponse,
            headers(
                ("Set-Cookie" = String, description = "Sets two fresh HttpOnly auth cookies for the current browser.")
            )
        ),
        (status = 400, description = "Invalid input or mismatched passwords", body = ErrorResponse),
        (status = 401, description = "Authentication required, access token invalid, or code invalid", body = ErrorResponse),
        (status = 404, description = "User not found", body = ErrorResponse),
        (status = 500, description = "Server error", body = ErrorResponse)
    )
)]
#[post(
    "/api/auth/password/change/confirm",
    format = "json",
    data = "<payload>"
)]
pub async fn confirm_password_change(
    state: &State<AppState>,
    cookies: &CookieJar<'_>,
    user: AuthUser,
    payload: Json<ConfirmPasswordChangeRequest>,
) -> Result<Json<AuthResponse>, ApiError> {
    let session =
        auth::confirm_password_change(&state.pool, &state.auth, user.user_id, payload.into_inner())
            .await?;
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
        (status = 403, description = "Email address has not been verified yet", body = ErrorResponse),
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
