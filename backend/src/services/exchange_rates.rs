use std::{
    collections::{BTreeMap, BTreeSet},
    time::Duration,
};

use chrono::{DateTime, Duration as ChronoDuration, Utc};
use reqwest::Client;
use rust_decimal::Decimal;
use serde::Deserialize;
use sqlx::{PgPool, Postgres, QueryBuilder};
use uuid::Uuid;

use crate::{
    config::ExchangeRateProviderConfig,
    errors::ApiError,
    models::exchange_rate::ExchangeRateRecord,
    schema::exchange_rate::{ExchangeRateInput, ExchangeRateResponse},
    services::normalize_currency_code,
};

const MANUAL_SOURCE: &str = "manual";
const PROVIDER_SOURCE: &str = "provider";
const PROVIDER_REFRESH_INTERVAL_HOURS: i64 = 24;

#[derive(Debug, Deserialize)]
struct FrankfurterRateRow {
    base: String,
    quote: String,
    rate: Decimal,
}

#[derive(Debug)]
struct ProviderRateInput {
    from_currency: String,
    to_currency: String,
    rate: Decimal,
}

#[derive(Debug, Default)]
struct ExchangeRatePairState {
    manual_rate: Option<Decimal>,
    provider_rate: Option<Decimal>,
}

fn is_manual_source(source: &str) -> bool {
    source == MANUAL_SOURCE
}

fn exchange_rate_pair_key(from_currency: &str, to_currency: &str) -> (String, String) {
    (
        from_currency.trim().to_uppercase(),
        to_currency.trim().to_uppercase(),
    )
}

fn map_exchange_rate_pair(
    from_currency: String,
    to_currency: String,
    pair: ExchangeRatePairState,
) -> Option<ExchangeRateResponse> {
    let effective_rate = pair.manual_rate.or(pair.provider_rate)?;

    Some(ExchangeRateResponse {
        from_currency,
        to_currency,
        rate: effective_rate,
        is_manual: pair.manual_rate.is_some(),
        provider_rate: pair.provider_rate,
    })
}

fn normalize_exchange_rate_input(input: ExchangeRateInput) -> Result<ExchangeRateInput, ApiError> {
    let from_currency = normalize_currency_code(&input.from_currency, "From currency")?;
    let to_currency = normalize_currency_code(&input.to_currency, "To currency")?;

    if from_currency == to_currency {
        return Err(ApiError::bad_request(
            "Exchange rates must connect two different currencies",
        ));
    }

    if input.rate <= Decimal::ZERO {
        return Err(ApiError::bad_request(
            "Exchange rate must be greater than zero",
        ));
    }

    Ok(ExchangeRateInput {
        from_currency,
        to_currency,
        rate: input.rate,
    })
}

pub fn parse_requested_currencies(value: Option<&str>) -> Result<Option<Vec<String>>, ApiError> {
    let Some(value) = value else {
        return Ok(None);
    };

    let normalized = value
        .split(',')
        .map(|currency| normalize_currency_code(currency, "Currency filter"))
        .collect::<Result<BTreeSet<_>, _>>()?
        .into_iter()
        .collect::<Vec<_>>();

    if normalized.is_empty() {
        return Ok(None);
    }

    Ok(Some(normalized))
}

async fn list_exchange_rate_records(
    pool: &PgPool,
    user_id: Uuid,
) -> Result<Vec<ExchangeRateRecord>, ApiError> {
    Ok(sqlx::query_as::<_, ExchangeRateRecord>(
        "SELECT from_currency, to_currency, rate, source, updated_at
         FROM exchange_rates
         WHERE user_id = $1
         ORDER BY from_currency ASC, to_currency ASC, source ASC",
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?)
}

async fn list_tracked_currencies(pool: &PgPool, user_id: Uuid) -> Result<Vec<String>, ApiError> {
    Ok(sqlx::query_scalar::<_, String>(
        "SELECT currency
         FROM users
         WHERE id = $1
         UNION
         SELECT currency
         FROM accounts
         WHERE user_id = $1
         ORDER BY currency ASC",
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?)
}

async fn list_user_ids(pool: &PgPool) -> Result<Vec<Uuid>, ApiError> {
    Ok(sqlx::query_scalar::<_, Uuid>(
        "SELECT id
         FROM users
         ORDER BY created_at ASC",
    )
    .fetch_all(pool)
    .await?)
}

fn build_http_client(config: &ExchangeRateProviderConfig) -> Option<Client> {
    Client::builder()
        .timeout(Duration::from_secs(config.request_timeout_seconds))
        .build()
        .map_err(|error| {
            eprintln!("unable to build Frankfurter client: {error}");
            error
        })
        .ok()
}

fn should_refresh_provider_cache(
    records: &[ExchangeRateRecord],
    currencies: &[String],
    now: DateTime<Utc>,
) -> bool {
    if currencies.len() < 2 {
        return false;
    }

    let relevant_currencies = currencies.iter().cloned().collect::<BTreeSet<_>>();
    let expected_pairs = currencies.len() * (currencies.len() - 1);
    let mut provider_pairs = BTreeSet::new();

    for record in records {
        if record.source != PROVIDER_SOURCE {
            continue;
        }

        if !relevant_currencies.contains(&record.from_currency)
            || !relevant_currencies.contains(&record.to_currency)
        {
            continue;
        }

        provider_pairs.insert(exchange_rate_pair_key(
            &record.from_currency,
            &record.to_currency,
        ));

        if now.signed_duration_since(record.updated_at)
            >= ChronoDuration::hours(PROVIDER_REFRESH_INTERVAL_HOURS)
        {
            return true;
        }
    }

    provider_pairs.len() < expected_pairs
}

async fn fetch_online_exchange_rates(
    config: &ExchangeRateProviderConfig,
    currencies: &[String],
) -> Vec<ProviderRateInput> {
    if !config.enabled || currencies.len() < 2 {
        return Vec::new();
    }

    let Some(client) = build_http_client(config) else {
        return Vec::new();
    };

    let mut rates = Vec::new();

    for from_currency in currencies {
        let quotes = currencies
            .iter()
            .filter(|to_currency| *to_currency != from_currency)
            .cloned()
            .collect::<Vec<_>>();

        if quotes.is_empty() {
            continue;
        }

        let quotes_param = quotes.join(",");
        let request = client
            .get(format!("{}/rates", config.frankfurter_base_url))
            .query(&[
                ("base", from_currency.as_str()),
                ("quotes", quotes_param.as_str()),
            ]);

        let response = match request.send().await {
            Ok(response) => response,
            Err(error) => {
                eprintln!("unable to fetch Frankfurter rates for {from_currency}: {error}");
                continue;
            }
        };

        if !response.status().is_success() {
            eprintln!(
                "Frankfurter returned status {} for base currency {}",
                response.status(),
                from_currency
            );
            continue;
        }

        let payload = match response.json::<Vec<FrankfurterRateRow>>().await {
            Ok(payload) => payload,
            Err(error) => {
                eprintln!("unable to parse Frankfurter response for {from_currency}: {error}");
                continue;
            }
        };

        for row in payload {
            if row.rate <= Decimal::ZERO {
                continue;
            }

            rates.push(ProviderRateInput {
                from_currency: row.base,
                to_currency: row.quote,
                rate: row.rate,
            });
        }
    }

    rates
}

async fn upsert_provider_exchange_rates(
    pool: &PgPool,
    user_id: Uuid,
    provider_rates: &[ProviderRateInput],
) -> Result<(), ApiError> {
    if provider_rates.is_empty() {
        return Ok(());
    }

    let refreshed_at = Utc::now();
    let mut builder = QueryBuilder::<Postgres>::new(
        "INSERT INTO exchange_rates (user_id, from_currency, to_currency, rate, source, updated_at) ",
    );

    builder.push_values(provider_rates.iter(), |mut row, rate| {
        row.push_bind(user_id)
            .push_bind(&rate.from_currency)
            .push_bind(&rate.to_currency)
            .push_bind(rate.rate)
            .push_bind(PROVIDER_SOURCE)
            .push_bind(refreshed_at);
    });

    builder.push(
        " ON CONFLICT (user_id, from_currency, to_currency, source)
          DO UPDATE
          SET rate = EXCLUDED.rate,
              updated_at = EXCLUDED.updated_at",
    );

    builder.build().execute(pool).await?;

    Ok(())
}

async fn refresh_provider_cache_if_needed(
    pool: &PgPool,
    user_id: Uuid,
    config: &ExchangeRateProviderConfig,
    currencies: &[String],
    records: &[ExchangeRateRecord],
) -> Result<(), ApiError> {
    if !config.enabled || currencies.len() < 2 {
        return Ok(());
    }

    if !should_refresh_provider_cache(records, currencies, Utc::now()) {
        return Ok(());
    }

    let provider_rates = fetch_online_exchange_rates(config, currencies).await;
    upsert_provider_exchange_rates(pool, user_id, &provider_rates).await?;

    Ok(())
}

fn merge_exchange_rate_records(records: Vec<ExchangeRateRecord>) -> Vec<ExchangeRateResponse> {
    let mut pairs = BTreeMap::<(String, String), ExchangeRatePairState>::new();

    for record in records {
        let key = exchange_rate_pair_key(&record.from_currency, &record.to_currency);
        let pair = pairs.entry(key).or_default();

        if is_manual_source(&record.source) {
            pair.manual_rate = Some(record.rate);
        } else {
            pair.provider_rate = Some(record.rate);
        }
    }

    pairs
        .into_iter()
        .filter_map(|((from_currency, to_currency), pair)| {
            map_exchange_rate_pair(from_currency, to_currency, pair)
        })
        .collect()
}

fn resolve_effective_rate_from_records(
    records: &[ExchangeRateRecord],
    from_currency: &str,
    to_currency: &str,
) -> Option<Decimal> {
    if from_currency == to_currency {
        return Some(Decimal::ONE);
    }

    let mut direct_manual_rate = None;
    let mut direct_provider_rate = None;
    let mut inverse_manual_rate = None;
    let mut inverse_provider_rate = None;

    for record in records {
        if record.from_currency == from_currency && record.to_currency == to_currency {
            if is_manual_source(&record.source) {
                direct_manual_rate = Some(record.rate);
            } else {
                direct_provider_rate = Some(record.rate);
            }
        } else if record.from_currency == to_currency && record.to_currency == from_currency {
            if is_manual_source(&record.source) {
                inverse_manual_rate = Some(record.rate);
            } else {
                inverse_provider_rate = Some(record.rate);
            }
        }
    }

    direct_manual_rate.or(direct_provider_rate).or_else(|| {
        inverse_manual_rate
            .or(inverse_provider_rate)
            .map(|rate| Decimal::ONE / rate)
    })
}

fn filter_records_by_currencies(
    records: Vec<ExchangeRateRecord>,
    currencies: &[String],
) -> Vec<ExchangeRateRecord> {
    if currencies.is_empty() {
        return records;
    }

    let allowed = currencies.iter().cloned().collect::<BTreeSet<_>>();

    records
        .into_iter()
        .filter(|record| {
            allowed.contains(&record.from_currency) && allowed.contains(&record.to_currency)
        })
        .collect()
}

pub async fn list_exchange_rates(
    pool: &PgPool,
    user_id: Uuid,
    config: &ExchangeRateProviderConfig,
    requested_currencies: Option<Vec<String>>,
) -> Result<Vec<ExchangeRateResponse>, ApiError> {
    let tracked_currencies = match requested_currencies {
        Some(currencies) => currencies,
        None => list_tracked_currencies(pool, user_id).await?,
    };

    let existing_records = filter_records_by_currencies(
        list_exchange_rate_records(pool, user_id).await?,
        &tracked_currencies,
    );

    let needs_refresh = config.enabled
        && should_refresh_provider_cache(&existing_records, &tracked_currencies, Utc::now());

    if needs_refresh {
        if existing_records.is_empty() {
            refresh_provider_cache_if_needed(
                pool,
                user_id,
                config,
                &tracked_currencies,
                &existing_records,
            )
            .await?;
        } else {
            let pool = pool.clone();
            let config = config.clone();
            let tracked_currencies = tracked_currencies.clone();

            tokio::spawn(async move {
                let records = match list_exchange_rate_records(&pool, user_id).await {
                    Ok(records) => filter_records_by_currencies(records, &tracked_currencies),
                    Err(error) => {
                        eprintln!("unable to read cached exchange rates: {}", error.message);
                        return;
                    }
                };

                if let Err(error) = refresh_provider_cache_if_needed(
                    &pool,
                    user_id,
                    &config,
                    &tracked_currencies,
                    &records,
                )
                .await
                {
                    eprintln!("unable to refresh exchange-rate cache: {}", error.message);
                }
            });

            return Ok(merge_exchange_rate_records(existing_records));
        }
    }

    let fresh_records = filter_records_by_currencies(
        list_exchange_rate_records(pool, user_id).await?,
        &tracked_currencies,
    );

    Ok(merge_exchange_rate_records(fresh_records))
}

pub async fn resolve_effective_exchange_rate(
    pool: &PgPool,
    user_id: Uuid,
    config: &ExchangeRateProviderConfig,
    from_currency: &str,
    to_currency: &str,
) -> Result<Option<Decimal>, ApiError> {
    let normalized_from_currency = normalize_currency_code(from_currency, "From currency")?;
    let normalized_to_currency = normalize_currency_code(to_currency, "To currency")?;

    if normalized_from_currency == normalized_to_currency {
        return Ok(Some(Decimal::ONE));
    }

    let tracked_currencies = vec![
        normalized_from_currency.clone(),
        normalized_to_currency.clone(),
    ];

    let existing_records = filter_records_by_currencies(
        list_exchange_rate_records(pool, user_id).await?,
        &tracked_currencies,
    );

    refresh_provider_cache_if_needed(
        pool,
        user_id,
        config,
        &tracked_currencies,
        &existing_records,
    )
    .await?;

    let fresh_records = filter_records_by_currencies(
        list_exchange_rate_records(pool, user_id).await?,
        &tracked_currencies,
    );

    Ok(resolve_effective_rate_from_records(
        &fresh_records,
        &normalized_from_currency,
        &normalized_to_currency,
    ))
}

pub async fn refresh_all_stale_provider_rates(
    pool: &PgPool,
    config: &ExchangeRateProviderConfig,
) -> Result<(), ApiError> {
    if !config.enabled {
        return Ok(());
    }

    let user_ids = list_user_ids(pool).await?;

    for user_id in user_ids {
        let tracked_currencies = list_tracked_currencies(pool, user_id).await?;
        let existing_records = filter_records_by_currencies(
            list_exchange_rate_records(pool, user_id).await?,
            &tracked_currencies,
        );

        refresh_provider_cache_if_needed(
            pool,
            user_id,
            config,
            &tracked_currencies,
            &existing_records,
        )
        .await?;
    }

    Ok(())
}

pub async fn replace_exchange_rates(
    pool: &PgPool,
    user_id: Uuid,
    rates: Vec<ExchangeRateInput>,
) -> Result<Vec<ExchangeRateResponse>, ApiError> {
    let mut normalized_rates = Vec::with_capacity(rates.len());
    let mut seen_pairs = BTreeSet::new();

    for rate in rates {
        let normalized = normalize_exchange_rate_input(rate)?;

        if !seen_pairs.insert((
            normalized.from_currency.clone(),
            normalized.to_currency.clone(),
        )) {
            return Err(ApiError::bad_request(
                "Duplicate exchange rate pairs are not allowed",
            ));
        }

        normalized_rates.push(normalized);
    }

    let mut transaction = pool.begin().await?;

    sqlx::query("DELETE FROM exchange_rates WHERE user_id = $1 AND source = $2")
        .bind(user_id)
        .bind(MANUAL_SOURCE)
        .execute(&mut *transaction)
        .await?;

    if !normalized_rates.is_empty() {
        let updated_at = Utc::now();
        let mut builder = QueryBuilder::<Postgres>::new(
            "INSERT INTO exchange_rates (user_id, from_currency, to_currency, rate, source, updated_at) ",
        );

        builder.push_values(normalized_rates.iter(), |mut row, rate| {
            row.push_bind(user_id)
                .push_bind(&rate.from_currency)
                .push_bind(&rate.to_currency)
                .push_bind(rate.rate)
                .push_bind(MANUAL_SOURCE)
                .push_bind(updated_at);
        });

        builder.build().execute(&mut *transaction).await?;
    }

    transaction.commit().await?;

    Ok(normalized_rates
        .into_iter()
        .map(|rate| ExchangeRateResponse {
            from_currency: rate.from_currency,
            to_currency: rate.to_currency,
            rate: rate.rate,
            is_manual: true,
            provider_rate: None,
        })
        .collect())
}

#[cfg(test)]
mod tests {
    use chrono::{Duration as ChronoDuration, Utc};
    use rust_decimal::Decimal;

    use super::{
        exchange_rate_pair_key, merge_exchange_rate_records, normalize_exchange_rate_input,
        parse_requested_currencies, resolve_effective_rate_from_records,
        should_refresh_provider_cache, MANUAL_SOURCE, PROVIDER_SOURCE,
    };
    use crate::{
        models::exchange_rate::ExchangeRateRecord, schema::exchange_rate::ExchangeRateInput,
    };

    fn record(
        from_currency: &str,
        to_currency: &str,
        rate: Decimal,
        source: &str,
        updated_at: chrono::DateTime<Utc>,
    ) -> ExchangeRateRecord {
        ExchangeRateRecord {
            from_currency: from_currency.to_string(),
            to_currency: to_currency.to_string(),
            rate,
            source: source.to_string(),
            updated_at,
        }
    }

    #[test]
    fn normalizes_exchange_rate_currency_codes() {
        let normalized = normalize_exchange_rate_input(ExchangeRateInput {
            from_currency: " usd ".to_string(),
            to_currency: " eur ".to_string(),
            rate: Decimal::new(109, 2),
        })
        .expect("rate should normalize");

        assert_eq!(normalized.from_currency, "USD");
        assert_eq!(normalized.to_currency, "EUR");
    }

    #[test]
    fn rejects_exchange_rate_same_currency_pair() {
        let error = normalize_exchange_rate_input(ExchangeRateInput {
            from_currency: "USD".to_string(),
            to_currency: "usd".to_string(),
            rate: Decimal::ONE,
        })
        .expect_err("same currencies should fail");

        assert_eq!(
            error.message,
            "Exchange rates must connect two different currencies"
        );
    }

    #[test]
    fn rejects_non_positive_exchange_rate() {
        let error = normalize_exchange_rate_input(ExchangeRateInput {
            from_currency: "USD".to_string(),
            to_currency: "EUR".to_string(),
            rate: Decimal::ZERO,
        })
        .expect_err("non-positive rate should fail");

        assert_eq!(error.message, "Exchange rate must be greater than zero");
    }

    #[test]
    fn parses_requested_currencies_as_unique_uppercase_codes() {
        let currencies = parse_requested_currencies(Some(" usd, eur , usd "))
            .expect("currencies should parse")
            .expect("currencies should exist");

        assert_eq!(currencies, vec!["EUR".to_string(), "USD".to_string()]);
    }

    #[test]
    fn merge_prefers_manual_exchange_rates_and_keeps_provider_rate() {
        let now = Utc::now();
        let merged = merge_exchange_rate_records(vec![
            record("USD", "EUR", Decimal::new(95, 2), PROVIDER_SOURCE, now),
            record("USD", "EUR", Decimal::new(109, 2), MANUAL_SOURCE, now),
        ]);

        assert_eq!(merged.len(), 1);
        assert_eq!(merged[0].rate, Decimal::new(109, 2));
        assert_eq!(merged[0].provider_rate, Some(Decimal::new(95, 2)));
        assert!(merged[0].is_manual);
    }

    #[test]
    fn provider_cache_refreshes_when_pairs_are_missing() {
        let needs_refresh = should_refresh_provider_cache(
            &[record(
                "USD",
                "EUR",
                Decimal::new(95, 2),
                PROVIDER_SOURCE,
                Utc::now(),
            )],
            &["USD".to_string(), "EUR".to_string()],
            Utc::now(),
        );

        assert!(needs_refresh);
    }

    #[test]
    fn provider_cache_refreshes_when_cached_rate_is_stale() {
        let now = Utc::now();
        let needs_refresh = should_refresh_provider_cache(
            &[
                record(
                    "USD",
                    "EUR",
                    Decimal::new(95, 2),
                    PROVIDER_SOURCE,
                    now - ChronoDuration::hours(25),
                ),
                record(
                    "EUR",
                    "USD",
                    Decimal::new(105, 2),
                    PROVIDER_SOURCE,
                    now - ChronoDuration::hours(25),
                ),
            ],
            &["USD".to_string(), "EUR".to_string()],
            now,
        );

        assert!(needs_refresh);
    }

    #[test]
    fn provider_cache_stays_fresh_when_all_pairs_exist_and_are_recent() {
        let now = Utc::now();
        let needs_refresh = should_refresh_provider_cache(
            &[
                record(
                    "USD",
                    "EUR",
                    Decimal::new(95, 2),
                    PROVIDER_SOURCE,
                    now - ChronoDuration::hours(2),
                ),
                record(
                    "EUR",
                    "USD",
                    Decimal::new(105, 2),
                    PROVIDER_SOURCE,
                    now - ChronoDuration::hours(2),
                ),
            ],
            &["USD".to_string(), "EUR".to_string()],
            now,
        );

        assert!(!needs_refresh);
    }

    #[test]
    fn builds_normalized_pair_keys() {
        assert_eq!(
            exchange_rate_pair_key(" usd ", " eur "),
            ("USD".to_string(), "EUR".to_string())
        );
    }

    #[test]
    fn resolves_inverse_manual_rate_when_direct_pair_is_missing() {
        let rate = resolve_effective_rate_from_records(
            &[record(
                "USD",
                "DOP",
                Decimal::new(5900, 2),
                MANUAL_SOURCE,
                Utc::now(),
            )],
            "DOP",
            "USD",
        )
        .expect("inverse rate should resolve");

        assert_eq!(rate.round_dp(8), Decimal::new(1694915, 8));
    }
}
