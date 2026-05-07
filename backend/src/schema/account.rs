use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
#[allow(unused_imports)]
use serde_json::json;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::models::account::AccountType;

#[derive(Debug, Deserialize, ToSchema)]
#[schema(example = json!({
    "name": "Primary checking",
    "type": "bank_account",
    "currency": "USD"
}))]
pub struct CreateAccountRequest {
    /// Display name for the account.
    #[schema(min_length = 1, example = "Primary checking")]
    pub name: String,
    /// Account classification used for ordering and behavior.
    pub r#type: AccountType,
    /// Optional ISO 4217 currency code. Defaults to the user's default currency.
    #[schema(pattern = "^[A-Za-z]{3}$", example = "USD")]
    pub currency: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
#[schema(example = json!({
    "name": "Travel cash",
    "type": "cash",
    "currency": "DOP"
}))]
pub struct UpdateAccountRequest {
    /// Display name for the account.
    #[schema(min_length = 1, example = "Travel cash")]
    pub name: String,
    /// Account classification used for ordering and behavior.
    pub r#type: AccountType,
    /// ISO 4217 currency code for the account.
    #[schema(pattern = "^[A-Za-z]{3}$", example = "DOP")]
    pub currency: String,
}

#[derive(Debug, Serialize, ToSchema)]
#[schema(example = json!({
    "id": "d5dcbe8d-bb41-49c4-939f-9adf5a8c6001",
    "name": "Primary checking",
    "type": "bank_account",
    "currency": "USD",
    "created_at": "2026-05-01T10:20:00Z",
    "balance": "1530.75"
}))]
pub struct AccountResponse {
    /// Stable unique identifier for the account.
    #[schema(example = "d5dcbe8d-bb41-49c4-939f-9adf5a8c6001")]
    pub id: Uuid,
    /// Display name for the account.
    #[schema(example = "Primary checking")]
    pub name: String,
    /// Account classification used for ordering and behavior.
    pub r#type: AccountType,
    /// ISO 4217 currency code attached to the account.
    #[schema(pattern = "^[A-Za-z]{3}$", example = "USD")]
    pub currency: String,
    /// Timestamp when the account was created.
    #[schema(example = "2026-05-01T10:20:00Z")]
    pub created_at: DateTime<Utc>,
    /// Computed account balance from related transactions.
    #[schema(example = "1530.75")]
    pub balance: Decimal,
}
