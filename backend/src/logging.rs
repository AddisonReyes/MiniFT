use std::time::Instant;

use chrono::Utc;
use rocket::{
    fairing::{Fairing, Info, Kind},
    request::Request,
    response::Response,
};
use serde::Serialize;
use serde_json::{Map, Value};

pub type LogField = (&'static str, Value);

pub fn field<T>(key: &'static str, value: T) -> LogField
where
    T: Serialize,
{
    let value = serde_json::to_value(value)
        .unwrap_or_else(|error| Value::String(format!("serialization_error:{error}")));

    (key, value)
}

fn emit(level: &str, event: &str, fields: &[LogField]) {
    let mut payload = Map::new();
    payload.insert(
        "timestamp".to_string(),
        Value::String(Utc::now().to_rfc3339()),
    );
    payload.insert("level".to_string(), Value::String(level.to_string()));
    payload.insert(
        "service".to_string(),
        Value::String("minift-backend".to_string()),
    );
    payload.insert("event".to_string(), Value::String(event.to_string()));

    for (key, value) in fields {
        payload.insert((*key).to_string(), value.clone());
    }

    let line = serde_json::to_string(&payload).unwrap_or_else(|error| {
        format!(
            "{{\"timestamp\":\"{}\",\"level\":\"ERROR\",\"service\":\"minift-backend\",\"event\":\"logging.serialization_failed\",\"details\":\"{}\"}}",
            Utc::now().to_rfc3339(),
            error
        )
    });

    match level {
        "ERROR" => eprintln!("{line}"),
        _ => println!("{line}"),
    }
}

pub fn info(event: &str, fields: &[LogField]) {
    emit("INFO", event, fields);
}

pub fn warn(event: &str, fields: &[LogField]) {
    emit("WARN", event, fields);
}

pub fn error(event: &str, fields: &[LogField]) {
    emit("ERROR", event, fields);
}

pub struct HttpLogger;

#[rocket::async_trait]
impl Fairing for HttpLogger {
    fn info(&self) -> Info {
        Info {
            name: "HTTP Request Logger",
            kind: Kind::Request | Kind::Response,
        }
    }

    async fn on_request(&self, request: &mut Request<'_>, _data: &mut rocket::Data<'_>) {
        request.local_cache(Instant::now);
    }

    async fn on_response<'r>(&self, request: &'r Request<'_>, response: &mut Response<'r>) {
        let started_at = request.local_cache(Instant::now);
        let duration_ms = started_at.elapsed().as_millis() as u64;
        let status_code = response.status().code;
        let route = request.route().map(|route| route.uri.to_string());
        let fields = [
            field("method", request.method().as_str()),
            field("uri", request.uri().to_string()),
            field("route", route),
            field("status", status_code),
            field("duration_ms", duration_ms),
            field("client_ip", request.client_ip().map(|ip| ip.to_string())),
            field("origin", request.headers().get_one("Origin")),
        ];

        if status_code >= 500 {
            error("http.request.completed", &fields);
        } else if status_code >= 400 {
            warn("http.request.completed", &fields);
        } else {
            info("http.request.completed", &fields);
        }
    }
}
