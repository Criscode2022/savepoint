---
title: Testing · CI
---

# Testing · CI

No hay `.github/workflows` en `videogames-library`. El smoke se lanza a mano (o en local) con Playwright.

## Qué haría un workflow futuro

1. `npm ci`
2. `npx playwright install --with-deps chromium`
3. Arrancar `ng serve` (o usar `webServer` en un `playwright.config.ts`)
4. `node scripts/browser-check.mjs` con secretos de Neon en el entorno de CI

Hasta entonces, el criterio de “verde” es: login en [videogames-library.netlify.app](https://videogames-library.netlify.app), biblioteca con covers, y el `report.json` del último browser-check sin `pageErrors`.
