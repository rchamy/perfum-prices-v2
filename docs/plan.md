# Plan — perfum-prices-v2

## Repositorio

- **URL**: https://github.com/rchamy/perfum-prices-v2
- **GitHub Project**: ya creado en el repositorio

---

## Fase 0 — Documentación técnica previa ✅

- [x] Casos de uso (`docs/UseCases.md`)
- [x] Arquitectura C4 niveles 1–3 (`docs/C4.md`)
- [x] Modelo de datos (`docs/er-diagram.md`)
- [x] Diagramas de secuencia (`docs/sequential-diagram.md`)
- [x] Historias de usuario (`docs/user-stories.md` + 23 issues en GitHub Project)

---

## Fase 1 — Setup e infraestructura base ✅

- [x] Monorepo npm workspaces (`apps/*`, `packages/*`)
- [x] TypeScript base (`tsconfig.base.json`, `.prettierrc`)
- [x] `packages/shared` — tipos, enums y DTOs compartidos
- [x] Supabase — proyecto provisionado y migración `001_initial_schema.sql` aplicada
- [x] Variables de entorno configuradas (`.env` en api y worker, `environment.ts` en web)
- [ ] CI/CD: GitHub Actions (lint + deploy) — pendiente

---

## Fase 2 — Backend: API REST ✅

- [x] Scaffold `apps/api` (Express + TypeScript + tsx)
- [x] Supabase Auth — JWT middleware, control de roles `admin` / `visitor`
- [x] `GET|POST /stores`, `PATCH /stores/:id/toggle`, `POST /stores/test-scrape`
- [x] `GET /products`, `GET /products/:id`
- [x] `GET /prices/:id/current`, `GET /prices/:id/history`
- [x] `GET|POST|PUT|PATCH|DELETE /alerts`
- [x] `GET|POST|DELETE /favorites`
- [x] `GET|PUT /users/me`, `POST /users/me/telegram/link`, `GET|PATCH /admin/users`
- [x] `GET /health/worker`, `POST /health/worker/:id/run`, `GET /health/worker/:id/last-log`
- [x] API corriendo y conectada a Supabase (`/ping` ✅, `/stores` ✅, `/products` ✅)
- [ ] Tests de integración — pendiente

---

## Fase 3 — Worker: Scraper ✅ (scaffold)

- [x] Scaffold `apps/worker` (Node.js + TypeScript + node-cron)
- [x] Puppeteer + stealth plugin (`ScraperConnector`)
- [x] Config de tiendas desde BD (selectores editables, frecuencia, método)
- [x] Connector MercadoLibre API pública (`mercadolibre.ts`)
- [x] `AnomalyDetector` — detecta 0 resultados / errores HTTP / notifica Admin
- [x] `AlertEvaluator` — evalúa alertas activas y notifica usuarios
- [x] `PriceWriter` — persiste precios e invalida vista materializada
- [x] `Scheduler` — cron por tienda + polling `job_queue` para ejecución manual
- [x] `NotificationService` — Nodemailer (Gmail SMTP) + Telegram Bot API
- [ ] Configurar credenciales Gmail y Telegram en `.env` del worker — pendiente
- [ ] Scrapers Fase 1: cargar selectores reales de Paris, Falabella, Ripley, Lider, Fasa, SAIRAM, Multimarcasperfumes, Alisha, Silk — pendiente

---

## Fase 4 — Frontend: Angular (en progreso)

- [x] Scaffold Angular 21 standalone (`apps/web`)
- [x] `SupabaseService` — auth email/contraseña + Google OAuth
- [x] `ApiService` — todos los endpoints mapeados
- [x] `HttpInterceptor` — JWT adjunto automáticamente
- [x] Guards `authGuard` y `adminGuard`
- [x] Estilos globales — design tokens, btn, card, form, alert, badge, spinner
- [x] `NavbarComponent` — responsive, roles, hamburger mobile
- [x] `LoginComponent` — email/pass + Google, toggle password
- [x] `RegisterComponent` — nombre + email + pass + Google, confirm email
- [x] `CallbackComponent` — maneja redirect OAuth
- [x] `HomeComponent` — hero + grid top descuentos + skeleton loading
- [x] `SearchComponent` + filtros (género, tienda, precio, ordenar) + URL sync + paginación
- [x] `ProductDetailComponent` + tabla de precios por tienda + notas olfativas + favorito toggle
- [x] `PriceChartComponent` — gráfico de tendencia (Chart.js) integrado en ProductDetail, selector 7D/30D/90D/1A
- [x] `FavoritesComponent`
- [x] `AlertsComponent` — crear/editar/toggle alertas con búsqueda de producto inline
- [x] `ProfileComponent` — editar perfil, vincular Telegram, cerrar sesión
- [x] Panel Admin: `StoresComponent` (CRUD + test-scrape), `HealthComponent` (worker status + run manual), `UsersComponent` (paginado + cambio de rol)
- [ ] Deploy en Vercel / GitHub Pages

---

## Fase 5 — Notificaciones (scaffold listo, config pendiente)

- [x] `NotificationService` implementado (Nodemailer + Telegram)
- [x] `sendPriceAlert()` — notifica usuario cuando baja el precio
- [x] `sendScraperAlert()` — notifica Admin cuando falla el scraper
- [x] `startTelegramBot()` — escucha `/start <token>` para vincular cuentas
- [ ] Configurar `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `TELEGRAM_BOT_TOKEN` en `.env`
- [ ] Crear bot en Telegram (via @BotFather) — pendiente

---

## Arquitectura (stack 100% gratuito)

```
┌──────────────────────────────────────────────────────┐
│  Worker (Node.js + TypeScript)                       │
│  Scraper configurable por tienda — cron jobs         │
│  Hosting: Railway / Render free tier                 │
└───────────────────┬──────────────────────────────────┘
                    │ escribe precios
┌───────────────────▼──────────────────────────────────┐
│  Supabase (PostgreSQL, free tier)          ✅ ACTIVO  │
│  Precios históricos + config de tiendas + usuarios   │
└───────────────────┬──────────────────────────────────┘
                    │ lee / escribe
┌───────────────────▼──────────────────────────────────┐
│  API REST (Node.js + Express + TypeScript)  ✅ ACTIVO │
│  Hosting: Railway / Render free tier                 │
└───────────────────┬──────────────────────────────────┘
                    │
┌───────────────────▼──────────────────────────────────┐
│  Frontend (Angular + TypeScript)        🔨 EN PROGRESO│
│  Perfiles: Administrador / Visitante                 │
│  Autenticación: email/contraseña + Google OAuth 2.0  │
│  Hosting: GitHub Pages / Vercel free tier            │
└───────────────────┬──────────────────────────────────┘
                    │
┌───────────────────▼──────────────────────────────────┐
│  Notificaciones: Nodemailer (Gmail SMTP)             │
│                  Telegram Bot API        ⚙️ PENDIENTE │
└──────────────────────────────────────────────────────┘
```

---

## Próxima sesión — retomar aquí

**Pasos para poner en producción:**

1. Aplicar en Supabase SQL editor:
   - `supabase/migrations/002_fix_product_best_prices.sql`
   - `supabase/seeds/001_stores.sql`
2. Actualizar selectores CSS reales de cada tienda vía `/admin/stores` → "Probar"
3. Configurar `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `TELEGRAM_BOT_TOKEN` en `apps/worker/.env`
4. Activar Google OAuth en Supabase Auth → Providers → Google
5. CI/CD + deploy (Vercel frontend, Railway API + Worker)

---

## Regla de documentación

Cualquier cambio en requerimientos, funcionalidades, actores, tiendas, tecnología o estructura debe reflejarse de inmediato en **todos** los archivos afectados: `context.md`, `plan.md`, `UseCases.md`, `C4.md`, `er-diagram.md`, `sequential-diagram.md`.
