#![allow(clippy::inconsistent_digit_grouping)]

mod common;

use common::{register_test_user, TestDatabase};
use minift_backend::{
    models::{account::AccountType, recurring::RecurringFrequency, transaction::TransactionType},
    schema::{
        recurring::{CreateRecurringTransactionRequest, UpdateRecurringTransactionRequest},
        transaction::TransactionFilters,
    },
    services::{accounts, recurring, transactions},
};
use rocket::http::Status;
use rust_decimal::Decimal;

async fn default_cash_account(
    pool: &sqlx::PgPool,
    user_id: uuid::Uuid,
) -> minift_backend::schema::account::AccountResponse {
    accounts::list_accounts(pool, user_id)
        .await
        .expect("accounts")
        .into_iter()
        .find(|account| account.r#type == AccountType::Cash)
        .expect("default cash account")
}

#[tokio::test]
async fn recurring_crud_rejects_transfers_and_enforces_user_scope() {
    let Some(database) = TestDatabase::new().await else {
        return;
    };

    let user_id = register_test_user(&database.pool, "recurring-crud", "USD")
        .await
        .expect("test user");
    let other_user_id = register_test_user(&database.pool, "recurring-crud-other", "USD")
        .await
        .expect("other test user");
    let cash_account = default_cash_account(&database.pool, user_id).await;

    let transfer_error = recurring::create_recurring_transaction(
        &database.pool,
        user_id,
        CreateRecurringTransactionRequest {
            account_id: cash_account.id,
            amount: Decimal::new(100_00, 2),
            r#type: TransactionType::Transfer,
            category: "Move money".to_string(),
            note: None,
            frequency: RecurringFrequency::Monthly,
            next_run_date: chrono::NaiveDate::from_ymd_opt(2026, 6, 1).unwrap(),
        },
    )
    .await
    .expect_err("recurring transfer should be rejected");

    assert_eq!(
        transfer_error.message,
        "Recurring transfers are not supported"
    );

    let created = recurring::create_recurring_transaction(
        &database.pool,
        user_id,
        CreateRecurringTransactionRequest {
            account_id: cash_account.id,
            amount: Decimal::new(45_00, 2),
            r#type: TransactionType::Expense,
            category: "Streaming".to_string(),
            note: Some("Music".to_string()),
            frequency: RecurringFrequency::Monthly,
            next_run_date: chrono::NaiveDate::from_ymd_opt(2026, 6, 5).unwrap(),
        },
    )
    .await
    .expect("recurring transaction should be created");

    assert_eq!(created.account_id, cash_account.id);
    assert_eq!(created.account_name, cash_account.name);
    assert_eq!(created.account_currency, cash_account.currency);

    let other_user_rules = recurring::list_recurring_transactions(&database.pool, other_user_id)
        .await
        .expect("other user recurring rules");

    assert!(other_user_rules.is_empty());

    let other_user_update_error = recurring::update_recurring_transaction(
        &database.pool,
        other_user_id,
        created.id,
        UpdateRecurringTransactionRequest {
            account_id: cash_account.id,
            amount: Decimal::new(50_00, 2),
            r#type: TransactionType::Expense,
            category: "Streaming".to_string(),
            note: None,
            frequency: RecurringFrequency::Weekly,
            next_run_date: chrono::NaiveDate::from_ymd_opt(2026, 6, 12).unwrap(),
        },
    )
    .await
    .expect_err("other user should not update recurring transaction");

    assert_eq!(
        other_user_update_error.message,
        "Recurring transaction not found"
    );

    let updated = recurring::update_recurring_transaction(
        &database.pool,
        user_id,
        created.id,
        UpdateRecurringTransactionRequest {
            account_id: cash_account.id,
            amount: Decimal::new(55_00, 2),
            r#type: TransactionType::Expense,
            category: "Subscriptions".to_string(),
            note: None,
            frequency: RecurringFrequency::Weekly,
            next_run_date: chrono::NaiveDate::from_ymd_opt(2026, 6, 12).unwrap(),
        },
    )
    .await
    .expect("recurring transaction should update");

    assert_eq!(updated.amount, Decimal::new(55_00, 2));
    assert_eq!(updated.category, "Subscriptions");
    assert_eq!(updated.frequency, RecurringFrequency::Weekly);

    recurring::delete_recurring_transaction(&database.pool, user_id, created.id)
        .await
        .expect("recurring transaction should delete");

    let rules = recurring::list_recurring_transactions(&database.pool, user_id)
        .await
        .expect("recurring rules after delete");

    assert!(rules.is_empty());

    database.cleanup().await;
}

#[tokio::test]
async fn processing_due_recurring_transactions_materializes_occurrences_and_advances_date() {
    let Some(database) = TestDatabase::new().await else {
        return;
    };

    let user_id = register_test_user(&database.pool, "recurring-worker", "USD")
        .await
        .expect("test user");
    let cash_account = default_cash_account(&database.pool, user_id).await;
    let today = chrono::Utc::now().date_naive();
    let first_due_date = today
        .checked_sub_days(chrono::Days::new(2))
        .expect("valid due date");

    let created = recurring::create_recurring_transaction(
        &database.pool,
        user_id,
        CreateRecurringTransactionRequest {
            account_id: cash_account.id,
            amount: Decimal::new(25_00, 2),
            r#type: TransactionType::Expense,
            category: "Coffee".to_string(),
            note: Some("Daily coffee".to_string()),
            frequency: RecurringFrequency::Daily,
            next_run_date: first_due_date,
        },
    )
    .await
    .expect("recurring transaction should be created");

    recurring::process_due_transactions(&database.pool)
        .await
        .expect("due recurring transactions should process");

    let generated_transactions = transactions::list_transactions(
        &database.pool,
        user_id,
        TransactionFilters {
            category: Some("Coffee".to_string()),
            ..TransactionFilters::default()
        },
    )
    .await
    .expect("generated transactions should list");

    assert_eq!(generated_transactions.len(), 3);
    assert!(generated_transactions.iter().all(|transaction| {
        transaction.account_id == Some(cash_account.id)
            && transaction.amount == Decimal::new(25_00, 2)
            && transaction.r#type == TransactionType::Expense
            && transaction.transfer_id.is_none()
    }));
    assert!(generated_transactions
        .iter()
        .any(|transaction| transaction.date == first_due_date));
    assert!(generated_transactions
        .iter()
        .any(|transaction| transaction.date == today));

    let rules = recurring::list_recurring_transactions(&database.pool, user_id)
        .await
        .expect("recurring rules should list");
    let rule = rules
        .into_iter()
        .find(|rule| rule.id == created.id)
        .expect("processed recurring rule");

    assert_eq!(
        rule.next_run_date,
        today
            .checked_add_days(chrono::Days::new(1))
            .expect("valid next run date")
    );

    recurring::process_due_transactions(&database.pool)
        .await
        .expect("second process should be idempotent for current date");

    let generated_transactions_after_second_run = transactions::list_transactions(
        &database.pool,
        user_id,
        TransactionFilters {
            category: Some("Coffee".to_string()),
            ..TransactionFilters::default()
        },
    )
    .await
    .expect("generated transactions should list after second run");

    assert_eq!(generated_transactions_after_second_run.len(), 3);

    database.cleanup().await;
}

#[tokio::test]
async fn recurring_validation_rejects_invalid_account_and_text_limits() {
    let Some(database) = TestDatabase::new().await else {
        return;
    };

    let user_id = register_test_user(&database.pool, "recurring-validation", "USD")
        .await
        .expect("test user");
    let other_user_id = register_test_user(&database.pool, "recurring-validation-other", "USD")
        .await
        .expect("other test user");
    let other_cash_account = default_cash_account(&database.pool, other_user_id).await;

    let account_error = recurring::create_recurring_transaction(
        &database.pool,
        user_id,
        CreateRecurringTransactionRequest {
            account_id: other_cash_account.id,
            amount: Decimal::new(25_00, 2),
            r#type: TransactionType::Expense,
            category: "Coffee".to_string(),
            note: None,
            frequency: RecurringFrequency::Daily,
            next_run_date: chrono::NaiveDate::from_ymd_opt(2026, 6, 1).unwrap(),
        },
    )
    .await
    .expect_err("foreign account should be rejected");

    assert_eq!(account_error.status, Status::NotFound);
    assert_eq!(account_error.message, "Account not found");

    let cash_account = default_cash_account(&database.pool, user_id).await;
    let category_error = recurring::create_recurring_transaction(
        &database.pool,
        user_id,
        CreateRecurringTransactionRequest {
            account_id: cash_account.id,
            amount: Decimal::new(25_00, 2),
            r#type: TransactionType::Expense,
            category: "a".repeat(33),
            note: None,
            frequency: RecurringFrequency::Daily,
            next_run_date: chrono::NaiveDate::from_ymd_opt(2026, 6, 1).unwrap(),
        },
    )
    .await
    .expect_err("long category should be rejected");

    assert_eq!(
        category_error.message,
        "Category must be 32 characters or fewer"
    );

    database.cleanup().await;
}
