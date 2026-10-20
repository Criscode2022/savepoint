---
title: Testing · unitarios
---

# Testing · unitarios

No hay specs Jasmine/Karma en el árbol actual (`find … -name '*.spec.ts'` vacío). `npm test` arrancaría el scaffold de Angular CLI si se añadieran.

Lo que **sí** está testeado en código son utilidades puras usadas por el form y el status (`rating.utils`, `game-status.utils`, `genre.utils`, `release-countdown`) — candidatas naturales a unitarios el día que se abra la suite.

Hasta entonces, el smoke Playwright cubre el camino feliz de la UI.
