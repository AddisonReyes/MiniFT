use std::time::Duration;

use sqlx::{migrate::Migrator, postgres::PgPoolOptions, PgPool};

static MIGRATOR: Migrator = sqlx::migrate!("./migrations");

pub async fn connect_and_migrate(database_url: &str) -> Result<PgPool, sqlx::Error> {
    let mut attempts = 0u8;

    loop {
        match PgPoolOptions::new()
            .max_connections(10)
            .connect(database_url)
            .await
        {
            Ok(pool) => {
                MIGRATOR.run(&pool).await?;
                return Ok(pool);
            }
            Err(error) if attempts < 20 => {
                attempts += 1;
                eprintln!("database not ready (attempt {attempts}/20): {error}");
                tokio::time::sleep(Duration::from_secs(2)).await;
            }
            Err(error) => return Err(error),
        }
    }
}
