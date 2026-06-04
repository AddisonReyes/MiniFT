#![allow(clippy::inconsistent_digit_grouping)]

mod common;

use common::{register_test_user, TestDatabase};
use minift_backend::{
    models::{account::AccountType, transaction::TransactionType},
    schema::{
        budget::{BudgetFilters, CreateBudgetRequest, UpdateBudgetRequest},
        transaction::CreateTransactionRequest,
    },
    services::{accounts, budgets, transactions},
};
use rust_decimal::Decimal;

async fn default_cash_account_id(pool: &sqlx::PgPool, user_id: uuid::Uuid) -> uuid::Uuid {
    accounts::list_accounts(pool, user_id)
        .await
        .expect("accounts")
        .into_iter()
        .find(|account| account.r#type == AccountType::Cash)
        .expect("default cash account")
        .id
}

async fn create_transaction(
    pool: &sqlx::PgPool,
    user_id: uuid::Uuid,
    amount: Decimal,
    transaction_type: TransactionType,
    category: &str,
    date: chrono::NaiveDate,
) {
    transactions::create_transaction(
        pool,
        user_id,
        CreateTransactionRequest {
            account_id: None,
            amount,
            r#type: transaction_type,
            category: category.to_string(),
            note: None,
            date,
        },
    )
    .await
    .expect("transaction should be created");
}

#[tokio::test]
async fn budget_spending_counts_only_matching_expenses_for_user_and_month() {
    let Some(database) = TestDatabase::new().await else {
        return;
    };

    let user_id = register_test_user(&database.pool, "budgets-spending", "USD")
        .await
        .expect("test user");
    let other_user_id = register_test_user(&database.pool, "budgets-spending-other", "USD")
        .await
        .expect("other test user");

    let budget = budgets::create_budget(
        &database.pool,
        user_id,
        CreateBudgetRequest {
            category: "Groceries".to_string(),
            limit_amount: Decimal::new(500_00, 2),
            month: chrono::NaiveDate::from_ymd_opt(2026, 5, 15).unwrap(),
        },
    )
    .await
    .expect("budget should be created");

    assert_eq!(
        budget.month,
        chrono::NaiveDate::from_ymd_opt(2026, 5, 1).unwrap()
    );
    assert_eq!(budget.spent_amount, Decimal::ZERO);
    assert_eq!(budget.remaining_amount, Decimal::new(500_00, 2));

    create_transaction(
        &database.pool,
        user_id,
        Decimal::new(125_00, 2),
        TransactionType::Expense,
        "groceries",
        chrono::NaiveDate::from_ymd_opt(2026, 5, 4).unwrap(),
    )
    .await;
    create_transaction(
        &database.pool,
        user_id,
        Decimal::new(50_00, 2),
        TransactionType::Expense,
        "Groceries",
        chrono::NaiveDate::from_ymd_opt(2026, 5, 20).unwrap(),
    )
    .await;
    create_transaction(
        &database.pool,
        user_id,
        Decimal::new(999_00, 2),
        TransactionType::Income,
        "Groceries",
        chrono::NaiveDate::from_ymd_opt(2026, 5, 21).unwrap(),
    )
    .await;
    create_transaction(
        &database.pool,
        user_id,
        Decimal::new(60_00, 2),
        TransactionType::Expense,
        "Groceries",
        chrono::NaiveDate::from_ymd_opt(2026, 6, 1).unwrap(),
    )
    .await;
    create_transaction(
        &database.pool,
        user_id,
        Decimal::new(80_00, 2),
        TransactionType::Expense,
        "Dining",
        chrono::NaiveDate::from_ymd_opt(2026, 5, 22).unwrap(),
    )
    .await;
    create_transaction(
        &database.pool,
        other_user_id,
        Decimal::new(70_00, 2),
        TransactionType::Expense,
        "Groceries",
        chrono::NaiveDate::from_ymd_opt(2026, 5, 22).unwrap(),
    )
    .await;

    let budget = budgets::get_budget(&database.pool, user_id, budget.id)
        .await
        .expect("budget should be readable");

    assert_eq!(budget.spent_amount, Decimal::new(175_00, 2));
    assert_eq!(budget.remaining_amount, Decimal::new(325_00, 2));

    let may_budgets = budgets::list_budgets(
        &database.pool,
        user_id,
        BudgetFilters {
            month: Some("2026-05-19".to_string()),
        },
    )
    .await
    .expect("budgets should list");

    assert_eq!(may_budgets.len(), 1);
    assert_eq!(may_budgets[0].id, budget.id);

    let other_user_budgets = budgets::list_budgets(
        &database.pool,
        other_user_id,
        BudgetFilters {
            month: Some("2026-05-01".to_string()),
        },
    )
    .await
    .expect("other user budgets should list");

    assert!(other_user_budgets.is_empty());

    database.cleanup().await;
}

#[tokio::test]
async fn budget_crud_duplicate_conflicts_and_user_scope_are_enforced() {
    let Some(database) = TestDatabase::new().await else {
        return;
    };

    let user_id = register_test_user(&database.pool, "budgets-crud", "USD")
        .await
        .expect("test user");
    let other_user_id = register_test_user(&database.pool, "budgets-crud-other", "USD")
        .await
        .expect("other test user");

    let budget = budgets::create_budget(
        &database.pool,
        user_id,
        CreateBudgetRequest {
            category: "Rent".to_string(),
            limit_amount: Decimal::new(1_200_00, 2),
            month: chrono::NaiveDate::from_ymd_opt(2026, 5, 1).unwrap(),
        },
    )
    .await
    .expect("budget should be created");

    let duplicate_error = budgets::create_budget(
        &database.pool,
        user_id,
        CreateBudgetRequest {
            category: "Rent".to_string(),
            limit_amount: Decimal::new(1_300_00, 2),
            month: chrono::NaiveDate::from_ymd_opt(2026, 5, 18).unwrap(),
        },
    )
    .await
    .expect_err("duplicate budget should be rejected");

    assert_eq!(
        duplicate_error.message,
        "A budget already exists for that category and month"
    );

    let other_user_update_error = budgets::update_budget(
        &database.pool,
        other_user_id,
        budget.id,
        UpdateBudgetRequest {
            category: "Rent".to_string(),
            limit_amount: Decimal::new(1_000_00, 2),
            month: chrono::NaiveDate::from_ymd_opt(2026, 5, 1).unwrap(),
        },
    )
    .await
    .expect_err("other user should not update budget");

    assert_eq!(other_user_update_error.message, "Budget not found");

    let updated = budgets::update_budget(
        &database.pool,
        user_id,
        budget.id,
        UpdateBudgetRequest {
            category: "Housing".to_string(),
            limit_amount: Decimal::new(1_400_00, 2),
            month: chrono::NaiveDate::from_ymd_opt(2026, 6, 20).unwrap(),
        },
    )
    .await
    .expect("budget should update");

    assert_eq!(updated.category, "Housing");
    assert_eq!(updated.limit_amount, Decimal::new(1_400_00, 2));
    assert_eq!(
        updated.month,
        chrono::NaiveDate::from_ymd_opt(2026, 6, 1).unwrap()
    );

    budgets::delete_budget(&database.pool, user_id, budget.id)
        .await
        .expect("budget should delete");

    let deleted_error = budgets::get_budget(&database.pool, user_id, budget.id)
        .await
        .expect_err("deleted budget should not be found");

    assert_eq!(deleted_error.message, "Budget not found");

    let cash_account_id = default_cash_account_id(&database.pool, user_id).await;
    assert_ne!(cash_account_id, uuid::Uuid::nil());

    database.cleanup().await;
}
