---
name: frontend-next
description: Senior frontend engineering workflow for MiniFT. Use when working on frontend TypeScript, React, Next.js App Router, Tailwind, static export, protected routes, app shell, dashboard UI, client API flows, responsive behavior, accessibility, or any files under frontend/.
---

# Frontend TypeScript + Next.js

Treat MiniFT frontend changes as production software. Inspect nearby components and route patterns before editing.

## Architecture

Keep responsibilities separated:

- `frontend/app/`: pages and route-specific composition.
- `frontend/components/`: reusable UI.
- `frontend/lib/`: shared formatting, state-free view helpers, API utilities, hooks, platform detection, and interaction helpers.

Keep page files focused on data fetching, mutations, and route-specific composition. Split complex UI into focused components. Avoid god files, duplicated display logic, and heavy CSS-only responsive duplication.

## Design System

Before substantial UI changes, read `frontend/DESIGN.md`.

Reuse existing primitives before creating new ones, including `BrandLink`, `SiteFooter`, `MonthPicker`, `SummaryCard`, `FinanceSnapshot`, and `components/ui.tsx`.

Use Tailwind as the styling layer. Keep UI quiet, structured, accessible, and suited for a finance app rather than marketing-style pages.

## Routes, Auth, And Data

The frontend is exported as static HTML. Protected app routes are guarded after the client session check rather than by server-side rendering.

Protected app routes include `/dashboard`, `/transactions`, `/accounts`, `/budgets`, `/reports`, and `/settings`.

Preserve cookie-based auth assumptions. API calls should remain compatible with backend `HttpOnly` auth cookies.

When filter inputs drive network queries, prefer debounced or deferred updates unless the page explicitly needs live-as-you-type behavior.

## Responsive Behavior

Desktop web uses the top-right nav in `AppShell`. Compact web swaps that nav for a `Menu` button panel below `lg`. Native mobile keeps the bottom navigation bar and secondary-route sheet.

If mobile and desktop layouts are materially different, render one branch at a time with shared helpers such as `useMediaQuery` instead of mounting both heavy layouts.

## UI Quality

Every app route should account for relevant loading, error, empty, and success states.

Use typed props, accessible controls, stable responsive dimensions, and text that fits cleanly on mobile and desktop. Prefer familiar controls: icons for tool buttons, toggles for binary settings, inputs for values, menus for option sets, and tabs for alternate views.

## Tests And Verification

Prefer this verification set when relevant:

```bash
cd frontend && npm run lint
cd frontend && npm run build
```

For visual or responsive changes, verify desktop and mobile widths.

## Definition Of Done

Before finishing, confirm the change is scoped, readable, split into appropriate components/helpers, accessible, covered by tests or verification when behavior changed, and reported with any remaining risk.
