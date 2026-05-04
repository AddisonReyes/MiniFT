# Repository Guidelines

## Project Structure & Module Organization

MiniFT is a two-app repository:

- `backend/`: Rust + Rocket API. Core code lives in `src/` and is split into `handlers/`, `services/`, `models/`, `routes/`, `schema/`, and `db/`. SQL migrations live in `backend/migrations/`.
- `frontend/`: Next.js App Router app. Pages live in `frontend/app/`, shared UI in `frontend/components/`, and client utilities in `frontend/lib/`.
- Auth model: the backend issues `HttpOnly` access and refresh cookies, persists rotated refresh sessions in PostgreSQL, and exposes session-aware auth routes under `/api/auth/*`.
- Frontend route intent: `/` is the public landing page; `/dashboard`, `/transactions`, `/accounts`, `/budgets`, `/reports`, and `/settings` are protected app routes wrapped by `PageFrame`.
- Frontend deployment note: `frontend/` is exported as static HTML, so protected app routes are guarded after the client session check rather than by server-side rendering.
- Shared frontend widgets should live in `frontend/components/`. Prefer reusing existing primitives such as `BrandLink`, `SiteFooter`, `MonthPicker`, `SummaryCard`, `FinanceSnapshot`, and `components/ui.tsx` before creating page-local duplicates.
- Read `frontend/DESIGN.md` before making substantial UI changes. It captures the current visual language, component priorities, and design constraints for agents.
- Tooling files: `frontend/eslint.config.mjs` configures frontend linting, and `.github/workflows/ci.yml` mirrors the default CI verification pipeline.
- Root files: `docker-compose.yml` wires local services together; `README.md` documents the full-stack setup.

## Build, Test, and Development Commands

- `docker-compose up --build`: build and run the full MVP stack locally.
- `cd backend && cargo run`: start the API outside Docker.
- `cd backend && cargo check`: fast Rust validation.
- `cd backend && cargo test`: run backend unit and integration tests.
- `cd backend && cargo fmt`: format backend code.
- `cd backend && cargo fmt --check`: CI formatting check for backend code.
- `cd frontend && npm install`: install frontend dependencies.
- `cd frontend && npm ci`: install frontend dependencies exactly as locked for CI or a clean checkout.
- `cd frontend && npm run dev`: start the Next.js dev server.
- `cd frontend && npm run build`: production build check.
- `cd frontend && npm run lint`: run frontend linting through the ESLint CLI.

## Coding Style & Naming Conventions

Use 4-space indentation in Rust and 2-space indentation in TypeScript, JSX, JSON, and config files. Keep Rust modules focused by responsibility and prefer explicit service-layer logic over handler-heavy routes. Use `snake_case` for Rust functions, fields, and file names; use `PascalCase` for React components; use lowercase route segments such as `app/transactions`. Tailwind is the only styling layer; keep reusable UI in `frontend/components/`.

Write code for human readers first: prefer clear names, small functions, straightforward control flow, and comments only where intent is not obvious from the code itself. Favor clean, maintainable implementations over clever shortcuts, and follow the existing stack conventions and standard best practices for Rust, React, and SQLx.

For frontend changes, avoid duplicating display logic in pages. Put shared formatting/state-free view helpers in `frontend/lib/` and reusable UI in `frontend/components/`. Keep page files focused on data fetching, mutations, and route-specific composition.

## Testing Guidelines

Backend automated tests live both near the Rust modules and under `backend/tests/`. Treat `cd backend && cargo fmt --check`, `cd backend && cargo test`, `cd backend && cargo check`, `cd frontend && npm run build`, `cd frontend && npm run lint`, and a local `docker-compose up --build` smoke test as the default verification bar. When adding backend tests, prefer Rust unit tests near the module for internal logic and integration tests under `backend/tests/` for Postgres-backed flows. GitHub Actions in `.github/workflows/ci.yml` mirrors this baseline with isolated backend and frontend jobs.

## Commit & Pull Request Guidelines

Recent history uses short, descriptive commit subjects such as `Currency format` and `Integrating docker to the project`. Follow that pattern: one focused change per commit, written in plain English. Pull requests should include a brief summary, impacted areas (`backend`, `frontend`, `docker`), setup or env changes, and screenshots for UI changes.

## Security & Configuration Tips

Never commit real secrets. Backend auth depends on `JWT_SECRET`, local database access uses `DATABASE_URL`, backend integration tests can use `TEST_DATABASE_URL`, and frontend API access depends on `NEXT_PUBLIC_API_BASE_URL`. Cookie behavior is controlled by `AUTH_COOKIE_SECURE`, `AUTH_COOKIE_SAME_SITE`, and optionally `AUTH_COOKIE_DOMAIN`; cross-origin production deployments need `AUTH_COOKIE_SECURE=true` and `AUTH_COOKIE_SAME_SITE=none`. Because auth uses cookies, keep `CORS_ALLOWED_ORIGINS` explicit and do not rely on `*` in production. Keep `SEED_DEV_DATA` disabled outside development. If Docker Compose fails because the shared bridge network is missing, create it with `docker network create services_default`.
