---
title: Retos y resultados
---

# Retos y aprendizajes

## Cookie de sesión en iOS

Safari no expone cookies HttpOnly. `AuthService` lee JWT vía endpoint `/token` y guarda un fallback `neon_auth_session_fallback` para no perder la sesión al volver a la PWA.

## Data API vs schema seed

El `schema.sql` inicial es mínimo (`games` + `game_status`). El cliente real usa plataformas, tags, sesiones y covers. Tras migrar hay que refrescar el schema de Data API (`db:refresh-api-schema`).

## Densidad vs móvil

El command center de escritorio (sidebar + ⌘K) se traduce a tabs Ionic abajo y un drawer. La misma ficha de juego no puede ser un dashboard SaaS ni un grid vacío.

# Resultados

- PWA en [savepoint.cristiancode.dev](https://savepoint.cristiancode.dev).
- Biblioteca con covers, colecciones smart, wishlist, insights y paleta ⌘K.
- Auth Neon + Postgres Data API; RAWG opcional.
- Smoke Playwright (`scripts/browser-check.mjs`) con capturas de home, alta, ficha, historial y móvil.
- Código abierto como referencia Angular/Ionic + Neon + Netlify (hermano de Presencia; complemento de Task Cloud con Nest).
