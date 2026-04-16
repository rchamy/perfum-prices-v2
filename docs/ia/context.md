Eres un experto project manager, experto en crear PRD (documento de requisito de productos) y en crear historias de usuario.
También eres experto en análisis de mercado, benchmarking y experto en startups.

Necesito crear un sistema que permita obtener precios de perfumes del retail y sitios web conocidos en Chile (escalable posteriormente en un upgrade a otros países).
Los perfumes podrían tener distintos precios en una misma tienda/sitio web, dependiendo si existen descuentos en tarjetas de crédito, bancos, etc. También podrían existir ofertas por cyber day´s u otras ofertas que el mercado/tienda proponga.

La idea es obtener estos precios mediante scrapping o API, almacenarlos históricamente en una base de datos para posteriormente poder consultarlos.
También, será posible notificar a una persona si el precio baja un porcentaje (por error de precio, por ejemplo o una buena ofera).

Adicionalmente, debe existir un sitio web que muestre los perfumes con mayor descuentos actualmente, poder buscar perfumes, marcarlos para notificaciones de algunos perfumes que le interesen al cliente, poder filtrar por marca, olores (notas de olores o lo que creas conveniente en cuanto a perfumes), filtrar por precio, sitio web/tienda, etc.

El sistema debe contemplar dos perfiles de usuario:
- **Administrador**: puede agregar, editar y deshabilitar tiendas de forma simple y configurable desde la interfaz web, sin necesidad de modificar código. Gestiona la configuración del scraper por tienda (URL, selectores, frecuencia, método de obtención).
- **Usuario visitante**: puede buscar perfumes, ver precios históricos, filtrar, marcar favoritos y configurar notificaciones personales.

La autenticación debe soportar:
- Registro e inicio de sesión con email y contraseña.
- Inicio de sesión con Google (OAuth 2.0), gestionado mediante Supabase Auth.

Considera lo siguiente:
Si se realiza scrapping, debemos ser indetectables.
Si se utiliza API debe estar abierta y ser gratuita.
Utilizar base de datos gratuita.
Para obtener precios constantemente creo que sería una alternativa un worker o algo que trabaje constantemente fuera del sitio web.
Nada de lo que se realice debe llevar costos asociados.
Debe notificar por mail o por telegram al usuario que lo requiera (configurable)
Debe mostrar gráficos de tendencia 

Considera utilizar javascript como lenguaje, nodejs, typescrip, angular, tecnologias gratuitas.

Las tiendas objetivo iniciales para Chile son:
- Paris, Falabella, Ripley, Lider, Fasa (retail general con precios diferenciados por tarjeta/banco)
- MercadoLibre Chile (integración vía API pública gratuita, no scraping)
- SAIRAM Perfumes, Multimarcasperfumes, Alisha Perfumes, Silk Perfumes (tiendas especializadas en perfumes)

El sistema debe permitir agregar nuevas tiendas de forma sencilla y configurable por el Administrador desde la interfaz web, sin tocar código.

**Resiliencia ante cambios de estructura HTML (scraping):**
Dado que los sitios web pueden cambiar su estructura HTML en cualquier momento, el sistema debe contemplar:
- Los selectores CSS/XPath de cada tienda se almacenan en la base de datos y son editables por el Administrador desde el panel web, sin necesidad de redesplegar la aplicación.
- El worker debe detectar automáticamente cuando un scraper falla o retorna resultados vacíos/anómalos (0 precios, errores HTTP, cambios drásticos en valores) y notificar al Administrador por mail o Telegram.
- El panel Admin debe mostrar un dashboard de salud de cada tienda: última ejecución exitosa, errores recientes, cantidad de productos obtenidos.
- Los sitios con API disponible (como MercadoLibre) son preferibles al scraping justamente por su mayor estabilidad ante cambios.

Plantea una solución que se pueda publicar en un servidor gratuito o mediante github.

El repositorio se encuentra en: https://github.com/rchamy/perfum-prices-v2
El GitHub Project ya está creado en ese repositorio.

**Regla de mantenimiento de documentación:**
Ante cualquier instrucción que modifique, agregue o elimine un requerimiento, funcionalidad, actor, tienda, tecnología o estructura del sistema, se deben actualizar de forma inmediata y consistente todos los archivos de documentación afectados: `context.md`, `plan.md`, `UseCases.md`, `C4.md`, `er-diagram.md`, `sequential-diagram.md` y cualquier otro `.md` del proyecto. Ningún cambio queda reflejado solo en un archivo.

Antes del desarrollo de la aplicación, quiero que explicitamente realices lo siguiente:
- Generes casos de uso con mermaid en un archivo UseCases.md.
- Generes un diagrama C4, puedes realizarlo hasta el nivel 3 y lueg, cuando exista elcódigo, realizar el último nivel.
- Diseño de la base de datos en mermaid en un archivo llamado er-diagram.md
- Diagrama de secuencia en un archivo llamado sequential-diagram.md
- Crear las historias de usuario (una vez aprobadas por mí) directo en github project. Si necesitas links o algo para esto, hazmelo saber.

