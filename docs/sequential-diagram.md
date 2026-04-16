# Diagramas de Secuencia — perfum-prices-v2

---

## SD-01: Autenticación con email y contraseña

```mermaid
sequenceDiagram
    actor Visitor as Usuario Visitante
    participant FE as Frontend (Angular)
    participant SB as Supabase Auth
    participant API as API REST

    Visitor->>FE: Ingresa email y contraseña
    FE->>SB: signInWithPassword(email, password)
    SB-->>FE: JWT + refresh token
    FE->>FE: Guarda JWT en memoria
    FE->>API: GET /users/me (Authorization: Bearer JWT)
    API->>SB: Verifica JWT
    SB-->>API: Payload (user_id, role)
    API-->>FE: Perfil del usuario (nombre, rol, canal notif.)
    FE-->>Visitor: Redirige según rol (Admin → panel / Visitor → home)
```

---

## SD-02: Autenticación con Google OAuth 2.0

```mermaid
sequenceDiagram
    actor Visitor as Usuario Visitante
    participant FE as Frontend (Angular)
    participant SB as Supabase Auth
    participant Google as Google OAuth 2.0
    participant API as API REST

    Visitor->>FE: Clic en "Continuar con Google"
    FE->>SB: signInWithOAuth(provider: google)
    SB-->>FE: URL de redirección a Google
    FE->>Google: Redirige al usuario
    Google-->>Visitor: Pantalla de consentimiento Google
    Visitor->>Google: Aprueba acceso
    Google-->>SB: Authorization code
    SB->>Google: Intercambia code por tokens
    Google-->>SB: Access token + perfil Google
    SB-->>FE: JWT + refresh token (callback URL)
    FE->>FE: Guarda JWT en memoria
    FE->>API: GET /users/me (Authorization: Bearer JWT)
    API->>SB: Verifica JWT
    SB-->>API: Payload (user_id, role)
    API-->>FE: Perfil del usuario
    FE-->>Visitor: Redirige según rol
```

---

## SD-03: Búsqueda y filtrado de perfumes

```mermaid
sequenceDiagram
    actor Visitor as Usuario Visitante
    participant FE as Frontend (Angular)
    participant API as API REST
    participant DB as Supabase (PostgreSQL)

    Visitor->>FE: Ingresa término de búsqueda y/o filtros
    Note over FE: Filtros: marca, notas olfativas,<br/>género, rango de precio, tienda

    FE->>API: GET /products?q=chanel&brand=Chanel&gender=female&minPrice=30000&maxPrice=80000&note=floral
    API->>DB: SELECT products JOIN brands JOIN product_notes WHERE ...
    DB-->>API: Lista de productos con precio mínimo actual por tienda
    API-->>FE: Array de productos [{id, nombre, marca, imagen, precio_min, descuento_max}]
    FE-->>Visitor: Renderiza resultados con tarjetas de producto
```

---

## SD-04: Ver detalle de perfume e historial de precios

```mermaid
sequenceDiagram
    actor Visitor as Usuario Visitante
    participant FE as Frontend (Angular)
    participant API as API REST
    participant DB as Supabase (PostgreSQL)

    Visitor->>FE: Clic en un perfume
    FE->>API: GET /products/:id
    API->>DB: SELECT product + brand + notes
    DB-->>API: Detalle del producto
    API-->>FE: Datos del perfume

    FE->>API: GET /prices/:productId?history=true&range=30d
    API->>DB: SELECT prices JOIN store_products WHERE product_id = :id AND captured_at > now() - 30d
    DB-->>API: Serie histórica de precios por tienda
    API-->>FE: [{store, date, price_normal, price_discounted, payment_method}]

    FE->>FE: Renderiza tabla de precios actuales por tienda
    FE->>FE: Renderiza gráfico de tendencia (Chart.js)
    FE-->>Visitor: Vista completa del perfume con historial
```

---

## SD-05: Configurar alerta de precio

```mermaid
sequenceDiagram
    actor Visitor as Usuario Visitante
    participant FE as Frontend (Angular)
    participant API as API REST
    participant DB as Supabase (PostgreSQL)

    Visitor->>FE: Clic en "Crear alerta" en un perfume
    FE-->>Visitor: Modal: umbral (% o precio fijo), tienda (opcional), canal
    Visitor->>FE: Define umbral 20%, canal: Telegram, tienda: cualquiera
    FE->>API: POST /alerts {product_id, threshold_type: percentage, threshold_value: 20, store_id: null, notification_channel: telegram}
    API->>DB: INSERT INTO alerts
    DB-->>API: OK
    API-->>FE: Alerta creada
    FE-->>Visitor: Confirmación visual
```

---

## SD-06: Worker — Obtención de precios por scraping

```mermaid
sequenceDiagram
    participant CRON as Scheduler (node-cron)
    participant Worker as Price Worker
    participant DB as Supabase (PostgreSQL)
    participant Puppeteer as Puppeteer + Stealth
    participant Site as Sitio Web (tienda)
    participant Notif as Notification Service

    CRON->>Worker: Dispara job (según frecuencia configurada)
    Worker->>DB: SELECT stores WHERE method = 'scraper' AND is_active = true
    DB-->>Worker: Lista de tiendas con selectores

    loop Por cada tienda
        Worker->>DB: SELECT store_products WHERE store_id = :id AND is_active = true
        DB-->>Worker: Lista de URLs de productos a scrapear

        Worker->>Puppeteer: Inicializar navegador con perfil stealth
        Puppeteer->>Site: GET product_url (simula comportamiento humano)
        Site-->>Puppeteer: HTML de la página

        Puppeteer->>Worker: Aplica selectores CSS/XPath
        Worker->>Worker: Normaliza precios (PriceNormalizer)

        alt Resultado válido
            Worker->>DB: INSERT INTO prices (store_product_id, price_normal, price_discounted, payment_method, captured_at)
            Worker->>DB: UPDATE store_products SET last_scraped_at = now()
            Worker->>Worker: Evalúa alertas de usuarios (AnomalyDetector)
        else 0 resultados o error
            Worker->>DB: INSERT INTO worker_logs (store_id, status: error, error_message)
            Worker->>Notif: Notificar Admin — scraper fallido en tienda X
        end

        Worker->>DB: INSERT INTO worker_logs (store_id, status, products_found, started_at, finished_at)
    end
```

---

## SD-07: Worker — Obtención de precios por API (MercadoLibre)

```mermaid
sequenceDiagram
    participant CRON as Scheduler (node-cron)
    participant Worker as Price Worker
    participant DB as Supabase (PostgreSQL)
    participant ML as MercadoLibre API
    participant Notif as Notification Service

    CRON->>Worker: Dispara job
    Worker->>DB: SELECT stores WHERE method = 'api' AND is_active = true
    DB-->>Worker: Tienda MercadoLibre con api_config (endpoint, params)

    Worker->>ML: GET /sites/MLC/search?q=perfume&category=... (paginado)
    ML-->>Worker: JSON con items [{id, title, price, original_price, permalink}]

    Worker->>Worker: Normaliza datos (PriceNormalizer)
    Worker->>Worker: Identifica producto en BD por nombre/marca (fuzzy match)

    alt Producto existe en BD
        Worker->>DB: INSERT INTO prices
    else Producto nuevo
        Worker->>DB: INSERT INTO products + store_products
        Worker->>DB: INSERT INTO prices
    end

    Worker->>DB: INSERT INTO worker_logs (status: success, products_found)
```

---

## SD-08: Worker — Detección de anomalía y notificación al Admin

```mermaid
sequenceDiagram
    participant Worker as Price Worker
    participant Detector as Anomaly Detector
    participant DB as Supabase (PostgreSQL)
    participant Notif as Notification Service
    participant Gmail as Gmail SMTP
    participant Telegram as Telegram Bot API
    participant Admin as Administrador

    Worker->>Detector: Resultado del scraping (precios obtenidos)

    alt Caso 1: 0 resultados obtenidos
        Detector->>DB: INSERT INTO worker_logs (status: error, error_message: "0 productos encontrados")
        Detector->>Notif: trigger(admin, "Scraper sin resultados", store)
    else Caso 2: Error HTTP (403, 429, 503)
        Detector->>DB: INSERT INTO worker_logs (status: error, error_message: "HTTP 403")
        Detector->>Notif: trigger(admin, "Error HTTP en tienda", store)
    else Caso 3: Precio fuera de rango estadístico
        Detector->>DB: INSERT INTO worker_logs (status: partial, error_message: "Precio anómalo detectado")
        Detector->>Notif: trigger(admin, "Precio anómalo detectado", store, precio)
    end

    Notif->>DB: SELECT admin notification_channel
    DB-->>Notif: channel: "both"

    Notif->>Gmail: Envía email de alerta al Admin
    Gmail-->>Admin: Email: "⚠️ Scraper fallido — Tienda X"

    Notif->>Telegram: Envía mensaje al Admin
    Telegram-->>Admin: Mensaje: "⚠️ Scraper fallido — Tienda X"
```

---

## SD-09: Worker — Evaluación de alertas de usuario y notificación

```mermaid
sequenceDiagram
    participant Worker as Price Worker
    participant Evaluator as Alert Evaluator
    participant DB as Supabase (PostgreSQL)
    participant Notif as Notification Service
    participant Gmail as Gmail SMTP
    participant Telegram as Telegram Bot API
    participant Visitor as Usuario Visitante

    Worker->>Evaluator: Nuevo precio guardado (product_id, store_id, price_normal, price_discounted)

    Evaluator->>DB: SELECT alerts WHERE product_id = :id AND is_active = true AND (store_id = :storeId OR store_id IS NULL)
    DB-->>Evaluator: Lista de alertas activas para ese producto

    loop Por cada alerta
        Evaluator->>Evaluator: Compara precio actual vs umbral configurado

        alt Umbral superado (precio bajó lo suficiente)
            Evaluator->>DB: UPDATE alerts SET last_triggered_at = now()
            Evaluator->>DB: SELECT users WHERE id = alert.user_id
            DB-->>Evaluator: user (email, notification_channel, telegram_chat_id)

            Evaluator->>Notif: trigger(user, product, store, precio_anterior, precio_nuevo)

            alt Canal: email
                Notif->>Gmail: Envía email "💸 Alerta de precio: [Perfume] bajó a $XX.XXX"
                Gmail-->>Visitor: Email con link al producto
            else Canal: telegram
                Notif->>Telegram: Envía mensaje con detalle y link
                Telegram-->>Visitor: Mensaje Telegram
            else Canal: both
                Notif->>Gmail: Envía email
                Notif->>Telegram: Envía mensaje
            end
        end
    end
```

---

## SD-10: Admin — Agregar nueva tienda con test de selectores

```mermaid
sequenceDiagram
    actor Admin as Administrador
    participant FE as Frontend (Angular)
    participant API as API REST
    participant DB as Supabase (PostgreSQL)
    participant Worker as Price Worker
    participant Site as Nuevo Sitio Web

    Admin->>FE: Panel Admin → "Agregar tienda"
    FE-->>Admin: Formulario: nombre, URL, método, frecuencia
    Admin->>FE: Completa datos y selecciona método: scraper

    FE-->>Admin: Formulario de selectores (product_name, price_normal, price_discount, payment_method...)
    Admin->>FE: Ingresa selectores CSS y URL de ejemplo para test

    Admin->>FE: Clic en "Probar selectores"
    FE->>API: POST /stores/test-scrape {url, selectors}
    API->>Worker: Ejecuta scrape puntual (sin guardar en BD)
    Worker->>Site: GET url con Puppeteer stealth
    Site-->>Worker: HTML
    Worker->>Worker: Aplica selectores
    Worker-->>API: Resultado: {product_name, price_normal, price_discount} o error

    alt Selectores válidos
        API-->>FE: Preview de datos extraídos
        FE-->>Admin: Muestra preview: "Chanel N°5 — $75.990 / $60.990 CMR"
        Admin->>FE: Confirma y guarda
        FE->>API: POST /stores (datos completos)
        API->>DB: INSERT INTO stores + store_selectors
        DB-->>API: OK
        API-->>FE: Tienda creada
        FE-->>Admin: Tienda activa en el sistema
    else Selectores inválidos
        API-->>FE: Error con detalle
        FE-->>Admin: "Selector '.price' no encontrado en la página"
        Admin->>FE: Corrige selectores y reintenta
    end
```

---

## SD-11: Admin — Actualizar selectores tras cambio de HTML

```mermaid
sequenceDiagram
    actor Admin as Administrador
    participant Telegram as Telegram Bot API
    participant FE as Frontend (Angular)
    participant API as API REST
    participant DB as Supabase (PostgreSQL)

    Note over Telegram,Admin: El worker detectó error en la tienda (SD-08)

    Telegram-->>Admin: "⚠️ Scraper fallido — Paris.cl — 0 productos (hace 15 min)"
    Admin->>FE: Abre panel Admin → Dashboard de salud
    FE->>API: GET /health/worker
    API->>DB: SELECT worker_logs WHERE store_id = :id ORDER BY created_at DESC
    DB-->>API: Logs recientes con errores
    API-->>FE: Estado de salud por tienda
    FE-->>Admin: Tienda "Paris.cl" en rojo — último error hace 15 min

    Admin->>FE: Clic en "Editar selectores" de Paris.cl
    FE-->>Admin: Formulario con selectores actuales
    Admin->>FE: Actualiza selector de precio: ".price-box .current" → ".price--current"
    Admin->>FE: Ejecuta test con URL de ejemplo
    FE->>API: POST /stores/test-scrape {url, selectors actualizados}
    API-->>FE: Preview correcto
    Admin->>FE: Guarda cambios
    FE->>API: PUT /stores/:id/selectors
    API->>DB: UPDATE store_selectors
    DB-->>API: OK
    API-->>FE: Selectores actualizados
    FE-->>Admin: "Selectores actualizados — próxima ejecución en 45 min"
```

---

## Resumen de diagramas

| # | Flujo | Actores |
|---|---|---|
| SD-01 | Login con email/contraseña | Visitante, Frontend, Supabase, API |
| SD-02 | Login con Google OAuth 2.0 | Visitante, Frontend, Supabase, Google |
| SD-03 | Búsqueda y filtrado de perfumes | Visitante, Frontend, API, BD |
| SD-04 | Detalle de perfume e historial de precios | Visitante, Frontend, API, BD |
| SD-05 | Configurar alerta de precio | Visitante, Frontend, API, BD |
| SD-06 | Worker — scraping de precios | Worker, Puppeteer, Tienda, BD, Notif |
| SD-07 | Worker — obtención via API (MercadoLibre) | Worker, ML API, BD |
| SD-08 | Worker — anomalía y notificación al Admin | Worker, Detector, BD, Notif, Admin |
| SD-09 | Worker — alerta de precio a usuario | Worker, Evaluator, BD, Notif, Visitante |
| SD-10 | Admin — agregar tienda con test de selectores | Admin, Frontend, API, Worker, Sitio |
| SD-11 | Admin — actualizar selectores tras cambio HTML | Admin, Telegram, Frontend, API, BD |
