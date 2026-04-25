# MiniFT Frontend

Next.js App Router frontend for MiniFT. It renders the dashboard, CRUD pages, and reports, then exports to static HTML for Cloudflare Pages.

## Environment Variables

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
NODE_ENV=development
```

`NEXT_PUBLIC_API_BASE_URL` is the public backend origin the browser will call directly.

## Run Locally

```bash
cp .env.example .env.local
npm install
npm run dev
```

The frontend expects the backend API to be available and reachable through `NEXT_PUBLIC_API_BASE_URL`.

## Cloudflare Pages

Use the `Next.js (Static HTML Export)` preset or equivalent settings:

- Root directory: `frontend`
- Build command: `npm run build`
- Build output directory: `out`
- Required build env: `NEXT_PUBLIC_API_BASE_URL=https://<your-railway-backend>/api`

## Notes

- `next.config.ts` uses `output: "export"` so `npm run build` emits a deploy-ready `out/` folder.
- The frontend stores JWTs in browser storage and automatically refreshes access tokens when the backend returns `401`.
- The backend must allow cross-origin requests from the Cloudflare Pages site.
