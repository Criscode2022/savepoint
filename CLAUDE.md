# Savepoint — Agent Context

Savepoint (formerly GameVault) is a personal video-game library manager.

## Design Context

Strategic and visual design specs live at the project root:

- **[PRODUCT.md](./PRODUCT.md)** — register (`product`), platform (`web`), users, brand personality, anti-references, design principles, accessibility targets
- **[DESIGN.md](./DESIGN.md)** — color tokens, typography, elevation, components, do's/don'ts (YAML frontmatter + markdown body)
- **[.impeccable/design.json](./.impeccable/design.json)** — sidecar extensions (shadows, motion, component snippets for live panel)

Read `PRODUCT.md` and `DESIGN.md` before any UI work. Register is **product** (tool UI, Steam/GOG density); identity is **deep navy + Savepoint blue** with a light save-point voice and AAA text contrast.

Impeccable commands: `/impeccable critique`, `/impeccable audit`, `/impeccable polish`, `/impeccable live` (requires `npm start`).

## Stack

Angular 19 + Ionic 8 + Tailwind 4. Theme tokens in `src/theme/variables.scss` (Ionic palette in `src/global.scss`); shared UI primitives in `src/app/shared/styles/app-controls.scss`. Brand name lives in `src/app/shared/brand.ts`; collection definitions in `src/app/shared/library-collections.ts`. Neon Auth + Neon PostgreSQL backend.
