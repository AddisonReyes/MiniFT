use std::path::PathBuf;

use rocket::{
    fairing::{Fairing, Info, Kind},
    http::{Header, Method, Status},
    request::Request,
    response::Response,
};

use crate::config::AppState;

pub struct Cors;

fn apply_cors_headers(response: &mut Response<'_>, allowed_origin: &str) {
    response.set_header(Header::new(
        "Access-Control-Allow-Origin",
        allowed_origin.to_string(),
    ));
    response.set_header(Header::new(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    ));
    response.set_header(Header::new(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization",
    ));
    response.set_header(Header::new("Access-Control-Max-Age", "86400"));

    if allowed_origin != "*" {
        response.set_header(Header::new("Vary", "Origin"));
    }
}

#[rocket::async_trait]
impl Fairing for Cors {
    fn info(&self) -> Info {
        Info {
            name: "CORS Headers",
            kind: Kind::Response,
        }
    }

    async fn on_response<'r>(&self, request: &'r Request<'_>, response: &mut Response<'r>) {
        if request.method() == Method::Options && response.status() == Status::NotFound {
            response.set_status(Status::NoContent);
        }

        let Some(origin) = request.headers().get_one("Origin") else {
            return;
        };

        let Some(state) = request.rocket().state::<AppState>() else {
            return;
        };

        let Some(allowed_origin) = state.cors.allowed_origin_header(origin) else {
            return;
        };

        apply_cors_headers(response, &allowed_origin);
    }
}

#[options("/api/<_path..>")]
pub fn preflight(_path: PathBuf) -> Status {
    Status::NoContent
}
