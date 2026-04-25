use rocket::serde::json::Json;

use crate::schema::common::MessageResponse;

#[get("/health")]
pub async fn health() -> Json<MessageResponse> {
    Json(MessageResponse::new("ok"))
}
