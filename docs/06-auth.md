---
title: Autenticación email + Neon
---

# Modelo de autenticación

## Flujo

1. Registro o login email/password (`/register`, `/login`).
2. Neon Auth (`authClient` → endpoints `/token`, sesión cookie).
3. `AuthGuard` exige sesión para el shell; `loginGuard` saca al usuario ya logueado de `/login`.
4. `AuthService` guarda JWT (cookie o fallback `neon_auth_session_fallback` en iOS).
5. Logout: `signOut()` + limpieza de fallback.

## Seguridad

- Contraseña y tokens los gestiona Neon Auth; el bundle no guarda secretos de servidor.
- El JWT se usa como Bearer en la Data API.
- 401 en Data API dispara un handling de sesión caducada (no bucle infinito).

## Por qué email y no PIN

El vault tiene que recuperarse entre portátil y móvil. Neon Auth ya da email recuperable. Un PIN local (Task Cloud) no cubría “la misma biblioteca en dos dispositivos” sin un backend custom.
