#![allow(clippy::inconsistent_digit_grouping)]

mod common;

use common::{register_test_user, TestDatabase};
use minift_backend::{
    config::ExchangeRateProviderConfig,
    models::{account::AccountType, transaction::TransactionType},
    schema::account::CreateAccountRequest,
    schema::transaction::{
        CategorySummaryQuery, CreateTransactionRequest, TransactionFilters,
        UpdateTransactionRequest,
    },
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

async fn create_transaction(
    database: &TestDatabase,
    user_id: uuid::Uuid,
    account_id: Option<uuid::Uuid>,
    amount: Decimal,
    transaction_type: TransactionType,
    category: &str,
    date: chrono::NaiveDate,
) -> uuid::Uuid {
    transactions::create_transaction(
        &database.pool,
        user_id,
        CreateTransactionRequest {
            account_id,
            amount,
            r#type: transaction_type,
            category: category.to_string(),
            note: None,
            date,
        },
    )
    .await
    .expect("transaction should be created")
    .id
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

#[tokio::test]
async fn create_transaction_rejects_category_longer_than_32_characters() {
    let Some(database) = TestDatabase::new().await else {
        return;
    };

    let user_id = register_test_user(&database.pool, "transactions-category-limit", "USD")
        .await
        .expect("test user");

    let error = transactions::create_transaction(
        &database.pool,
        user_id,
        CreateTransactionRequest {
            account_id: None,
            amount: Decimal::new(25_00, 2),
            r#type: TransactionType::Expense,
            category: "a".repeat(33),
            note: None,
            date: chrono::NaiveDate::from_ymd_opt(2026, 5, 11).unwrap(),
        },
    )
    .await
    .expect_err("category should be rejected");

    assert_eq!(error.message, "Category must be 32 characters or fewer");

    database.cleanup().await;
}

#[tokio::test]
async fn list_transactions_applies_type_category_account_date_and_limit_filters() {
    let Some(database) = TestDatabase::new().await else {
        return;
    };

    let user_id = register_test_user(&database.pool, "transactions-filters", "USD")
        .await
        .expect("test user");
    let other_user_id = register_test_user(&database.pool, "transactions-filters-other", "USD")
        .await
        .expect("other test user");
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
    .expect("savings account");

    let groceries_id = create_transaction(
        &database,
        user_id,
        Some(cash_account.id),
        Decimal::new(80_00, 2),
        TransactionType::Expense,
        "Groceries",
        chrono::NaiveDate::from_ymd_opt(2026, 5, 4).unwrap(),
    )
    .await;
    create_transaction(
        &database,
        user_id,
        Some(savings_account.id),
        Decimal::new(1_000_00, 2),
        TransactionType::Income,
        "Salary",
        chrono::NaiveDate::from_ymd_opt(2026, 5, 5).unwrap(),
    )
    .await;
    create_transaction(
        &database,
        user_id,
        Some(cash_account.id),
        Decimal::new(45_00, 2),
        TransactionType::Expense,
        "Dining",
        chrono::NaiveDate::from_ymd_opt(2026, 5, 8).unwrap(),
    )
    .await;
    create_transaction(
        &database,
        user_id,
        Some(cash_account.id),
        Decimal::new(25_00, 2),
        TransactionType::Expense,
        "Groceries",
        chrono::NaiveDate::from_ymd_opt(2026, 6, 1).unwrap(),
    )
    .await;
    create_transaction(
        &database,
        other_user_id,
        None,
        Decimal::new(99_00, 2),
        TransactionType::Expense,
        "Groceries",
        chrono::NaiveDate::from_ymd_opt(2026, 5, 4).unwrap(),
    )
    .await;

    let filtered = transactions::list_transactions(
        &database.pool,
        user_id,
        TransactionFilters {
            r#type: Some(TransactionType::Expense),
            category: Some("grocer".to_string()),
            account_id: Some(cash_account.id),
            start_date: Some("2026-05-01".to_string()),
            end_date: Some("2026-05-31".to_string()),
            limit: Some(10),
        },
    )
    .await
    .expect("filtered transactions");

    assert_eq!(filtered.len(), 1);
    assert_eq!(filtered[0].id, groceries_id);

    let limited = transactions::list_transactions(
        &database.pool,
        user_id,
        TransactionFilters {
            limit: Some(2),
            ..TransactionFilters::default()
        },
    )
    .await
    .expect("limited transactions");

    assert_eq!(limited.len(), 2);

    database.cleanup().await;
}

#[tokio::test]
async fn category_summary_groups_categories_and_excludes_transfer_rows() {
    let Some(database) = TestDatabase::new().await else {
        return;
    };

    let user_id = register_test_user(&database.pool, "transactions-category-summary", "USD")
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
    .expect("savings account");

    create_transaction(
        &database,
        user_id,
        Some(cash_account.id),
        Decimal::new(300_00, 2),
        TransactionType::Expense,
        "Rent",
        chrono::NaiveDate::from_ymd_opt(2026, 5, 1).unwrap(),
    )
    .await;
    create_transaction(
        &database,
        user_id,
        Some(cash_account.id),
        Decimal::new(100_00, 2),
        TransactionType::Expense,
        "Groceries",
        chrono::NaiveDate::from_ymd_opt(2026, 5, 2).unwrap(),
    )
    .await;
    create_transaction(
        &database,
        user_id,
        Some(cash_account.id),
        Decimal::new(50_00, 2),
        TransactionType::Expense,
        "Groceries",
        chrono::NaiveDate::from_ymd_opt(2026, 6, 2).unwrap(),
    )
    .await;
    create_transaction(
        &database,
        user_id,
        Some(cash_account.id),
        Decimal::new(1_000_00, 2),
        TransactionType::Income,
        "Salary",
        chrono::NaiveDate::from_ymd_opt(2026, 5, 3).unwrap(),
    )
    .await;
    transfers::create_transfer(
        &database.pool,
        user_id,
        &disabled_exchange_rate_provider_config(),
        CreateTransferRequest {
            from_account_id: cash_account.id,
            to_account_id: savings_account.id,
            amount: Decimal::new(500_00, 2),
            date: chrono::NaiveDate::from_ymd_opt(2026, 5, 4).unwrap(),
            note: None,
        },
    )
    .await
    .expect("transfer should be created");

    let expense_summary = transactions::category_summary(
        &database.pool,
        user_id,
        CategorySummaryQuery {
            month: Some("2026-05-19".to_string()),
            r#type: Some(TransactionType::Expense),
        },
    )
    .await
    .expect("expense summary");

    assert_eq!(
        expense_summary.month,
        chrono::NaiveDate::from_ymd_opt(2026, 5, 1).unwrap()
    );
    assert_eq!(expense_summary.items.len(), 2);
    assert_eq!(expense_summary.items[0].category, "Rent");
    assert_eq!(expense_summary.items[0].total, Decimal::new(300_00, 2));
    assert_eq!(expense_summary.items[0].percentage, 75.0);
    assert_eq!(expense_summary.items[1].category, "Groceries");
    assert_eq!(expense_summary.items[1].total, Decimal::new(100_00, 2));
    assert_eq!(expense_summary.items[1].percentage, 25.0);

    let income_summary = transactions::category_summary(
        &database.pool,
        user_id,
        CategorySummaryQuery {
            month: Some("2026-05-01".to_string()),
            r#type: Some(TransactionType::Income),
        },
    )
    .await
    .expect("income summary");

    assert_eq!(income_summary.items.len(), 1);
    assert_eq!(income_summary.items[0].category, "Salary");
    assert_eq!(income_summary.items[0].total, Decimal::new(1_000_00, 2));

    let transfer_error = transactions::category_summary(
        &database.pool,
        user_id,
        CategorySummaryQuery {
            month: Some("2026-05-01".to_string()),
            r#type: Some(TransactionType::Transfer),
        },
    )
    .await
    .expect_err("transfer category summary should be rejected");

    assert_eq!(
        transfer_error.message,
        "Category summaries support income or expense only"
    );

    database.cleanup().await;
}

#[tokio::test]
async fn transfer_rows_must_be_managed_through_transfers_endpoint() {
    let Some(database) = TestDatabase::new().await else {
        return;
    };

    let user_id = register_test_user(&database.pool, "transactions-transfer-rows", "USD")
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
    .expect("savings account");

    transfers::create_transfer(
        &database.pool,
        user_id,
        &disabled_exchange_rate_provider_config(),
        CreateTransferRequest {
            from_account_id: cash_account.id,
            to_account_id: savings_account.id,
            amount: Decimal::new(200_00, 2),
            date: chrono::NaiveDate::from_ymd_opt(2026, 5, 10).unwrap(),
            note: None,
        },
    )
    .await
    .expect("transfer should be created");

    let transfer_row = transactions::list_transactions(
        &database.pool,
        user_id,
        TransactionFilters {
            r#type: Some(TransactionType::Transfer),
            account_id: Some(cash_account.id),
            ..TransactionFilters::default()
        },
    )
    .await
    .expect("transfer rows")
    .into_iter()
    .next()
    .expect("cash transfer row");

    let update_error = transactions::update_transaction(
        &database.pool,
        user_id,
        transfer_row.id,
        UpdateTransactionRequest {
            account_id: Some(cash_account.id),
            amount: Decimal::new(1_00, 2),
            r#type: TransactionType::Expense,
            category: "Edited".to_string(),
            note: None,
            date: chrono::NaiveDate::from_ymd_opt(2026, 5, 10).unwrap(),
        },
    )
    .await
    .expect_err("transfer row update should be rejected");

    assert_eq!(
        update_error.message,
        "Transfer entries must be managed through the transfers endpoint"
    );

    let delete_error = transactions::delete_transaction(&database.pool, user_id, transfer_row.id)
        .await
        .expect_err("transfer row delete should be rejected");

    assert_eq!(
        delete_error.message,
        "Transfer entries must be removed through the transfers endpoint"
    );

    database.cleanup().await;
}
