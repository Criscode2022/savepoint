---
title: Testing · e2e
---

# Testing · e2e

Script: `scripts/browser-check.mjs`. Playwright Chromium, viewport 1280×800 (y un paso móvil).

```bash
npm start                 # :4200 con .env
node scripts/browser-check.mjs
```

Login con cuenta de desarrollo (`EMAIL` / `PASSWORD` en el script). Recorre:

| Paso | Ruta | Captura |
|------|------|---------|
| login | `/home` tras sign-in | `01-home-after-login.png` |
| add-game | `/add` | `02-add-game.png` |
| wishlist | `/wishlist/add` | `02-wishlist-add.png` |
| historial | `/play-history` | `02-play-history.png` |
| perfil | `/profile` | `02-profile.png` |
| ficha | `/game/:id` | `03-game-detail.png` |
| edición | `/edit/:id` | `04-game-edit.png` |
| móvil | `/home` | `05-home-mobile.png` |

Salida: `.browser-check/report.json` (ok por paso + errores de consola). Las capturas de este portfolio (escritorio y móvil) salen de la **app en Netlify** con la misma cuenta, no de Imagine.
