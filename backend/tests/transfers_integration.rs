mod common;

use common::{register_test_user, TestDatabase};
use minift_backend::{
    config::ExchangeRateProviderConfig,
    models::{account::AccountType, transaction::TransactionType},
    schema::account::CreateAccountRequest,
    schema::exchange_rate::ExchangeRateInput,
    schema::transaction::TransactionFilters,
    schema::transfer::CreateTransferRequest,
    services::{accounts, exchange_rates, transactions, transfers},
};
use rust_decimal::Decimal;

fn disabled_exchange_rate_provider_config() -> ExchangeRateProviderConfig {
    ExchangeRateProviderConfig {
        enabled: false,
        frankfurter_base_url: "https://api.frankfurter.dev/v2".to_string(),
        request_timeout_seconds: 10,
    }
}

#[tokio::test]
async fn create_transfer_creates_mirrored_transaction_rows() {
    let Some(database) = TestDatabase::new().await else {
        return;
    };

    let user_id = register_test_user(&database.pool, "transfers-mirror", "USD")
        .await
        .expect("test user");
    let cash_account = accounts::list_accounts(&database.pool, user_id)
        .await
        .expect("accounts")
        .into_iter()
        .find(|account| account.r#type == AccountType::Cash)
        .expect("cash account");
    let savings_account = accounts::create_account(
        &database.pool,
        user_id,
        CreateAccountRequest {
            name: "Savings".to_string(),
            r#type: AccountType::BankAccount,
            currency: Some("USD".to_string()),
        },
    )
    .await
    .expect("savings");

    let transfer = transfers::create_transfer(
        &database.pool,
        user_id,
        &disabled_exchange_rate_provider_config(),
        CreateTransferRequest {
            from_account_id: cash_account.id,
            to_account_id: savings_account.id,
            amount: Decimal::new(125_00, 2),
            date: chrono::NaiveDate::from_ymd_opt(2026, 5, 8).unwrap(),
            note: None,
        },
    )
    .await
    .expect("transfer should be created");

    let transfer_rows = transactions::list_transactions(
        &database.pool,
        user_id,
        TransactionFilters {
            r#type: Some(TransactionType::Transfer),
            ..TransactionFilters::default()
        },
    )
    .await
    .expect("transfer rows");

    assert_eq!(transfer_rows.len(), 2);
    assert!(transfer_rows
        .iter()
        .all(|row| row.transfer_id == Some(transfer.id)));
    assert!(transfer_rows
        .iter()
        .any(|row| row.account_id == Some(cash_account.id)));
    assert!(transfer_rows
        .iter()
        .any(|row| row.account_id == Some(savings_account.id)));

    database.cleanup().await;
}

#[tokio::test]
async fn create_transfer_rejects_same_source_and_destination_account() {
    let Some(database) = TestDatabase::new().await else {
        return;
    };

    let user_id = register_test_user(&database.pool, "transfers-same-account", "USD")
        .await
        .expect("test user");
    let cash_account = accounts::list_accounts(&database.pool, user_id)
        .await
        .expect("accounts")
        .into_iter()
        .find(|account| account.r#type == AccountType::Cash)
        .expect("cash account");

    let error = transfers::create_transfer(
        &database.pool,
        user_id,
        &disabled_exchange_rate_provider_config(),
        CreateTransferRequest {
            from_account_id: cash_account.id,
            to_account_id: cash_account.id,
            amount: Decimal::new(75_00, 2),
            date: chrono::NaiveDate::from_ymd_opt(2026, 5, 9).unwrap(),
            note: None,
        },
    )
    .await
    .expect_err("transfer should fail");

    assert_eq!(error.message, "Transfer accounts must be different");

    database.cleanup().await;
}

#[tokio::test]
async fn create_transfer_converts_destination_amount_for_different_currencies() {
    let Some(database) = TestDatabase::new().await else {
        return;
    };

    let user_id = register_test_user(&database.pool, "transfers-convert", "USD")
        .await
        .expect("test user");
    let usd_account = accounts::list_accounts(&database.pool, user_id)
        .await
        .expect("accounts")
        .into_iter()
        .find(|account| account.r#type == AccountType::Cash)
        .expect("cash account");
    let dop_account = accounts::create_account(
        &database.pool,
        user_id,
        CreateAccountRequest {
            name: "Wallet".to_string(),
            r#type: AccountType::Cash,
            currency: Some("DOP".to_string()),
        },
    )
    .await
    .expect("dop account");

    exchange_rates::replace_exchange_rates(
        &database.pool,
        user_id,
        vec![ExchangeRateInput {
            from_currency: "DOP".to_string(),
            to_currency: "USD".to_string(),
            rate: Decimal::new(2, 2),
        }],
    )
    .await
    .expect("manual rate");

    let transfer = transfers::create_transfer(
        &database.pool,
        user_id,
        &disabled_exchange_rate_provider_config(),
        CreateTransferRequest {
            from_account_id: dop_account.id,
            to_account_id: usd_account.id,
            amount: Decimal::new(500_00, 2),
            date: chrono::NaiveDate::from_ymd_opt(2026, 5, 10).unwrap(),
            note: None,
        },
    )
    .await
    .expect("transfer should convert");

    let transfer_rows = transactions::list_transactions(
        &database.pool,
        user_id,
        TransactionFilters {
            r#type: Some(TransactionType::Transfer),
            ..TransactionFilters::default()
        },
    )
    .await
    .expect("transfer rows");

    let outgoing_row = transfer_rows
        .iter()
        .find(|row| row.account_id == Some(dop_account.id))
        .expect("outgoing row");
    let incoming_row = transfer_rows
        .iter()
        .find(|row| row.account_id == Some(usd_account.id))
        .expect("incoming row");

    assert_eq!(transfer.amount, Decimal::new(500_00, 2));
    assert_eq!(outgoing_row.amount, Decimal::new(500_00, 2));
    assert_eq!(incoming_row.amount, Decimal::new(10_00, 2));

    database.cleanup().await;
}

#[tokio::test]
async fn create_transfer_rejects_missing_exchange_rate_for_different_currencies() {
    let Some(database) = TestDatabase::new().await else {
        return;
    };

    let user_id = register_test_user(&database.pool, "transfers-missing-rate", "USD")
        .await
        .expect("test user");
    let usd_account = accounts::list_accounts(&database.pool, user_id)
        .await
        .expect("accounts")
        .into_iter()
        .find(|account| account.r#type == AccountType::Cash)
        .expect("cash account");
    let eur_account = accounts::create_account(
        &database.pool,
        user_id,
        CreateAccountRequest {
            name: "Travel".to_string(),
            r#type: AccountType::BankAccount,
            currency: Some("EUR".to_string()),
        },
    )
    .await
    .expect("eur account");

    let error = transfers::create_transfer(
        &database.pool,
        user_id,
        &disabled_exchange_rate_provider_config(),
        CreateTransferRequest {
            from_account_id: eur_account.id,
            to_account_id: usd_account.id,
            amount: Decimal::new(120_00, 2),
            date: chrono::NaiveDate::from_ymd_opt(2026, 5, 11).unwrap(),
            note: None,
        },
    )
    .await
    .expect_err("transfer should fail without rate");

    assert_eq!(
        error.message,
        "Missing exchange rate from EUR to USD for this transfer"
    );

    database.cleanup().await;
}
