use rocket::{
    http::Status,
    request::Request,
    response::{status, Responder},
    serde::json::Json,
};
use serde::Serialize;

#[derive(Debug)]
pub struct ApiError {
    pub status: Status,
    pub message: String,
}

impl ApiError {
    pub fn new(status: Status, message: impl Into<String>) -> Self {
        Self {
            status,
            message: message.into(),
        }
    }

    pub fn bad_request(message: impl Into<String>) -> Self {
        Self::new(Status::BadRequest, message)
    }

    pub fn unauthorized(message: impl Into<String>) -> Self {
        Self::new(Status::Unauthorized, message)
    }

    pub fn forbidden(message: impl Into<String>) -> Self {
        Self::new(Status::Forbidden, message)
    }

    pub fn not_found(message: impl Into<String>) -> Self {
        Self::new(Status::NotFound, message)
    }

    pub fn conflict(message: impl Into<String>) -> Self {
        Self::new(Status::Conflict, message)
    }

    pub fn internal(message: impl Into<String>) -> Self {
        Self::new(Status::InternalServerError, message)
    }
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

impl<'r> Responder<'r, 'static> for ApiError {
    fn respond_to(self, request: &'r Request<'_>) -> rocket::response::Result<'static> {
        status::Custom(
            self.status,
            Json(ErrorResponse {
                error: self.message,
            }),
        )
        .respond_to(request)
    }
}

impl From<sqlx::Error> for ApiError {
    fn from(error: sqlx::Error) -> Self {
        Self::internal(error.to_string())
    }
}
