use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation};
use rocket::{
    http::{Method, Status},
    request::{FromRequest, Outcome, Request},
};
use uuid::Uuid;

use crate::{
    config::AppState,
    errors::ApiError,
    logging::{self, field},
    models::auth::{TokenClaims, TokenKind},
};

#[derive(Debug, Clone)]
pub struct AuthUser {
    pub user_id: Uuid,
}

#[derive(Debug, Clone)]
pub struct MutatingOrigin;

fn has_bearer_authorization(request: &Request<'_>) -> bool {
    request
        .headers()
        .get_one("Authorization")
        .and_then(|header| header.strip_prefix("Bearer "))
        .is_some_and(|token| !token.trim().is_empty())
}

fn is_mutating_method(method: Method) -> bool {
    matches!(
        method,
        Method::Post | Method::Put | Method::Patch | Method::Delete
    )
}

fn has_safe_fetch_site(request: &Request<'_>) -> bool {
    request
        .headers()
        .get_one("Sec-Fetch-Site")
        .is_some_and(|value| matches!(value, "same-origin" | "same-site" | "none"))
}

#[rocket::async_trait]
impl<'r> FromRequest<'r> for MutatingOrigin {
    type Error = ApiError;

    async fn from_request(request: &'r Request<'_>) -> Outcome<Self, Self::Error> {
        if !is_mutating_method(request.method()) || has_bearer_authorization(request) {
            return Outcome::Success(Self);
        }

        if has_safe_fetch_site(request) {
            return Outcome::Success(Self);
        }

        let Some(origin) = request.headers().get_one("Origin") else {
            logging::warn(
                "auth.origin.rejected",
                &[
                    field("method", request.method().as_str()),
                    field("path", request.uri().path().to_string()),
                    field("reason", "missing_origin"),
                ],
            );

            return Outcome::Error((
                Status::Forbidden,
                ApiError::forbidden("Origin is required for credentialed requests"),
            ));
        };

        let allowed_origin = request
            .rocket()
            .state::<AppState>()
            .and_then(|state| state.cors.allowed_origin_header(origin))
            .or_else(|| {
                request
                    .rocket()
                    .state::<crate::config::CorsConfig>()
                    .and_then(|cors| cors.allowed_origin_header(origin))
            });

        if allowed_origin.is_some() {
            return Outcome::Success(Self);
        }

        logging::warn(
            "auth.origin.rejected",
            &[
                field("method", request.method().as_str()),
                field("path", request.uri().path().to_string()),
                field("origin", origin),
            ],
        );

        Outcome::Error((
            Status::Forbidden,
            ApiError::forbidden("Origin is not allowed for credentialed requests"),
        ))
    }
}

#[rocket::async_trait]
impl<'r> FromRequest<'r> for AuthUser {
    type Error = ApiError;

    async fn from_request(request: &'r Request<'_>) -> Outcome<Self, Self::Error> {
        let log_failure = |reason: &str| {
            logging::warn(
                "auth.request.rejected",
                &[
                    field("reason", reason),
                    field("method", request.method().as_str()),
                    field("path", request.uri().path().to_string()),
                    field("client_ip", request.client_ip().map(|ip| ip.to_string())),
                ],
            );
        };

        let Some(state) = request.rocket().state::<AppState>() else {
            log_failure("missing_application_state");
            return Outcome::Error((
                Status::InternalServerError,
                ApiError::internal("Application state is unavailable"),
            ));
        };

        let token = if let Some(auth_header) = request.headers().get_one("Authorization") {
            let Some(token) = auth_header.strip_prefix("Bearer ") else {
                log_failure("invalid_authorization_scheme");
                return Outcome::Error((
                    Status::Unauthorized,
                    ApiError::unauthorized("Invalid authorization scheme"),
                ));
            };

            token.to_string()
        } else if let Some(cookie) = request
            .cookies()
            .get(state.auth.access_cookie_name.as_str())
        {
            cookie.value().to_string()
        } else {
            log_failure("authentication_required");
            return Outcome::Error((
                Status::Unauthorized,
                ApiError::unauthorized("Authentication required"),
            ));
        };

        let mut validation = Validation::new(Algorithm::HS256);
        validation.validate_exp = true;

        let claims = match decode::<TokenClaims>(
            &token,
            &DecodingKey::from_secret(state.auth.jwt_secret.as_bytes()),
            &validation,
        ) {
            Ok(token_data) => token_data.claims,
            Err(_) => {
                log_failure("invalid_or_expired_token");
                return Outcome::Error((
                    Status::Unauthorized,
                    ApiError::unauthorized("Invalid or expired token"),
                ));
            }
        };

        if claims.token_kind != TokenKind::Access {
            log_failure("access_token_required");
            return Outcome::Error((
                Status::Unauthorized,
                ApiError::unauthorized("Access token required"),
            ));
        }

        Outcome::Success(AuthUser {
            user_id: claims.sub,
        })
    }
}

#[cfg(test)]
mod tests {
    use rocket::{http::Status, local::blocking::Client};

    use super::MutatingOrigin;
    use crate::config::CorsConfig;

    #[post("/guarded")]
    fn guarded(_origin: MutatingOrigin) -> &'static str {
        "ok"
    }

    fn client() -> Client {
        let cors =
            CorsConfig::from_allowed_origins(vec!["https://app.example".to_string()]).unwrap();

        Client::tracked(rocket::build().manage(cors).mount("/", routes![guarded]))
            .expect("test client should build")
    }

    #[test]
    fn mutating_origin_rejects_missing_origin() {
        let client = client();
        let response = client.post("/guarded").dispatch();

        assert_eq!(response.status(), Status::Forbidden);
    }

    #[test]
    fn mutating_origin_allows_configured_origin() {
        let client = client();
        let response = client
            .post("/guarded")
            .header(rocket::http::Header::new("Origin", "https://app.example"))
            .dispatch();

        assert_eq!(response.status(), Status::Ok);
    }

    #[test]
    fn mutating_origin_allows_safe_fetch_site_without_origin() {
        let client = client();
        let response = client
            .post("/guarded")
            .header(rocket::http::Header::new("Sec-Fetch-Site", "same-origin"))
            .dispatch();

        assert_eq!(response.status(), Status::Ok);
    }

    #[test]
    fn mutating_origin_allows_bearer_clients() {
        let client = client();
        let response = client
            .post("/guarded")
            .header(rocket::http::Header::new("Origin", "https://evil.example"))
            .header(rocket::http::Header::new("Authorization", "Bearer token"))
            .dispatch();

        assert_eq!(response.status(), Status::Ok);
    }

    #[test]
    fn mutating_origin_rejects_foreign_origin() {
        let client = client();
        let response = client
            .post("/guarded")
            .header(rocket::http::Header::new("Origin", "https://evil.example"))
            .dispatch();

        assert_eq!(response.status(), Status::Forbidden);
    }
}
