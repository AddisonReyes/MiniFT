---
version: "alpha"
name: "MiniFT"
description: "A dark, minimal personal finance workspace with calm marketing polish and dense authenticated views."
colors:
  background: "#090C11"
  background-elevated: "#121722"
  ink: "#0B0D12"
  foreground: "#F3F5F7"
  mist: "#99A3BA"
  line: "#2A3144"
  signal: "#7AE7B9"
  hazard: "#FF8B8B"
  amber: "#F7C267"
  white: "#FFFFFF"
typography:
  hero:
    fontFamily: "Space Grotesk"
    fontSize: "4.5rem"
    fontWeight: 600
    lineHeight: 0.95
  heading-1:
    fontFamily: "Space Grotesk"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1.05
  heading-2:
    fontFamily: "Space Grotesk"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
  heading-3:
    fontFamily: "Space Grotesk"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.25
  body-md:
    fontFamily: "Space Grotesk"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.75
  body-sm:
    fontFamily: "Space Grotesk"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label-caps:
    fontFamily: "Space Grotesk"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.24em"
  mono-meta:
    fontFamily: "IBM Plex Mono"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "18px"
  md: "20px"
  lg: "22px"
  xl: "24px"
  2xl: "32px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  3xl: "32px"
components:
  page-background:
    backgroundColor: "{colors.background}"
  card:
    backgroundColor: "{colors.background-elevated}"
    textColor: "{colors.foreground}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.xl}"
    padding: "{spacing.2xl}"
  button-primary:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
  button-secondary:
    backgroundColor: "{colors.background-elevated}"
    textColor: "{colors.foreground}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
  button-ghost:
    backgroundColor: "{colors.background}"
    textColor: "{colors.mist}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
  button-danger:
    backgroundColor: "{colors.hazard}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
  badge-neutral:
    backgroundColor: "{colors.background-elevated}"
    textColor: "{colors.foreground}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.pill}"
    padding: "{spacing.sm}"
  badge-success:
    backgroundColor: "{colors.background-elevated}"
    textColor: "{colors.signal}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.pill}"
    padding: "{spacing.sm}"
  badge-danger:
    backgroundColor: "{colors.background-elevated}"
    textColor: "{colors.hazard}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.pill}"
    padding: "{spacing.sm}"
  badge-amber:
    backgroundColor: "{colors.background-elevated}"
    textColor: "{colors.amber}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.pill}"
    padding: "{spacing.sm}"
  modal:
    backgroundColor: "{colors.background-elevated}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.2xl}"
    padding: "{spacing.2xl}"
  nav-pill-active:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.pill}"
    padding: "{spacing.sm}"
---

## Overview

MiniFT should feel like a focused monthly finance workspace, not a flashy startup dashboard. The visual tone is dark, quiet, and slightly premium: soft-glass panels over a layered ink background, tight typography, restrained color usage, and high information density without visual noise.

The public landing page is the most expressive surface in the product. It can use bigger headlines, a stronger split layout, and a slightly more editorial tone. Authenticated screens should be calmer and more operational: clear page titles, compact summaries, readable tables, and action-first workflows.

The emotional target is confidence and readability. Users should feel that the app helps them understand their month at a glance, not overwhelm them with widgets, charts, or decoration.

## Colors

The palette is dark-first and should remain dark-only unless the product intentionally adopts a separate light theme later.

- `background` and `background-elevated` define the base atmosphere: deep navy-black surfaces, never flat pure black and never light gray.
- `foreground` is reserved for primary text and key values.
- `mist` is the default secondary text color for descriptions, metadata, helper copy, and inactive controls.
- `line` is used for subtle borders and separators. Borders should frame content softly, not dominate it.
- `signal` is the only strong positive accent. Use it for primary CTAs, focus states, active emphasis, positive numbers, and healthy progress.
- `hazard` is for destructive actions, error states, and negative expense emphasis.
- `amber` is the transfer and caution accent. It is the secondary semantic color, not a second CTA color.

Panels often use translucent dark surfaces in implementation. Preserve that effect when practical instead of turning cards into opaque, flat rectangles.

## Typography

`Space Grotesk` is the primary voice of the UI. It should carry nearly all visible typography across marketing, auth, and product surfaces.

- Headlines are large, tight, and confident rather than decorative.
- Landing page hero copy can push to a bold editorial scale with very tight line height.
- Workspace page titles should stay in the `heading-1` range and feel strong but compact.
- Section titles typically live in the `heading-2` or `heading-3` range.
- Supporting copy is short and readable, usually in `body-sm` or `body-md`.
- Small uppercase labels with generous tracking are a recurring signature for metadata and section markers.

`IBM Plex Mono` is available as a supporting font for dense numeric or meta treatments, but the current UI uses it sparingly. Do not introduce a third font, and do not make the product feel code-themed.

## Layout

MiniFT prefers structured, readable layouts over novelty.

- Keep pages inside a centered max-width container similar to the existing `max-w-7xl` shell.
- Public pages work best as split layouts: narrative copy on one side, product preview or snapshot on the other.
- Authenticated routes should follow the `PageFrame` and `AppShell` pattern: top navigation, page label, H1, short supporting description, then content.
- Favor one to three strong content groups per screen instead of many small widgets.
- Use grids for summaries and responsive cards, but keep the visual rhythm relaxed with generous gaps.
- Prefer tables on desktop when scanning matters, then switch to stacked cards on mobile.
- In reports, budgets, and summaries, prioritize totals, ranked lists, and progress bars before adding charts.

Action rows should stay easy to reach. On small screens they may wrap into full-width or two-column button grids, but the hierarchy must remain obvious.

## Elevation & Depth

Depth in MiniFT is subtle and atmospheric.

- The global page background should keep the current layered gradient and faint ledger-grid texture.
- Cards and modals should feel like soft floating surfaces, using blur and shadow instead of heavy borders alone.
- Shadows are present but diffused. Avoid hard drop shadows, giant glow effects, or card stacks that feel game-like.
- Focus states may be brighter than the rest of the system, especially around `signal`, but should still feel clean and controlled.

## Shapes

Rounded geometry is part of the product identity.

- Controls and panels generally sit between `18px` and `24px` radii.
- Primary containers can go larger when they need to feel more premium or modal.
- Pills are used for the brand chip, navigation states, and badges.
- Avoid sharp-cornered components, boxy tables, or mixing very small radii with very large radii on the same surface.

The interface should feel soft and modern, but never bubbly or toy-like.

## Components

Use the existing shared building blocks before inventing new local patterns.

- `Card` is the default section container. Most app surfaces should begin here.
- `Button` variants already define the system hierarchy: `primary` for the main action, `secondary` for strong but quieter alternatives, `ghost` for low-emphasis actions, and `danger` for destructive actions.
- `Badge` is the semantic pill for counts, transaction types, and status callouts. Keep badge text uppercase and brief.
- `Modal` is a large dark sheet with a short title, optional subtitle, and a right-aligned action row.
- `BrandLink` should remain a compact pill-shaped brand marker rather than becoming a full logo lockup.
- `SummaryCard` is the preferred pattern for top-line metrics on dashboard and reports screens.
- `MonthPicker` is the standard date-period control for monthly views and should stay aligned with page actions when space allows.
- `FinanceSnapshot` belongs to marketing and auth-adjacent storytelling surfaces. Do not duplicate it inside every product page.
- `TransactionListSection` and similar dense data views should use right-aligned amounts, semantic amount colors, muted metadata, and restrained row hover states.
- Empty states should be calm and helpful. Use one concise sentence about what is missing and one clear next action.
- Forms should stay label-first and mostly vertical. Two-column fields are appropriate only when they genuinely reduce height without hurting readability.

If a new page needs a component that feels common to more than one route, it should likely live in `frontend/components/` rather than remain page-local.

## Do's and Don'ts

Do preserve the current dark, layered, finance-workspace atmosphere.

Do reuse shared primitives like `Card`, `Button`, `Badge`, `MonthPicker`, `BrandLink`, `SiteFooter`, `PageFrame`, and `AppShell`.

Do keep copy concise, practical, and monthly-control oriented.

Do use `signal`, `hazard`, and `amber` semantically. The color of money-related values should communicate meaning immediately.

Do make desktop views scan quickly and mobile views stack cleanly.

Do prefer readable lists, tables, and progress bars over decorative data visualizations.

Do keep transitions short and meaningful. Hover, focus, and subtle panel changes are enough for most interactions.

Don't introduce purple, bright blue, or extra brand colors that compete with `signal`.

Don't switch major app surfaces to white or near-white backgrounds.

Don't add generic SaaS dashboard clutter like oversized KPI mosaics, heavy chart chrome, or decorative illustration blocks inside the authenticated workspace.

Don't create page-local button, card, badge, or input styles if `frontend/components/ui.tsx` already covers the need.

Don't overload the UI with icons. The product currently communicates mostly through text, spacing, and semantic color.

Don't make finance feel playful. MiniFT should feel clear, composed, and trustworthy.
