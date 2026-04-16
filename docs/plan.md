# Plan — perfum-prices-v2

## Repositorio

- **URL**: https://github.com/rchamy/perfum-prices-v2
- **GitHub Project**: ya creado en el repositorio

---

## Fase 0 — Documentación técnica previa

| # | Entregable | Archivo | Estado |
|---|---|---|---|
| 1 | Casos de uso | `docs/UseCases.md` | ✅ Completado |
| 2 | Arquitectura C4 (niveles 1–3) | `docs/C4.md` | ✅ Completado |
| 3 | Modelo de datos | `docs/er-diagram.md` | ✅ Completado |
| 4 | Diagramas de secuencia | `docs/sequential-diagram.md` | ✅ Completado |
| 5 | Historias de usuario | `docs/user-stories.md` + GitHub Project | ⏳ Pendiente aprobación |

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
│  Supabase (PostgreSQL, free tier)                    │
│  Precios históricos + config de tiendas + usuarios   │
└───────────────────┬──────────────────────────────────┘
                    │ lee / escribe
┌───────────────────▼──────────────────────────────────┐
│  API REST (Node.js + Express + TypeScript)           │
│  Hosting: Railway / Render free tier                 │
└───────────────────┬──────────────────────────────────┘
                    │
┌───────────────────▼──────────────────────────────────┐
│  Frontend (Angular + TypeScript)                     │
│  Perfiles: Administrador / Visitante                 │
│  Autenticación: email/contraseña + Google OAuth 2.0  │
│  Hosting: GitHub Pages / Vercel free tier            │
└───────────────────┬──────────────────────────────────┘
                    │
┌───────────────────▼──────────────────────────────────┐
│  Notificaciones: Nodemailer (Gmail SMTP)             │
│                  Telegram Bot API                    │
└──────────────────────────────────────────────────────┘
```

---

## Módulos principales

| Módulo | Descripción |
|---|---|
| **Scraper Worker** | puppeteer-extra + stealth plugin; config por tienda en BD (URL, selectores CSS/XPath, frecuencia) |
| **API Connector** | Integración con MercadoLibre API pública gratuita |
| **Store Manager** | CRUD de tiendas desde panel Admin sin tocar código; selector de método: `scraper` o `api` |
| **Anomaly Detector** | Detecta 0 resultados, errores HTTP y precios fuera de rango; notifica al Admin automáticamente |
| **Price Store** | Supabase PostgreSQL; precio por producto/tienda/fecha/método de pago |
| **API REST** | Express: productos, precios, tiendas, alertas, tendencias, health, auth |
| **Auth** | Supabase Auth — email/contraseña + Google OAuth 2.0; roles: `admin` / `visitor` |
| **Frontend** | Angular: búsqueda, filtros, favoritos, gráficos de tendencia (Chart.js), panel admin |
| **Notification Service** | Nodemailer + Telegram Bot, configurable por usuario |

---

## Tiendas objetivo — Fase 1 (Chile)

| Tipo | Tiendas |
|---|---|
| **Retail general** (precios diferenciados por tarjeta/banco) | Paris, Falabella, Ripley, Lider, Fasa |
| **API pública gratuita** | MercadoLibre Chile |
| **Especializadas en perfumes** | SAIRAM Perfumes, Multimarcasperfumes, Alisha Perfumes, Silk Perfumes |

Nuevas tiendas se agregan desde el panel Admin sin modificar código.

---

## Perfiles de usuario

| Perfil | Capacidades |
|---|---|
| **Administrador** | Agregar/editar/deshabilitar tiendas, configurar scraper (URL, selectores, frecuencia, método), testear selectores en vivo, ver dashboard de salud del worker, gestionar usuarios |
| **Visitante** | Registrarse (email o Google), buscar perfumes, ver precios e historial, filtrar, marcar favoritos, configurar alertas de precio (umbral + canal: mail/Telegram) |

---

## Resiliencia ante cambios de HTML

- Selectores CSS/XPath almacenados en BD y editables desde el panel Admin sin redesplegar.
- Worker detecta y notifica al Admin ante: 0 resultados, errores HTTP, precios anómalos.
- Dashboard de salud por tienda: última ejecución exitosa, errores recientes, productos obtenidos.
- Sitios con API (MercadoLibre) son preferibles al scraping por mayor estabilidad.

---

## Regla de documentación

Cualquier cambio en requerimientos, funcionalidades, actores, tiendas, tecnología o estructura debe reflejarse de inmediato en **todos** los archivos de documentación afectados: `context.md`, `plan.md`, `UseCases.md`, `C4.md`, `er-diagram.md`, `sequential-diagram.md`.
