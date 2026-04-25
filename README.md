# MiniFT

MiniFT is a minimalist personal finance tracker built as a full-stack MVP with a Rust API, Next.js frontend, PostgreSQL persistence, JWT auth, recurring transaction processing, budgets, and reporting.

## Stack

- Frontend: Next.js App Router, TypeScript, React, TailwindCSS, TanStack Query
- Backend: Rust, Rocket, SQLx, PostgreSQL
- Infra: Docker, docker-compose

## Architecture

- `frontend/` builds to a static `out/` export for Cloudflare Pages.
- The browser calls the backend API directly using `NEXT_PUBLIC_API_BASE_URL`.
- `backend/` exposes the Rocket API under `/api/*`.
- `postgres` stores users, accounts, transactions, transfers, recurring rules, and budgets.
- The backend runs a background worker to materialize due recurring transactions.
- The backend adds CORS headers so the static frontend can authenticate and query data from a different origin.

## Run The MVP

```bash
docker-compose up --build
```

Once the stack is ready:

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:8000/health`

## First Use

1. Open `http://localhost:3000/register`
2. Create an account
3. Sign in and start adding accounts, transactions, transfers, budgets, and recurring entries

## Backend Highlights

- JWT auth with access and refresh tokens
- Argon2 password hashing
- Default `Cash` account created at registration
- Transfer mirroring into transaction records
- Monthly and category summary endpoints
- SQL migrations applied automatically on startup

## Frontend Highlights

- Dark-mode-first UI
- Static HTML export compatible with Cloudflare Pages
- Browser-managed JWT session with automatic refresh
- CRUD screens for accounts, transactions, budgets, and recurring transactions
- Reports page for monthly totals and category breakdowns

## Cloudflare Pages

Build the frontend from `frontend/` with:

- Build command: `npm run build`
- Output directory: `out`
- Environment variable: `NEXT_PUBLIC_API_BASE_URL=https://<your-railway-backend>/api`

## Local Development Without Docker

- Backend instructions: [backend/README.md](/home/dakotitah/github/MiniFT/backend/README.md)
- Frontend instructions: [frontend/README.md](/home/dakotitah/github/MiniFT/frontend/README.md)
