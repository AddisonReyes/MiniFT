mod common;

use common::{register_test_user, TestDatabase};
use minift_backend::{
    config::ExchangeRateProviderConfig,
    models::transaction::TransactionType,
    schema::account::CreateAccountRequest,
    schema::transaction::{CreateTransactionRequest, TransactionFilters},
    schema::transfer::CreateTransferRequest,
    services::{accounts, transactions, transfers},
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
async fn create_transaction_without_account_uses_default_cash_account() {
    let Some(database) = TestDatabase::new().await else {
        return;
    };

    let user_id = register_test_user(&database.pool, "transactions-default-cash", "USD")
        .await
        .expect("test user");
    let cash_account = accounts::list_accounts(&database.pool, user_id)
        .await
        .expect("accounts")
        .into_iter()
        .find(|account| account.r#type == minift_backend::models::account::AccountType::Cash)
        .expect("default cash account");

    let created_transaction = transactions::create_transaction(
        &database.pool,
        user_id,
        CreateTransactionRequest {
            account_id: None,
            amount: Decimal::new(35_00, 2),
            r#type: TransactionType::Expense,
            category: "Dining".to_string(),
            note: Some("Lunch".to_string()),
            date: chrono::NaiveDate::from_ymd_opt(2026, 5, 10).unwrap(),
        },
    )
    .await
    .expect("transaction should be created");

    assert_eq!(created_transaction.account_id, Some(cash_account.id));

    database.cleanup().await;
}

#[tokio::test]
async fn monthly_summary_excludes_transfer_rows() {
    let Some(database) = TestDatabase::new().await else {
        return;
    };

    let user_id = register_test_user(&database.pool, "transactions-monthly-summary", "USD")
        .await
        .expect("test user");
    let savings_account = accounts::create_account(
        &database.pool,
        user_id,
        CreateAccountRequest {
            name: "Savings".to_string(),
            r#type: minift_backend::models::account::AccountType::BankAccount,
            currency: Some("USD".to_string()),
        },
    )
    .await
    .expect("account");

    transactions::create_transaction(
        &database.pool,
        user_id,
        CreateTransactionRequest {
            account_id: Some(savings_account.id),
            amount: Decimal::new(1_000_00, 2),
            r#type: TransactionType::Income,
            category: "Salary".to_string(),
            note: None,
            date: chrono::NaiveDate::from_ymd_opt(2026, 5, 2).unwrap(),
        },
    )
    .await
    .expect("income");

    transactions::create_transaction(
        &database.pool,
        user_id,
        CreateTransactionRequest {
            account_id: Some(savings_account.id),
            amount: Decimal::new(250_00, 2),
            r#type: TransactionType::Expense,
            category: "Groceries".to_string(),
            note: None,
            date: chrono::NaiveDate::from_ymd_opt(2026, 5, 4).unwrap(),
        },
    )
    .await
    .expect("expense");

    let cash_account = accounts::list_accounts(&database.pool, user_id)
        .await
        .expect("accounts")
        .into_iter()
        .find(|account| account.r#type == minift_backend::models::account::AccountType::Cash)
        .expect("cash account");

    transfers::create_transfer(
        &database.pool,
        user_id,
        &disabled_exchange_rate_provider_config(),
        CreateTransferRequest {
            from_account_id: savings_account.id,
            to_account_id: cash_account.id,
            amount: Decimal::new(300_00, 2),
            date: chrono::NaiveDate::from_ymd_opt(2026, 5, 5).unwrap(),
            note: None,
        },
    )
    .await
    .expect("transfer");

    let summary =
        transactions::monthly_summary(&database.pool, user_id, Some("2026-05-01".to_string()))
            .await
            .expect("summary");

    assert_eq!(summary.income_total, Decimal::new(1_000_00, 2));
    assert_eq!(summary.expense_total, Decimal::new(250_00, 2));
    assert_eq!(summary.net_total, Decimal::new(750_00, 2));

    let transfer_rows = transactions::list_transactions(
        &database.pool,
        user_id,
        TransactionFilters {
            r#type: Some(TransactionType::Transfer),
            ..TransactionFilters::default()
        },
    )
    .await
    .expect("filtered transfers");

    assert_eq!(transfer_rows.len(), 2);

    database.cleanup().await;
}
