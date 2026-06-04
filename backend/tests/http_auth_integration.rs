mod common;

use common::{register_verified_test_user, TestApp};
use rocket::{
    http::{Header, Status},
    local::asynchronous::LocalResponse,
};
use serde_json::{json, Value};

const ALLOWED_ORIGIN: &str = "https://app.example.test";

fn set_cookie_headers(response: &LocalResponse<'_>, cookie_name: &str) -> Vec<String> {
    let cookie_prefix = format!("{cookie_name}=");

    response
        .headers()
        .get("Set-Cookie")
        .filter(|header| header.starts_with(&cookie_prefix))
        .map(ToString::to_string)
        .collect()
}

fn assert_auth_cookie_header(header: &str, cookie_name: &str) {
    assert!(
        header.starts_with(&format!("{cookie_name}=")),
        "cookie header should start with {cookie_name}=, got {header}"
    );
    assert!(
        header.to_ascii_lowercase().contains("httponly"),
        "auth cookie should be HttpOnly: {header}"
    );
    assert!(
        header.to_ascii_lowercase().contains("samesite=lax"),
        "auth cookie should preserve SameSite=Lax: {header}"
    );
    assert!(
        header.to_ascii_lowercase().contains("path=/"),
        "auth cookie should be scoped to the app root: {header}"
    );
}

fn cookie_value_from_header(header: &str, cookie_name: &str) -> String {
    let cookie_prefix = format!("{cookie_name}=");
    header
        .strip_prefix(&cookie_prefix)
        .and_then(|value| value.split(';').next())
        .expect("set-cookie header should contain a cookie value")
        .to_string()
}

async fn assert_error(response: LocalResponse<'_>, status: Status, message: &str) {
    assert_eq!(response.status(), status);

    let body = response
        .into_json::<Value>()
        .await
        .expect("error response should be JSON");

    assert_eq!(body["error"], message);
}

#[tokio::test]
async fn login_sets_http_only_cookies_and_cookie_session_can_read_profile() {
    let Some(app) = TestApp::new().await else {
        return;
    };

    let (_user_id, email) =
        register_verified_test_user(&app.database.pool, "http-login-cookies", "USD")
            .await
            .expect("verified test user");

    let login_response = app
        .client
        .post("/api/auth/login")
        .header(Header::new("Origin", ALLOWED_ORIGIN))
        .json(&json!({
            "email": email,
            "password": "password123",
        }))
        .dispatch()
        .await;

    assert_eq!(login_response.status(), Status::Ok);

    let access_cookie_headers =
        set_cookie_headers(&login_response, &app.state.auth.access_cookie_name);
    let refresh_cookie_headers =
        set_cookie_headers(&login_response, &app.state.auth.refresh_cookie_name);

    assert_eq!(access_cookie_headers.len(), 1);
    assert_eq!(refresh_cookie_headers.len(), 1);
    assert_auth_cookie_header(
        &access_cookie_headers[0],
        &app.state.auth.access_cookie_name,
    );
    assert_auth_cookie_header(
        &refresh_cookie_headers[0],
        &app.state.auth.refresh_cookie_name,
    );

    let login_body = login_response
        .into_json::<Value>()
        .await
        .expect("login response should be JSON");
    assert_eq!(login_body["user"]["email"], email);

    let profile_response = app.client.get("/api/auth/me").dispatch().await;
    assert_eq!(profile_response.status(), Status::Ok);

    let profile_body = profile_response
        .into_json::<Value>()
        .await
        .expect("profile response should be JSON");
    assert_eq!(profile_body["email"], email);

    app.cleanup().await;
}

#[tokio::test]
async fn protected_endpoints_require_authentication() {
    let Some(app) = TestApp::new().await else {
        return;
    };

    let profile_response = app.client.get("/api/auth/me").dispatch().await;
    assert_error(
        profile_response,
        Status::Unauthorized,
        "Authentication required",
    )
    .await;

    let accounts_response = app.client.get("/api/accounts").dispatch().await;
    assert_error(
        accounts_response,
        Status::Unauthorized,
        "Authentication required",
    )
    .await;

    app.cleanup().await;
}

#[tokio::test]
async fn mutating_cookie_requests_reject_untrusted_origins() {
    let Some(app) = TestApp::new().await else {
        return;
    };

    let (_user_id, email) =
        register_verified_test_user(&app.database.pool, "http-origin-guard", "USD")
            .await
            .expect("verified test user");

    let response = app
        .client
        .post("/api/auth/login")
        .header(Header::new("Origin", "https://evil.example.test"))
        .json(&json!({
            "email": email,
            "password": "password123",
        }))
        .dispatch()
        .await;

    assert_eq!(response.status(), Status::Forbidden);
    drop(response);

    app.cleanup().await;
}

#[tokio::test]
async fn mutating_cookie_requests_reject_missing_origin() {
    let Some(app) = TestApp::new().await else {
        return;
    };

    let (_user_id, email) =
        register_verified_test_user(&app.database.pool, "http-missing-origin", "USD")
            .await
            .expect("verified test user");

    let response = app
        .client
        .post("/api/auth/login")
        .json(&json!({
            "email": email,
            "password": "password123",
        }))
        .dispatch()
        .await;

    assert_eq!(response.status(), Status::Forbidden);
    drop(response);

    app.cleanup().await;
}

#[tokio::test]
async fn refresh_rotates_refresh_cookie_and_rejects_reusing_the_old_token() {
    let Some(app) = TestApp::new().await else {
        return;
    };

    let (user_id, email) =
        register_verified_test_user(&app.database.pool, "http-refresh-rotation", "USD")
            .await
            .expect("verified test user");

    let login_response = app
        .client
        .post("/api/auth/login")
        .header(Header::new("Origin", ALLOWED_ORIGIN))
        .json(&json!({
            "email": email,
            "password": "password123",
        }))
        .dispatch()
        .await;

    assert_eq!(login_response.status(), Status::Ok);
    let old_refresh_cookie_header =
        set_cookie_headers(&login_response, &app.state.auth.refresh_cookie_name)
            .into_iter()
            .next()
            .expect("login should set refresh cookie");
    let old_refresh_token = cookie_value_from_header(
        &old_refresh_cookie_header,
        &app.state.auth.refresh_cookie_name,
    );

    let refresh_response = app
        .client
        .post("/api/auth/refresh")
        .header(Header::new("Origin", ALLOWED_ORIGIN))
        .dispatch()
        .await;
    assert_eq!(refresh_response.status(), Status::Ok);
    let new_refresh_cookie_header =
        set_cookie_headers(&refresh_response, &app.state.auth.refresh_cookie_name)
            .into_iter()
            .next()
            .expect("refresh should set replacement refresh cookie");
    let new_refresh_token = cookie_value_from_header(
        &new_refresh_cookie_header,
        &app.state.auth.refresh_cookie_name,
    );

    assert_ne!(old_refresh_token, new_refresh_token);
    drop(login_response);
    drop(refresh_response);

    let untracked_client = app.untracked_client().await;
    let reused_response = untracked_client
        .post("/api/auth/refresh")
        .header(Header::new("Origin", ALLOWED_ORIGIN))
        .header(Header::new(
            "Cookie",
            format!(
                "{}={}",
                app.state.auth.refresh_cookie_name, old_refresh_token
            ),
        ))
        .dispatch()
        .await;

    assert_error(
        reused_response,
        Status::Unauthorized,
        "Invalid or expired refresh token",
    )
    .await;

    let active_refresh_session_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)::bigint
         FROM refresh_sessions
         WHERE user_id = $1
           AND revoked_at IS NULL",
    )
    .bind(user_id)
    .fetch_one(&app.database.pool)
    .await
    .expect("refresh session count");

    assert_eq!(active_refresh_session_count, 0);

    let profile_response = app.client.get("/api/auth/me").dispatch().await;
    assert_eq!(profile_response.status(), Status::Ok);
    drop(profile_response);

    app.cleanup().await;
}

#[tokio::test]
async fn logout_clears_cookie_session_and_revokes_refresh_session() {
    let Some(app) = TestApp::new().await else {
        return;
    };

    let (user_id, email) = register_verified_test_user(&app.database.pool, "http-logout", "USD")
        .await
        .expect("verified test user");

    let login_response = app
        .client
        .post("/api/auth/login")
        .header(Header::new("Origin", ALLOWED_ORIGIN))
        .json(&json!({
            "email": email,
            "password": "password123",
        }))
        .dispatch()
        .await;
    assert_eq!(login_response.status(), Status::Ok);
    drop(login_response);

    let logout_response = app
        .client
        .post("/api/auth/logout")
        .header(Header::new("Origin", ALLOWED_ORIGIN))
        .dispatch()
        .await;
    assert_eq!(logout_response.status(), Status::Ok);
    assert_eq!(
        set_cookie_headers(&logout_response, &app.state.auth.access_cookie_name).len(),
        1
    );
    assert_eq!(
        set_cookie_headers(&logout_response, &app.state.auth.refresh_cookie_name).len(),
        1
    );
    drop(logout_response);

    let active_refresh_session_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)::bigint
         FROM refresh_sessions
         WHERE user_id = $1
           AND revoked_at IS NULL",
    )
    .bind(user_id)
    .fetch_one(&app.database.pool)
    .await
    .expect("refresh session count");

    assert_eq!(active_refresh_session_count, 0);

    let profile_response = app.client.get("/api/auth/me").dispatch().await;
    assert_error(
        profile_response,
        Status::Unauthorized,
        "Authentication required",
    )
    .await;

    app.cleanup().await;
}
