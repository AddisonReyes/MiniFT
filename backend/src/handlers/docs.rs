use rocket::{
    http::{Header, Status},
    request::Request,
    response::{Responder, Response},
    serde::json::Json,
    State,
};
use utoipa_swagger_ui::BasicAuth as SwaggerBasicAuth;

use crate::docs::ApiDocsState;

const DOCS_BASIC_AUTH_CHALLENGE: &str = "Basic realm=\":\"";

#[derive(Debug, Clone, Copy)]
pub struct DocsUnauthorized;

impl<'r> Responder<'r, 'static> for DocsUnauthorized {
    fn respond_to(self, _: &'r Request<'_>) -> rocket::response::Result<'static> {
        Response::build()
            .status(Status::Unauthorized)
            .header(Header::new("WWW-Authenticate", DOCS_BASIC_AUTH_CHALLENGE))
            .ok()
    }
}

fn authorize_docs_request(
    state: &State<ApiDocsState>,
    auth: Result<SwaggerBasicAuth, ()>,
) -> Result<(), DocsUnauthorized> {
    match auth {
        Ok(auth) if state.is_authorized(&auth.username, &auth.password) => Ok(()),
        _ => Err(DocsUnauthorized),
    }
}

#[get("/api-docs/openapi.json")]
pub async fn openapi_json(
    state: &State<ApiDocsState>,
    auth: Result<SwaggerBasicAuth, ()>,
) -> Result<Json<serde_json::Value>, DocsUnauthorized> {
    authorize_docs_request(state, auth)?;

    Ok(Json(state.openapi().clone()))
}

#[cfg(test)]
mod tests {
    use base64::{prelude::BASE64_STANDARD, Engine};
    use rocket::{
        http::{Header, Status},
        local::blocking::Client,
    };
    use serde_json::json;
    use utoipa_swagger_ui::SwaggerUi;

    use crate::{config::DocsBasicAuthCredentials, docs::ApiDocsState};

    use super::{openapi_json, DOCS_BASIC_AUTH_CHALLENGE};

    fn authorized_header() -> Header<'static> {
        Header::new(
            "Authorization",
            format!("Basic {}", BASE64_STANDARD.encode("docs:super-secret")),
        )
    }

    fn build_client() -> Client {
        let docs_state = ApiDocsState::new(
            json!({
                "openapi": "3.1.0",
                "info": {
                    "title": "MiniFT Test Docs",
                    "version": "test"
                }
            }),
            DocsBasicAuthCredentials {
                username: "docs".to_string(),
                password: "super-secret".to_string(),
            },
        );
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
    fn swagger_ui_requires_basic_auth() {
        let client = build_client();

        let response = client.get("/docs/").dispatch();

        assert_eq!(response.status(), Status::Unauthorized);
        assert_eq!(
            response.headers().get_one("WWW-Authenticate"),
            Some(DOCS_BASIC_AUTH_CHALLENGE)
        );
    }

    #[test]
    fn openapi_json_requires_basic_auth() {
        let client = build_client();

        let response = client.get("/api-docs/openapi.json").dispatch();

        assert_eq!(response.status(), Status::Unauthorized);
        assert_eq!(
            response.headers().get_one("WWW-Authenticate"),
            Some(DOCS_BASIC_AUTH_CHALLENGE)
        );
    }

    #[test]
    fn docs_routes_accept_valid_basic_auth() {
        let client = build_client();

        let swagger_response = client.get("/docs/").header(authorized_header()).dispatch();
        assert_eq!(swagger_response.status(), Status::Ok);
        assert_eq!(
            swagger_response.headers().get_one("Content-Type"),
            Some("text/html")
        );

        let json_response = client
            .get("/api-docs/openapi.json")
            .header(authorized_header())
            .dispatch();
        assert_eq!(json_response.status(), Status::Ok);

        let body = json_response
            .into_string()
            .expect("openapi route should return a body");
        assert!(body.contains("\"openapi\":\"3.1.0\""));
        assert!(body.contains("\"title\":\"MiniFT Test Docs\""));
    }
}
