---
title: Testing · visión
---

# Testing · visión

Savepoint **no tiene tests unitarios ni de integración**: no hay ficheros `*.spec.ts` y `angular.json` no define un target `test`, así que `npm test` termina con *Cannot determine project or target for command*. Lo que existe es un **smoke con Playwright** (`scripts/browser-check.mjs`) que inicia sesión con una cuenta real, recorre las pantallas principales y guarda capturas.

Estado a 20 de octubre de 2026:

| Capa                                                  | Herramienta                            | Qué comprueba                                                     | Estado                                  |
| ----------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------- | --------------------------------------- |
| [Unitarios](./13-testing-unit.md)                     | —                                      | —                                                                 | No hay                                  |
| [Integración](./14-testing-integration.md)            | `ng build` y `ng lint`                 | Que la app compila y sigue las reglas de ESLint                   | El build pasa; el lint da 32 errores    |
| [Smoke en el navegador](./15-testing-e2e.md)          | Playwright (Chromium), script propio   | Login, biblioteca, añadir, wishlist, historial, perfil, ficha, móvil | Se lanza a mano contra la app en local |
| [CI](./16-testing-ci.md)                              | —                                      | —                                                                 | No hay workflow de tests                |

## Comandos

```bash
npm run build     # ng build (antes, set-env genera environment.ts desde .env)
npm run lint      # ng lint con angular-eslint
BROWSER_CHECK_EMAIL=… BROWSER_CHECK_PASSWORD=… node scripts/browser-check.mjs
```

El smoke necesita la app arrancada (`npm start`, en `:4200`) y una cuenta de Savepoint. Sus credenciales van en variables de entorno, nunca en el repo.
