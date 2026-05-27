use rocket::{serde::json::Json, State};

use crate::docs::ApiDocsState;

#[get("/api-docs/openapi.json")]
pub async fn openapi_json(state: &State<ApiDocsState>) -> Json<serde_json::Value> {
    Json(state.openapi().clone())
}

#[cfg(test)]
mod tests {
    use rocket::{http::Status, local::blocking::Client};
    use serde_json::json;
    use utoipa_swagger_ui::SwaggerUi;

    use crate::docs::ApiDocsState;

    use super::openapi_json;

    fn build_client() -> Client {
        let docs_state = ApiDocsState::new(json!({
            "openapi": "3.1.0",
            "info": {
                "title": "MiniFT Test Docs",
                "version": "test"
            }
        }));
        let swagger_ui = SwaggerUi::new("/docs/<_..>").config(docs_state.swagger_ui_config());

        Client::tracked(
            rocket::build()
                .manage(docs_state)
                .mount("/", routes![openapi_json])
                .mount("/", swagger_ui),
        )
        .expect("docs test client should build")
    }

    #[test]
    fn swagger_ui_is_public() {
        let client = build_client();

        let response = client.get("/docs/").dispatch();

        assert_eq!(response.status(), Status::Ok);
        assert_eq!(
            response.headers().get_one("Content-Type"),
            Some("text/html")
        );
    }

    #[test]
    fn openapi_json_is_public() {
        let client = build_client();

        let response = client.get("/api-docs/openapi.json").dispatch();

        assert_eq!(response.status(), Status::Ok);

        let body = response
            .into_string()
            .expect("openapi route should return a body");
        assert!(body.contains("\"openapi\":\"3.1.0\""));
        assert!(body.contains("\"title\":\"MiniFT Test Docs\""));
    }
}
