mod common;

use common::{register_test_user, TestDatabase};
use minift_backend::{
    models::{account::AccountType, transaction::TransactionType},
    schema::account::CreateAccountRequest,
    schema::transaction::TransactionFilters,
    schema::transfer::CreateTransferRequest,
    services::{accounts, transactions, transfers},
};
use rust_decimal::Decimal;

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
