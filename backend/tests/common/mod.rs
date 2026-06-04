#![allow(dead_code)]

use std::{env, sync::Arc};

use minift_backend::{
    config::{
        AppState, AuthConfig, CorsConfig, DocsConfig, EmailConfig, EmailState,
        ExchangeRateProviderConfig, GoogleIntegrationConfig, SeedConfig, WorkerConfig,
    },
    cors,
    db::MIGRATOR,
    routes,
    schema::auth::RegisterRequest,
    services::auth,
};
use resend_rs::Resend;
use rocket::http::SameSite;
use rocket::local::asynchronous::Client;
use sqlx::{postgres::PgPoolOptions, Executor, PgPool};
use uuid::Uuid;

pub struct TestDatabase {
    pub pool: PgPool,
    base_url: String,
    schema: String,
}

pub struct TestApp {
    pub database: TestDatabase,
    pub state: AppState,
    pub client: Client,
}

impl TestDatabase {
    pub async fn new() -> Option<Self> {
        dotenvy::dotenv().ok();

        let base_url = match env::var("TEST_DATABASE_URL").or_else(|_| env::var("DATABASE_URL")) {
            Ok(url) => url,
            Err(_) => {
                eprintln!(
                    "Skipping integration test: set TEST_DATABASE_URL or DATABASE_URL to a Postgres instance"
                );
                return None;
            }
        };

        let schema = format!("test_{}", Uuid::new_v4().simple());
        let admin_pool = match PgPoolOptions::new()
            .max_connections(1)
            .connect(&base_url)
            .await
        {
            Ok(pool) => pool,
            Err(error) => {
                eprintln!("Skipping integration test: unable to connect to Postgres: {error}");
                return None;
            }
        };

        let create_schema_query = format!(r#"CREATE SCHEMA "{schema}""#);

        if let Err(error) = admin_pool.execute(create_schema_query.as_str()).await {
            eprintln!("Skipping integration test: unable to create schema {schema}: {error}");
            return None;
        }

        let search_path_schema = Arc::new(schema.clone());
        let pool = match PgPoolOptions::new()
            .max_connections(5)
            .after_connect(move |connection, _meta| {
                let search_path_schema = Arc::clone(&search_path_schema);

                Box::pin(async move {
                    let set_search_path_query =
                        format!(r#"SET search_path TO "{search_path_schema}""#);
                    connection.execute(set_search_path_query.as_str()).await?;
                    Ok(())
                })
            })
            .connect(&base_url)
            .await
        {
            Ok(pool) => pool,
            Err(error) => {
                eprintln!("Skipping integration test: unable to connect isolated pool: {error}");
                return None;
            }
        };

        if let Err(error) = MIGRATOR.run(&pool).await {
            eprintln!("Skipping integration test: unable to run migrations: {error}");
            return None;
        }

        Some(Self {
            pool,
            base_url,
            schema,
        })
    }

    pub async fn cleanup(self) {
        self.pool.close().await;

        if let Ok(admin_pool) = PgPoolOptions::new()
            .max_connections(1)
            .connect(&self.base_url)
            .await
        {
            let drop_schema_query = format!(r#"DROP SCHEMA IF EXISTS "{}" CASCADE"#, self.schema);
            let _ = admin_pool.execute(drop_schema_query.as_str()).await;
        }
    }
}

impl TestApp {
    pub async fn new() -> Option<Self> {
        let database = TestDatabase::new().await?;
        let state = test_app_state(database.pool.clone());
        let client = Client::tracked(build_test_rocket(state.clone()))
            .await
            .expect("test Rocket client should build");

        Some(Self {
            database,
            state,
            client,
        })
    }

    pub async fn untracked_client(&self) -> Client {
        Client::untracked(build_test_rocket(self.state.clone()))
            .await
            .expect("test Rocket client should build")
    }

    pub async fn cleanup(self) {
        self.database.cleanup().await;
    }
}

pub fn test_auth_config() -> AuthConfig {
    AuthConfig {
        jwt_secret: "integration-test-secret".to_string(),
        access_token_ttl_minutes: 15,
        refresh_token_ttl_days: 30,
        access_cookie_name: "minift_access_token".to_string(),
        refresh_cookie_name: "minift_refresh_token".to_string(),
        cookie_secure: false,
        cookie_same_site: SameSite::Lax,
        cookie_domain: None,
    }
}

pub fn disabled_exchange_rate_provider_config() -> ExchangeRateProviderConfig {
    ExchangeRateProviderConfig {
        enabled: false,
        frankfurter_base_url: "https://api.frankfurter.dev/v2".to_string(),
        request_timeout_seconds: 10,
    }
}

fn test_email_state() -> EmailState {
    EmailState {
        client: Resend::new("re_test_dummy_key"),
        config: EmailConfig {
            from_email: "MiniFT <noreply@example.test>".to_string(),
            app_base_url: "http://localhost:3000".to_string(),
            verification_ttl_hours: 24,
            password_reset_code_ttl_minutes: 15,
        },
    }
}

fn test_google_config() -> GoogleIntegrationConfig {
    GoogleIntegrationConfig {
        client_id: None,
        client_secret: None,
        redirect_url: None,
        token_cipher: None,
        gmail_readonly_scope: "https://www.googleapis.com/auth/gmail.readonly".to_string(),
        sync_interval_seconds: 300,
        request_timeout_seconds: 15,
        max_sync_messages_per_run: 100,
        min_manual_sync_interval_seconds: 60,
        app_base_url: "http://localhost:3000".to_string(),
    }
}

pub fn test_app_state(pool: PgPool) -> AppState {
    AppState {
        pool,
        auth: test_auth_config(),
        cors: CorsConfig::from_allowed_origins(vec!["https://app.example.test".to_string()])
            .expect("test CORS config"),
        worker: WorkerConfig {
            interval_seconds: 60,
        },
        docs: DocsConfig { enabled: false },
        seed: SeedConfig { enabled: false },
        exchange_rates: disabled_exchange_rate_provider_config(),
        google: test_google_config(),
        email: test_email_state(),
    }
}

fn build_test_rocket(state: AppState) -> rocket::Rocket<rocket::Build> {
    rocket::build()
        .manage(state)
        .attach(cors::Cors)
        .mount("/", routes::all())
}

pub async fn register_test_user(
    pool: &PgPool,
    email_prefix: &str,
    currency: &str,
) -> Result<Uuid, minift_backend::errors::ApiError> {
    let email = format!("{email_prefix}-{}@example.test", Uuid::new_v4().simple());
    let registration = auth::register_user(
        pool,
        24,
        RegisterRequest {
            email,
            password: "password123".to_string(),
            currency: Some(currency.to_string()),
        },
    )
    .await?;
    auth::mark_user_email_verified(pool, registration.user.id).await?;

    Ok(registration.user.id)
}

pub async fn register_verified_test_user(
    pool: &PgPool,
    email_prefix: &str,
    currency: &str,
) -> Result<(Uuid, String), minift_backend::errors::ApiError> {
    let email = format!("{email_prefix}-{}@example.test", Uuid::new_v4().simple());
    let registration = auth::register_user(
        pool,
        24,
        RegisterRequest {
            email: email.clone(),
            password: "password123".to_string(),
            currency: Some(currency.to_string()),
        },
    )
    .await?;
    auth::mark_user_email_verified(pool, registration.user.id).await?;

    Ok((registration.user.id, email))
}
