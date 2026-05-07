use rocket::form::FromForm;
use serde::Serialize;
#[allow(unused_imports)]
use serde_json::json;
use utoipa::{IntoParams, ToSchema};

#[derive(Debug, Clone, Serialize, ToSchema)]
#[schema(example = json!({ "message": "Signed out" }))]
pub struct MessageResponse {
    /// Human-readable status or confirmation message.
    #[schema(example = "Signed out")]
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
    #[param(
        value_type = String,
        format = Date,
        pattern = "^\\d{4}-\\d{2}-\\d{2}$",
        example = "2026-05-01"
    )]
    pub month: Option<String>,
}
