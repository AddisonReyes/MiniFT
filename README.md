# MiniFT

MiniFT is a minimalist personal finance tracker built as a full-stack MVP with a Rust API, Next.js frontend, PostgreSQL persistence, cookie-backed auth, multi-currency accounts, editable exchange rates, recurring transaction processing, budgets, and reporting.

## Stack

- Frontend: Next.js App Router, TypeScript, React, TailwindCSS, TanStack Query
- Backend: Rust, Rocket, SQLx, PostgreSQL
- Infra: Docker, docker-compose

## Architecture

- `frontend/` builds to a static `out/` export for Cloudflare Pages.
- The public landing page lives at `/`; authenticated users work from `/dashboard`.
- The browser calls the backend API directly using `NEXT_PUBLIC_API_BASE_URL`.
- `backend/` exposes the Rocket API under `/api/*`.
- The backend authenticates users with `HttpOnly` access cookies plus rotated refresh sessions persisted in PostgreSQL.
- Because the frontend is a static export, authenticated routes are client-guarded after the session check instead of server-rendered behind middleware.
- `postgres` stores users, accounts, per-account currencies, exchange rates, transactions, transfers, recurring rules, and budgets.
- The backend runs a background worker to materialize due recurring transactions.
- The backend can optionally seed a complete demo workspace when `SEED_DEV_DATA=true`.
- The backend adds CORS headers so the static frontend can authenticate and query data from a different origin.

## Run The MVP

```bash
docker-compose up --build
```

Once the stack is ready:

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:8000/health`

The development stack keeps PostgreSQL data in the Docker volume `postgres_data`. Avoid `docker-compose down -v` if you want to preserve your local workspace data between runs.

When `SEED_DEV_DATA=true`, the backend also creates a demo workspace automatically:

- Email: `demo@minift.local`
- Password: `demo12345`

## First Use

1. Open `http://localhost:3000/register`
2. Create an account
3. Sign in and continue to `/dashboard`
4. Set your default currency in `/settings` if needed
5. Start adding multi-currency accounts, transactions, transfers, budgets, and recurring entries

Or, if development seed data is enabled, open `http://localhost:3000/login` and sign in with the demo credentials above.

## Backend Highlights

- JWT access cookies with rotated refresh sessions
- Argon2 password hashing
- Default `Cash` account created at registration using the user's default currency
- Per-account currencies plus user-owned exchange rate overrides layered over Frankfurter daily rates
- Transfer mirroring into transaction records
- Monthly and category summary endpoints
- Idempotent development seed data for local demos
- Rust unit tests plus Postgres-backed integration tests
- SQL migrations applied automatically on startup

## Frontend Highlights

- Public landing page plus protected dashboard workspace
- Dark-mode-first UI with a subtle ledger-grid background
- `/accounts` shows gross and net totals in the user's default currency, per-account currencies, and an editable conversions modal with Frankfurter-backed daily rates plus manual overrides
- `/settings` lets users update their default currency after registration
- Static HTML export compatible with Cloudflare Pages
- HttpOnly cookie session with automatic refresh
- CRUD screens for accounts, transactions, budgets, and recurring transactions
- Reports page for monthly totals and category breakdowns
- Shared UI widgets for branding, footer, finance snapshots, month picking, and transaction display styles
- `frontend/DESIGN.md` documents the design language for future UI work

## Testing

- `cd backend && cargo fmt --check`
- `cd backend && cargo test`
- `cd backend && cargo check`
- `cd frontend && npm run build`
- `cd frontend && npm run lint`

Backend integration tests try `TEST_DATABASE_URL` first and then `DATABASE_URL`. If neither points to a reachable PostgreSQL instance, those integration tests exit early without failing.

GitHub Actions mirrors this baseline in [.github/workflows/ci.yml](/home/dakotitah/github/MiniFT/.github/workflows/ci.yml).

## Exchange Rates

- MiniFT fetches daily currency conversions from Frankfurter by default.
- Users can override any pair manually from `/accounts`; unchecked pairs continue using the online rate.
- Backend env vars:
  - `FRANKFURTER_ENABLED=true`
  - `FRANKFURTER_API_BASE_URL=https://api.frankfurter.dev/v2`
  - `FRANKFURTER_TIMEOUT_SECONDS=10`

## Cloudflare Pages

Build the frontend from `frontend/` with:

- Build command: `npm run build`
- Output directory: `out`
- Environment variable: `NEXT_PUBLIC_API_BASE_URL=https://<your-railway-backend>/api`

Set the Railway backend allowlist with:

- `CORS_ALLOWED_ORIGINS=["https://<your-project>.pages.dev","http://localhost:3000"]`
- `AUTH_COOKIE_SECURE=true`
- `AUTH_COOKIE_SAME_SITE=none`
- `AUTH_COOKIE_DOMAIN=` optionally set to your API cookie domain when your production setup requires it

The backend must use an explicit origin allowlist for cookie auth. Avoid `CORS_ALLOWED_ORIGINS=["*"]` in production.

## Local Development Without Docker

- Copy [backend/.env.example](/home/dakotitah/github/MiniFT/backend/.env.example) to `backend/.env` and adjust values if needed.
- Copy [frontend/.env.example](/home/dakotitah/github/MiniFT/frontend/.env.example) to `frontend/.env`.
- Backend instructions: [backend/README.md](/home/dakotitah/github/MiniFT/backend/README.md)
- Frontend instructions: [frontend/README.md](/home/dakotitah/github/MiniFT/frontend/README.md)
