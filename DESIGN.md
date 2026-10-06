---
name: Savepoint
description: Personal game library — deep navy, one dark-blue accent, Steam-trustworthy density
colors:
  accent: "#2a56e8"
  accent-strong: "#3b67f5"
  accent-deep: "#1f45c4"
  accent-ink: "#9bb7ff"
  accent-ink-soft: "#dbe5ff"
  accent-alt: "#22d3ee"
  bg-base: "#070b17"
  bg-surface: "#0b1222"
  bg-elevated: "#101a2e"
  bg-elevated-hover: "#142039"
  bg-input: "#0a1020"
  bg-overlay: "#111c34"
  ink-primary: "#f5f8ff"
  ink-secondary: "#c9d4e8"
  ink-muted: "#9aa8c2"
  border-subtle: "rgba(148, 170, 214, 0.14)"
  status-not-started: "#9aa8c2"
  status-playing: "#22d3ee"
  status-paused: "#f59e0b"
  status-completed: "#22c55e"
  status-wishlist: "#f472b6"
  rating: "#fbbf24"
  semantic-error: "#ef4444"
typography:
  display:
    fontFamily: "Chakra Petch, system-ui, sans-serif"
    fontSize: "1.25rem–2.5rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0.01em"
  page-title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 750
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  panel-title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.35
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.75rem–0.8125rem"
    fontWeight: 600
rounded:
  sm: "6px"
  md: "12px"
  lg: "16px"
  xl: "18px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    minHeight: "44px"
  button-ghost:
    backgroundColor: "rgba(255, 255, 255, 0.03)"
    textColor: "{colors.ink-primary}"
    border: "1px solid rgba(148, 170, 214, 0.24)"
    rounded: "{rounded.md}"
  status-pill:
    backgroundColor: "rgba(var(--tone-rgb), 0.12)"
    textColor: "var(--tone-ink)"
    rounded: "{rounded.pill}"
  panel:
    backgroundColor: "{colors.bg-elevated}"
    border: "1px solid {colors.border-subtle}"
    rounded: "{rounded.lg}"
    padding: "20px"
  chip:
    backgroundColor: "rgba(59, 103, 245, 0.12)"
    textColor: "{colors.accent-ink-soft}"
    rounded: "{rounded.pill}"
---

# Design System: Savepoint

## Overview

**Creative North Star: "The Save Point"**

Savepoint is a power-user game library: sidebar collections, a ⌘K command palette, grid / list / shelf layouts, and quick status actions. It is dressed in deep navy with one confident blue, and a save-point crystal as its mark. Density comes from Steam/GOG; restraint from Linear. Personality lives in moments — empty states, completions, saves — never in labels or data.

**Key characteristics**

- Navy surfaces layered base → surface → elevated → overlay
- One dark-blue accent for the primary action, current selection and focus
- Status tones via `[data-status]` (`--tone`, `--tone-rgb`, `--tone-ink`), always paired with an icon or label
- Inter for all UI; Chakra Petch only for brand moments
- Buttons name the action they perform ("Pause", "Resume", "Start playing"), not the current state
- AA everywhere, AAA on body copy

## Colors

### Accent

- **Savepoint Blue** (`--accent` #2a56e8): solid fill for the primary action of a view; white label at 5.8:1.
- **Strong / Deep** (`--accent-strong` #3b67f5, `--accent-deep` #1f45c4): hover and pressed.
- **Tint channel** (`--accent-rgb` 59, 103, 245): translucent backgrounds and borders for selected chips, active nav, focus rings.
- **Accent ink** (`--accent-ink` #9bb7ff, `--accent-ink-soft` #dbe5ff): text and icons on navy or on accent tints.
- **Signal cyan** (`--accent-alt` #22d3ee): playtime and activity only.

### Neutrals

| Token | Value | Use |
|---|---|---|
| `--bg-base` | #070b17 | App background |
| `--bg-surface` | #0b1222 | Sidebar, topbar, footers |
| `--bg-elevated` | #101a2e | Cards and panels |
| `--bg-input` | #0a1020 | Fields, nested rows |
| `--bg-overlay` | #111c34 | Popovers, alerts, palette |
| `--ink-primary` | #f5f8ff | Headings, values |
| `--ink-secondary` | #c9d4e8 | Body, metadata (11.6:1 on elevated) |
| `--ink-muted` | #9aa8c2 | Secondary labels (7.2:1 on elevated) |

### Status

Backlog slate, Playing cyan, Paused amber, Completed green, Wishlist pink. Never reuse these as decoration. Apply them with `data-status` on the element (or an ancestor) and read `--tone*` in CSS.

### Named rules

**The One Blue Rule.** Solid blue appears once per view, on the primary action. Everything else uses tints.

**The Readable Dark Rule.** No text below 4.5:1 on its surface, placeholders included.

## Typography

- **Display** — Chakra Petch 700: wordmark, auth title, empty-library hero, year headings in Play history.
- **Page title** — Inter 750, 1.5rem (1.3125rem on phones), sentence case.
- **Panel title** — Inter 700, 1rem, sentence case. No uppercase eyebrows.
- **Body** — Inter 400, 0.875–0.9375rem, max 70ch for prose.
- **Labels** — Inter 600, 0.75–0.8125rem. Only platform chips are uppercase.

## Elevation

Flat at rest. Cards lift 4px on hover with a blue rim (`--shadow-card-hover`); the primary button carries `--shadow-accent`. Glow is reserved for the brand crystal.

## Components

Shared primitives live in `src/app/shared/styles/app-controls.scss` — use them before writing new styles.

- **Buttons** — `.btn.btn--primary`, `.btn.btn--ghost`, `.btn.btn--danger`, `.btn--sm`; `.icon-btn` (+ `--danger`); `.text-btn`.
- **Segmented control** — `.segmented` for the grid / list / shelf switch.
- **Panel** — `.panel`, `.panel__head`, `.panel__title`, `.panel__hint`, `.panel__empty`. Never nest panels.
- **Stat strip** — `.stat-strip` with `.stat-strip__item` (one panel, several figures; no hero-metric tiles).
- **Chips** — `.chip`, `.chip--alt`, `.chip--neutral` for read-only labels; `.status-pill` for status.
- **Meter** — `.meter` / `.meter__fill` (`.meter--success`).
- **Menus** — `ion-popover.app-menu-popover` with `.menu-list` / `.menu-list__item`.
- **Page header** — `<app-page-header title subtitle backHref backLabel>` with `[pageActions]` projection. Top-level pages omit `backHref`.
- **Brand mark** — `<app-brand-mark [size] [glow]>`.

### Game card (signature component)

3:4 cover with a labelled status pill (top-left), platform chip or release countdown (bottom-left), edit/remove on hover (always visible on touch). Body: title, developer · year, ★ rating and playtime, up to 3 genres. Footer: the next action ("Start playing", "Pause" + "Complete", "Resume" + "Complete", "Add to library") or "Finished Mar 2026" for completed games.

## Do's and Don'ts

### Do

- Use tokens from `src/theme/variables.scss`; never hardcode hex/rgba in components.
- Drive status color through `[data-status]`.
- Keep library views dense: metadata, filters and counts visible without drilling in.
- Validate forms on submit and move focus to the first invalid field.
- Respect `prefers-reduced-motion`.

### Don't

- Don't use gradient text, side-stripe borders, or uppercase eyebrows above sections.
- Don't show the same control twice in one viewport (e.g. two layout toggles).
- Don't disable a submit button to signal invalid input.
- Don't put the display face on buttons, labels or data.
- Don't fall into RGB-gamer cliché or generic SaaS dashboards.
