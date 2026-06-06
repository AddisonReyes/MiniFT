pub mod accounts;
pub mod auth;
pub mod budgets;
pub mod dev_seed;
pub mod email;
pub mod exchange_rates;
pub mod gmail_sync_service;
pub mod recurring;
pub mod transactions;
pub mod transfers;
pub mod turnstile;

use chrono::{Datelike, Months, NaiveDate, Utc};
use rust_decimal::Decimal;

use crate::errors::ApiError;

pub const CATEGORY_MAX_LENGTH: usize = 32;
pub const NOTE_MAX_LENGTH: usize = 128;

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

fn ensure_text_max_length(
    value: &str,
    field_name: &str,
    max_length: usize,
) -> Result<(), ApiError> {
    if value.chars().count() > max_length {
        return Err(ApiError::bad_request(format!(
            "{field_name} must be {max_length} characters or fewer"
        )));
    }

    Ok(())
}

pub fn normalize_required_text_with_max_length(
    value: &str,
    field_name: &str,
    max_length: usize,
) -> Result<String, ApiError> {
    let normalized = normalize_required_text(value, field_name)?;
    ensure_text_max_length(&normalized, field_name, max_length)?;
    Ok(normalized)
}

pub fn normalize_optional_text_with_max_length(
    value: &Option<String>,
    field_name: &str,
    max_length: usize,
) -> Result<Option<String>, ApiError> {
    let normalized = normalize_optional_text(value);

    if let Some(text) = normalized.as_deref() {
        ensure_text_max_length(text, field_name, max_length)?;
    }

    Ok(normalized)
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

#[cfg(test)]
mod tests {
    use chrono::NaiveDate;

    use super::{
        month_bounds, normalize_currency_code, normalize_optional_text_with_max_length,
        normalize_required_text_with_max_length, parse_optional_date, CATEGORY_MAX_LENGTH,
        NOTE_MAX_LENGTH,
    };

    #[test]
    fn normalizes_currency_codes_to_uppercase() {
        let currency =
            normalize_currency_code(" dop ", "Currency").expect("currency should normalize");

        assert_eq!(currency, "DOP");
    }

    #[test]
    fn rejects_invalid_currency_codes() {
        let error = normalize_currency_code("usd1", "Currency").expect_err("currency should fail");

        assert_eq!(error.message, "Currency must be a 3-letter currency code");
    }

    #[test]
    fn rejects_required_text_that_exceeds_max_length() {
        let value = "a".repeat(CATEGORY_MAX_LENGTH + 1);
        let error =
            normalize_required_text_with_max_length(&value, "Category", CATEGORY_MAX_LENGTH)
                .expect_err("category should fail");

        assert_eq!(error.message, "Category must be 32 characters or fewer");
    }

    #[test]
    fn rejects_optional_text_that_exceeds_max_length() {
        let error = normalize_optional_text_with_max_length(
            &Some("a".repeat(NOTE_MAX_LENGTH + 1)),
            "Note",
            NOTE_MAX_LENGTH,
        )
        .expect_err("note should fail");

        assert_eq!(error.message, "Note must be 128 characters or fewer");
    }

    #[test]
    fn parses_optional_date_when_valid() {
        let date = parse_optional_date(Some("2026-05-01".to_string()), "start date")
            .expect("date should parse");

        assert_eq!(date, Some(NaiveDate::from_ymd_opt(2026, 5, 1).unwrap()));
    }

    #[test]
    fn returns_none_for_blank_optional_date() {
        let date =
            parse_optional_date(Some("   ".to_string()), "start date").expect("blank is valid");

        assert_eq!(date, None);
    }

    #[test]
    fn returns_first_day_and_next_month_bounds() {
        let input_month = NaiveDate::from_ymd_opt(2026, 5, 18).unwrap();
        let (month_start, next_month) = month_bounds(Some(input_month)).expect("bounds");

        assert_eq!(month_start, NaiveDate::from_ymd_opt(2026, 5, 1).unwrap());
        assert_eq!(next_month, NaiveDate::from_ymd_opt(2026, 6, 1).unwrap());
    }
}
