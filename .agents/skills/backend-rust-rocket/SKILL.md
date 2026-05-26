---
name: backend-rust-rocket
description: Senior backend engineering workflow for MiniFT. Use when working on backend Rust, Rocket, SQLx, PostgreSQL, migrations, auth cookies, refresh sessions, API routes, backend tests, or any files under backend/.
---

# Backend Rust + Rocket

Treat MiniFT backend changes as production software. Inspect the relevant modules before editing and follow existing patterns in `backend/src/`.

## Architecture

Keep responsibilities separated:

- `handlers/`: parse requests, call services, shape responses.
- `services/`: own business logic, validation, and transactional flows.
- `models/`: define explicit data structures.
- `routes/`: wire Rocket routes.
- `schema/` and `db/`: own database integration patterns.
- `migrations/`: own persistent schema changes.

Avoid handler-heavy routes, god files, broad rewrites, duplicated business rules, and clever abstractions without clear value.

## Auth And Security

Preserve the cookie-based auth model. The backend issues `HttpOnly` access and refresh cookies, persists rotated refresh sessions in PostgreSQL, and exposes session-aware auth routes under `/api/auth/*`.

Be especially careful with refresh token rotation, session invalidation, cookie flags, CORS, `AUTH_COOKIE_SECURE`, `AUTH_COOKIE_SAME_SITE`, `AUTH_COOKIE_DOMAIN`, `JWT_SECRET`, `DATABASE_URL`, and `TEST_DATABASE_URL`.

Never weaken auth, validation, CORS, cookie security, or production configuration for convenience.

## Database

When changing persistent data shape, add a forward-only SQL migration in `backend/migrations/`.

Prefer SQLx typed queries, explicit models, and clear error handling. Keep database behavior testable and avoid ad hoc string manipulation for structured data.

## Tests And Verification

Add focused tests when behavior changes, especially for services, auth/session flows, database-backed behavior, and API contracts.

Prefer this verification set when relevant:

```bash
cd backend && cargo fmt --check
cd backend && cargo check
cd backend && cargo test
```

Use Rust unit tests near modules for internal logic and integration tests under `backend/tests/` for Postgres-backed flows.

## Definition Of Done

Before finishing, confirm the change is scoped, readable, separated by responsibility, covered by tests when behavior changed, and verified with the relevant commands when feasible. Report any remaining risk clearly.
