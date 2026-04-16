# Casos de Uso — perfum-prices-v2

## UC-01: Vista general del sistema

```mermaid
graph TB
    Admin["👤 Administrador"]
    Visitor["👤 Usuario Visitante"]
    Worker["⚙️ Worker (sistema)"]
    NotifService["📨 Servicio de Notificaciones"]

    subgraph Web["Aplicación Web"]
        UC_AdminStores["Gestionar tiendas"]
        UC_AdminHealth["Ver salud del scraper"]
        UC_AdminUsers["Gestionar usuarios"]
        UC_Search["Buscar perfumes"]
        UC_Filter["Filtrar resultados"]
        UC_History["Ver historial de precios"]
        UC_Favorites["Gestionar favoritos"]
        UC_Alerts["Configurar alertas de precio"]
        UC_Trends["Ver gráficos de tendencia"]
    end

    subgraph Background["Procesos en segundo plano"]
        UC_Scrape["Obtener precios (scraper/API)"]
        UC_Detect["Detectar anomalías"]
        UC_Notify["Enviar notificaciones"]
    end

    Admin --> UC_AdminStores
    Admin --> UC_AdminHealth
    Admin --> UC_AdminUsers
    Admin --> UC_Search
    Admin --> UC_Filter

    Visitor --> UC_Search
    Visitor --> UC_Filter
    Visitor --> UC_History
    Visitor --> UC_Favorites
    Visitor --> UC_Alerts
    Visitor --> UC_Trends

    Worker --> UC_Scrape
    Worker --> UC_Detect
    Worker --> UC_Notify

    UC_Notify --> NotifService
    UC_Detect --> NotifService
```

---

## UC-02: Gestión de tiendas (Administrador)

```mermaid
flowchart TD
    Admin["👤 Administrador"]

    Admin --> A1["Agregar tienda"]
    Admin --> A2["Editar tienda"]
    Admin --> A3["Deshabilitar/habilitar tienda"]
    Admin --> A4["Configurar selectores HTML"]
    Admin --> A5["Configurar frecuencia de scraping"]
    Admin --> A6["Definir método de obtención"]

    A1 --> M1{"Método"}
    A6 --> M1
    M1 -->|"scraper"| M1a["Configurar URL y selectores CSS/XPath"]
    M1 -->|"api"| M1b["Configurar endpoint y parámetros API"]

    A4 --> V1["Validar selector en vivo (test scrape)"]
    V1 -->|"OK"| V2["Guardar configuración en BD"]
    V1 -->|"Error"| V3["Mostrar error al Admin"]
```

---

## UC-03: Monitoreo y salud del worker (Administrador)

```mermaid
flowchart TD
    Admin["👤 Administrador"]

    Admin --> H1["Ver dashboard de salud"]
    H1 --> H2["Estado por tienda:\n última ejecución, errores, productos obtenidos"]

    H2 --> H3{"¿Tienda con error?"}
    H3 -->|"Sí"| H4["Ver detalle de error"]
    H4 --> H5["Editar selectores / config"]
    H5 --> H6["Forzar ejecución manual"]

    H3 -->|"No"| H7["Ver estadísticas históricas del worker"]

    subgraph Auto["Sistema automático"]
        W1["Worker detecta anomalía"]
        W1 --> W2["Notifica al Admin por mail/Telegram"]
    end
```

---

## UC-04: Búsqueda y exploración de perfumes (Visitante)

```mermaid
flowchart TD
    Visitor["👤 Usuario Visitante"]

    Visitor --> S1["Ingresar al sitio"]
    S1 --> S2["Ver perfumes con mayor descuento actual"]

    Visitor --> S3["Buscar perfume por nombre o marca"]
    S3 --> S4["Aplicar filtros"]

    S4 --> F1["Filtrar por marca"]
    S4 --> F2["Filtrar por notas olfativas\n(cítrico, amaderado, floral, oriental, etc.)"]
    S4 --> F3["Filtrar por precio (rango)"]
    S4 --> F4["Filtrar por tienda"]
    S4 --> F5["Filtrar por género\n(hombre, mujer, unisex)"]

    S4 --> S5["Ver resultados"]
    S5 --> S6["Seleccionar perfume"]
    S6 --> S7["Ver detalle:\n precios por tienda, método de pago,\n mejor precio actual"]
    S7 --> S8["Ver gráfico de tendencia de precios"]
```

---

## UC-05: Historial y comparación de precios (Visitante)

```mermaid
flowchart TD
    Visitor["👤 Usuario Visitante"]

    Visitor --> P1["Seleccionar perfume"]
    P1 --> P2["Ver tabla de precios actuales por tienda"]
    P2 --> P3["Ver precio normal vs precio con descuento\n(tarjeta/banco específico)"]
    P1 --> P4["Ver gráfico histórico de precios"]
    P4 --> P5["Seleccionar rango de tiempo:\n 7d / 30d / 90d / 1 año"]
    P4 --> P6["Comparar entre tiendas en el mismo gráfico"]
    P1 --> P7["Ver precio mínimo histórico registrado"]
    P1 --> P8["Ver oferta activa si existe\n(Cyber Day, etc.)"]
```

---

## UC-06: Favoritos y alertas de precio (Visitante)

```mermaid
flowchart TD
    Visitor["👤 Usuario Visitante"]

    Visitor --> R1{"¿Tiene cuenta?"}
    R1 -->|"No"| R2["Registrarse\n(email o Google)"]
    R1 -->|"Sí"| R3["Iniciar sesión\n(email o Google)"]

    R3 --> F1["Marcar perfume como favorito"]
    F1 --> F2["Ver lista de favoritos"]

    R3 --> A1["Crear alerta de precio"]
    A1 --> A2["Seleccionar perfume"]
    A2 --> A3["Definir umbral:\n porcentaje de baja o precio objetivo"]
    A3 --> A4["Elegir canal de notificación:\n mail / Telegram / ambos"]
    A4 --> A5["Alerta guardada"]

    subgraph Auto["Sistema automático"]
        W1["Worker detecta baja de precio"]
        W1 --> W2["Evalúa alertas activas"]
        W2 --> W3["Envía notificación al usuario"]
    end
```

---

## UC-07: Registro y autenticación (Visitante)

```mermaid
flowchart TD
    Visitor["👤 Usuario Visitante"]

    Visitor --> R1{"¿Cómo registrarse?"}
    R1 -->|"Email"| R2["Ingresar email y contraseña"]
    R2 --> R3["Confirmar email"]
    R3 --> R4["Cuenta activa"]

    R1 -->|"Google"| R5["Clic en 'Iniciar sesión con Google'"]
    R5 --> R6["Redirige a Google OAuth 2.0"]
    R6 --> R7["Usuario autoriza acceso"]
    R7 --> R4

    Visitor --> L1{"¿Cómo iniciar sesión?"}
    L1 -->|"Email"| L2["Email + contraseña"]
    L2 --> L3["Sesión activa"]

    L1 -->|"Google"| L4["Clic en 'Continuar con Google'"]
    L4 --> L5["Redirige a Google OAuth 2.0"]
    L5 --> L3

    L3 --> P1["Editar perfil"]
    P1 --> P2["Cambiar canal de notificación\n(mail / Telegram)"]
    P2 -->|"Telegram"| P3["Vincular cuenta de Telegram\n(via bot token)"]
```

---

## UC-08: Proceso automatizado de obtención de precios (Worker)

```mermaid
flowchart TD
    Cron["⏱️ Cron Job"]

    Cron --> W1["Leer tiendas activas desde BD"]
    W1 --> W2["Por cada tienda"]

    W2 --> W3{"Método"}
    W3 -->|"scraper"| W4["Lanzar Puppeteer con stealth"]
    W3 -->|"api"| W5["Llamar endpoint API\n(ej: MercadoLibre)"]

    W4 --> W6["Extraer precios usando selectores de BD"]
    W5 --> W6

    W6 --> W7{"¿Resultado válido?"}
    W7 -->|"Sí"| W8["Guardar precios en BD con timestamp"]
    W8 --> W9["Evaluar alertas de usuarios"]
    W9 --> W10["Notificar si corresponde"]

    W7 -->|"No / Error"| W11["Registrar error en BD"]
    W11 --> W12["Notificar al Administrador"]
```

---

## Resumen de actores y casos de uso

| Actor | Casos de uso |
|---|---|
| **Administrador** | UC-02, UC-03 + todos los de Visitante |
| **Usuario Visitante** | UC-04, UC-05, UC-06, UC-07 |
| **Worker (sistema)** | UC-08 |
| **Servicio de Notificaciones** | Invocado por UC-06 y UC-08 |
