# Repository Guidelines

## Project Structure & Module Organization

MiniFT is a two-app repository:

- `backend/`: Rust + Rocket API. Core code lives in `src/` and is split into `handlers/`, `services/`, `models/`, `routes/`, `schema/`, and `db/`. SQL migrations live in `backend/migrations/`.
- `frontend/`: Next.js App Router app. Pages live in `frontend/app/`, shared UI in `frontend/components/`, and client utilities in `frontend/lib/`.
- Auth model: the backend issues `HttpOnly` access and refresh cookies, persists rotated refresh sessions in PostgreSQL, and exposes session-aware auth routes under `/api/auth/*`.
- Frontend route intent: `/` is the public landing page; `/dashboard`, `/transactions`, `/accounts`, `/budgets`, `/reports`, and `/settings` are protected app routes wrapped by `PageFrame`.
- Frontend deployment note: `frontend/` is exported as static HTML, so protected app routes are guarded after the client session check rather than by server-side rendering.
- Frontend shell intent: desktop web uses the top-right nav in `AppShell`; compact web swaps that nav for a `Menu` button panel below `lg`; native mobile keeps the bottom navigation bar and secondary-route sheet.
- Shared frontend widgets should live in `frontend/components/`. Prefer reusing existing primitives such as `BrandLink`, `SiteFooter`, `MonthPicker`, `SummaryCard`, `FinanceSnapshot`, and `components/ui.tsx` before creating page-local duplicates.
- Shared frontend interaction helpers live in `frontend/lib/`, including `useMediaQuery`, `useDebouncedValue`, platform detection, and view/state formatting helpers.
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

Avoid CSS-only responsive duplication for heavy UI. If mobile and desktop layouts are materially different, prefer rendering one branch at a time with shared helpers such as `useMediaQuery` instead of mounting both and hiding one.

When filter inputs drive network queries, prefer debounced or deferred updates over firing a new request on every keystroke unless the page explicitly needs live-as-you-type behavior.

## Engineering Bar

Treat MiniFT as production software. Before changing code, inspect the relevant existing modules and follow local patterns. Prefer small focused modules, typed data contracts, explicit error handling, practical tests, readable names, and straightforward control flow.

Avoid large god files, spaghetti logic, duplicated business rules, broad rewrites unrelated to the task, clever abstractions without clear value, and any change that weakens auth, validation, cookie security, CORS, accessibility, or production configuration.

Every non-trivial change should consider maintainability, testability, security, failure states, loading and empty states, accessibility for frontend work, and CI verification. Documentation should be practical and close to the code. Prefer clear structure over excessive comments.

## Definition of Done

A task is not complete until the agent has understood the relevant existing code, made the smallest clean change that solves the problem, kept backend/frontend/database responsibilities separated, added or updated tests when behavior changes, run relevant verification commands when feasible, and explained what changed plus any remaining risk.

## Codex Skills

Project skills live in `skills/`.

- Use `skills/backend-rust-rocket/SKILL.md` for backend work touching Rust, Rocket, SQLx, PostgreSQL, auth cookies, migrations, API routes, or backend tests.
- Use `skills/frontend-next/SKILL.md` for frontend work touching TypeScript, React, Next.js App Router, Tailwind, protected routes, app shell, dashboard UI, client API flows, responsive behavior, or accessibility.

## Backend Skill: Rust + Rocket

Use this section whenever working on `backend/`, Rust, Rocket, SQLx, PostgreSQL, auth cookies, migrations, API routes, or backend tests.

Keep handlers focused on parsing requests and returning responses. Put business logic in services, keep models as clear data structures, keep database access explicit, and put persistent schema changes in migrations. Do not place unrelated backend responsibilities in one file.

Preserve the cookie-based auth model. Be especially careful with refresh token rotation, persisted refresh sessions, `HttpOnly` cookies, cookie security flags, CORS, session invalidation, and `/api/auth/*` behavior. Never weaken auth or CORS defaults for convenience.

When changing persistent data shape, add a forward-only SQL migration in `backend/migrations/`. Prefer SQLx typed queries and explicit models over ad hoc data handling.

For backend verification, prefer `cd backend && cargo fmt --check`, `cd backend && cargo check`, and `cd backend && cargo test`. Add focused unit tests near Rust modules for internal logic and integration tests under `backend/tests/` for Postgres-backed flows.

## Frontend Skill: TypeScript + Next.js

Use this section whenever working on `frontend/`, TypeScript, React, Next.js App Router, Tailwind, protected routes, client API helpers, dashboard UI, or responsive behavior.

Before substantial UI changes, read `frontend/DESIGN.md`. Reuse existing primitives such as `BrandLink`, `SiteFooter`, `MonthPicker`, `SummaryCard`, `FinanceSnapshot`, and `components/ui.tsx` before creating new components.

Keep pages focused on data fetching, mutations, and route-specific composition. Put reusable UI in `frontend/components/`, and put shared formatting, state-free helpers, API utilities, and hooks in `frontend/lib/`. Split complex UI into focused components instead of growing page files into god files.

Respect the static export model: protected app routes are guarded after the client session check. Preserve cookie-based auth assumptions and make API calls compatible with backend `HttpOnly` auth cookies.

Desktop web uses the top-right nav in `AppShell`; compact web swaps that nav for a `Menu` button panel below `lg`; native mobile keeps the bottom navigation bar and secondary-route sheet. If mobile and desktop layouts are materially different, render one branch at a time with `useMediaQuery` instead of mounting heavy duplicate layouts.

Every app route should account for relevant loading, error, empty, and success states. Use typed props, accessible controls, stable responsive dimensions, and text that fits cleanly on mobile and desktop.

For frontend verification, prefer `cd frontend && npm run lint` and `cd frontend && npm run build`. For visual or responsive changes, verify desktop and mobile widths.

## Testing Guidelines

Backend automated tests live both near the Rust modules and under `backend/tests/`. Treat `cd backend && cargo fmt --check`, `cd backend && cargo test`, `cd backend && cargo check`, `cd frontend && npm run build`, `cd frontend && npm run lint`, and a local `docker-compose up --build` smoke test as the default verification bar. When adding backend tests, prefer Rust unit tests near the module for internal logic and integration tests under `backend/tests/` for Postgres-backed flows. GitHub Actions in `.github/workflows/ci.yml` mirrors this baseline with isolated backend and frontend jobs.

## Commit & Pull Request Guidelines

Recent history uses short, descriptive commit subjects such as `Currency format` and `Integrating docker to the project`. Follow that pattern: one focused change per commit, written in plain English. Pull requests should include a brief summary, impacted areas (`backend`, `frontend`, `docker`), setup or env changes, and screenshots for UI changes.

## Security & Configuration Tips

Never commit real secrets. Backend auth depends on `JWT_SECRET`, local database access uses `DATABASE_URL`, backend integration tests can use `TEST_DATABASE_URL`, and frontend API access depends on `NEXT_PUBLIC_API_BASE_URL`. Cookie behavior is controlled by `AUTH_COOKIE_SECURE`, `AUTH_COOKIE_SAME_SITE`, and optionally `AUTH_COOKIE_DOMAIN`; cross-origin production deployments need `AUTH_COOKIE_SECURE=true` and `AUTH_COOKIE_SAME_SITE=none`. Because auth uses cookies, keep `CORS_ALLOWED_ORIGINS` explicit and do not rely on `*` in production. Keep `SEED_DEV_DATA` disabled outside development. If Docker Compose fails because the shared bridge network is missing, create it with `docker network create services_default`.
