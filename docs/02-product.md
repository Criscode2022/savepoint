---
title: Producto y features
---

# Producto y features

## Problema

Las colecciones se fragmentan entre Excel, notas, Steam y la cabeza. Falta un vault de **confianza** para plataforma, horas, estado y wishlist cuando el backlog no cabe en un solo store.

## Solución

Command center de biblioteca: colecciones smart, paleta ⌘K, tres vistas (grid / lista / estantería), Continue Playing, tags, wishlist con countdown, log de sesiones e insights. Auth Neon; persistencia en Postgres.

## Características

### Biblioteca
Filtros por plataforma, año, desarrollador, rating, última partida y playtime. Tags y colecciones guardadas. Import JSON; export JSON y Excel.

### Vistas
Grid (cartas con cover 3:4), lista densa y shelf. La preferencia se persiste.

### Wishlist
Títulos próximos con cuenta atrás de lanzamiento. “Add to library” cuando ya salió.

### Playtime e historial
Log rápido de horas en la ficha; timeline de partidas completadas.

### Insights y For you
Racha, % completado, horas por plataforma/género. Recomendaciones RAWG a partir del gusto de la librería (sin modelo de IA).

### Paleta ⌘K
Salto a juegos, colecciones y acciones (`Ctrl/⌘K`).
