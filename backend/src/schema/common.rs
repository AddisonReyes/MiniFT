use rocket::form::FromForm;
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct MessageResponse {
    pub message: String,
}

impl MessageResponse {
    pub fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
        }
    }
}

#[derive(Debug, Clone, FromForm)]
pub struct MonthQuery {
    pub month: Option<String>,
}
