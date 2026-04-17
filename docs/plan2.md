# Plan 2 — Checklist para completar perfum-prices-v2

> Generado tras revisión exhaustiva de código fuente, migraciones, seeds, documentación y BD real.
> Fecha: 2026-04-17

---

## Estado actual del sistema (verificado contra Supabase)

| Componente | Estado | Completitud |
|-----------|--------|-------------|
| `packages/shared` | ✅ Completo | 100% — 16 modelos, 9 DTOs, enums alineados con BD |
| `apps/api` | ✅ Funcional | ~95% — Todos los endpoints implementados |
| `apps/worker` | ⚠️ Funcional con bugs | ~85% — Scaffold completo, 1 bug crítico |
| `apps/web` | ✅ Funcional | ~95% — Todas las vistas implementadas |
| BD (migraciones) | ✅ Todas aplicadas | 001-004 aplicadas, RPCs y vista OK |
| Seeds | ✅ Aplicado | 10 tiendas + selectores cargados |
| Scraping real | ⚠️ Parcial | 3/10 tiendas con productos (Silk, SAIRAM, Multimarcas) |
| Notificaciones | ⚠️ Scaffold listo | Credenciales no configuradas |
| CI/CD + Deploy | ❌ No iniciado | Sin GitHub Actions ni deploy |

### Datos actuales en BD (verificados)

| Tabla | Filas | Notas |
|-------|-------|-------|
| `stores` | 10 | Todas creadas. Fasa, MercadoLibre, Alisha inactivas |
| `store_selectors` | ~55 | 8/10 tiendas con selectores (falta Alisha, MercadoLibre no necesita) |
| `products` | 286 | Creados por scraping de Silk, SAIRAM, Multimarcas |
| `brands` | 6 | Silk Perfumes, Mawi, Aco, Acqua Di Parma, Adolfo Domínguez, Sin marca |
| `store_products` | 286 | Silk: 20, SAIRAM: 40, Multimarcas: 226 |
| `prices` | 40 | Solo de Silk Perfumes (única tienda con scraping exitoso reciente) |
| `product_best_prices` | 20 | Vista materializada funcionando |
| `users` | 1 | 1 usuario registrado |
| `worker_logs` | 23 | Errores frecuentes en Paris, Ripley, Falabella, SAIRAM |
| `olfactive_families` | 8 | Cargadas |
| `olfactive_notes` | 0 | ⚠️ Sin datos |
| `product_notes` | 0 | ⚠️ Sin datos |
| `alerts` / `favorites` | 0 | Sin uso aún |

### Estado de scraping por tienda

| Tienda | Activa | Selectores | Productos | Último scrape | Estado |
|--------|--------|-----------|-----------|---------------|--------|
| Silk Perfumes | ✅ | ✅ 8 campos | 20 | Hoy - success | 🟢 Funciona |
| SAIRAM Perfumes | ✅ | ✅ 6 campos | 40 | Hoy - error (frame detached) | 🟡 Inestable |
| Multimarcasperfumes | ✅ | ✅ 8 campos | 226 | Hoy - error (0 productos) | 🟡 Inestable |
| Paris | ✅ | ✅ 7 campos | 0 | Hoy - error (0 productos) | 🔴 No funciona |
| Falabella | ✅ | ✅ 7 campos | 0 | Hoy - error (0 productos) | 🔴 No funciona |
| Ripley | ✅ | ✅ 7 campos | 0 | Hoy - error (0 productos) | 🔴 No funciona |
| Lider | ✅ | ✅ 7 campos | 0 | Sin logs | 🔴 No ha corrido |
| Fasa | ❌ | ✅ 4 campos | 0 | Sin logs | ⚫ Deshabilitada |
| Alisha Perfumes | ❌ | ❌ 0 campos | 0 | Sin logs | ⚫ Deshabilitada, sin selectores |
| MercadoLibre | ❌ | N/A (API) | 0 | Sin logs | ⚫ Deshabilitada |

---

## Checklist por prioridad

### 🔴 P0 — Bugs críticos (bloquean funcionalidad core)

- [x] **BUG: `alert-evaluator.ts` — `store_product_id` vs `store_id`** ✅ FIXED
  - Se movió el lookup de `store_products` antes de la query de precios.
  - Ahora usa `storeProduct.id` (correcto) en vez de `storeId` (incorrecto).
  - También usa `.range(1,1)` para saltar el precio recién escrito y comparar con el anterior.

- [x] **Alertas muestran `product_id` en lugar de nombre de producto** ✅ FIXED
  - Template ahora usa `a.products?.brands?.name + ' — ' + a.products?.name`.
  - `editAlert()` también carga el nombre del producto al editar.

---

### 🟡 P1 — Arreglar scrapers que fallan (3 tiendas retail no funcionan)

- [x] **Paris.cl, Falabella.com, Ripley.cl, Lider.cl** → ⚠️ DESHABILITADAS
  - Investigación: Usan anti-bot agresivo (Cloudflare, DoubleClick tracker, queue-it waiting room).
  - Puppeteer stealth no es suficiente para estas tiendas.
  - Se deshabilitaron (`is_active = false`) para evitar logs de error innecesarios.
  - **Futuro**: Evaluar APIs internas, extensiones de navegador, o servicios proxy (ScrapingBee, etc.).

- [x] **Estabilizar SAIRAM Perfumes** ✅ FIXED
  - Agregado fallback en `scraper.ts`: si `networkidle2` falla con "frame detached", reintenta con `domcontentloaded` + wait 3s.
  - Mismo fix aplicado a `discoverProductUrls()`.

- [x] **Estabilizar Multimarcasperfumes** ✅ FIXED
  - `listing_url` estaba mal (apuntaba a homepage `/perfumes` en vez de `/collections/perfumes`).
  - Corregido en BD. También se beneficia del fix de frame detached.

- [x] **Lider.cl** → ⚠️ DESHABILITADA (queue-it waiting room, imposible scraping directo)

- [x] **Configurar selectores para Alisha Perfumes** ✅ DONE
  - PrestaShop store. Se insertaron 8 selectores (list_item, list_product_url, list_next_page, product_name, price_normal, price_discount, image_url, brand).
  - `listing_url` corregido a `https://alishaperfumes.cl/12-perfumes`.
  - Tienda habilitada (`is_active = true`).

- [x] **Habilitar MercadoLibre** ✅ DONE
  - `is_active = true`. `api_config` ya estaba configurada correctamente.

---

### 🟡 P2 — Configuración de credenciales (requerido para notificaciones)

- [ ] **Configurar Gmail App Password** para el worker
  - Crear App Password en la cuenta Gmail: https://myaccount.google.com/apppasswords
  - Setear `GMAIL_USER` y `GMAIL_APP_PASSWORD` en `apps/worker/.env`

- [ ] **Crear bot de Telegram** vía @BotFather
  - Obtener `TELEGRAM_BOT_TOKEN`
  - Setear en `apps/worker/.env`

- [ ] **Configurar `ADMIN_EMAIL` y `ADMIN_TELEGRAM_CHAT_ID`** en `apps/worker/.env`
  - Para que el AnomalyDetector notifique al admin cuando falla un scraper

- [ ] **Configurar Google OAuth** en Supabase Auth
  - Dashboard → Authentication → Providers → Google
  - Setear Client ID y Client Secret de Google Cloud Console
  - Configurar redirect URL: `https://<supabase-project>.supabase.co/auth/v1/callback`

---

### 🟢 P3 — Mejoras de código (calidad, no bloquean funcionalidad)

- [ ] **Worker: Validar que credenciales Gmail/Telegram existan** antes de usarlas
  - Archivo: `apps/worker/src/services/notification.ts`
  - Agregar check al inicio: si no hay credenciales, loguear warning y no intentar enviar

- [ ] **Worker: Paginar resultados de MercadoLibre API** (actualmente limitado a 50 items)
  - Archivo: `apps/worker/src/connectors/mercadolibre.ts`
  - La API soporta offset/limit — iterar hasta cubrir todos los resultados

- [ ] **API: Eliminar dependencia `express-validator`** del package.json (nunca se usa)
  - O implementar validación de inputs con ella en los endpoints

- [ ] **API: Optimizar query N+1 en `GET /prices/:productId/history`**
  - Archivo: `apps/api/src/routes/prices.ts`
  - Actualmente hace 1 query por store_product. Refactorizar a 1 query batch con GROUP BY.

- [ ] **API: No exponer `telegram_link_token`** en response de `POST /me/telegram/link`
  - Archivo: `apps/api/src/routes/users.ts`
  - Devolver solo el token al frontend, no el row completo

- [ ] **Frontend: `environment.prod.ts`** — Reemplazar URLs placeholder
  - `apiUrl`, `supabaseUrl`, `supabaseAnonKey` tienen valores dummy

- [ ] **Cargar notas olfativas** (`olfactive_notes`) y asociarlas a productos (`product_notes`)
  - Actualmente hay 8 familias olfativas pero 0 notas y 0 asociaciones
  - El SearchComponent tiene filtro por notas pero no hay datos para filtrar

---

### 🔵 P4 — Testing (marcado como pendiente en el plan original)

- [ ] **Tests de integración para la API**
  - Endpoints prioritarios: `/products`, `/prices`, `/stores` (CRUD), `/alerts` (CRUD)
  - Stack sugerido: Vitest + Supertest

- [ ] **Tests unitarios del Worker**
  - Prioridad: `alert-evaluator.ts` (después del fix), `price-writer.ts`, `anomaly-detector.ts`

- [ ] **Tests e2e del Frontend** (opcional)
  - Stack sugerido: Cypress o Playwright

---

### 🔵 P5 — Deploy y CI/CD

- [ ] **Configurar GitHub Actions** — lint + typecheck en PR
  - Workflow: `npm install` → `npm run build --workspace=packages/shared` → `tsc --noEmit` en api, worker, web

- [ ] **Deploy Frontend en Vercel**
  - Build command: `npm run build --workspace=apps/web`
  - Output: `apps/web/dist/`
  - Setear env vars en Vercel dashboard

- [ ] **Deploy API en Railway o Render** (free tier)
  - Start command: `npm run start --workspace=apps/api`
  - Setear env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CORS_ORIGIN`, `PORT`

- [ ] **Deploy Worker en Railway o Render** (free tier)
  - Start command: `npm run start --workspace=apps/worker`
  - Setear env vars: todas las de Supabase + Gmail + Telegram

- [ ] **Actualizar `CORS_ORIGIN`** en la API con la URL real del frontend desplegado

---

### ⚪ P6 — Nice to have (mejoras futuras)

- [ ] Agregar data inicial de marcas y familias olfativas (seed)
- [ ] Dashboard de estadísticas globales (total productos, precios capturados, etc.)
- [ ] Export de historial de precios a CSV
- [ ] PWA (Progressive Web App) para notificaciones push en mobile
- [ ] Rate limiting en la API
- [ ] Retry logic en el worker para errores de red transitorios
- [ ] Caché de respuestas frecuentes (Redis o in-memory)
- [ ] Nivel 4 del diagrama C4 (documentación de código)

---

## Orden sugerido de ejecución

```
P0 (Bugs)  →  P1 (Scrapers)  →  P2 (Credenciales)  →  P3 (Mejoras código)
     ↓
P4 (Tests)  →  P5 (Deploy)  →  P6 (Futuro)
```

**Mínimo viable para producción:** P0 + al menos 5 tiendas de P1 funcionando + P2 + P5.

---

## Archivos clave a modificar

| Archivo | Cambio requerido |
|---------|-----------------|
| `apps/worker/src/processors/alert-evaluator.ts` | Fix bug store_product_id (P0) |
| `apps/web/src/app/features/alerts/alerts.component.ts` | Mostrar nombre de producto (P0) |
| `apps/worker/src/services/notification.ts` | Validar credenciales antes de enviar (P4) |
| `apps/worker/src/connectors/mercadolibre.ts` | Paginación API (P4) |
| `apps/api/src/routes/prices.ts` | Optimizar N+1 query (P4) |
| `apps/api/src/routes/users.ts` | No exponer token completo (P4) |
| `apps/web/src/environments/environment.prod.ts` | URLs reales (P6) |
| `apps/worker/.env` | Credenciales Gmail + Telegram (P3) |
