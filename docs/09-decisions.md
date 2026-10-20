---
title: Decisiones de producto y tech
---

# Decisiones

## Neon Auth/Data en lugar de Nest propio

El contrato (email, sesión, filas por usuario) cabe en BaaS. Un Nest extra no aportaba PIN custom ni bulk jobs. Menos ops, un deploy estático.

## Command center, no “CRUD de juegos”

Sidebar + ⌘K + smart collections son el ADN. Una lista con badges habría sido el anti-patrón de spreadsheet feo que el `PRODUCT.md` rechaza.

## RAWG, no IA

Portadas y “For you” salen de un catálogo de videojuegos. Un LLM no añade verdad de metadatos y sí añade coste y alucinación.

## Refined Vault

Cyberpunk contenido: Orbitron solo en marca; Inter en UI; glow en hover/foco. Rechaza RGB de feria y SaaS crema.

## Netlify, no Vercel

SPA + rewrite encajan en `netlify.toml` sin función. Task Cloud necesita Vercel por Nest.

## Angular 19 + Ionic 8 + Zone

Ionic 8 sigue pidiendo `zone.js`. No se fuerza zoneless ni Signal Forms de v21 (el techo de Task Cloud / Presencia).
