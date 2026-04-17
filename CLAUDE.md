# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies (root)
npm install

# Build shared types first (required before API/Worker typecheck)
npm run build --workspace=packages/shared

# API (apps/api) — port 3000
npm run dev --workspace=apps/api        # tsx watch
cd apps/api && npx tsc --noEmit         # typecheck

# Worker (apps/worker) — port 3001
npm run dev --workspace=apps/worker

# Frontend (apps/web) — port 4200
npm run start --workspace=apps/web      # ng serve
cd apps/web && npx tsc --noEmit         # typecheck
```

## Architecture

npm workspaces monorepo: `apps/api`, `apps/worker`, `apps/web`, `packages/shared`.

**Data flow:** Worker scrapes stores → writes to `prices` table → refreshes `product_best_prices` materialized view → API reads view → Angular frontend.

**Auth:** Supabase Auth (email/password + Google OAuth). JWT passed via `Authorization: Bearer` header. API middleware validates token and fetches role from `users` table. Two roles: `admin` / `visitor`.

**Key architectural decisions:**
- CSS selectors stored in `store_selectors` table — Admin edits them via UI without redeploying
- `product_best_prices` is a materialized view refreshed after each Worker price-write batch via `supabase.rpc('refresh_product_best_prices')`
- Worker triggers manual runs via `job_queue` table (polling every 5s), not direct RPC
- `store_products` links products to stores; `prices` is append-only

## Key files

| Path | Purpose |
|------|---------|
| `packages/shared/src/types/` | Shared TypeScript types, enums, DTOs |
| `apps/api/src/middleware/auth.ts` | JWT validation + role fetch |
| `apps/api/src/routes/` | Express routers (products, prices, stores, alerts, favorites, users, health) |
| `apps/worker/src/connectors/` | Puppeteer scraper + MercadoLibre API |
| `apps/worker/src/processors/` | PriceWriter, AlertEvaluator, AnomalyDetector |
| `apps/worker/src/scheduler.ts` | Cron runner + job_queue poller |
| `apps/web/src/app/core/services/` | SupabaseService, ApiService |
| `apps/web/src/app/app.routes.ts` | Lazy-loaded routes |
| `supabase/migrations/` | PostgreSQL schema (001) + view fix (002) |
| `supabase/seeds/001_stores.sql` | Initial stores + placeholder selectors |

## Environment variables

- `apps/api/.env` — `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CORS_ORIGIN`
- `apps/worker/.env` — same Supabase vars + `WORKER_PORT`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `TELEGRAM_BOT_TOKEN`
- `apps/web/src/environments/environment.ts` — `supabaseUrl`, `supabaseAnonKey`, `apiUrl`

## Pending before production

1. Apply `supabase/migrations/002_fix_product_best_prices.sql` in Supabase dashboard (SQL editor)
2. Run `supabase/seeds/001_stores.sql` to insert stores
3. Update real CSS selectors for each store via Admin UI (`/admin/stores` → Probar)
4. Set `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `TELEGRAM_BOT_TOKEN` in `apps/worker/.env`
5. Configure Google OAuth redirect URL in Supabase Auth settings
6. Deploy: Vercel (frontend), Railway/Render (API + Worker)
