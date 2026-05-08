use std::time::Duration;

use sqlx::{migrate::Migrator, postgres::PgPoolOptions, PgPool};

use crate::logging::{self, field};

pub static MIGRATOR: Migrator = sqlx::migrate!("./migrations");

pub async fn connect_and_migrate(database_url: &str) -> Result<PgPool, sqlx::Error> {
    let mut attempts = 0u8;

    logging::info("db.connect.started", &[]);

    loop {
        match PgPoolOptions::new()
            .max_connections(10)
            .connect(database_url)
            .await
        {
            Ok(pool) => {
                logging::info("db.connect.succeeded", &[]);

                if let Err(error) = MIGRATOR.run(&pool).await {
                    logging::error("db.migrations.failed", &[field("error", error.to_string())]);
                    return Err(error.into());
                }

                logging::info("db.migrations.applied", &[]);
                return Ok(pool);
            }
            Err(error) if attempts < 20 => {
                attempts += 1;
                logging::warn(
                    "db.connect.retry",
                    &[
                        field("attempt", attempts),
                        field("max_attempts", 20),
                        field("error", error.to_string()),
                    ],
                );
                tokio::time::sleep(Duration::from_secs(2)).await;
            }
            Err(error) => {
                logging::error("db.connect.failed", &[field("error", error.to_string())]);
                return Err(error);
            }
        }
    }
}
