use std::path::PathBuf;

use rocket::{
    fairing::{Fairing, Info, Kind},
    http::{Header, Method, Status},
    request::Request,
    response::Response,
};

pub struct Cors;

fn apply_cors_headers(response: &mut Response<'_>) {
    response.set_header(Header::new("Access-Control-Allow-Origin", "*"));
    response.set_header(Header::new(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    ));
    response.set_header(Header::new(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization",
    ));
    response.set_header(Header::new("Access-Control-Max-Age", "86400"));
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
        apply_cors_headers(response);

        if request.method() == Method::Options && response.status() == Status::NotFound {
            response.set_status(Status::NoContent);
        }
    }
}

#[options("/api/<_path..>")]
pub fn preflight(_path: PathBuf) -> Status {
    Status::NoContent
}
