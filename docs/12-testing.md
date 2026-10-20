---
title: Testing · visión
---

# Testing · visión

Savepoint no tiene GitHub Actions ni suite Karma. El contrato de prueba que **sí existe** es un **smoke Playwright** en `scripts/browser-check.mjs`: login real, recorre las rutas del vault y guarda PNG en `.browser-check/`.

| Capa | Runner | Qué cubre | Comando |
|------|--------|-----------|---------|
| Smoke / e2e | Playwright (Chromium) | Login, home, add, wishlist, historial, perfil, ficha, móvil | `node scripts/browser-check.mjs` |
| Unitario | — | No hay `*.spec.ts` en el repo | — |
| CI | — | No hay `.github/workflows` | — |

`package.json` declara `playwright` y `ng test` / `ng lint`, pero el catálogo de casos que se enseña aquí es el browser-check: es lo que produce las capturas del portfolio.

Siguientes documentos: [unitarios](./13-testing-unit.md) · [integración](./14-testing-integration.md) · [e2e](./15-testing-e2e.md) · [CI](./16-testing-ci.md).
