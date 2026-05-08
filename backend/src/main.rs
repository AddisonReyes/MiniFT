use std::env;

use minift_backend::{
    config::{
        AppState, AuthConfig, CorsConfig, ExchangeRateProviderConfig, SeedConfig, WorkerConfig,
    },
    cors, db, docs, logging, routes, services,
};
use rocket::fairing::AdHoc;
use utoipa_swagger_ui::SwaggerUi;

async fn build_rocket() -> Result<rocket::Rocket<rocket::Build>, Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    logging::info("app.startup.begin", &[]);

    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/minift".to_string());
    let pool = db::connect_and_migrate(&database_url).await?;

    let state = AppState {
        pool,
        auth: AuthConfig::from_env().map_err(std::io::Error::other)?,
        cors: CorsConfig::from_env(),
        worker: WorkerConfig::from_env(),
        seed: SeedConfig::from_env(),
        exchange_rates: ExchangeRateProviderConfig::from_env(),
    };

    logging::info(
        "app.config.loaded",
        &[
            logging::field("cors_origin_count", state.cors.allowed_origin_count()),
            logging::field("worker_interval_seconds", state.worker.interval_seconds),
            logging::field("seed_enabled", state.seed.enabled),
            logging::field("exchange_rates_enabled", state.exchange_rates.enabled),
            logging::field("auth_cookie_secure", state.auth.cookie_secure),
            logging::field(
                "auth_cookie_same_site",
                format!("{:?}", state.auth.cookie_same_site),
            ),
        ],
    );

    services::dev_seed::seed_dev_data(&state)
        .await
        .map_err(|error| std::io::Error::other(error.message.clone()))?;

    let api_doc = docs::build_openapi(&state);
    let route_count = routes::all().len();

    let rocket = rocket::build()
        .manage(state.clone())
        .attach(cors::Cors)
        .attach(logging::HttpLogger)
        .mount("/", routes::all())
        .mount(
            "/",
            SwaggerUi::new("/docs/<_..>").url("/api-docs/openapi.json", api_doc),
        )
        .attach(AdHoc::on_liftoff("Recurring Worker", |rocket| {
            Box::pin(async move {
                if let Some(state) = rocket.state::<AppState>().cloned() {
                    logging::info(
                        "worker.recurring.spawned",
                        &[logging::field(
                            "interval_seconds",
                            state.worker.interval_seconds.max(15),
                        )],
                    );
                    tokio::spawn(async move {
                        services::recurring::run_worker(state).await;
                    });
                }
            })
        }));

    logging::info(
        "app.startup.ready",
        &[logging::field("route_count", route_count)],
    );

    Ok(rocket)
}

#[rocket::main]
async fn main() -> Result<(), rocket::Error> {
    let rocket = match build_rocket().await {
        Ok(rocket) => rocket,
        Err(error) => {
            logging::error(
                "app.startup.failed",
                &[logging::field("error", error.to_string())],
            );
            std::process::exit(1);
        }
    };

    rocket.launch().await?;
    Ok(())
}
