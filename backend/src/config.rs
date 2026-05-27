use std::env;

use resend_rs::Resend;
use rocket::http::SameSite;
use sqlx::PgPool;

use crate::{logging, security::encryption::TokenCipher};

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

fn parse_optional_env(name: &str) -> Option<String> {
    env::var(name)
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

#[derive(Debug, Clone)]
pub struct AuthConfig {
    pub jwt_secret: String,
    pub access_token_ttl_minutes: i64,
    pub refresh_token_ttl_days: i64,
    pub access_cookie_name: String,
    pub refresh_cookie_name: String,
    pub cookie_secure: bool,
    pub cookie_same_site: SameSite,
    pub cookie_domain: Option<String>,
}

fn parse_bool_env(name: &str, default: bool) -> bool {
    env::var(name)
        .ok()
        .map(|value| {
            matches!(
                value.trim().to_ascii_lowercase().as_str(),
                "1" | "true" | "yes" | "on"
            )
        })
        .unwrap_or(default)
}

fn parse_same_site(value: &str) -> Result<SameSite, String> {
    match value.trim().to_ascii_lowercase().as_str() {
        "lax" => Ok(SameSite::Lax),
        "strict" => Ok(SameSite::Strict),
        "none" => Ok(SameSite::None),
        _ => Err("AUTH_COOKIE_SAME_SITE must be one of: lax, strict, none".to_string()),
    }
}

impl AuthConfig {
    pub fn from_env() -> Result<Self, String> {
        let jwt_secret =
            env::var("JWT_SECRET").map_err(|_| "JWT_SECRET must be set".to_string())?;
        let cookie_same_site = parse_same_site(
            &env::var("AUTH_COOKIE_SAME_SITE").unwrap_or_else(|_| "lax".to_string()),
        )?;
        let cookie_domain = env::var("AUTH_COOKIE_DOMAIN")
            .ok()
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty());

        Ok(Self {
            jwt_secret,
            access_token_ttl_minutes: env::var("ACCESS_TOKEN_TTL_MINUTES")
                .ok()
                .and_then(|value| value.parse().ok())
                .unwrap_or(15),
            refresh_token_ttl_days: env::var("REFRESH_TOKEN_TTL_DAYS")
                .ok()
                .and_then(|value| value.parse().ok())
                .unwrap_or(30),
            access_cookie_name: env::var("ACCESS_COOKIE_NAME")
                .unwrap_or_else(|_| "minift_access_token".to_string()),
            refresh_cookie_name: env::var("REFRESH_COOKIE_NAME")
                .unwrap_or_else(|_| "minift_refresh_token".to_string()),
            cookie_secure: parse_bool_env("AUTH_COOKIE_SECURE", false),
            cookie_same_site,
            cookie_domain,
        })
    }
}

#[derive(Debug, Clone)]
pub struct CorsConfig {
    allowed_origins: Vec<String>,
}

impl CorsConfig {
    pub fn from_env() -> Self {
        let raw_origins = env::var("CORS_ALLOWED_ORIGINS").unwrap_or_else(|_| {
            "[\"http://localhost:3000\",\"http://localhost\",\"https://localhost\"]".to_string()
        });

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
            return Some(normalized_origin);
        }

        self.allowed_origins
            .iter()
            .find(|allowed_origin| *allowed_origin == &normalized_origin)
            .cloned()
    }

    pub fn allowed_origin_count(&self) -> usize {
        self.allowed_origins.len()
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
pub struct GoogleIntegrationConfig {
    pub client_id: Option<String>,
    pub client_secret: Option<String>,
    pub redirect_url: Option<String>,
    pub token_cipher: Option<TokenCipher>,
    pub gmail_readonly_scope: String,
    pub sync_interval_seconds: u64,
    pub request_timeout_seconds: u64,
    pub max_sync_messages_per_run: usize,
    pub min_manual_sync_interval_seconds: u64,
    pub app_base_url: String,
}

impl GoogleIntegrationConfig {
    pub fn from_env() -> Self {
        let token_cipher = parse_optional_env("GOOGLE_TOKEN_ENCRYPTION_KEY").and_then(|value| {
            match TokenCipher::from_encoded_key(&value) {
                Ok(cipher) => Some(cipher),
                Err(error) => {
                    logging::warn(
                        "integrations.google.config.invalid_encryption_key",
                        &[logging::field("error", error)],
                    );
                    None
                }
            }
        });

        Self {
            client_id: parse_optional_env("GOOGLE_CLIENT_ID"),
            client_secret: parse_optional_env("GOOGLE_CLIENT_SECRET"),
            redirect_url: parse_optional_env("GOOGLE_REDIRECT_URL"),
            token_cipher,
            gmail_readonly_scope: "https://www.googleapis.com/auth/gmail.readonly".to_string(),
            sync_interval_seconds: env::var("GMAIL_SYNC_INTERVAL_SECONDS")
                .ok()
                .and_then(|value| value.parse().ok())
                .unwrap_or(300),
            request_timeout_seconds: env::var("GOOGLE_REQUEST_TIMEOUT_SECONDS")
                .ok()
                .and_then(|value| value.parse().ok())
                .unwrap_or(15),
            max_sync_messages_per_run: env::var("GMAIL_MAX_MESSAGES_PER_RUN")
                .ok()
                .and_then(|value| value.parse().ok())
                .unwrap_or(100),
            min_manual_sync_interval_seconds: env::var("GMAIL_MIN_MANUAL_SYNC_INTERVAL_SECONDS")
                .ok()
                .and_then(|value| value.parse().ok())
                .unwrap_or(60),
            app_base_url: env::var("APP_BASE_URL")
                .unwrap_or_else(|_| "http://localhost:3000".to_string())
                .trim_end_matches('/')
                .to_string(),
        }
    }

    pub fn is_configured(&self) -> bool {
        self.client_id.is_some()
            && self.client_secret.is_some()
            && self.redirect_url.is_some()
            && self.token_cipher.is_some()
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
                .map(|_| parse_bool_env("SEED_DEV_DATA", false))
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
                .map(|_| parse_bool_env("FRANKFURTER_ENABLED", true))
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
pub struct EmailConfig {
    pub from_email: String,
    pub app_base_url: String,
    pub verification_ttl_hours: i64,
    pub password_reset_code_ttl_minutes: i64,
}

impl EmailConfig {
    pub fn from_env() -> Self {
        Self {
            from_email: env::var("RESEND_FROM_EMAIL")
                .unwrap_or_else(|_| "MiniFT <onboarding@resend.dev>".to_string()),
            app_base_url: env::var("APP_BASE_URL")
                .unwrap_or_else(|_| "http://localhost:3000".to_string())
                .trim_end_matches('/')
                .to_string(),
            verification_ttl_hours: env::var("EMAIL_VERIFICATION_TTL_HOURS")
                .ok()
                .and_then(|value| value.parse().ok())
                .unwrap_or(24),
            password_reset_code_ttl_minutes: env::var("PASSWORD_RESET_CODE_TTL_MINUTES")
                .ok()
                .and_then(|value| value.parse().ok())
                .unwrap_or(15),
        }
    }
}

#[derive(Clone)]
pub struct EmailState {
    pub client: Resend,
    pub config: EmailConfig,
}

impl EmailState {
    pub fn from_env() -> Result<Self, String> {
        let api_key =
            env::var("RESEND_API_KEY").map_err(|_| "RESEND_API_KEY must be set".to_string())?;

        Ok(Self {
            client: Resend::new(&api_key),
            config: EmailConfig::from_env(),
        })
    }
}

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub auth: AuthConfig,
    pub cors: CorsConfig,
    pub worker: WorkerConfig,
    pub seed: SeedConfig,
    pub exchange_rates: ExchangeRateProviderConfig,
    pub google: GoogleIntegrationConfig,
    pub email: EmailState,
}

#[cfg(test)]
mod tests {
    use rocket::http::SameSite;

    use super::{
        parse_allowed_origins, parse_same_site, CorsConfig, ExchangeRateProviderConfig,
        GoogleIntegrationConfig,
    };

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

    #[test]
    fn parses_cookie_same_site_values() {
        assert!(matches!(parse_same_site("lax"), Ok(SameSite::Lax)));
        assert!(matches!(parse_same_site("strict"), Ok(SameSite::Strict)));
        assert!(matches!(parse_same_site("none"), Ok(SameSite::None)));
    }

    #[test]
    fn google_config_reports_unconfigured_by_default() {
        let config = GoogleIntegrationConfig {
            client_id: None,
            client_secret: None,
            redirect_url: None,
            token_cipher: None,
            gmail_readonly_scope: "scope".to_string(),
            sync_interval_seconds: 300,
            request_timeout_seconds: 15,
            max_sync_messages_per_run: 100,
            min_manual_sync_interval_seconds: 60,
            app_base_url: "http://localhost:3000".to_string(),
        };

        assert!(!config.is_configured());
    }
}
