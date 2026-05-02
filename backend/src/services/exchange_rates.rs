use std::collections::BTreeSet;

use sqlx::{PgPool, Postgres, QueryBuilder};
use uuid::Uuid;

use crate::{
    errors::ApiError,
    models::exchange_rate::ExchangeRateRecord,
    schema::exchange_rate::{ExchangeRateInput, ExchangeRateResponse},
    services::normalize_currency_code,
};

fn map_exchange_rate(record: ExchangeRateRecord) -> ExchangeRateResponse {
    ExchangeRateResponse {
        from_currency: record.from_currency,
        to_currency: record.to_currency,
        rate: record.rate,
    }
}

fn normalize_exchange_rate_input(input: ExchangeRateInput) -> Result<ExchangeRateInput, ApiError> {
    let from_currency = normalize_currency_code(&input.from_currency, "From currency")?;
    let to_currency = normalize_currency_code(&input.to_currency, "To currency")?;

    if from_currency == to_currency {
        return Err(ApiError::bad_request(
            "Exchange rates must connect two different currencies",
        ));
    }

    if input.rate <= rust_decimal::Decimal::ZERO {
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

pub async fn list_exchange_rates(
    pool: &PgPool,
    user_id: Uuid,
) -> Result<Vec<ExchangeRateResponse>, ApiError> {
    let rows = sqlx::query_as::<_, ExchangeRateRecord>(
        "SELECT from_currency, to_currency, rate
         FROM exchange_rates
         WHERE user_id = $1
         ORDER BY from_currency ASC, to_currency ASC",
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;

    Ok(rows.into_iter().map(map_exchange_rate).collect())
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

    sqlx::query("DELETE FROM exchange_rates WHERE user_id = $1")
        .bind(user_id)
        .execute(&mut *transaction)
        .await?;

    if !normalized_rates.is_empty() {
        let mut builder = QueryBuilder::<Postgres>::new(
            "INSERT INTO exchange_rates (user_id, from_currency, to_currency, rate) ",
        );

        builder.push_values(normalized_rates.iter(), |mut row, rate| {
            row.push_bind(user_id)
                .push_bind(&rate.from_currency)
                .push_bind(&rate.to_currency)
                .push_bind(rate.rate);
        });

        builder.build().execute(&mut *transaction).await?;
    }

    transaction.commit().await?;

    list_exchange_rates(pool, user_id).await
}

#[cfg(test)]
mod tests {
    use rust_decimal::Decimal;

    use super::normalize_exchange_rate_input;
    use crate::schema::exchange_rate::ExchangeRateInput;

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
}
