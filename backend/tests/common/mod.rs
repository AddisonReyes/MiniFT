use std::{env, sync::Arc};

use minift_backend::{
    config::AuthConfig, db::MIGRATOR, schema::auth::RegisterRequest, services::auth,
};
use rocket::http::SameSite;
use sqlx::{postgres::PgPoolOptions, Executor, PgPool};
use uuid::Uuid;

pub struct TestDatabase {
    pub pool: PgPool,
    base_url: String,
    schema: String,
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

pub async fn register_test_user(
    pool: &PgPool,
    email_prefix: &str,
    currency: &str,
) -> Result<Uuid, minift_backend::errors::ApiError> {
    let email = format!("{email_prefix}-{}@example.test", Uuid::new_v4().simple());
    let auth_response = auth::register_user(
        pool,
        &test_auth_config(),
        RegisterRequest {
            email,
            password: "password123".to_string(),
            currency: Some(currency.to_string()),
        },
    )
    .await?;

    Ok(auth_response.user.id)
}
