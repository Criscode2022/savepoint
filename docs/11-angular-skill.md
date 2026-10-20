---
title: Skill Angular
---

# Angular en Savepoint

App **Angular 19 + Ionic 8 + TypeScript 5.6 + Zone**. Componentes **standalone**, lazy `loadComponent` en `app.routes.ts`. Formularios con `FormsModule` / reactive (`formControlName` en login). No hay skill Angular versionada en el repo (a diferencia de Task Cloud).

## Qué se aplica

| Práctica | Dónde |
|----------|--------|
| Standalone + lazy routes | Shell, home, ficha, form, insights |
| Signals + RxJS | `GameService` (signal + subjects) |
| Ionic tabs / drawer | Móvil vs sidebar desktop |
| HttpClient + PostgREST | `DatabaseService` |
| Guards funcionales y de clase | `loginGuard`, `AuthGuard` |

## Techo Ionic 8

| API moderna | Por qué no se fuerza | Qué hay |
|-------------|----------------------|---------|
| **Zoneless** | Ionic 8 pide `zone.js` ~0.15 | Zone |
| **Signal Forms v21+** | App en Angular 19 | Reactive / template forms |
| **View Transitions del Router** | Navegación Ionic | Transiciones Ionic |
| **SSR** | PWA + Auth cookie + Data API | SPA en Netlify |

Subir a Angular 21/22 exigiría alinear Ionic (mismo techo documentado en Task Cloud / Presencia).
