# MiniFT Frontend

Next.js App Router frontend for MiniFT. It renders the dashboard, CRUD pages, reports, and a same-origin API proxy that stores JWTs in secure cookies.

## Environment Variables

```bash
BACKEND_INTERNAL_URL=http://localhost:8000
NODE_ENV=development
```

`BACKEND_INTERNAL_URL` is used by the local proxy route handlers to forward requests to the Rocket API.

## Run Locally

```bash
npm install
npm run dev
```

The frontend expects the backend API to be available and reachable through `BACKEND_INTERNAL_URL`.

## Notes

- The browser talks to `/api/*` on the frontend origin.
- Route handlers forward requests to the backend and refresh access tokens when possible.
- Auth cookies are `httpOnly`, which keeps tokens out of browser JavaScript.

