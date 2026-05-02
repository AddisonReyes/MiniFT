pub mod accounts;
pub mod auth;
pub mod budgets;
pub mod dev_seed;
pub mod exchange_rates;
pub mod recurring;
pub mod transactions;
pub mod transfers;

use chrono::{Datelike, Months, NaiveDate, Utc};
use rust_decimal::Decimal;

use crate::errors::ApiError;

pub fn normalize_required_text(value: &str, field_name: &str) -> Result<String, ApiError> {
    let trimmed = value.trim();

    if trimmed.is_empty() {
        return Err(ApiError::bad_request(format!("{field_name} is required")));
    }

    Ok(trimmed.to_string())
}

pub fn normalize_currency_code(value: &str, field_name: &str) -> Result<String, ApiError> {
    let normalized = value.trim().to_uppercase();

    if normalized.len() != 3
        || !normalized
            .chars()
            .all(|character| character.is_ascii_alphabetic())
    {
        return Err(ApiError::bad_request(format!(
            "{field_name} must be a 3-letter currency code"
        )));
    }

    Ok(normalized)
}

pub fn normalize_optional_text(value: &Option<String>) -> Option<String> {
    value.as_ref().and_then(|item| {
        let trimmed = item.trim();
        (!trimmed.is_empty()).then(|| trimmed.to_string())
    })
}

pub fn ensure_positive_amount(amount: Decimal, field_name: &str) -> Result<(), ApiError> {
    if amount <= Decimal::ZERO {
        return Err(ApiError::bad_request(format!(
            "{field_name} must be greater than zero"
        )));
    }

    Ok(())
}

pub fn normalize_month(date: NaiveDate) -> Result<NaiveDate, ApiError> {
    date.with_day(1)
        .ok_or_else(|| ApiError::bad_request("Invalid month value"))
}

pub fn month_bounds(month: Option<NaiveDate>) -> Result<(NaiveDate, NaiveDate), ApiError> {
    let current = month.unwrap_or_else(|| Utc::now().date_naive());
    let first_day = normalize_month(current)?;
    let next_month = first_day
        .checked_add_months(Months::new(1))
        .ok_or_else(|| ApiError::bad_request("Invalid month range"))?;

    Ok((first_day, next_month))
}

pub fn parse_optional_date(
    value: Option<String>,
    field_name: &str,
) -> Result<Option<NaiveDate>, ApiError> {
    match value {
        Some(value) if !value.trim().is_empty() => {
            NaiveDate::parse_from_str(value.trim(), "%Y-%m-%d")
                .map(Some)
                .map_err(|_| ApiError::bad_request(format!("Invalid {field_name}")))
        }
        _ => Ok(None),
    }
}
