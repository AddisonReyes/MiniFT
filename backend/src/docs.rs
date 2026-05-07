use utoipa::{
    openapi::{
        schema::Components,
        security::{ApiKey, ApiKeyValue, Http, HttpAuthScheme, SecurityScheme},
    },
    OpenApi,
};

use crate::config::AppState;

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::handlers::health::health,
        crate::handlers::auth::register,
        crate::handlers::auth::login,
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
        (name = "auth", description = "Registration, login, cookie rotation, and current-user profile endpoints."),
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
    doc.info.description = Some(
        format!(
            r#"
Cookie-backed personal finance API for MiniFT.

### What you can do here
- Register and authenticate users with rotating refresh sessions.
- Manage accounts, transactions, budgets, transfers, recurring rules, and exchange rates.
- Inspect reporting endpoints for monthly totals and category breakdowns.

### Authentication notes
- Protected endpoints accept either a Bearer access token or the `{}` HttpOnly access cookie.
- `POST /api/auth/refresh` reads the `{}` HttpOnly refresh cookie and rotates the persisted session.
- Auth response bodies return the current user profile only. Tokens are issued through cookies.

### Documentation endpoints
- Swagger UI: `/docs`
- OpenAPI JSON: `/api-docs/openapi.json`
            "#,
            state.auth.access_cookie_name, state.auth.refresh_cookie_name
        )
        .trim()
        .to_string(),
    );

    let components = doc.components.get_or_insert_with(Components::new);
    components.add_security_scheme(
        "bearer_auth",
        SecurityScheme::Http(Http::new(HttpAuthScheme::Bearer)),
    );
    components.add_security_scheme(
        "access_cookie_auth",
        SecurityScheme::ApiKey(ApiKey::Cookie(ApiKeyValue::with_description(
            state.auth.access_cookie_name.clone(),
            format!(
                "HttpOnly access token cookie. Current configured name: `{}`.",
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
