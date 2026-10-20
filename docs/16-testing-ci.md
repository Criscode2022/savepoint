---
title: Testing · CI
---

# Testing · CI

No hay ningún workflow que compile o pruebe el código. El único fichero en `.github/workflows` es `portfolio-docs.yml`, que pide al portfolio que se reconstruya cuando cambia `docs/`.

## Lo que hace de puerta hoy

El build de producción. La plataforma de hosting compila cada push a `main` y lo publica en [savepoint.cristiancode.dev](https://savepoint.cristiancode.dev); si no compila, producción sigue con la versión anterior. El lint no forma parte de ese build.

## Un primer workflow

Sin secretos, con lo que ya existe:

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run build
```

El paso de lint fallaría hoy por los 32 errores (ver [integración](./14-testing-integration.md)); arreglarlos es el paso previo.

## El smoke en CI

Es posible, pero necesita más: Playwright con Chromium (`npx playwright install --with-deps chromium`), arrancar la app antes del script y una cuenta de prueba guardada como secretos `BROWSER_CHECK_EMAIL` y `BROWSER_CHECK_PASSWORD`. Como trabaja contra Neon de verdad, lo sensato sería una rama de Neon solo para CI.
