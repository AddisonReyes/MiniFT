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

## Navigation Behavior

- Desktop web uses the top navigation in the upper-right area of `AppShell`.
- Web below `lg` switches that desktop nav to a compact `Menu` button instead of wrapping pills onto multiple lines.
- Native Android uses the bottom navigation bar plus the secondary-route sheet opened from the `more` action.
- The mobile bottom bar is intentionally native-only. A narrow desktop browser should still behave like web, not like the native shell.

## Environment Variables

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
```

`NEXT_PUBLIC_API_BASE_URL` is the public backend origin the browser will call directly.

## Run Locally

```bash
cp .env.example .env
npm ci
npm run dev
```

The frontend expects the backend API to be available and reachable through `NEXT_PUBLIC_API_BASE_URL`, including the auth, accounts, exchange-rate, transaction, budget, report, and settings endpoints.

## Quality Checks

```bash
npm run lint
npm run build
```

`npm run lint` uses the ESLint CLI configured in `eslint.config.mjs`.

## Android With Capacitor

MiniFT can be packaged as an Android app through Capacitor without rewriting the
Next.js frontend.

### First Android test

```bash
cp .env.example .env
npm ci
npm run android:sync
npm run android:emulator
npm run android:reverse
npm run android:open
```

This repo exports the frontend to `out/`, and Capacitor copies that build into
`android/` during `android:sync`.

- `npm run android:open` opens the native Android project in Android Studio.
- `npm run android:emulator` boots the configured Android emulator from `.env`,
  restarts `adb` with your local private key, uses a safer GPU mode by default,
  and skips Quick Boot snapshot restore to avoid corrupted-snapshot startup
  failures.
- `npm run android:reverse` maps the emulator's `localhost:8000` back to the
  backend running on your machine. Run this before pressing Run in Android
  Studio when `NEXT_PUBLIC_API_BASE_URL` points at `http://localhost:8000/api`.
- `npm run android:adb-reset` manually restarts `adb` with the same SDK and key
  configuration if the emulator ever shows up as `offline` or `unauthorized`.
- `npm run android:avd-fix` rewrites the selected AVD with safer defaults for
  Linux development: cold boot, software GPU rendering, more RAM, and a larger
  VM heap.

### Android from terminal only

If you want to avoid Android Studio entirely, you can work from the VS Code
terminal:

```bash
npm run android:emulator
```

Leave that running in one terminal, then use a second terminal for the app:

```bash
npm run android:run
```

Useful terminal-only commands:

- `npm run android:devices`: show connected devices and emulators.
- `npm run android:wait-device`: wait until the emulator is fully booted.
- `npm run android:reverse`: expose your local backend on emulator `localhost`
  through `adb reverse` using the ports listed in `ANDROID_REVERSE_PORTS`.
- `npm run android:build-debug`: export the web app, sync Capacitor, and build
  the Android debug APK.
- `npm run android:install-debug`: install the current debug APK on the running
  emulator.
- `npm run android:launch`: open the installed app on the running emulator.
- `npm run android:run`: build, install, and launch in one command.
- `npm run android:logcat`: stream Android logs for the active device.

If `adb` says the emulator is `unauthorized`, unlock the emulator and accept the
USB debugging prompt once. After that, `android:run` and `android:logcat`
should work normally from the terminal.

For local backend development, keep `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api`
in `frontend/.env` and run:

```bash
npm run android:reverse
```

That maps the emulator's `localhost:8000` back to the backend running on your
machine, which keeps cookie auth much more reliable than pointing the app at
`10.0.2.2`.

If an AVD gets into a bad state, add `ANDROID_EMULATOR_FLAGS=-wipe-data` to
`.env`, run `npm run android:emulator` once, and then remove the flag again.

### Backend notes for Android auth

- Capacitor Android serves the app from `http://localhost`, so the backend must
  allow that origin in `CORS_ALLOWED_ORIGINS`.
- Capacitor 8 defaults Android to `https://localhost`, but this repo overrides
  the Android scheme to `http` in `capacitor.config.ts` so local cookie auth
  stays same-site with `http://localhost:8000/api`.
- If you test against a deployed backend over HTTPS, use
  `AUTH_COOKIE_SECURE=true` and `AUTH_COOKIE_SAME_SITE=none` so cookie auth
  continues to work inside the Android WebView.
- For local Android auth, prefer `adb reverse` plus `http://localhost:8000/api`
  instead of `10.0.2.2`, so the app and API stay on the same site for cookies.

## Cloudflare Pages

Use the `Next.js (Static HTML Export)` preset or equivalent settings:

- Root directory: `frontend`
- Build command: `npm run build`
- Build output directory: `out`
- Required build env: `NEXT_PUBLIC_API_BASE_URL=https://<your-railway-backend>/api`
- Backend env: `CORS_ALLOWED_ORIGINS=["https://<your-project>.pages.dev","http://localhost:3000","http://localhost","https://localhost"]`
- Backend env: `AUTH_COOKIE_SECURE=true`
- Backend env: `AUTH_COOKIE_SAME_SITE=none`

## Notes

- `next.config.ts` uses `output: "export"` so `npm run build` emits a deploy-ready `out/` folder.
- The frontend authenticates with HttpOnly cookies and automatically retries requests after a successful refresh.
- Since the app is exported as static HTML, protected pages are enforced after the client-side session check rather than by a server render.
- The backend must allow cross-origin requests from the Cloudflare Pages site and expose cookies with `AUTH_COOKIE_SECURE=true` plus `AUTH_COOKIE_SAME_SITE=none` in production.
- If the Android app also talks to that deployed backend, the backend must also allow the localhost WebView origins. This repo uses `http://localhost` for Android, but allowing `https://localhost` too keeps stale native builds from failing CORS preflight.
- Cookie auth requires explicit backend origins. Do not expect wildcard CORS to work for authenticated browser requests.
- `/accounts` converts gross and net totals into the user's default currency using Frankfurter daily rates unless a pair is manually overridden.
- `/settings` lets users change their default currency without re-registering.
- Shared UI primitives live in `components/`; reusable product widgets include `BrandLink`, `SiteFooter`, `MonthPicker`, and `FinanceSnapshot`.
- Shared frontend perf helpers live in `lib/`, including platform detection, debounced filter state, and media-query-based responsive branching.
- Prefer real conditional rendering for mobile vs desktop data views instead of mounting both branches and hiding one with CSS alone.
- The dashboard intentionally fetches only the recent transaction slice it displays, and transaction filters debounce network churn during typing.
- Read [DESIGN.md](./DESIGN.md) before making substantial UI changes so new work stays aligned with the product's visual language.
