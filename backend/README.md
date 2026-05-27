# MiniFT Backend

Rust + Rocket API for MiniFT. The backend owns authentication, persistence, per-account currencies, exchange rates, transfer mirroring, recurring transaction generation, and reporting.

## Environment Variables

Set these before running locally outside Docker:

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/minift
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/minift
JWT_SECRET=replace-with-at-least-32-random-characters
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM_EMAIL=MiniFT <onboarding@resend.dev>
APP_BASE_URL=http://localhost:3000
EMAIL_VERIFICATION_TTL_HOURS=24
PASSWORD_RESET_CODE_TTL_MINUTES=15
ACCESS_TOKEN_TTL_MINUTES=15
REFRESH_TOKEN_TTL_DAYS=30
ACCESS_COOKIE_NAME=minift_access_token
REFRESH_COOKIE_NAME=minift_refresh_token
AUTH_COOKIE_SECURE=false
AUTH_COOKIE_SAME_SITE=lax
AUTH_COOKIE_DOMAIN=
RECURRING_WORKER_INTERVAL_SECONDS=60
SEED_DEV_DATA=false
FRANKFURTER_ENABLED=true
FRANKFURTER_API_BASE_URL=https://api.frankfurter.dev/v2
FRANKFURTER_TIMEOUT_SECONDS=10
CORS_ALLOWED_ORIGINS=["http://localhost:3000","http://localhost","https://localhost","https://minift.pages.dev"]
ROCKET_ADDRESS=0.0.0.0
ROCKET_PORT=8000
```

`TEST_DATABASE_URL` is optional but recommended for integration tests. If it is omitted, the test helpers fall back to `DATABASE_URL`.
Frankfurter is used as the default online exchange-rate provider. Leave it enabled unless you want accounts to rely only on manual overrides.
`JWT_SECRET` is required, must be at least 32 characters, and must not use a placeholder value.
`RESEND_API_KEY` is required because registration, email verification, password reset, and password change confirmations are now email-backed.
`APP_BASE_URL` is the frontend origin used in verification links sent by email. For local web development, `http://localhost:3000` is the expected default.
`ACCESS_COOKIE_NAME` and `REFRESH_COOKIE_NAME` are optional overrides for the auth cookie names.

`CORS_ALLOWED_ORIGINS` accepts a JSON array of explicit allowed frontend origins. Wildcard origins are rejected because the API uses credentialed cookie auth. Trailing slashes are normalized, so `http://localhost:3000/` and `http://localhost:3000` are treated the same.
For Capacitor Android testing, allow the localhost WebView origins used by the app shell. This repo pins Android to `http://localhost`, but keeping both `http://localhost` and `https://localhost` in the allowlist makes local and migrated builds more forgiving.
For cross-origin production deployments such as Cloudflare Pages calling Railway, set `AUTH_COOKIE_SECURE=true` and `AUTH_COOKIE_SAME_SITE=none` so the browser will send auth cookies with API requests. Set `AUTH_COOKIE_DOMAIN` only when you intentionally need to scope cookies to a specific production domain.

## Run Locally

```bash
cargo run
```

The backend applies SQL migrations automatically on startup.

Interactive API docs are served publicly from the same backend process:

- Swagger UI: `http://localhost:8000/docs`
- OpenAPI JSON: `http://localhost:8000/api-docs/openapi.json`

If `SEED_DEV_DATA=true`, startup also creates a demo user plus sample accounts, transactions, budgets, recurring rules, and exchange rates:

- Email: `demo@minift.local`
- Password: `demo12345`

## Run Tests

```bash
cargo fmt --check
cargo test
```

Unit tests live next to the modules they cover. Integration tests live under `backend/tests/`, create isolated PostgreSQL schemas, and try `TEST_DATABASE_URL` first and `DATABASE_URL` second. If no reachable database is available, they return early instead of failing.

## API Areas

- `POST /api/auth/register`
- `POST /api/auth/register/resend-verification`
- `POST /api/auth/verify-email`
- `POST /api/auth/login`
- `POST /api/auth/password/reset/request`
- `POST /api/auth/password/reset/confirm`
- `POST /api/auth/password/change/request`
- `POST /api/auth/password/change/confirm`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PUT /api/auth/me`
- CRUD for accounts, transactions, budgets, and recurring transactions
- `POST /api/transfers`
- `GET /api/exchange-rates`
- `PUT /api/exchange-rates`
- monthly and category summaries under `/api/transactions/summary/*`

## Swagger / OpenAPI

The backend publishes an OpenAPI 3.1 document and an embedded Swagger UI.

- UI route: `/docs`
- JSON route: `/api-docs/openapi.json`
- Protected routes are documented with both Bearer auth and cookie auth.
- `POST /api/auth/refresh` is documented as using the refresh cookie rather than a JSON request body.

## Notes

- A default `Cash` account is created for every new user using that user's default currency.
- New accounts start in a pending-verification state until the email link is completed.
- Auth sessions use HttpOnly cookies plus rotated refresh sessions stored in PostgreSQL.
- Password reset and settings password changes both use emailed one-time codes delivered through Resend.
- `POST /api/auth/refresh` rotates the persisted refresh session and reads the refresh token from the auth cookie instead of expecting a request body.
- Accounts can be `cash`, `bank_account`, `credit_card`, or `loan`.
- Transfers are stored in `transfers` and mirrored into `transactions`.
- Exchange rates are resolved from Frankfurter daily data by default, while checked pairs in the accounts modal are stored as user-owned manual overrides.
- The recurring worker runs inside the API process and checks due items on an interval.

## Backend Logs

- The backend emits structured JSON logs to `stdout`/`stderr`.
- Logs cover startup, database connectivity, HTTP request completion, auth failures, user CRUD operations, exchange-rate refreshes, dev seed activity, and recurring worker processing.
- Business logs include identifiers and operational context such as `user_id`, resource ids, counts, currencies, dates, and status codes.
- Credentials, JWT secrets, passwords, and raw auth tokens are not written to logs.
