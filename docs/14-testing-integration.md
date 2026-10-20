---
title: Testing · integración
---

# Testing · integración

No hay `*.integration.spec.ts`. La integración real se ejerce contra **Neon Auth + Data API** en local (`npm start` con `.env`) y en producción.

El browser-check hace de integración de rutas + guards: sin sesión redirige a `/login`; con sesión entra a `/home`, `/add`, `/game/:id`, etc.

Un test de integración futuro debería mockear `DatabaseService` y montar `provideRouter` con `AuthGuard`, igual que Presencia mockea Neon.
