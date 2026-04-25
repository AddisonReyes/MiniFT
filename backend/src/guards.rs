use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation};
use rocket::{
    http::Status,
    request::{FromRequest, Outcome, Request},
};
use uuid::Uuid;

use crate::{
    config::AppState,
    errors::ApiError,
    models::auth::{TokenClaims, TokenKind},
};

#[derive(Debug, Clone)]
pub struct AuthUser {
    pub user_id: Uuid,
    pub email: String,
}

#[rocket::async_trait]
impl<'r> FromRequest<'r> for AuthUser {
    type Error = ApiError;

    async fn from_request(request: &'r Request<'_>) -> Outcome<Self, Self::Error> {
        let Some(state) = request.rocket().state::<AppState>() else {
            return Outcome::Error((
                Status::InternalServerError,
                ApiError::internal("Application state is unavailable"),
            ));
        };

        let Some(auth_header) = request.headers().get_one("Authorization") else {
            return Outcome::Error((
                Status::Unauthorized,
                ApiError::unauthorized("Missing Authorization header"),
            ));
        };

        let Some(token) = auth_header.strip_prefix("Bearer ") else {
            return Outcome::Error((
                Status::Unauthorized,
                ApiError::unauthorized("Invalid authorization scheme"),
            ));
        };

        let mut validation = Validation::new(Algorithm::HS256);
        validation.validate_exp = true;

        let claims = match decode::<TokenClaims>(
            token,
            &DecodingKey::from_secret(state.auth.jwt_secret.as_bytes()),
            &validation,
        ) {
            Ok(token_data) => token_data.claims,
            Err(_) => {
                return Outcome::Error((
                    Status::Unauthorized,
                    ApiError::unauthorized("Invalid or expired token"),
                ))
            }
        };

        if claims.token_kind != TokenKind::Access {
            return Outcome::Error((
                Status::Unauthorized,
                ApiError::unauthorized("Access token required"),
            ));
        }

        Outcome::Success(AuthUser {
            user_id: claims.sub,
            email: claims.email,
        })
    }
}
