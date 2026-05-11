use utoipa::{
    openapi::{
        info::License,
        schema::Components,
        security::{ApiKey, ApiKeyValue, HttpAuthScheme, HttpBuilder, SecurityScheme},
        Server,
    },
    OpenApi,
};

use crate::config::AppState;

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::handlers::health::health,
        crate::handlers::integrations::connect,
        crate::handlers::integrations::callback,
        crate::handlers::integrations::disconnect,
        crate::handlers::integrations::google_status,
        crate::handlers::integrations::gmail_status,
        crate::handlers::integrations::sync_now,
        crate::handlers::imports::list,
        crate::handlers::imports::approve,
        crate::handlers::imports::reject,
        crate::handlers::imports::link_account,
        crate::handlers::auth::register,
        crate::handlers::auth::resend_verification,
        crate::handlers::auth::verify_email,
        crate::handlers::auth::login,
        crate::handlers::auth::request_password_reset,
        crate::handlers::auth::confirm_password_reset,
        crate::handlers::auth::request_password_change,
        crate::handlers::auth::confirm_password_change,
        crate::handlers::auth::refresh,
        crate::handlers::auth::logout,
        crate::handlers::auth::me,
        crate::handlers::auth::update_me,
        crate::handlers::accounts::list,
        crate::handlers::accounts::get,
        crate::handlers::accounts::create,
        crate::handlers::accounts::update,
        crate::handlers::accounts::delete,
        crate::handlers::exchange_rates::list,
        crate::handlers::exchange_rates::replace,
        crate::handlers::transactions::list,
        crate::handlers::transactions::get,
        crate::handlers::transactions::create,
        crate::handlers::transactions::update,
        crate::handlers::transactions::delete,
        crate::handlers::transactions::monthly_summary,
        crate::handlers::transactions::category_summary,
        crate::handlers::budgets::list,
        crate::handlers::budgets::get,
        crate::handlers::budgets::create,
        crate::handlers::budgets::update,
        crate::handlers::budgets::delete,
        crate::handlers::transfers::list,
        crate::handlers::transfers::create,
        crate::handlers::transfers::delete,
        crate::handlers::recurring::list,
        crate::handlers::recurring::create,
        crate::handlers::recurring::update,
        crate::handlers::recurring::delete
    ),
    tags(
        (name = "system", description = "Operational endpoints for health checks and backend status."),
        (name = "integrations", description = "Google OAuth connection management and Gmail sync orchestration."),
        (name = "imports", description = "Review and approve Gmail-derived bank transaction imports."),
        (name = "auth", description = "Registration, verification, password recovery, cookie rotation, and current-user profile endpoints."),
        (name = "accounts", description = "User-owned financial accounts and balances."),
        (name = "exchange_rates", description = "Effective and manual exchange rates used for conversions."),
        (name = "transactions", description = "Income, expense, transfer mirrors, and summary reporting."),
        (name = "budgets", description = "Monthly category budgets and spend tracking."),
        (name = "transfers", description = "Account-to-account transfers with mirrored transaction entries."),
        (name = "recurring", description = "Recurring income and expense rules materialized by the background worker.")
    )
)]
pub struct ApiDoc;

pub fn build_openapi(state: &AppState) -> utoipa::openapi::OpenApi {
    let mut doc = ApiDoc::openapi();

    doc.info.title = "MiniFT Backend API".to_string();
    doc.info.version = env!("CARGO_PKG_VERSION").to_string();
    doc.info.license = Some({
        let mut license = License::new("PolyForm Noncommercial 1.0.0");
        license.url = Some("https://polyformproject.org/licenses/noncommercial/1.0.0".to_string());
        license
    });
    doc.info.description = Some(
        format!(
            r#"
Cookie-backed personal finance API for MiniFT.

### Authentication
- Browser clients should authenticate through the HttpOnly cookies set by `POST /api/auth/verify-email`, `POST /api/auth/login`, `POST /api/auth/password/change/confirm`, and `POST /api/auth/refresh`.
- `POST /api/auth/register` creates the account and sends the verification email, but it does not sign the browser in immediately.
- Protected endpoints also accept `Authorization: Bearer <access-token>` for non-browser clients and manual testing.
- `POST /api/auth/refresh` reads the `{}` refresh cookie, rotates the persisted refresh session, and sends back fresh auth cookies.
- `POST /api/auth/logout` clears both auth cookies and revokes the refresh session when present.
- Password recovery is handled by the public `POST /api/auth/password/reset/request` and `POST /api/auth/password/reset/confirm` endpoints.

### Conventions
- Request and response bodies are JSON unless noted otherwise.
- Monetary amounts are serialized as strings to preserve decimal precision.
- Dates use `YYYY-MM-DD`; timestamps use ISO 8601 UTC.
- Error responses use the shape `{{ "error": "..." }}`.

### Documentation endpoints
- Swagger UI: `/docs`
- OpenAPI JSON: `/api-docs/openapi.json`
            "#,
            state.auth.refresh_cookie_name
        )
        .trim()
        .to_string(),
    );
    doc.servers = Some(vec![
        {
            let mut server = Server::new("/");
            server.description = Some("Current deployment".to_string());
            server
        },
        {
            let mut server = Server::new("http://localhost:8000");
            server.description = Some("Local backend".to_string());
            server
        },
    ]);

    let components = doc.components.get_or_insert_with(Components::new);
    components.add_security_scheme(
        "bearer_auth",
        SecurityScheme::Http(
            HttpBuilder::new()
                .scheme(HttpAuthScheme::Bearer)
                .bearer_format("JWT")
                .description(Some(
                    "Optional alternative to cookie auth for scripts, mobile clients, or manual testing.",
                ))
                .build(),
        ),
    );
    components.add_security_scheme(
        "access_cookie_auth",
        SecurityScheme::ApiKey(ApiKey::Cookie(ApiKeyValue::with_description(
            state.auth.access_cookie_name.clone(),
            format!(
                "HttpOnly access token cookie used by browser clients. Current configured name: `{}`.",
                state.auth.access_cookie_name
            ),
        ))),
    );
    components.add_security_scheme(
        "refresh_cookie_auth",
        SecurityScheme::ApiKey(ApiKey::Cookie(ApiKeyValue::with_description(
            state.auth.refresh_cookie_name.clone(),
            format!(
                "HttpOnly refresh token cookie used by refresh and logout flows. Current configured name: `{}`.",
                state.auth.refresh_cookie_name
            ),
        ))),
    );

    doc
}
