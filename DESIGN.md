---
name: GameVault
description: Cyberpunk neon personal game library — dark, dense, Steam-trustworthy
colors:
  neon-purple: "#a855f7"
  neon-purple-deep: "#7c3aed"
  neon-cyan: "#06b6d4"
  neon-pink: "#ec4899"
  neon-green: "#10b981"
  vault-bg: "#0a0a0f"
  vault-surface: "#12121a"
  vault-elevated: "#151520"
  vault-input: "#0f0f15"
  ink-primary: "#f8fafc"
  ink-secondary: "#cbd5e1"
  ink-muted: "#94a3b8"
  border-neon: "rgba(168, 85, 247, 0.2)"
  status-playing: "#3b82f6"
  status-completed: "#22c55e"
  status-wishlist: "#f472b6"
  semantic-error: "#ef4444"
  semantic-warning: "#f59e0b"
typography:
  display:
    fontFamily: "Orbitron, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.02em"
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "normal"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "normal"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.06em"
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
  2xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.neon-purple}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.neon-purple-deep}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.neon-purple}"
    rounded: "{rounded.md}"
    padding: "11px 14px"
  button-outline-hover:
    backgroundColor: "rgba(168, 85, 247, 0.12)"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.md}"
    padding: "11px 14px"
  input-field:
    backgroundColor: "{colors.vault-input}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  chip-genre:
    backgroundColor: "rgba(168, 85, 247, 0.16)"
    textColor: "#e9d5ff"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
---

# Design System: GameVault

## Overview

**Creative North Star: "The Neon Vault"**

GameVault is a power-user game library tool dressed in cyberpunk atmosphere. The interface behaves like Steam or GOG — dense metadata, fast filters, scannable grids — while the dark vault framing (purple/cyan/pink accents, subtle glow, Orbitron brand moments) signals ownership of a personal collection. Design serves the task: users are cataloging, searching, and updating play state, not admiring chrome.

The system explicitly rejects over-neon RGB gamer cliché, mobile F2P UI energy, spreadsheet ugliness, and generic SaaS dashboards. Neon is earned on brand marks, primary actions, and hover feedback — never as wallpaper.

**Key Characteristics:**

- Dark-first surfaces with layered depth (vault bg → surface → elevated card)
- Information-dense library views with platform badges, status chips, and inline stats
- Inter for all UI copy; Orbitron reserved for brand wordmark and hero titles only
- Purple-led accent with cyan/pink/green reserved for semantic status and secondary highlights
- Tactile cards with lift-on-hover, not static icon+text grids
- WCAG AAA text contrast prioritized on body copy and labels over aesthetic glow

## Colors

A committed dark palette: near-black vault backgrounds carry the atmosphere; saturated neon accents mark brand, actions, and status.

### Primary

- **Neon Purple** (#a855f7): Primary actions, brand gradient start, focus rings, scrollbar thumb, selected tab. The vault's signature accent — use sparingly on any single screen.
- **Neon Purple Deep** (#7c3aed): Hover/pressed states on primary buttons and active emphasis.

### Secondary

- **Neon Cyan** (#06b6d4): Secondary accent — playtime stats, gradient end, auth orb atmosphere. Pair with purple for brand gradients only; never as a second competing primary.
- **Neon Pink** (#ec4899): Wishlist status, countdown badges, tertiary accent in auth/marketing moments.

### Tertiary

- **Neon Green** (#10b981): Completed status, success confirmations, release countdown "available" state.

### Neutral

- **Vault Background** (#0a0a0f): App shell, ion-content default. The deepest layer.
- **Vault Surface** (#12121a): Toolbars, tab bars, secondary panels.
- **Vault Elevated** (#151520): Cards, modals, form sections. Slightly lifted from surface.
- **Vault Input** (#0f0f15): Text fields, search inputs, select backgrounds.
- **Ink Primary** (#f8fafc): Headings, primary body text, button labels on dark fills.
- **Ink Secondary** (#cbd5e1): Descriptions, metadata values, card body copy.
- **Ink Muted** (#94a3b8): Secondary labels, separators — bump toward #cbd5e1 if contrast fails AAA on elevated surfaces.
- **Border Neon** (rgba(168, 85, 247, 0.2)): Default card and input borders; intensify to 0.35 on hover.

### Named Rules

**The One Glow Rule.** Neon box-shadow and pulse animations appear only on hover, focus, or brand hero moments — never as a default resting state on every card.

**The Readable Dark Rule.** Body text and placeholders must meet WCAG AAA where practical (#cbd5e1 minimum on #151520). Muted gray (#64748b) is deprecated for readable copy; reserve it for decorative separators only.

## Typography

**Display Font:** Orbitron (with system-ui fallback)  
**Body Font:** Inter (with system-ui fallback)  
**Label Font:** Inter (uppercase chips and platform badges use label weight/spacing)

**Character:** Orbitron delivers gaming identity in one word — "GameVault" — then Inter takes over for every task. The pairing is contrast by role, not decoration.

### Hierarchy

- **Display** (700, 1.75rem, 1.2): Brand wordmark, auth page title. Orbitron only.
- **Headline** (700, 1.35rem, 1.35): Page and card section titles (form card headers, filter panel).
- **Title** (700, 1.0625rem, 1.35): Game card titles, list item primary labels. Max 2 lines with clamp.
- **Body** (400, 0.875rem, 1.55): Descriptions, form help, card metadata. Max 65–75ch in prose blocks.
- **Label** (700, 0.75rem, 0.06em tracking, uppercase): Platform chips, filter badges, stat pill labels.

### Named Rules

**The Orbitron Gate.** Orbitron is forbidden on buttons, form labels, data tables, and navigation items. If it's not the brand name or a page hero, it's Inter.

## Elevation

Hybrid system: tonal layering at rest, shadow + glow on interaction. Cards sit on vault-elevated (#151520) with a soft ambient shadow (0 12px 32px rgba(0,0,0,0.35)) and a 1px border. Hover lifts cards 4px with a purple border intensification — depth is responsive, not decorative.

### Shadow Vocabulary

- **Card ambient** (`0 12px 32px rgba(0, 0, 0, 0.35)`): Default game cards and form cards at rest.
- **Card hover** (`0 20px 40px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(168, 85, 247, 0.25)`): Lift + neon rim on interactive cards.
- **Neon purple glow** (`0 0 20px rgba(168, 85, 247, 0.4)`): Primary buttons, auth logo — accent moments only.
- **Form panel** (`0 16px 40px rgba(0, 0, 0, 0.35)`): Form cards and filter panels.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows and glow appear as a response to hover, focus, or primary CTA — not on every container.

## Components

Atmospheric but task-first: Ionic primitives styled with vault tokens, custom game-library patterns on top.

### Buttons

- **Shape:** Rounded rectangles (12px / `--radius-md`); icon-only actions are circular (38px).
- **Primary:** Purple fill (#a855f7), white label, 600 weight, subtle neon shadow. Used for save, add game, auth submit.
- **Outline:** Transparent fill, purple border and text; hover fills rgba(168, 85, 247, 0.12). Status toggles on game cards.
- **Clear/Ghost:** Transparent, secondary ink (#94a3b8); header icon buttons.
- **Hover / Focus:** 2px purple outline-offset focus ring globally; buttons lift 2px on primary hover where applicable.

### Chips

- **Genre chip:** Pill (999px), rgba(168, 85, 247, 0.16) fill, #e9d5ff text, 1px purple border at 0.28 opacity.
- **Platform badge:** Pill on cover image, platform-color mixed 88% with black, uppercase label at 0.6875rem / 700 / 0.06em tracking.
- **Stat pill:** rgba(255,255,255,0.04) fill, rating (amber) and playtime (cyan) icon accents.

### Cards / Containers

- **Game card:** 18px radius, gradient dark fill, 3:4 cover aspect, platform badge + status badge overlays, footer status button.
- **Form card:** 20px radius, rgba(18,18,32,0.92) fill, purple-tinted border, 1.25rem internal padding.
- **Filters panel:** 16px radius, compact 0.875rem padding, same border/shadow vocabulary as form cards.
- **Hover:** translateY(-4px), border-color shift to purple — never nested cards.

### Inputs / Fields

- **Style:** Vault input bg (#0f0f15), 12px radius, 1px neon-tinted border, 12px 16px padding.
- **Search field:** Icon-leading, full-width in library header, same token set as inputs.
- **Focus:** Border shifts to neon purple + optional 10px purple glow — must not reduce text contrast.
- **Placeholder:** Use #94a3b8 minimum; prefer #cbd5e1 if AAA target applies.

### Navigation

- **Header:** Vault surface toolbar, brand mark + Orbitron "GameVault" (gradient on "Vault" only), icon actions right-aligned.
- **Stats bar:** Horizontal filter tabs — total / playing / completed / wishlist counts as tappable stat items.
- **Quick nav:** Play History and Wishlist as text+count+chevron row buttons below search.
- **Mobile:** Ionic responsive grid; content-wrapper max 1600px on desktop, 900px on forms.

### Game Card (signature component)

The collection atom: cover art (3:4), platform chip, optional status badge, title + developer + year, truncated description, rating/playtime stats, genre chips (max 3), footer status CTA. Status colors: playing (blue), completed (green), wishlist (pink). Hover reveals edit/delete overlay on cover.

## Do's and Don'ts

### Do:

- **Do** use Inter for all UI text and Orbitron only for brand/display moments.
- **Do** keep library views information-dense — metadata, filters, and stats visible without drilling in.
- **Do** apply neon purple to primary actions and focus states; cyan/pink/green for semantic status only.
- **Do** lift cards on hover (4px) with border intensification — tactile feedback for a collection tool.
- **Do** respect `prefers-reduced-motion`: replace pulse/glow/slide with instant or crossfade transitions.
- **Do** maintain AAA text contrast on body copy (#cbd5e1+) even when it softens neon accents.

### Don't:

- **Don't** use over-neon / RGB gamer cliché — constant glow, gradient text on every heading, pulsing borders as default decoration.
- **Don't** use mobile free-to-play UI patterns — loot-box energy, cartoon chrome, loud gradient CTAs, fake urgency.
- **Don't** ship spreadsheet ugly layouts — raw tables with no hierarchy, no scan path, no collection delight.
- **Don't** fall into generic SaaS dashboard patterns — cream cards, hero metrics, eyebrow labels on every section.
- **Don't** use gradient text (`background-clip: text`) except the single "Vault" brand span in the header.
- **Don't** nest cards or use side-stripe borders (>1px colored left/right accent) on list items.
- **Don't** put Orbitron on buttons, labels, or data-dense UI — it breaks Steam/GOG trust.
