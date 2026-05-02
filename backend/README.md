# MiniFT Backend

Rust + Rocket API for MiniFT. The backend owns authentication, persistence, per-account currencies, exchange rates, transfer mirroring, recurring transaction generation, and reporting.

## Environment Variables

Set these before running locally outside Docker:

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/minift
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/minift
JWT_SECRET=change-me
ACCESS_TOKEN_TTL_MINUTES=15
REFRESH_TOKEN_TTL_DAYS=30
RECURRING_WORKER_INTERVAL_SECONDS=60
SEED_DEV_DATA=false
CORS_ALLOWED_ORIGINS=["http://localhost:3000","https://minift.pages.dev"]
ROCKET_ADDRESS=0.0.0.0
ROCKET_PORT=8000
```

`TEST_DATABASE_URL` is optional but recommended for integration tests. If it is omitted, the test helpers fall back to `DATABASE_URL`.

`CORS_ALLOWED_ORIGINS` accepts a JSON array of allowed frontend origins. Trailing slashes are normalized, so `http://localhost:3000/` and `http://localhost:3000` are treated the same.

## Run Locally

```bash
cargo run
```

The backend applies SQL migrations automatically on startup.

If `SEED_DEV_DATA=true`, startup also creates a demo user plus sample accounts, transactions, budgets, recurring rules, and exchange rates:

- Email: `demo@minift.local`
- Password: `demo12345`

## Run Tests

```bash
cargo test
```

Unit tests live next to the modules they cover. Integration tests live under `backend/tests/`, create isolated PostgreSQL schemas, and try `TEST_DATABASE_URL` first and `DATABASE_URL` second. If no reachable database is available, they return early instead of failing.

## API Areas

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/auth/me`
- `PUT /api/auth/me`
- CRUD for accounts, transactions, budgets, and recurring transactions
- `POST /api/transfers`
- `GET /api/exchange-rates`
- `PUT /api/exchange-rates`
- monthly and category summaries under `/api/transactions/summary/*`

## Notes

- A default `Cash` account is created for every new user using that user's default currency.
- Accounts can be `cash`, `bank_account`, `credit_card`, or `loan`.
- Transfers are stored in `transfers` and mirrored into `transactions`.
- Exchange rates are owned by the user and editable from the accounts workflow.
- The recurring worker runs inside the API process and checks due items on an interval.
