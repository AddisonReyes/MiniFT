use rocket::Route;

use crate::handlers;

pub fn all() -> Vec<Route> {
    routes![
        handlers::health::health,
        handlers::auth::register,
        handlers::auth::login,
        handlers::auth::refresh,
        handlers::auth::me,
        handlers::accounts::list,
        handlers::accounts::get,
        handlers::accounts::create,
        handlers::accounts::update,
        handlers::accounts::delete,
        handlers::transactions::list,
        handlers::transactions::get,
        handlers::transactions::create,
        handlers::transactions::update,
        handlers::transactions::delete,
        handlers::transactions::monthly_summary,
        handlers::transactions::category_summary,
        handlers::budgets::list,
        handlers::budgets::get,
        handlers::budgets::create,
        handlers::budgets::update,
        handlers::budgets::delete,
        handlers::transfers::list,
        handlers::transfers::create,
        handlers::transfers::delete,
        handlers::recurring::list,
        handlers::recurring::create,
        handlers::recurring::update,
        handlers::recurring::delete,
    ]
}
