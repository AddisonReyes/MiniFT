use rocket::serde::json::Json;

use crate::schema::common::MessageResponse;

#[utoipa::path(
    get,
    operation_id = "health_check",
    path = "/health",
    tag = "system",
    responses(
        (status = 200, description = "Backend health probe succeeded", body = MessageResponse)
    )
)]
#[get("/health")]
pub async fn health() -> Json<MessageResponse> {
    Json(MessageResponse::new("ok"))
}
