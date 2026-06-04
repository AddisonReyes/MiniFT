use rocket::{serde::json::Json, Build, Rocket, State};
use utoipa_swagger_ui::SwaggerUi;

use crate::docs::ApiDocsState;

#[get("/api-docs/openapi.json")]
pub async fn openapi_json(state: &State<ApiDocsState>) -> Json<serde_json::Value> {
    Json(state.openapi().clone())
}

pub fn mount_docs_routes(
    rocket: Rocket<Build>,
    docs_state: ApiDocsState,
    docs_enabled: bool,
) -> Rocket<Build> {
    if !docs_enabled {
        return rocket;
    }

    let swagger_ui = SwaggerUi::new("/docs/<_..>").config(docs_state.swagger_ui_config());

    rocket
        .manage(docs_state)
        .mount("/", routes![openapi_json])
        .mount("/", swagger_ui)
}

#[cfg(test)]
mod tests {
    use rocket::{http::Status, local::blocking::Client};
    use serde_json::json;

    use crate::docs::ApiDocsState;

    use super::mount_docs_routes;

    fn build_client(docs_enabled: bool) -> Client {
        let docs_state = ApiDocsState::new(json!({
            "openapi": "3.1.0",
            "info": {
                "title": "MiniFT Test Docs",
                "version": "test"
            }
        }));
        let rocket = mount_docs_routes(rocket::build(), docs_state, docs_enabled);

        Client::tracked(rocket).expect("docs test client should build")
    }

    #[test]
    fn swagger_ui_is_available_when_docs_are_enabled() {
        let client = build_client(true);

        let response = client.get("/docs/").dispatch();

        assert_eq!(response.status(), Status::Ok);
        assert_eq!(
            response.headers().get_one("Content-Type"),
            Some("text/html")
        );
    }

    #[test]
    fn openapi_json_is_available_when_docs_are_enabled() {
        let client = build_client(true);

        let response = client.get("/api-docs/openapi.json").dispatch();

        assert_eq!(response.status(), Status::Ok);

        let body = response
            .into_string()
            .expect("openapi route should return a body");
        assert!(body.contains("\"openapi\":\"3.1.0\""));
        assert!(body.contains("\"title\":\"MiniFT Test Docs\""));
    }

    #[test]
    fn docs_routes_are_not_mounted_when_disabled() {
        let client = build_client(false);

        assert_eq!(client.get("/docs/").dispatch().status(), Status::NotFound);
        assert_eq!(
            client.get("/api-docs/openapi.json").dispatch().status(),
            Status::NotFound
        );
    }
}
