use chrono::{Datelike, Days, Months, NaiveDate, Utc};
use rust_decimal::Decimal;
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    config::AppState,
    errors::ApiError,
    models::{account::AccountType, recurring::RecurringFrequency, transaction::TransactionType},
    schema::{
        account::CreateAccountRequest, auth::RegisterRequest, budget::CreateBudgetRequest,
        exchange_rate::ExchangeRateInput, recurring::CreateRecurringTransactionRequest,
        transaction::CreateTransactionRequest, transfer::CreateTransferRequest,
    },
    services::{accounts, auth, budgets, exchange_rates, recurring, transactions, transfers},
};

const DEMO_EMAIL: &str = "demo@minift.local";
const DEMO_PASSWORD: &str = "demo12345";
const DEMO_DEFAULT_CURRENCY: &str = "USD";

struct DemoAccounts {
    cash_account_id: Uuid,
    checking_account_id: Uuid,
    travel_account_id: Uuid,
    credit_card_account_id: Uuid,
    loan_account_id: Uuid,
}

fn money(units: i64) -> Decimal {
    Decimal::new(units, 2)
}

fn current_month_day(today: NaiveDate, preferred_day: u32) -> NaiveDate {
    let first_day = today.with_day(1).unwrap_or(today);
    let target_day = preferred_day.min(today.day()).max(1);

    first_day.with_day(target_day).unwrap_or(today)
}

fn month_day(month: NaiveDate, preferred_day: u32) -> NaiveDate {
    month.with_day(preferred_day).unwrap_or(month)
}

async fn demo_user_exists(pool: &PgPool) -> Result<bool, ApiError> {
    sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)")
        .bind(DEMO_EMAIL)
        .fetch_one(pool)
        .await
        .map_err(ApiError::from)
}

async fn create_demo_accounts(state: &AppState, user_id: Uuid) -> Result<DemoAccounts, ApiError> {
    let seeded_accounts = accounts::list_accounts(&state.pool, user_id).await?;
    let cash_account_id = seeded_accounts
        .into_iter()
        .find(|account| account.r#type == AccountType::Cash)
        .map(|account| account.id)
        .ok_or_else(|| {
            ApiError::internal("Seeded demo user is missing the default cash account")
        })?;

    let checking_account = accounts::create_account(
        &state.pool,
        user_id,
        CreateAccountRequest {
            name: "Main checking".to_string(),
            r#type: AccountType::BankAccount,
            currency: Some("USD".to_string()),
        },
    )
    .await?;

    let travel_account = accounts::create_account(
        &state.pool,
        user_id,
        CreateAccountRequest {
            name: "Travel fund".to_string(),
            r#type: AccountType::BankAccount,
            currency: Some("EUR".to_string()),
        },
    )
    .await?;

    let credit_card_account = accounts::create_account(
        &state.pool,
        user_id,
        CreateAccountRequest {
            name: "Visa card".to_string(),
            r#type: AccountType::CreditCard,
            currency: Some("USD".to_string()),
        },
    )
    .await?;

    let loan_account = accounts::create_account(
        &state.pool,
        user_id,
        CreateAccountRequest {
            name: "Car loan".to_string(),
            r#type: AccountType::Loan,
            currency: Some("DOP".to_string()),
        },
    )
    .await?;

    Ok(DemoAccounts {
        cash_account_id,
        checking_account_id: checking_account.id,
        travel_account_id: travel_account.id,
        credit_card_account_id: credit_card_account.id,
        loan_account_id: loan_account.id,
    })
}

async fn create_demo_exchange_rates(state: &AppState, user_id: Uuid) -> Result<(), ApiError> {
    exchange_rates::replace_exchange_rates(
        &state.pool,
        user_id,
        vec![
            ExchangeRateInput {
                from_currency: "USD".to_string(),
                to_currency: "EUR".to_string(),
                rate: Decimal::new(92, 2),
            },
            ExchangeRateInput {
                from_currency: "EUR".to_string(),
                to_currency: "USD".to_string(),
                rate: Decimal::new(109, 2),
            },
            ExchangeRateInput {
                from_currency: "USD".to_string(),
                to_currency: "DOP".to_string(),
                rate: Decimal::new(5850, 2),
            },
            ExchangeRateInput {
                from_currency: "DOP".to_string(),
                to_currency: "USD".to_string(),
                rate: Decimal::new(1709, 5),
            },
            ExchangeRateInput {
                from_currency: "EUR".to_string(),
                to_currency: "DOP".to_string(),
                rate: Decimal::new(6375, 2),
            },
            ExchangeRateInput {
                from_currency: "DOP".to_string(),
                to_currency: "EUR".to_string(),
                rate: Decimal::new(1569, 5),
            },
        ],
    )
    .await?;

    Ok(())
}

async fn create_demo_transactions(
    state: &AppState,
    user_id: Uuid,
    accounts: &DemoAccounts,
    today: NaiveDate,
) -> Result<(), ApiError> {
    let salary_date = current_month_day(today, 2);
    let rent_date = current_month_day(today, 3);
    let utility_date = current_month_day(today, 5);
    let travel_income_date = current_month_day(today, 6);
    let transfer_date = current_month_day(today, 7);
    let grocery_date = current_month_day(today, 8);
    let dining_date = current_month_day(today, 9);
    let card_purchase_date = current_month_day(today, 10);
    let card_payment_date = current_month_day(today, 12);
    let loan_date = current_month_day(today, 4);
    let travel_expense_date = current_month_day(today, 11);
    let previous_month = today
        .with_day(1)
        .and_then(|date| date.checked_sub_months(Months::new(1)))
        .unwrap_or(today);
    let previous_month_date = month_day(previous_month, 18);

    transactions::create_transaction(
        &state.pool,
        user_id,
        CreateTransactionRequest {
            account_id: Some(accounts.checking_account_id),
            amount: money(420000),
            r#type: TransactionType::Income,
            category: "Salary".to_string(),
            note: Some("Seeded payroll deposit".to_string()),
            date: salary_date,
        },
    )
    .await?;

    transactions::create_transaction(
        &state.pool,
        user_id,
        CreateTransactionRequest {
            account_id: Some(accounts.checking_account_id),
            amount: money(125000),
            r#type: TransactionType::Expense,
            category: "Rent".to_string(),
            note: Some("Monthly apartment rent".to_string()),
            date: rent_date,
        },
    )
    .await?;

    transactions::create_transaction(
        &state.pool,
        user_id,
        CreateTransactionRequest {
            account_id: Some(accounts.checking_account_id),
            amount: money(14500),
            r#type: TransactionType::Expense,
            category: "Utilities".to_string(),
            note: Some("Electricity and internet".to_string()),
            date: utility_date,
        },
    )
    .await?;

    transfers::create_transfer(
        &state.pool,
        user_id,
        CreateTransferRequest {
            from_account_id: accounts.checking_account_id,
            to_account_id: accounts.cash_account_id,
            amount: money(20000),
            date: transfer_date,
            note: Some("ATM withdrawal".to_string()),
        },
    )
    .await?;

    transactions::create_transaction(
        &state.pool,
        user_id,
        CreateTransactionRequest {
            account_id: Some(accounts.cash_account_id),
            amount: money(6400),
            r#type: TransactionType::Expense,
            category: "Groceries".to_string(),
            note: Some("Weekly grocery run".to_string()),
            date: grocery_date,
        },
    )
    .await?;

    transactions::create_transaction(
        &state.pool,
        user_id,
        CreateTransactionRequest {
            account_id: Some(accounts.cash_account_id),
            amount: money(3650),
            r#type: TransactionType::Expense,
            category: "Dining".to_string(),
            note: Some("Coffee and lunch".to_string()),
            date: dining_date,
        },
    )
    .await?;

    transactions::create_transaction(
        &state.pool,
        user_id,
        CreateTransactionRequest {
            account_id: Some(accounts.travel_account_id),
            amount: money(90000),
            r#type: TransactionType::Income,
            category: "Savings".to_string(),
            note: Some("Travel budget allocation".to_string()),
            date: travel_income_date,
        },
    )
    .await?;

    transactions::create_transaction(
        &state.pool,
        user_id,
        CreateTransactionRequest {
            account_id: Some(accounts.travel_account_id),
            amount: money(18000),
            r#type: TransactionType::Expense,
            category: "Transport".to_string(),
            note: Some("Airport rail pass".to_string()),
            date: travel_expense_date,
        },
    )
    .await?;

    transactions::create_transaction(
        &state.pool,
        user_id,
        CreateTransactionRequest {
            account_id: Some(accounts.travel_account_id),
            amount: money(12500),
            r#type: TransactionType::Expense,
            category: "Dining".to_string(),
            note: Some("Dinner while traveling".to_string()),
            date: previous_month_date,
        },
    )
    .await?;

    transactions::create_transaction(
        &state.pool,
        user_id,
        CreateTransactionRequest {
            account_id: Some(accounts.credit_card_account_id),
            amount: money(42000),
            r#type: TransactionType::Expense,
            category: "Electronics".to_string(),
            note: Some("Headphones purchase".to_string()),
            date: card_purchase_date,
        },
    )
    .await?;

    transactions::create_transaction(
        &state.pool,
        user_id,
        CreateTransactionRequest {
            account_id: Some(accounts.credit_card_account_id),
            amount: money(8500),
            r#type: TransactionType::Expense,
            category: "Dining".to_string(),
            note: Some("Restaurant bill".to_string()),
            date: card_purchase_date,
        },
    )
    .await?;

    transactions::create_transaction(
        &state.pool,
        user_id,
        CreateTransactionRequest {
            account_id: Some(accounts.credit_card_account_id),
            amount: money(15000),
            r#type: TransactionType::Income,
            category: "Card payment".to_string(),
            note: Some("Partial card payment".to_string()),
            date: card_payment_date,
        },
    )
    .await?;

    transactions::create_transaction(
        &state.pool,
        user_id,
        CreateTransactionRequest {
            account_id: Some(accounts.loan_account_id),
            amount: money(9500000),
            r#type: TransactionType::Expense,
            category: "Debt service".to_string(),
            note: Some("Outstanding loan principal".to_string()),
            date: loan_date,
        },
    )
    .await?;

    transactions::create_transaction(
        &state.pool,
        user_id,
        CreateTransactionRequest {
            account_id: Some(accounts.loan_account_id),
            amount: money(1200000),
            r#type: TransactionType::Income,
            category: "Debt service".to_string(),
            note: Some("Recent loan payment".to_string()),
            date: today,
        },
    )
    .await?;

    Ok(())
}

async fn create_demo_budgets(
    state: &AppState,
    user_id: Uuid,
    today: NaiveDate,
) -> Result<(), ApiError> {
    let current_month = today.with_day(1).unwrap_or(today);

    for (category, limit_amount) in [
        ("Groceries", money(45000)),
        ("Dining", money(22000)),
        ("Transport", money(18000)),
        ("Utilities", money(18000)),
    ] {
        budgets::create_budget(
            &state.pool,
            user_id,
            CreateBudgetRequest {
                category: category.to_string(),
                limit_amount,
                month: current_month,
            },
        )
        .await?;
    }

    Ok(())
}

async fn create_demo_recurring_rules(
    state: &AppState,
    user_id: Uuid,
    accounts: &DemoAccounts,
    today: NaiveDate,
) -> Result<(), ApiError> {
    let next_month = today
        .with_day(1)
        .and_then(|date| date.checked_add_months(Months::new(1)))
        .unwrap_or(today);
    let next_week = today.checked_add_days(Days::new(7)).unwrap_or(today);

    recurring::create_recurring_transaction(
        &state.pool,
        user_id,
        CreateRecurringTransactionRequest {
            account_id: accounts.checking_account_id,
            amount: money(420000),
            r#type: TransactionType::Income,
            category: "Salary".to_string(),
            note: Some("Monthly payroll".to_string()),
            frequency: RecurringFrequency::Monthly,
            next_run_date: month_day(next_month, 2),
        },
    )
    .await?;

    recurring::create_recurring_transaction(
        &state.pool,
        user_id,
        CreateRecurringTransactionRequest {
            account_id: accounts.checking_account_id,
            amount: money(125000),
            r#type: TransactionType::Expense,
            category: "Rent".to_string(),
            note: Some("Monthly apartment rent".to_string()),
            frequency: RecurringFrequency::Monthly,
            next_run_date: month_day(next_month, 3),
        },
    )
    .await?;

    recurring::create_recurring_transaction(
        &state.pool,
        user_id,
        CreateRecurringTransactionRequest {
            account_id: accounts.cash_account_id,
            amount: money(7500),
            r#type: TransactionType::Expense,
            category: "Groceries".to_string(),
            note: Some("Weekly essentials".to_string()),
            frequency: RecurringFrequency::Weekly,
            next_run_date: next_week,
        },
    )
    .await?;

    Ok(())
}

pub async fn seed_dev_data(state: &AppState) -> Result<(), ApiError> {
    if !state.seed.enabled {
        return Ok(());
    }

    if demo_user_exists(&state.pool).await? {
        eprintln!("SEED_DEV_DATA enabled: demo user already exists, skipping seed");
        return Ok(());
    }

    let auth_response = auth::register_user(
        &state.pool,
        &state.auth,
        RegisterRequest {
            email: DEMO_EMAIL.to_string(),
            password: DEMO_PASSWORD.to_string(),
            currency: Some(DEMO_DEFAULT_CURRENCY.to_string()),
        },
    )
    .await?;

    let user_id = auth_response.user.id;
    let today = Utc::now().date_naive();

    let demo_accounts = create_demo_accounts(state, user_id).await?;
    create_demo_exchange_rates(state, user_id).await?;
    create_demo_transactions(state, user_id, &demo_accounts, today).await?;
    create_demo_budgets(state, user_id, today).await?;
    create_demo_recurring_rules(state, user_id, &demo_accounts, today).await?;

    eprintln!(
        "SEED_DEV_DATA enabled: seeded demo workspace for {DEMO_EMAIL} with password {DEMO_PASSWORD}"
    );

    Ok(())
}
