---
title: Estructura del proyecto
---

# Estructura (app única)

Savepoint **no** es un monorepo Turborepo: un solo paquete Angular/Ionic.

| Path | Rol |
|------|-----|
| `src/app/layout/app-shell` | Command center (sidebar + tabs) |
| `src/app/pages/home` | Biblioteca + filtros + vistas |
| `src/app/pages/game-detail` | Ficha, rating, log de horas |
| `src/app/pages/game-form` | Alta / edición / wishlist |
| `src/app/pages/insights` | Stats de la colección |
| `src/app/pages/recommendations` | Picks RAWG |
| `src/app/pages/play-history` | Timeline |
| `src/app/pages/login` | Sign-in / register |
| `src/app/services` | Games, auth, Data API, RAWG |
| `src/app/components/command-palette` | ⌘K |
| `src/lib/auth.ts` | Cliente Neon Auth (fetch + cookies) |
| `neon/` | Schema SQL + migrate/seed |
| `scripts/set-env.js` | Genera `environment.ts` desde `.env` |
| `scripts/browser-check.mjs` | Playwright smoke de rutas |
| `netlify.toml` | Build + SPA fallback |

## Scripts

| Script | Descripción |
|--------|-------------|
| `npm start` | `set-env` + `ng serve` |
| `npm run build` | Producción → `dist/videogames-library/browser` |
| `npm run db:migrate` / `db:seed` | Schema y seed en Neon |
| `node scripts/browser-check.mjs` | Capturas e2e locales |

Package manager: npm. Node ≥ 18. Angular CLI 19.
