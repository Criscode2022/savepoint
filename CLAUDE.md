# GameVault — Agent Context

## Design Context

Strategic and visual design specs live at the project root:

- **[PRODUCT.md](./PRODUCT.md)** — register (`product`), platform (`web`), users, brand personality, anti-references, design principles, accessibility targets
- **[DESIGN.md](./DESIGN.md)** — color tokens, typography, elevation, components, do's/don'ts (YAML frontmatter + markdown body)
- **[.impeccable/design.json](./.impeccable/design.json)** — sidecar extensions (shadows, motion, component snippets for live panel)

Read `PRODUCT.md` and `DESIGN.md` before any UI work. Register is **product** (tool UI, Steam/GOG density); personality is **cyberpunk neon** with AAA text contrast.

Impeccable commands: `/impeccable critique`, `/impeccable audit`, `/impeccable polish`, `/impeccable live` (requires `npm start`).

## Stack

Angular 19 + Ionic 8 + Tailwind 4. Theme tokens in `src/theme/variables.scss` and `src/styles.scss`. Neon Auth + Neon PostgreSQL backend.
