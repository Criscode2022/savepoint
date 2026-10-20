---
title: Visión general
---

# Visión general · Savepoint

**Savepoint** (repo `videogames-library`) es una Progressive Web App Angular/Ionic para mantener una **biblioteca personal de videojuegos**: alta y edición de títulos, filtros densos, playtime, wishlist, historial de partidas e insights. La nube es **Neon Auth + Data API** (Postgres). Deploy en **Netlify**.

No es un monorepo Nest: un solo paquete Angular, equivalente a Presencia. El “command center” (sidebar, ⌘K, colecciones smart) es el producto, no un CRUD genérico.

## Enlaces

- **Web:** [https://videogames-library.netlify.app](https://videogames-library.netlify.app)
- **GitHub:** [Criscode2022/videogames-library](https://github.com/Criscode2022/videogames-library)
- **Producto:** `package.json` name `videogames-library` · marca **Savepoint**

## Stack

| Capa | Tecnología |
|------|------------|
| Web | Angular 19, Ionic 8, Tailwind 4, standalone components |
| Auth | Neon Auth (email/password, cookie + JWT fallback iOS) |
| Datos | Neon Data API (PostgREST) vía `DatabaseService` |
| Extra | RAWG API (búsqueda de portadas + recomendaciones, **sin IA**) |
| Deploy | Netlify (`dist/videogames-library/browser` + SPA rewrite) |
