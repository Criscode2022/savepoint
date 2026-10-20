---
title: Superficie API Neon
---

# Superficie API (Neon Auth + Data)

No hay Nest propio. El cliente habla con Neon Auth (`src/lib/auth.ts`) y con la Data API REST (`DatabaseService` + `HttpClient`).

## Auth

- `sign-in` / `sign-up` email
- `token` (JWT desde cookie HttpOnly)
- `get-session` / `sign-out`
- Fallback de sesión en `localStorage` para iOS cuando la cookie no es visible a JS

## Data API (PostgREST)

`DatabaseService` construye queries `select`, `filters` (`eq`, `ilike`, `in`…), `order`, `limit`. Escrituras con `Prefer: return=representation`.

Tablas de producto (además del esquema seed inicial): `games`, plataformas, compañías, directores, sesiones de juego, tags. Las filas van filtradas por el usuario autenticado.

## RAWG

`RawgService` rellena portadas y recomendaciones. Clave en `.env` (`RAWG_API_KEY`). Si falta, la biblioteca sigue funcionando con covers propias.

## Por qué no hay `/api` Nest

El dominio es un único cliente: email, sesión y filas por usuario caben en Neon Auth + Data API. Task Cloud necesita Nest por PIN/JWT propio; aquí no.
