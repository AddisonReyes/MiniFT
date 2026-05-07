use chrono::{DateTime, Utc};
use rocket::form::FromFormField;
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Type};
use utoipa::ToSchema;
use uuid::Uuid;

use rust_decimal::Decimal;

#[derive(
    Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type, FromFormField, ToSchema,
)]
#[serde(rename_all = "snake_case")]
#[sqlx(type_name = "account_type", rename_all = "snake_case")]
pub enum AccountType {
    /// Physical cash or a cash-equivalent wallet.
    #[field(value = "cash")]
    Cash,
    /// Deposit account such as checking or savings.
    #[field(value = "bank_account")]
    BankAccount,
    /// Liability account representing a credit card balance.
    #[field(value = "credit_card")]
    CreditCard,
    /// Liability account for a loan balance.
    #[field(value = "loan")]
    Loan,
}

#[derive(Debug, Clone, FromRow)]
pub struct AccountRecord {
    pub id: Uuid,
    pub name: String,
    pub r#type: AccountType,
    pub currency: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow)]
pub struct AccountBalanceRow {
    pub id: Uuid,
    pub name: String,
    pub r#type: AccountType,
    pub currency: String,
    pub created_at: DateTime<Utc>,
    pub balance: Decimal,
}
