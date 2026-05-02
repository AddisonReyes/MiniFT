mod common;

use common::{register_test_user, TestDatabase};
use minift_backend::{
    models::account::AccountType,
    schema::account::{CreateAccountRequest, UpdateAccountRequest},
    schema::transaction::CreateTransactionRequest,
    services::{accounts, transactions},
};
use rust_decimal::Decimal;

#[tokio::test]
async fn create_account_uses_user_default_currency_when_not_provided() {
    let Some(database) = TestDatabase::new().await else {
        return;
    };

    let user_id = register_test_user(&database.pool, "accounts-default-currency", "DOP")
        .await
        .expect("test user");

    let account = accounts::create_account(
        &database.pool,
        user_id,
        CreateAccountRequest {
            name: "Savings".to_string(),
            r#type: AccountType::BankAccount,
            currency: None,
        },
    )
    .await
    .expect("account should be created");

    assert_eq!(account.currency, "DOP");

    database.cleanup().await;
}

#[tokio::test]
async fn update_account_rejects_converting_last_cash_account() {
    let Some(database) = TestDatabase::new().await else {
        return;
    };

    let user_id = register_test_user(&database.pool, "accounts-last-cash", "USD")
        .await
        .expect("test user");
    let cash_account = accounts::list_accounts(&database.pool, user_id)
        .await
        .expect("accounts")
        .into_iter()
        .find(|account| account.r#type == AccountType::Cash)
        .expect("default cash account");

    let error = accounts::update_account(
        &database.pool,
        user_id,
        cash_account.id,
        UpdateAccountRequest {
            name: cash_account.name,
            r#type: AccountType::BankAccount,
            currency: cash_account.currency,
        },
    )
    .await
    .expect_err("last cash account should be protected");

    assert_eq!(
        error.message,
        "At least one cash account must remain available"
    );

    database.cleanup().await;
}

#[tokio::test]
async fn delete_account_rejects_accounts_with_activity() {
    let Some(database) = TestDatabase::new().await else {
        return;
    };

    let user_id = register_test_user(&database.pool, "accounts-delete-activity", "USD")
        .await
        .expect("test user");
    let account = accounts::create_account(
        &database.pool,
        user_id,
        CreateAccountRequest {
            name: "Operating".to_string(),
            r#type: AccountType::BankAccount,
            currency: Some("USD".to_string()),
        },
    )
    .await
    .expect("account should be created");

    transactions::create_transaction(
        &database.pool,
        user_id,
        CreateTransactionRequest {
            account_id: Some(account.id),
            amount: Decimal::new(125_00, 2),
            r#type: minift_backend::models::transaction::TransactionType::Income,
            category: "Salary".to_string(),
            note: None,
            date: chrono::NaiveDate::from_ymd_opt(2026, 5, 1).unwrap(),
        },
    )
    .await
    .expect("transaction should be created");

    let error = accounts::delete_account(&database.pool, user_id, account.id)
        .await
        .expect_err("account with activity should not be deleted");

    assert_eq!(error.message, "Accounts with activity cannot be deleted");

    database.cleanup().await;
}
