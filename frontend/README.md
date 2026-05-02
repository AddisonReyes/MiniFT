# MiniFT Frontend

Next.js App Router frontend for MiniFT. It renders the public landing page, protected dashboard workspace, multi-currency account tools, CRUD pages, and reports, then exports to static HTML for Cloudflare Pages.

## Route Map

- `/`: public landing page.
- `/login`: sign in page.
- `/register`: account creation page.
- `/dashboard`: protected monthly overview.
- `/transactions`: protected transaction, transfer, and recurring workspace.
- `/accounts`: protected account management with gross/net totals, Frankfurter-backed rates, and editable manual overrides.
- `/budgets`: protected monthly budget management.
- `/reports`: protected monthly reporting.
- `/settings`: protected profile/session settings, including default currency.

## Environment Variables

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
```

`NEXT_PUBLIC_API_BASE_URL` is the public backend origin the browser will call directly.

## Run Locally

```bash
cp .env.example .env
npm install
npm run dev
```

The frontend expects the backend API to be available and reachable through `NEXT_PUBLIC_API_BASE_URL`, including the auth, accounts, exchange-rate, transaction, budget, report, and settings endpoints.

## Cloudflare Pages

Use the `Next.js (Static HTML Export)` preset or equivalent settings:

- Root directory: `frontend`
- Build command: `npm run build`
- Build output directory: `out`
- Required build env: `NEXT_PUBLIC_API_BASE_URL=https://<your-railway-backend>/api`
- Backend env: `CORS_ALLOWED_ORIGINS=["https://<your-project>.pages.dev","http://localhost:3000"]`

## Notes

- `next.config.ts` uses `output: "export"` so `npm run build` emits a deploy-ready `out/` folder.
- The frontend stores JWTs in browser storage and automatically refreshes access tokens when the backend returns `401`.
- The backend must allow cross-origin requests from the Cloudflare Pages site.
- `/accounts` converts gross and net totals into the user's default currency using Frankfurter daily rates unless a pair is manually overridden.
- `/settings` lets users change their default currency without re-registering.
- Shared UI primitives live in `components/`; reusable product widgets include `BrandLink`, `SiteFooter`, `MonthPicker`, and `FinanceSnapshot`.
- Read [DESIGN.md](/home/dakotitah/github/MiniFT/frontend/DESIGN.md) before making substantial UI changes so new work stays aligned with the product's visual language.
