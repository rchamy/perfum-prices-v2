# Historias de Usuario — perfum-prices-v2

> Estado: borrador — pendiente aprobación para subir a GitHub Project.

---

## Épicas

| Épica | Descripción |
|---|---|
| **E1** | Autenticación y perfil |
| **E2** | Exploración de perfumes |
| **E3** | Favoritos y alertas |
| **E4** | Gestión de tiendas (Admin) |
| **E5** | Monitoreo del worker (Admin) |
| **E6** | Gestión de usuarios (Admin) |

---

## E1 — Autenticación y perfil

---

### HU-01: Registro con email y contraseña

**Como** usuario visitante,
**quiero** registrarme con mi email y una contraseña,
**para** tener una cuenta personal donde guardar favoritos y alertas de precio.

**Criterios de aceptación**
- [ ] El formulario solicita nombre, email y contraseña (mínimo 8 caracteres).
- [ ] Se envía un email de confirmación al registrarse.
- [ ] No se puede acceder a favoritos ni alertas sin confirmar el email.
- [ ] Si el email ya existe, se muestra un mensaje claro.
- [ ] La contraseña se almacena hasheada (gestionado por Supabase Auth).

**Sección técnica**
- **Componente**: `AuthModule` (Frontend) → `signUp()` de Supabase Auth JS SDK.
- **Tablas afectadas**: `users` (creado automáticamente por Supabase Auth, se extiende con `role = visitor`).
- **Endpoint**: No requiere endpoint propio; usa Supabase Auth directamente desde el frontend.
- **Notas**: Usar `supabase.auth.signUp()`. Al confirmar email, disparar un trigger en Supabase para crear el registro en la tabla `users` con `role = 'visitor'`.

---

### HU-02: Inicio de sesión con email y contraseña

**Como** usuario registrado,
**quiero** iniciar sesión con mi email y contraseña,
**para** acceder a mis favoritos, alertas y configuración personal.

**Criterios de aceptación**
- [ ] Login exitoso redirige al home (visitor) o panel Admin (admin).
- [ ] Credenciales incorrectas muestran mensaje de error sin revelar cuál campo falló.
- [ ] La sesión persiste al refrescar la página (refresh token).
- [ ] Existe opción de cierre de sesión.

**Sección técnica**
- **Componente**: `AuthModule` → `signInWithPassword()`.
- **JWT**: Almacenado en memoria (`sessionStorage`); adjuntado en `Authorization: Bearer` en cada request a la API via `HttpInterceptor`.
- **Guard**: `AuthGuard` y `RoleGuard` protegen rutas `/admin/**` (requiere `role = admin`).
- **Refresh**: Supabase SDK gestiona renovación automática del JWT.

---

### HU-03: Inicio de sesión con Google

**Como** usuario visitante,
**quiero** iniciar sesión con mi cuenta de Google,
**para** no tener que crear ni recordar una contraseña adicional.

**Criterios de aceptación**
- [ ] Botón "Continuar con Google" visible en la pantalla de login y registro.
- [ ] El flujo redirige a Google, solicita consentimiento y regresa a la app.
- [ ] Si es la primera vez, se crea la cuenta automáticamente con `role = visitor`.
- [ ] Si el email ya existe (cuenta email), se vincula al mismo usuario.

**Sección técnica**
- **Componente**: `AuthModule` → `signInWithOAuth({ provider: 'google' })`.
- **Configuración**: Habilitar proveedor Google en Supabase Dashboard (Client ID y Secret de Google Cloud Console — gratuito).
- **Callback URL**: Configurar `redirectTo` en Supabase y en Google Cloud Console.
- **Tabla**: Al primer login OAuth, el trigger de Supabase inserta en `users` con `role = 'visitor'`.

---

### HU-04: Editar perfil y configurar canal de notificación

**Como** usuario registrado,
**quiero** editar mi nombre y elegir cómo recibir notificaciones (email, Telegram o ambos),
**para** personalizar mi experiencia según mis preferencias.

**Criterios de aceptación**
- [ ] El usuario puede cambiar su nombre.
- [ ] El usuario puede seleccionar canal: email, Telegram o ambos.
- [ ] Si elige Telegram, aparece la opción de vincular cuenta (HU-05).
- [ ] Los cambios se guardan y aplican a las próximas notificaciones.

**Sección técnica**
- **Componente**: `ProfileModule`.
- **Endpoint**: `PUT /users/me` → actualiza `users.name`, `users.notification_channel`.
- **Tabla afectada**: `users`.

---

### HU-05: Vincular cuenta de Telegram

**Como** usuario que eligió Telegram como canal,
**quiero** vincular mi cuenta de Telegram con mi perfil,
**para** recibir alertas de precio directamente en Telegram.

**Criterios de aceptación**
- [ ] Se muestra el nombre del bot y un botón "Vincular con Telegram".
- [ ] El proceso genera un token único temporal.
- [ ] El usuario abre el bot en Telegram y envía el token.
- [ ] El sistema confirma la vinculación mostrando el nombre de usuario de Telegram.
- [ ] Si se desvincula, las notificaciones Telegram se suspenden inmediatamente.

**Sección técnica**
- **Flujo**: Frontend solicita `POST /users/me/telegram/link` → API genera token UUID temporal (TTL 10 min) guardado en `users.telegram_link_token`. Bot de Telegram escucha `/start <token>` → llama `POST /telegram/verify` → guarda `telegram_chat_id` en `users`.
- **Bot**: Implementado con `node-telegram-bot-api` en el servicio de Notification Service.
- **Tablas**: `users.telegram_chat_id`, `users.telegram_link_token`.

---

## E2 — Exploración de perfumes

---

### HU-06: Ver perfumes con mayor descuento en el home

**Como** visitante (sin cuenta),
**quiero** ver al entrar al sitio los perfumes con los mayores descuentos actuales,
**para** descubrir rápidamente las mejores ofertas sin tener que buscar.

**Criterios de aceptación**
- [ ] El home muestra una lista/grid de perfumes ordenados por porcentaje de descuento descendente.
- [ ] Cada tarjeta muestra: imagen, nombre, marca, precio normal, precio con descuento, % de ahorro y tienda.
- [ ] El contenido es visible sin necesidad de iniciar sesión.
- [ ] Se actualiza con los precios más recientes (máximo 1 hora de desfase).

**Sección técnica**
- **Componente**: `HomeModule`.
- **Endpoint**: `GET /products?sort=discount_desc&limit=20`.
- **Query**: JOIN entre `prices` (precio más reciente por `store_product_id`), `store_products`, `products`. Descuento calculado como `((price_normal - price_discounted) / price_normal) * 100`.
- **Performance**: Considerar vista materializada en Supabase que se refresca tras cada ejecución del worker.

---

### HU-07: Buscar perfumes por nombre o marca

**Como** usuario visitante,
**quiero** buscar perfumes ingresando un nombre o marca,
**para** encontrar rápidamente el perfume que me interesa.

**Criterios de aceptación**
- [ ] La búsqueda es case-insensitive y soporta búsqueda parcial (ej: "chan" encuentra "Chanel").
- [ ] Los resultados aparecen al escribir (debounce de 300ms).
- [ ] Si no hay resultados, se muestra un mensaje amigable con sugerencias.
- [ ] Los resultados incluyen imagen, nombre, marca y mejor precio actual.

**Sección técnica**
- **Componente**: `SearchModule`.
- **Endpoint**: `GET /products?q=:term`.
- **Query**: `ILIKE '%term%'` sobre `products.name` y `brands.name`. Para producción considerar `pg_trgm` (extensión de PostgreSQL disponible en Supabase) para búsqueda fuzzy eficiente.
- **Frontend**: Implementar `debounceTime(300)` + `distinctUntilChanged()` con RxJS en el `SearchComponent`.

---

### HU-08: Filtrar perfumes por múltiples criterios

**Como** usuario visitante,
**quiero** filtrar los resultados de búsqueda por marca, notas olfativas, género, rango de precio y tienda,
**para** encontrar exactamente el tipo de perfume que busco dentro de mi presupuesto.

**Criterios de aceptación**
- [ ] Filtros disponibles: marca (multi-selección), familia olfativa, notas (top/heart/base), género, rango de precio (slider), tienda.
- [ ] Los filtros son acumulativos (AND entre categorías).
- [ ] El contador de resultados se actualiza en tiempo real al aplicar filtros.
- [ ] Los filtros activos se muestran como chips eliminables.
- [ ] La URL refleja los filtros activos (compartible).

**Sección técnica**
- **Componente**: `SearchModule` → `FilterPanelComponent`.
- **Endpoint**: `GET /products?brand=:id&family=:id&gender=:g&minPrice=:n&maxPrice=:n&store=:id`.
- **Query**: JOIN `products` + `brands` + `product_notes` + `olfactive_notes` + `store_products` + `prices`. Filtro de precio sobre el precio mínimo actual del producto.
- **URL Params**: Usar `ActivatedRoute.queryParams` para sincronizar filtros con la URL.

---

### HU-09: Ver detalle de un perfume

**Como** usuario visitante,
**quiero** ver el detalle completo de un perfume con todos sus precios por tienda,
**para** saber dónde comprarlo más barato y con qué método de pago.

**Criterios de aceptación**
- [ ] Muestra: imagen, nombre, marca, género, descripción, notas olfativas (top/heart/base).
- [ ] Tabla de precios: tienda, precio normal, precio con descuento, método de pago requerido, link directo.
- [ ] Resalta visualmente la mejor oferta actual.
- [ ] Muestra el precio mínimo histórico registrado.
- [ ] Muestra si hay una oferta especial activa (Cyber Day, etc.) con fecha de vencimiento si está disponible.

**Sección técnica**
- **Componente**: `ProductDetailModule`.
- **Endpoints**:
  - `GET /products/:id` → detalle + notas.
  - `GET /prices/:productId/current` → precios actuales por tienda.
- **Precio mínimo histórico**: `SELECT MIN(price_discounted) FROM prices WHERE store_product_id IN (SELECT id FROM store_products WHERE product_id = :id)`.

---

### HU-10: Ver gráfico de tendencia de precios

**Como** usuario visitante,
**quiero** ver un gráfico de la evolución del precio de un perfume en el tiempo,
**para** saber si el precio está subiendo, bajando o si conviene esperar.

**Criterios de aceptación**
- [ ] Gráfico de línea con eje X (fecha) y eje Y (precio en CLP).
- [ ] Selector de rango: 7d, 30d, 90d, 1 año.
- [ ] Permite comparar múltiples tiendas en el mismo gráfico (líneas con colores distintos).
- [ ] Al hacer hover sobre un punto, muestra fecha, tienda, precio y método de pago.
- [ ] El gráfico es responsive (se adapta a mobile).

**Sección técnica**
- **Componente**: `ChartsModule` usando `Chart.js` con el wrapper `ng2-charts`.
- **Endpoint**: `GET /prices/:productId/history?range=30d&stores=id1,id2`.
- **Query**: `SELECT captured_at, price_normal, price_discounted, store_id FROM prices JOIN store_products ON ... WHERE captured_at > now() - interval '30 days'`.
- **Formato respuesta**: Array por tienda `[{store, data: [{date, price}]}]` listo para datasets de Chart.js.

---

## E3 — Favoritos y alertas

---

### HU-11: Marcar y desmarcar perfume como favorito

**Como** usuario registrado,
**quiero** marcar perfumes como favoritos,
**para** tener acceso rápido a los que me interesan sin tener que buscarlos de nuevo.

**Criterios de aceptación**
- [ ] Ícono de corazón/estrella en cada tarjeta y en el detalle del producto.
- [ ] El estado (marcado/no marcado) es visible e inmediato (optimistic update).
- [ ] Si el usuario no está autenticado, al hacer clic se le invita a iniciar sesión.
- [ ] Los favoritos se mantienen entre sesiones.

**Sección técnica**
- **Componente**: `FavoritesModule` + `FavoriteButtonComponent` (reutilizable).
- **Endpoints**: `POST /favorites {product_id}` / `DELETE /favorites/:productId`.
- **Tabla**: `favorites`.
- **Optimistic update**: Actualizar el estado en el store de Angular antes de recibir confirmación de la API; revertir si falla.

---

### HU-12: Ver lista de favoritos

**Como** usuario registrado,
**quiero** ver todos mis perfumes favoritos en un solo lugar,
**para** seguir de cerca su evolución de precios.

**Criterios de aceptación**
- [ ] Lista con imagen, nombre, marca y mejor precio actual de cada favorito.
- [ ] Indica si algún favorito tiene un descuento activo.
- [ ] Permite eliminar favoritos directamente desde la lista.
- [ ] Si la lista está vacía, muestra un mensaje con acceso a búsqueda.

**Sección técnica**
- **Componente**: `FavoritesModule`.
- **Endpoint**: `GET /favorites` → retorna favoritos del usuario autenticado con precio actual incluido.
- **Query**: JOIN `favorites` + `products` + `brands` + precio más reciente de `prices`.

---

### HU-13: Crear alerta de bajada de precio

**Como** usuario registrado,
**quiero** crear una alerta para un perfume que me interesa,
**para** recibir una notificación automática cuando el precio baje según mi criterio.

**Criterios de aceptación**
- [ ] Se puede crear la alerta desde el detalle del producto o desde favoritos.
- [ ] El usuario elige el tipo de umbral: porcentaje de baja (ej: 20%) o precio objetivo fijo (ej: $45.000).
- [ ] Puede limitar la alerta a una tienda específica o dejarla abierta a cualquier tienda.
- [ ] Elige el canal de notificación: email, Telegram o ambos.
- [ ] Si ya existe una alerta para ese producto, se ofrece editarla.

**Sección técnica**
- **Componente**: `AlertsModule` → `AlertFormComponent` (modal).
- **Endpoint**: `POST /alerts {product_id, store_id, threshold_type, threshold_value, notification_channel}`.
- **Tabla**: `alerts`.
- **Validación**: Si `threshold_type = percentage`, el valor debe estar entre 1 y 99. Si `fixed_price`, debe ser menor al precio actual.

---

### HU-14: Gestionar alertas activas

**Como** usuario registrado,
**quiero** ver, editar y eliminar mis alertas activas,
**para** mantener control sobre qué precios estoy monitoreando.

**Criterios de aceptación**
- [ ] Lista de alertas con: perfume, tienda (o "cualquier tienda"), umbral, canal y última vez activada.
- [ ] Se puede activar/pausar una alerta sin eliminarla.
- [ ] Se puede editar el umbral y el canal.
- [ ] Se puede eliminar una alerta con confirmación.

**Sección técnica**
- **Componente**: `AlertsModule`.
- **Endpoints**: `GET /alerts`, `PUT /alerts/:id`, `DELETE /alerts/:id`, `PATCH /alerts/:id/toggle`.
- **Tabla**: `alerts` — campo `is_active` para pausar sin eliminar.

---

## E4 — Gestión de tiendas (Admin)

---

### HU-15: Agregar tienda con método scraping

**Como** administrador,
**quiero** agregar una nueva tienda con configuración de scraping desde el panel web,
**para** incorporar nuevas fuentes de precios sin modificar el código.

**Criterios de aceptación**
- [ ] Formulario: nombre, URL base, logo, frecuencia de scraping (en minutos), país.
- [ ] Permite definir selectores CSS o XPath para cada campo: nombre del producto, precio normal, precio con descuento, método de pago, URL del producto, imagen.
- [ ] Incluye botón "Probar selectores" con URL de ejemplo antes de guardar.
- [ ] El preview del test muestra los datos extraídos o el error específico.
- [ ] La tienda queda activa al guardar y el worker la incorpora en el siguiente ciclo.

**Sección técnica**
- **Componente**: `AdminModule` → `StoreFormComponent`.
- **Endpoints**: `POST /stores`, `POST /stores/test-scrape`.
- **Tablas**: `stores`, `store_selectors`.
- **Test-scrape**: Ejecuta una instancia puntual de `ScraperConnector` sin persistir resultados. Timeout de 30s. Retorna `{field, value, error?}` por cada selector.
- **Selector types**: Soportar `css` y `xpath`. Validar que el selector es sintácticamente correcto antes de ejecutar.

---

### HU-16: Agregar tienda con método API

**Como** administrador,
**quiero** agregar una tienda que se integra vía API (como MercadoLibre),
**para** obtener precios de forma más estable y estructurada.

**Criterios de aceptación**
- [ ] Formulario: nombre, logo, frecuencia, país, URL base del endpoint.
- [ ] Editor JSON para `api_config`: endpoint path, query params, headers.
- [ ] Botón "Probar conexión" que ejecuta una llamada real y muestra la respuesta.
- [ ] Permite mapear campos de la respuesta JSON a los campos internos (nombre, precio, etc.).

**Sección técnica**
- **Componente**: `AdminModule` → `StoreFormComponent` (tab API).
- **Endpoints**: `POST /stores`, `POST /stores/test-api`.
- **Tablas**: `stores` (method = 'api', api_config = jsonb).
- **api_config schema**: `{ baseUrl, path, queryParams: {}, headers: {}, fieldMapping: { name, price, discountPrice, paymentMethod, productUrl } }`.

---

### HU-17: Editar configuración y selectores de una tienda

**Como** administrador,
**quiero** editar la configuración de una tienda existente,
**para** actualizar selectores cuando el sitio cambia su estructura HTML sin necesidad de redesplegar.

**Criterios de aceptación**
- [ ] Formulario prellenado con los datos actuales.
- [ ] Se puede editar cada selector individualmente.
- [ ] Botón "Probar selector" disponible por campo (no solo para el set completo).
- [ ] Los cambios son efectivos en la próxima ejecución del worker.
- [ ] Se registra en log quién hizo el cambio y cuándo.

**Sección técnica**
- **Endpoint**: `PUT /stores/:id`, `PUT /stores/:id/selectors`.
- **Tablas**: `stores`, `store_selectors`.
- **Auditoría**: Agregar `updated_by (uuid FK users)` y `updated_at` a `store_selectors`.

---

### HU-18: Deshabilitar y habilitar una tienda

**Como** administrador,
**quiero** deshabilitar temporalmente una tienda,
**para** pausar su scraping sin eliminar su configuración ni su historial de precios.

**Criterios de aceptación**
- [ ] Toggle de activo/inactivo en la lista de tiendas del panel Admin.
- [ ] Una tienda deshabilitada no aparece en los filtros del sitio público.
- [ ] El historial de precios se conserva y sigue siendo consultable.
- [ ] Al volver a habilitarla, el worker la retoma en el siguiente ciclo.

**Sección técnica**
- **Endpoint**: `PATCH /stores/:id/toggle`.
- **Tabla**: `stores.is_active`.
- **Worker**: Al cargar la config de tiendas, filtra `WHERE is_active = true`.
- **Frontend público**: `GET /products` y `/prices` filtran por tiendas activas.

---

## E5 — Monitoreo del worker (Admin)

---

### HU-19: Ver dashboard de salud del worker

**Como** administrador,
**quiero** ver en un dashboard el estado de cada tienda configurada,
**para** detectar rápidamente cuál está fallando y actuar antes de que los datos queden desactualizados.

**Criterios de aceptación**
- [ ] Lista de tiendas con semáforo de estado: verde (OK), amarillo (warning: >2h sin datos), rojo (error reciente).
- [ ] Por tienda: última ejecución exitosa, último error (mensaje y fecha), cantidad de productos obtenidos en la última ejecución.
- [ ] Gráfico de éxito/error de las últimas 24 ejecuciones por tienda.
- [ ] Acceso directo a "Editar selectores" desde cada fila con error.

**Sección técnica**
- **Componente**: `AdminModule` → `HealthDashboardComponent`.
- **Endpoint**: `GET /health/worker` → últimos N logs agrupados por tienda.
- **Query**: `SELECT store_id, status, products_found, error_message, started_at FROM worker_logs WHERE created_at > now() - interval '48h' ORDER BY created_at DESC`.
- **Lógica de semáforo**: Verde si último log en <1h y status success. Amarillo si último log exitoso entre 1h y 3h. Rojo si último log fue error o no hay log en >3h.

---

### HU-20: Forzar ejecución manual del scraper

**Como** administrador,
**quiero** poder forzar la ejecución inmediata del scraper para una tienda específica,
**para** verificar que los selectores actualizados funcionan correctamente sin esperar el próximo ciclo automático.

**Criterios de aceptación**
- [ ] Botón "Ejecutar ahora" disponible por tienda en el dashboard de salud.
- [ ] Se muestra un indicador de progreso mientras se ejecuta.
- [ ] Al terminar, muestra el resultado: productos obtenidos o error detallado.
- [ ] La ejecución manual queda registrada en `worker_logs`.

**Sección técnica**
- **Endpoint**: `POST /health/worker/:storeId/run`.
- **Implementación**: La API emite un evento al Worker (usando un mecanismo de cola simple — puede ser tabla `job_queue` en Supabase con polling, o un endpoint interno del Worker).
- **Respuesta**: Suscripción a resultado via polling `GET /health/worker/:storeId/last-log` cada 3s hasta que el log tenga `finished_at`.

---

### HU-21: Recibir notificación automática de fallo del scraper

**Como** administrador,
**quiero** recibir una notificación por mail o Telegram cuando un scraper falla,
**para** actuar rápidamente sin necesidad de revisar el panel manualmente.

**Criterios de aceptación**
- [ ] Notificación enviada cuando: 0 productos obtenidos, error HTTP, o excepción del scraper.
- [ ] El mensaje incluye: nombre de la tienda, tipo de error, hora y link directo al panel de edición de selectores.
- [ ] No se envían más de 3 notificaciones seguidas por la misma tienda sin intervención (para evitar spam).
- [ ] El canal de notificación del Admin se configura en su perfil de usuario.

**Sección técnica**
- **Módulo**: `AnomalyDetector` → `NotificationService`.
- **Anti-spam**: Verificar en `worker_logs` que no haya más de 3 errores consecutivos notificados. Agregar campo `notified (boolean)` a `worker_logs`.
- **Template email**: HTML con logo, tienda afectada, error, CTA "Ver en panel".
- **Telegram**: Mensaje con MarkdownV2 y link inline al panel Admin.

---

## E6 — Gestión de usuarios (Admin)

---

### HU-22: Ver lista de usuarios registrados

**Como** administrador,
**quiero** ver la lista de usuarios registrados en el sistema,
**para** tener visibilidad del uso de la plataforma.

**Criterios de aceptación**
- [ ] Tabla con: nombre, email, rol, canal de notificación, fecha de registro y cantidad de alertas activas.
- [ ] Permite buscar por nombre o email.
- [ ] Paginación de resultados.

**Sección técnica**
- **Componente**: `AdminModule` → `UsersListComponent`.
- **Endpoint**: `GET /admin/users?q=:term&page=:n&limit=20`.
- **Seguridad**: Requiere `role = admin` verificado en `AuthMiddleware`.
- **Query**: JOIN `users` + COUNT de `alerts` activas.

---

### HU-23: Cambiar rol de un usuario

**Como** administrador,
**quiero** poder promover un usuario a administrador o revertirlo a visitante,
**para** otorgar o revocar acceso al panel de administración.

**Criterios de aceptación**
- [ ] Select de rol (visitor / admin) editable por fila en la lista de usuarios.
- [ ] El cambio requiere confirmación ("¿Seguro que deseas dar acceso de administrador a [nombre]?").
- [ ] El cambio es efectivo de inmediato — el nuevo admin puede ingresar al panel sin necesidad de cerrar sesión.
- [ ] Un administrador no puede quitarse el rol a sí mismo.

**Sección técnica**
- **Endpoint**: `PATCH /admin/users/:id/role {role: admin | visitor}`.
- **Tabla**: `users.role`.
- **JWT**: El rol está en el JWT. Al cambiar el rol, el JWT vigente del usuario seguirá con el rol anterior hasta que expire o refresque. El guard de Angular también consulta `/users/me` para verificar el rol en cada carga, mitigando el desfase.
- **RLS (Row Level Security)**: Configurar políticas en Supabase para que solo usuarios con `role = admin` puedan leer la tabla `users` completa.

---

## Resumen de historias

| ID | Historia | Épica | Rol |
|---|---|---|---|
| HU-01 | Registro con email | E1 | Visitante |
| HU-02 | Login con email | E1 | Visitante |
| HU-03 | Login con Google OAuth | E1 | Visitante |
| HU-04 | Editar perfil y canal de notificación | E1 | Visitante |
| HU-05 | Vincular cuenta de Telegram | E1 | Visitante |
| HU-06 | Ver perfumes con mayor descuento (home) | E2 | Visitante / Anónimo |
| HU-07 | Buscar perfumes por nombre o marca | E2 | Visitante / Anónimo |
| HU-08 | Filtrar perfumes por múltiples criterios | E2 | Visitante / Anónimo |
| HU-09 | Ver detalle de perfume y precios por tienda | E2 | Visitante / Anónimo |
| HU-10 | Ver gráfico de tendencia de precios | E2 | Visitante / Anónimo |
| HU-11 | Marcar y desmarcar favoritos | E3 | Visitante |
| HU-12 | Ver lista de favoritos | E3 | Visitante |
| HU-13 | Crear alerta de bajada de precio | E3 | Visitante |
| HU-14 | Gestionar alertas activas | E3 | Visitante |
| HU-15 | Agregar tienda con scraping | E4 | Admin |
| HU-16 | Agregar tienda con API | E4 | Admin |
| HU-17 | Editar configuración y selectores | E4 | Admin |
| HU-18 | Deshabilitar / habilitar tienda | E4 | Admin |
| HU-19 | Ver dashboard de salud del worker | E5 | Admin |
| HU-20 | Forzar ejecución manual del scraper | E5 | Admin |
| HU-21 | Recibir notificación de fallo de scraper | E5 | Admin |
| HU-22 | Ver lista de usuarios | E6 | Admin |
| HU-23 | Cambiar rol de usuario | E6 | Admin |
