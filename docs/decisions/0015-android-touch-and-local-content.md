# ADR 0015 — Android, controles táctiles y contenido local

- Estado: autorizado para UPD-046.
- Fecha: 2026-11-27.

## Decisión

Una actividad Android aloja la interfaz común mediante el WebView del sistema.
Gradle empaqueta el build estático para el acceso sin conexión y el lanzador
abre el origen HTTPS seleccionado para cursos. Se usa la biblioteca AndroidX
WebKit para servir recursos empaquetados bajo un origen HTTPS reservado. Se fija
la versión del plugin de compilación y de AndroidX WebKit. Las dos son de código
abierto. El plugin se usa solo al construir y WebKit reutiliza el motor Android
ya instalado. Frente al código manual para interceptar recursos y asignar sus
tipos, WebViewAssetLoader ofrece una implementación mantenida por Android.
[Cargar contenido local en Android](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content)

La actividad conserva una sola vista, su almacenamiento por origen y la regla
de navegación del servidor. Carece de puente para comandos nativos. Se usa un
APK firmado por el sistema Android. Tauri sigue en Windows, donde se añade un
acceso al mismo build estático empaquetado. La interfaz táctil es común al
servidor y al contenido local. Gestos y teclado comparten reglas de progresión.

El acceso sin red tiene dos entradas. El contenido local empaquetado abre desde
el lanzador. Las copias de cursos se abren desde el origen donde se guardaron,
usando los recursos públicos verificados del service worker y el índice de la
última cuenta activa en ese servidor. Cada autenticación vigente filtra por
cursos autorizados. Cerrar sesión revoca el acceso local al índice activo.
Estudiante conserva la sincronización de finalizaciones. Las copias de Docente
y Administrador permiten estudiar con progreso local y sin capacidades de
publicación o gestión. Solo la cuenta administradora autenticada puede pedir
la edición publicada de un curso desde su pantalla administrativa.

## Alternativas

El navegador ya comparte el núcleo y su PWA. El APK añade una entrada local
disponible desde la instalación y una orientación definida para el teléfono.
Tauri móvil permitiría compartir el compilador nativo, pero el lanzador actual
depende de ventanas y menús de escritorio. La actividad Android ofrece el mismo
núcleo con una integración pequeña y un canal de firma propio.

## Verificación

Compilar APK, probar instalación en un teléfono horizontal, validar multitoque
y abrir ambos tipos de contenido con la red desconectada. Las publicaciones de
prueba usan identificadores separados para Windows y Android. Sus claves y
paquetes no pertenecen al actualizador de la versión oficial.
