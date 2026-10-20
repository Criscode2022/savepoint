---
title: Testing · e2e
---

# Testing · e2e

`scripts/browser-check.mjs` es un smoke con Playwright (Chromium, sin ventana). No usa `@playwright/test`: es un script que recorre la app, apunta cada paso en un informe y sale con código 1 si algo falla.

```bash
npm start   # la app en :4200, con .env
BROWSER_CHECK_EMAIL=… BROWSER_CHECK_PASSWORD=… node scripts/browser-check.mjs
```

`BASE_URL` cambia la dirección (por defecto `http://localhost:4200`). Sin las dos variables de la cuenta, el script se niega a arrancar.

## Qué recorre

| Paso            | Ruta                | Captura                     | Cuándo falla                                  |
| --------------- | ------------------- | --------------------------- | --------------------------------------------- |
| Login           | `/login` → `/home`  | `01-home-after-login.png`   | Si en 20 s no llega a `/home`                 |
| Añadir juego    | `/add`              | `02-add-game.png`           | Si redirige a `/login`                        |
| Wishlist        | `/wishlist/add`     | `02-wishlist-add.png`       | Si redirige a `/login`                        |
| Historial       | `/play-history`     | `02-play-history.png`       | Si redirige a `/login`                        |
| Perfil          | `/profile`          | `02-profile.png`            | Si redirige a `/login`                        |
| Ficha           | `/game/:id`         | `03-game-detail.png`        | Si al tocar el primer juego no abre su ficha  |
| Edición         | `/edit/:id`         | `04-game-edit.png`          | Si el botón de editar no lleva a `/edit/`     |
| Móvil           | `/home` a 390×844   | `05-home-mobile.png`        | —                                             |

Con la biblioteca vacía, la ficha y la edición se saltan y quedan marcadas como tales.

## El informe

Todo queda en `.browser-check/`: las capturas y `report.json` con cada paso, su URL y su resultado. El script escucha la consola y los errores de página durante todo el recorrido; un solo `console.error` o una excepción sin capturar marcan el informe como fallido aunque todos los pasos hayan pasado.

## Lo que no hace

No crea ni borra juegos: comprueba que las pantallas cargan con sesión, no que guardar funcione. Trabaja contra la base de datos que tenga configurada la app, así que conviene una cuenta solo para esto.
