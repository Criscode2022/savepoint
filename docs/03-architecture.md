---
title: Arquitectura
---

# Arquitectura

## Diagrama lógico

```
Browser / PWA Ionic (Angular 19)
    │  sesión: Neon Auth cookie + JWT fallback
    │  datos: HTTP Data API (PostgREST)
    ▼
Neon Auth  (email / password)
Neon Data API  ──►  Postgres (schema public)
RAWG API (opcional) ──►  portadas + recomendaciones
```

## Capas

1. **Shell** — `AppShellComponent`: sidebar de colecciones, search ⌘K, tabs móviles.
2. **Páginas** — `home`, `game/:id`, `add` / `edit/:id`, `wishlist/add`, `play-history`, `insights`, `recommendations`, `profile`.
3. **Servicios** — `GameService`, `AuthService`, `DatabaseService`, `RawgService`, `RecommendationsService`, prefs de vista.
4. **Guards** — `AuthGuard` en el shell; `loginGuard` en `/login` y `/register`.

## Principios

- Un vault, un usuario: las filas llevan `user_id`.
- RAWG es enriquecimiento, no fuente de verdad.
- Sin Nest: el contrato cabe en Auth + Data API.
- Estética **Refined Vault**: neon ganado, no wallpaper.
