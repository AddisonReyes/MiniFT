use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::models::account::AccountType;

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateAccountRequest {
    /// Display name for the account.
    pub name: String,
    /// Account classification used for ordering and behavior.
    pub r#type: AccountType,
    /// Optional ISO 4217 currency code. Defaults to the user's default currency.
    pub currency: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateAccountRequest {
    /// Display name for the account.
    pub name: String,
    /// Account classification used for ordering and behavior.
    pub r#type: AccountType,
    /// ISO 4217 currency code for the account.
    pub currency: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct AccountResponse {
    /// Stable unique identifier for the account.
    pub id: Uuid,
    /// Display name for the account.
    pub name: String,
    /// Account classification used for ordering and behavior.
    pub r#type: AccountType,
    /// ISO 4217 currency code attached to the account.
    pub currency: String,
    /// Timestamp when the account was created.
    pub created_at: DateTime<Utc>,
    /// Computed account balance from related transactions.
    pub balance: Decimal,
}
