---
title: Testing · unitarios
---

# Testing · unitarios

No hay tests unitarios ni un runner configurado: `angular.json` no tiene target `test` y el proyecto no instala Karma, Jasmine ni Vitest.

## Por dónde empezar

`src/app/shared/utils/` reúne funciones puras que no tocan Neon ni la red y deciden cosas que el usuario ve. Son las candidatas naturales:

| Fichero                    | Qué decide                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------- |
| `rating.utils.ts`          | La nota va de 0 a 10 en pasos de 0,5 (`clampRating`, `isValidRating`) y qué estados se pueden valorar (`canRateGame`) |
| `game-status.utils.ts`     | El siguiente estado de un juego (`getNextStatus`), el aviso al cambiarlo y si el cambio borra el historial de partidas |
| `release-countdown.ts`     | La fecha de lanzamiento a partir de `releaseDate` o `releaseYear`, el texto de la cuenta atrás y cuándo un juego de la wishlist puede pasar a la biblioteca |
| `genre.utils.ts`           | Cómo se normalizan los géneros y la lista sin duplicados (`normalizeGenres`, `collectUniqueGenres`)      |
| `game-sort.utils.ts`, `game-filters.utils.ts` | El orden y los filtros de la biblioteca                                              |
| `library-import.utils.ts`, `library-export.utils.ts` | El formato de importación y exportación de la biblioteca                      |

Un primer test de `rating.utils` fijaría los bordes: `clampRating(10.4)` da 10, `clampRating(-1)` da 0 e `isValidRating(null)` es falso.

## Con qué

Lo mínimo es añadir a `angular.json` el target `test` con el builder `@angular-devkit/build-angular:karma`, instalar Karma y Jasmine y crear `tsconfig.spec.json`. Vitest es la otra opción si se quiere un runner sin navegador para estas funciones.
