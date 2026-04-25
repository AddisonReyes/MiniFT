# Repository Guidelines

## Project Structure & Module Organization

MiniFT is a two-app repository:

- `backend/`: Rust + Rocket API. Core code lives in `src/` and is split into `handlers/`, `services/`, `models/`, `routes/`, `schema/`, and `db/`. SQL migrations live in `backend/migrations/`.
- `frontend/`: Next.js App Router app. Pages live in `frontend/app/`, shared UI in `frontend/components/`, and client utilities in `frontend/lib/`.
- Root files: `docker-compose.yml` wires local services together; `README.md` documents the full-stack setup.

## Build, Test, and Development Commands

- `docker-compose up --build`: build and run the full MVP stack locally.
- `cd backend && cargo run`: start the API outside Docker.
- `cd backend && cargo check`: fast Rust validation.
- `cd backend && cargo fmt`: format backend code.
- `cd frontend && npm install`: install frontend dependencies.
- `cd frontend && npm run dev`: start the Next.js dev server.
- `cd frontend && npm run build`: production build check.
- `cd frontend && npm run lint`: run frontend linting.

## Coding Style & Naming Conventions

Use 4-space indentation in Rust and 2-space indentation in TypeScript, JSX, JSON, and config files. Keep Rust modules focused by responsibility and prefer explicit service-layer logic over handler-heavy routes. Use `snake_case` for Rust functions, fields, and file names; use `PascalCase` for React components; use lowercase route segments such as `app/transactions`. Tailwind is the only styling layer; keep reusable UI in `frontend/components/`.

Write code for human readers first: prefer clear names, small functions, straightforward control flow, and comments only where intent is not obvious from the code itself. Favor clean, maintainable implementations over clever shortcuts, and follow the existing stack conventions and standard best practices for Rust, React, and SQLx.

## Testing Guidelines

There is no dedicated automated test suite yet. For now, contributors should treat `cargo check`, `npm run build`, `npm run lint`, and a local `docker-compose up --build` smoke test as the minimum verification bar. When adding backend tests, prefer Rust unit tests near the module or integration tests under `backend/tests/`.

## Commit & Pull Request Guidelines

Recent history uses short, descriptive commit subjects such as `Currency format` and `Integrating docker to the project`. Follow that pattern: one focused change per commit, written in plain English. Pull requests should include a brief summary, impacted areas (`backend`, `frontend`, `docker`), setup or env changes, and screenshots for UI changes.

## Security & Configuration Tips

Never commit real secrets. Backend auth depends on `JWT_SECRET`, and local database access uses `DATABASE_URL`. The frontend proxy depends on `BACKEND_INTERNAL_URL`. If Docker Compose fails because the shared bridge network is missing, create it with `docker network create services_default`.
