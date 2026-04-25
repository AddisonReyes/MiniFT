use chrono::{DateTime, Utc};
use rocket::form::FromFormField;
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Type};
use uuid::Uuid;

use rust_decimal::Decimal;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type, FromFormField)]
#[serde(rename_all = "lowercase")]
#[sqlx(type_name = "account_type", rename_all = "lowercase")]
pub enum AccountType {
    #[field(value = "bank")]
    Bank,
    #[field(value = "cash")]
    Cash,
}

#[derive(Debug, Clone, FromRow)]
pub struct AccountRecord {
    pub id: Uuid,
    pub name: String,
    pub r#type: AccountType,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow)]
pub struct AccountBalanceRow {
    pub id: Uuid,
    pub name: String,
    pub r#type: AccountType,
    pub created_at: DateTime<Utc>,
    pub balance: Decimal,
}
