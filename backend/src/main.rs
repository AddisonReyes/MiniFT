#[macro_use]
extern crate rocket;

mod config;
mod cors;
mod db;
mod errors;
mod guards;
mod handlers;
mod models;
mod routes;
mod schema;
mod services;

use std::env;

use config::{AppState, AuthConfig, WorkerConfig};
use rocket::fairing::AdHoc;

async fn build_rocket() -> Result<rocket::Rocket<rocket::Build>, Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();

    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/minift".to_string());
    let pool = db::connect_and_migrate(&database_url).await?;

    let state = AppState {
        pool,
        auth: AuthConfig::from_env(),
        worker: WorkerConfig::from_env(),
    };

    let rocket = rocket::build()
        .manage(state.clone())
        .attach(cors::Cors)
        .mount("/", routes::all())
        .attach(AdHoc::on_liftoff("Recurring Worker", |rocket| {
            Box::pin(async move {
                if let Some(state) = rocket.state::<AppState>().cloned() {
                    tokio::spawn(async move {
                        services::recurring::run_worker(state).await;
                    });
                }
            })
        }));

    Ok(rocket)
}

#[rocket::main]
async fn main() -> Result<(), rocket::Error> {
    let rocket = match build_rocket().await {
        Ok(rocket) => rocket,
        Err(error) => {
            eprintln!("failed to boot backend: {error}");
            std::process::exit(1);
        }
    };

    rocket.launch().await?;
    Ok(())
}
