use std::env;

use sqlx::PgPool;

fn normalize_origin(origin: &str) -> Option<String> {
    let trimmed = origin.trim().trim_end_matches('/');

    if trimmed.is_empty() {
        return None;
    }

    Some(trimmed.to_string())
}

fn parse_allowed_origins(value: &str) -> Vec<String> {
    let trimmed = value.trim();

    if trimmed.is_empty() {
        return Vec::new();
    }

    if let Ok(origins) = serde_json::from_str::<Vec<String>>(trimmed) {
        return origins
            .into_iter()
            .filter_map(|origin| normalize_origin(&origin))
            .collect();
    }

    trimmed
        .split(',')
        .filter_map(|origin| {
            normalize_origin(origin.trim().trim_matches(&['[', ']', '"', '\''][..]))
        })
        .collect()
}

#[derive(Debug, Clone)]
pub struct AuthConfig {
    pub jwt_secret: String,
    pub access_token_ttl_minutes: i64,
    pub refresh_token_ttl_days: i64,
}

impl AuthConfig {
    pub fn from_env() -> Self {
        Self {
            jwt_secret: env::var("JWT_SECRET")
                .unwrap_or_else(|_| "mini-ft-local-secret-change-me".to_string()),
            access_token_ttl_minutes: env::var("ACCESS_TOKEN_TTL_MINUTES")
                .ok()
                .and_then(|value| value.parse().ok())
                .unwrap_or(15),
            refresh_token_ttl_days: env::var("REFRESH_TOKEN_TTL_DAYS")
                .ok()
                .and_then(|value| value.parse().ok())
                .unwrap_or(30),
        }
    }
}

#[derive(Debug, Clone)]
pub struct CorsConfig {
    allowed_origins: Vec<String>,
}

impl CorsConfig {
    pub fn from_env() -> Self {
        let raw_origins = env::var("CORS_ALLOWED_ORIGINS")
            .unwrap_or_else(|_| "[\"http://localhost:3000\"]".to_string());

        Self {
            allowed_origins: parse_allowed_origins(&raw_origins),
        }
    }

    pub fn allowed_origin_header(&self, request_origin: &str) -> Option<String> {
        let normalized_origin = normalize_origin(request_origin)?;

        if self
            .allowed_origins
            .iter()
            .any(|allowed_origin| allowed_origin == "*")
        {
            return Some("*".to_string());
        }

        self.allowed_origins
            .iter()
            .find(|allowed_origin| *allowed_origin == &normalized_origin)
            .cloned()
    }
}

#[derive(Debug, Clone)]
pub struct WorkerConfig {
    pub interval_seconds: u64,
}

impl WorkerConfig {
    pub fn from_env() -> Self {
        Self {
            interval_seconds: env::var("RECURRING_WORKER_INTERVAL_SECONDS")
                .ok()
                .and_then(|value| value.parse().ok())
                .unwrap_or(60),
        }
    }
}

#[derive(Debug, Clone)]
pub struct SeedConfig {
    pub enabled: bool,
}

impl SeedConfig {
    pub fn from_env() -> Self {
        Self {
            enabled: env::var("SEED_DEV_DATA")
                .ok()
                .map(|value| {
                    matches!(
                        value.trim().to_ascii_lowercase().as_str(),
                        "1" | "true" | "yes" | "on"
                    )
                })
                .unwrap_or(false),
        }
    }
}

#[derive(Debug, Clone)]
pub struct ExchangeRateProviderConfig {
    pub enabled: bool,
    pub frankfurter_base_url: String,
    pub request_timeout_seconds: u64,
}

impl ExchangeRateProviderConfig {
    pub fn from_env() -> Self {
        Self {
            enabled: env::var("FRANKFURTER_ENABLED")
                .ok()
                .map(|value| {
                    matches!(
                        value.trim().to_ascii_lowercase().as_str(),
                        "1" | "true" | "yes" | "on"
                    )
                })
                .unwrap_or(true),
            frankfurter_base_url: env::var("FRANKFURTER_API_BASE_URL")
                .unwrap_or_else(|_| "https://api.frankfurter.dev/v2".to_string())
                .trim_end_matches('/')
                .to_string(),
            request_timeout_seconds: env::var("FRANKFURTER_TIMEOUT_SECONDS")
                .ok()
                .and_then(|value| value.parse().ok())
                .unwrap_or(10),
        }
    }
}

#[derive(Debug, Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub auth: AuthConfig,
    pub cors: CorsConfig,
    pub worker: WorkerConfig,
    pub seed: SeedConfig,
    pub exchange_rates: ExchangeRateProviderConfig,
}

#[cfg(test)]
mod tests {
    use super::{parse_allowed_origins, CorsConfig, ExchangeRateProviderConfig};

    #[test]
    fn parses_json_array_and_normalizes_trailing_slashes() {
        let origins =
            parse_allowed_origins(r#"["https://minift.pages.dev", "http://localhost:3000/"]"#);

        assert_eq!(
            origins,
            vec![
                "https://minift.pages.dev".to_string(),
                "http://localhost:3000".to_string()
            ]
        );
    }

    #[test]
    fn accepts_csv_fallback_format() {
        let origins = parse_allowed_origins("https://minift.pages.dev, http://localhost:3000/");

        assert_eq!(
            origins,
            vec![
                "https://minift.pages.dev".to_string(),
                "http://localhost:3000".to_string()
            ]
        );
    }

    #[test]
    fn matches_request_origin_after_normalization() {
        let config = CorsConfig {
            allowed_origins: vec!["http://localhost:3000".to_string()],
        };

        assert_eq!(
            config.allowed_origin_header("http://localhost:3000/"),
            Some("http://localhost:3000".to_string())
        );
    }

    #[test]
    fn trims_exchange_rate_provider_base_url() {
        let config = ExchangeRateProviderConfig {
            enabled: true,
            frankfurter_base_url: "https://api.frankfurter.dev/v2/"
                .trim_end_matches('/')
                .to_string(),
            request_timeout_seconds: 10,
        };

        assert_eq!(
            config.frankfurter_base_url,
            "https://api.frankfurter.dev/v2"
        );
    }
}
