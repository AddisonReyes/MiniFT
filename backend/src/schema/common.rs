use rocket::form::FromForm;
use serde::Serialize;
use utoipa::{IntoParams, ToSchema};

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct MessageResponse {
    /// Human-readable status or confirmation message.
    pub message: String,
}

impl MessageResponse {
    pub fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
        }
    }
}

#[derive(Debug, Clone, FromForm, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct MonthQuery {
    /// Month anchor in `YYYY-MM-DD` format. The backend normalizes the day to the first of the month.
    pub month: Option<String>,
}
