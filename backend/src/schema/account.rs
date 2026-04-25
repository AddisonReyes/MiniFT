use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::models::account::AccountType;

#[derive(Debug, Deserialize)]
pub struct CreateAccountRequest {
    pub name: String,
    pub r#type: AccountType,
}

#[derive(Debug, Deserialize)]
pub struct UpdateAccountRequest {
    pub name: String,
    pub r#type: AccountType,
}

#[derive(Debug, Serialize)]
pub struct AccountResponse {
    pub id: Uuid,
    pub name: String,
    pub r#type: AccountType,
    pub created_at: DateTime<Utc>,
    pub balance: Decimal,
}
