---
title: Modelo de datos
---

# Modelo de datos

## Entidades (`game.model.ts`)

### `Game`
`id`, `title`, `description`, `coverImage`, `platformId`, `developerId`, `directorId`, `releaseYear` / `releaseDate`, `genre[]`, `tags[]`, `rating`, `status` (`not_started` \| `playing` \| `paused` \| `completed` \| `wishlist`), playtime, `userId`.

### `GamePlayStatus`
Ciclo: not started → playing → paused → playing; completed y wishlist tienen transiciones propias. Completar limpia o conserva historial según reglas de `game-status.utils`.

### `PlaySession`
`gameId`, `userId`, `startedAt` / `endedAt`, `durationMinutes`, `notes`.

### Catálogos
`Platform`, `Company` (developer), `Director` — tablas auxiliares para filtros.

## Neon

El schema seed (`neon/schema.sql`) arranca `users`, `games`, `game_status`. El cliente evoluciona el contrato (tags, sesiones, plataformas) con scripts `db:migrate` / `db:add-tags` y refresh del Data API schema.

Todas las lecturas de biblioteca van con `user_id` del JWT.

## Local

Prefs de vista (grid/list/shelf) y fallback de sesión en `localStorage`. El catálogo **no** es offline-first: sin Data API no hay filas.
