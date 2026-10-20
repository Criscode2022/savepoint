---
title: Deploy Netlify
---

# Deploy en Netlify

## Idea

- `npm run build` (prebuild `set-env` inyecta URLs de Neon y RAWG)
- Publish `dist/videogames-library/browser`
- Catch-all SPA: `/*` → `/index.html` 200

## Config (`netlify.toml`)

```toml
[build]
  command = "npm run build"
  publish = "dist/videogames-library/browser"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

Las URLs de Neon Auth / Data API van en variables de entorno de Netlify (`NEON_AUTH_URL`, `DATABASE_URL`, `RAWG_API_KEY`). El cliente las lee desde `environment.prod.ts` generado en el build.

## Smoke

1. Abrir [https://videogames-library.netlify.app](https://videogames-library.netlify.app)
2. Login → biblioteca con grid de covers
3. Ficha de un título, ⌘K, wishlist, insights

## Local

```bash
cp .env.example .env   # Neon + RAWG
npm install
npm start              # :4200
```
