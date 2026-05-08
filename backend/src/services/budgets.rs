use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    errors::ApiError,
    logging::{self, field},
    models::budget::BudgetRow,
    schema::budget::{BudgetFilters, BudgetResponse, CreateBudgetRequest, UpdateBudgetRequest},
    services::{
        ensure_positive_amount, normalize_month, normalize_required_text, parse_optional_date,
    },
};

fn is_unique_violation(error: &sqlx::Error) -> bool {
    match error {
        sqlx::Error::Database(db_error) => db_error.code().as_deref() == Some("23505"),
        _ => false,
    }
}

fn map_budget(row: BudgetRow) -> BudgetResponse {
    BudgetResponse {
        id: row.id,
        category: row.category,
        limit_amount: row.limit_amount,
        month: row.month,
        created_at: row.created_at,
        spent_amount: row.spent_amount,
        remaining_amount: row.limit_amount - row.spent_amount,
    }
}

pub async fn list_budgets(
    pool: &PgPool,
    user_id: Uuid,
    filters: BudgetFilters,
) -> Result<Vec<BudgetResponse>, ApiError> {
    let month_filter = filters.month.clone();
    let month = match parse_optional_date(filters.month, "month")? {
        Some(value) => Some(normalize_month(value)?),
        None => None,
    };

    let rows = if let Some(month) = month {
        sqlx::query_as::<_, BudgetRow>(
            "SELECT
                b.id,
                b.category,
                b.limit_amount,
                b.month,
                b.created_at,
                COALESCE((
                  SELECT SUM(t.amount)
                  FROM transactions t
                  WHERE t.user_id = b.user_id
                    AND t.transfer_id IS NULL
                    AND t.type = 'expense'
                    AND LOWER(t.category) = LOWER(b.category)
                    AND t.date >= b.month
                    AND t.date < (b.month + INTERVAL '1 month')
                ), 0::numeric) AS spent_amount
             FROM budgets b
             WHERE b.user_id = $1
               AND b.month = $2
             ORDER BY b.month DESC, b.category ASC",
        )
        .bind(user_id)
        .bind(month)
        .fetch_all(pool)
        .await?
    } else {
        sqlx::query_as::<_, BudgetRow>(
            "SELECT
                b.id,
                b.category,
                b.limit_amount,
                b.month,
                b.created_at,
                COALESCE((
                  SELECT SUM(t.amount)
                  FROM transactions t
                  WHERE t.user_id = b.user_id
                    AND t.transfer_id IS NULL
                    AND t.type = 'expense'
                    AND LOWER(t.category) = LOWER(b.category)
                    AND t.date >= b.month
                    AND t.date < (b.month + INTERVAL '1 month')
                ), 0::numeric) AS spent_amount
             FROM budgets b
             WHERE b.user_id = $1
             ORDER BY b.month DESC, b.category ASC",
        )
        .bind(user_id)
        .fetch_all(pool)
        .await?
    };

    let budgets = rows.into_iter().map(map_budget).collect::<Vec<_>>();

    logging::info(
        "budgets.listed",
        &[
            field("user_id", user_id),
            field("budget_count", budgets.len()),
            field("month_filter", month_filter),
        ],
    );

    Ok(budgets)
}

pub async fn create_budget(
    pool: &PgPool,
    user_id: Uuid,
    payload: CreateBudgetRequest,
) -> Result<BudgetResponse, ApiError> {
    let category = normalize_required_text(&payload.category, "Category")?;
    ensure_positive_amount(payload.limit_amount, "Budget limit")?;
    let month = normalize_month(payload.month)?;

    let row = sqlx::query_as::<_, BudgetRow>(
        "INSERT INTO budgets (user_id, category, limit_amount, month)
         VALUES ($1, $2, $3, $4)
         RETURNING
           id,
           category,
           limit_amount,
           month,
           created_at,
           0::numeric AS spent_amount",
    )
    .bind(user_id)
    .bind(category)
    .bind(payload.limit_amount)
    .bind(month)
    .fetch_one(pool)
    .await
    .map_err(|error| {
        if is_unique_violation(&error) {
            logging::warn(
                "budgets.create.failed",
                &[
                    field("user_id", user_id),
                    field("reason", "duplicate_budget_for_month"),
                ],
            );
            ApiError::conflict("A budget already exists for that category and month")
        } else {
            ApiError::from(error)
        }
    })?;

    let budget = map_budget(row);

    logging::info(
        "budgets.created",
        &[
            field("user_id", user_id),
            field("budget_id", budget.id),
            field("category", &budget.category),
            field("limit_amount", budget.limit_amount),
            field("month", budget.month),
        ],
    );

    Ok(budget)
}

pub async fn update_budget(
    pool: &PgPool,
    user_id: Uuid,
    budget_id: Uuid,
    payload: UpdateBudgetRequest,
) -> Result<BudgetResponse, ApiError> {
    let category = normalize_required_text(&payload.category, "Category")?;
    ensure_positive_amount(payload.limit_amount, "Budget limit")?;
    let month = normalize_month(payload.month)?;

    let updated = sqlx::query(
        "UPDATE budgets
         SET category = $1, limit_amount = $2, month = $3
         WHERE id = $4 AND user_id = $5",
    )
    .bind(category)
    .bind(payload.limit_amount)
    .bind(month)
    .bind(budget_id)
    .bind(user_id)
    .execute(pool)
    .await
    .map_err(|error| {
        if is_unique_violation(&error) {
            logging::warn(
                "budgets.update.failed",
                &[
                    field("user_id", user_id),
                    field("budget_id", budget_id),
                    field("reason", "duplicate_budget_for_month"),
                ],
            );
            ApiError::conflict("A budget already exists for that category and month")
        } else {
            ApiError::from(error)
        }
    })?;

    if updated.rows_affected() == 0 {
        return Err(ApiError::not_found("Budget not found"));
    }

    let budget = get_budget(pool, user_id, budget_id).await?;

    logging::info(
        "budgets.updated",
        &[
            field("user_id", user_id),
            field("budget_id", budget.id),
            field("category", &budget.category),
            field("limit_amount", budget.limit_amount),
            field("month", budget.month),
            field("spent_amount", budget.spent_amount),
        ],
    );

    Ok(budget)
}

pub async fn get_budget(
    pool: &PgPool,
    user_id: Uuid,
    budget_id: Uuid,
) -> Result<BudgetResponse, ApiError> {
    let row = sqlx::query_as::<_, BudgetRow>(
        "SELECT
            b.id,
            b.category,
            b.limit_amount,
            b.month,
            b.created_at,
            COALESCE((
              SELECT SUM(t.amount)
              FROM transactions t
              WHERE t.user_id = b.user_id
                AND t.transfer_id IS NULL
                AND t.type = 'expense'
                AND LOWER(t.category) = LOWER(b.category)
                AND t.date >= b.month
                AND t.date < (b.month + INTERVAL '1 month')
            ), 0::numeric) AS spent_amount
         FROM budgets b
         WHERE b.user_id = $1 AND b.id = $2",
    )
    .bind(user_id)
    .bind(budget_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| ApiError::not_found("Budget not found"))?;

    let budget = map_budget(row);

    logging::info(
        "budgets.read",
        &[
            field("user_id", user_id),
            field("budget_id", budget.id),
            field("category", &budget.category),
            field("limit_amount", budget.limit_amount),
            field("month", budget.month),
            field("spent_amount", budget.spent_amount),
            field("remaining_amount", budget.remaining_amount),
        ],
    );

    Ok(budget)
}

pub async fn delete_budget(pool: &PgPool, user_id: Uuid, budget_id: Uuid) -> Result<(), ApiError> {
    let budget = get_budget(pool, user_id, budget_id).await?;
    let result = sqlx::query("DELETE FROM budgets WHERE id = $1 AND user_id = $2")
        .bind(budget_id)
        .bind(user_id)
        .execute(pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(ApiError::not_found("Budget not found"));
    }

    logging::info(
        "budgets.deleted",
        &[
            field("user_id", user_id),
            field("budget_id", budget.id),
            field("category", &budget.category),
            field("limit_amount", budget.limit_amount),
            field("month", budget.month),
        ],
    );

    Ok(())
}
