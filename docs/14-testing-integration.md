---
title: Testing · integración
---

# Testing · integración

No hay tests de integración. Las dos comprobaciones automáticas que se pueden lanzar son el build y el lint.

## Build

```bash
npm run build
```

`prebuild` ejecuta `scripts/set-env.js`, que escribe `environment.ts` con las URLs de Neon Auth y Data API y la clave de RAWG, y después `ng build` compila la app. Si falta un import, una plantilla no compila o un tipo no encaja, el build falla. El 20 de octubre de 2026 pasa: 1,12 MB de carga inicial sin comprimir, unos 219 kB transferidos.

## Lint

```bash
npm run lint
```

`ng lint` con `angular-eslint` y `typescript-eslint` (reglas recomendadas y estilísticas, plantillas inline incluidas). El 20 de octubre de 2026 da **32 errores**, casi todos `any` explícitos, más alguna variable sin usar, un método vacío y el estilo de tipos de array. 18 se arreglan solos con `--fix`.

## Lo que queda fuera

Ninguna de las dos comprobaciones habla con Neon. Que la app lea y escriba bien la biblioteca solo se ve con el [smoke en el navegador](./15-testing-e2e.md), contra la base de datos de verdad.

Un test de integración razonable montaría la app con `provideRouter` y los guards reales, y sustituiría el servicio de base de datos por uno en memoria: sin sesión, `/home` lleva a `/login`; con sesión, la biblioteca enseña los juegos del servicio falso.
