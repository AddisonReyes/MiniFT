use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation};
use rocket::{
    http::Status,
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
