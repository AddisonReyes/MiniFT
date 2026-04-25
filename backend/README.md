# MiniFT Backend

Rust + Rocket API for MiniFT. The backend owns authentication, persistence, transfer mirroring, recurring transaction generation, and reporting.

## Environment Variables

Set these before running locally outside Docker:

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/minift
JWT_SECRET=change-me
ACCESS_TOKEN_TTL_MINUTES=15
REFRESH_TOKEN_TTL_DAYS=30
RECURRING_WORKER_INTERVAL_SECONDS=60
ROCKET_ADDRESS=0.0.0.0
ROCKET_PORT=8000
```

## Run Locally

```bash
cargo run
```

The backend applies SQL migrations automatically on startup.

## API Areas

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/auth/me`
- CRUD for accounts, transactions, budgets, and recurring transactions
- `POST /api/transfers`
- monthly and category summaries under `/api/transactions/summary/*`

## Notes

- A default `Cash` account is created for every new user.
- Transfers are stored in `transfers` and mirrored into `transactions`.
- The recurring worker runs inside the API process and checks due items on an interval.

