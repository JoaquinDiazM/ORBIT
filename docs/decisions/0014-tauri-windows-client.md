# ADR 0014 — Cliente de Windows con Tauri 2

- Estado: aceptado por JoaquinDiazM para UPD-033.
- Fecha: 2026-11-22.
- Amplía el [ADR 0013](0013-self-hosted-courses-and-offline-client.md).

## Contexto

Docentes y estudiantes necesitan abrir ORBIT desde Windows con un instalador y recibir
nuevas versiones en la aplicación. El servidor docente conserva su administración y el
curso sigue usando el núcleo web compartido.

## Decisión

- Adoptar Tauri 2 con un instalador NSIS por usuario para Windows x64. WebView2 usa el
  runtime del sistema. El instalador puede descargarlo de Microsoft cuando falta.
  [Instalador de Windows](https://v2.tauri.app/distribute/windows-installer/).
- Empaquetar una pantalla local pequeña para elegir servidor y actualizar. La ventana del
  curso navega dentro del origen HTTPS elegido. Las credenciales del curso se introducen
  en ORBIT y los permisos siguen comprobándose en el servidor. El cliente recuerda la
  dirección y la selección de curso. Los enlaces a otros orígenes se pueden abrir desde
  el navegador habitual copiando su dirección.
- Restringir los comandos nativos al identificador de la ventana local. El contenido
  remoto queda fuera de las capacidades y sus ventanas emergentes se bloquean.
  El cliente no necesita credenciales SSH, permisos de administración de Windows ni
  acceso a la VPN. **VPN institucional · Próximamente** es una opción informativa.
  [Capacidades de Tauri](https://v2.tauri.app/security/capabilities/).
- Usar el mismo instalador para descarga inicial y actualizaciones. El cliente consulta
  el manifiesto HTTPS de GitHub Releases y Tauri verifica la firma del binario con la
  clave pública incluida en la app. La firma debe corresponder a la versión anunciada
  en el manifiesto. La clave privada pertenece al mantenedor y los
  builds locales sin clave pública solo ofrecen conexión. La actualización mantiene la
  identidad de la aplicación y los datos del WebView.
  [Actualizador de Tauri](https://v2.tauri.app/plugin/updater/).
- Autorizar @tauri-apps/cli `2.12.6` como dependencia de desarrollo. En Rust se
  incorporan Tauri, su actualizador y la serialización Serde. Tauri y la CLI se distribuyen con
  licencia MIT o Apache-2.0. El lockfile fija el árbol de dependencias. El coste se
  concentra en la compilación nativa y el instalador. El runtime web del curso no
  descarga estas dependencias. La portabilidad del núcleo web se conserva.
  [Repositorio de Tauri](https://github.com/tauri-apps/tauri).

## Alternativas consideradas

- Mantener solo la PWA. Evita nuevas dependencias, pero la instalación depende del
  navegador y no ofrece el instalador de GitHub solicitado.
- Crear un lanzador con WebView2 y un actualizador propio. Aumenta el trabajo de
  mantenimiento para Windows y obliga a diseñar y probar la verificación de firmas.
- Usar Electron. Incluye su propio Chromium en la distribución y aumenta el tamaño
  del instalador. En el alcance inicial basta el WebView del sistema.

## Consecuencias y revisión

UPD-045 añade una espera previa en el instalador NSIS que recibe la versión
anterior. Durante `/UPDATE` consulta el Restart Manager por la ruta exacta del
ejecutable instalado y cede tiempo para que el proceso termine. Cada consulta
usa una sesión cerrada antes de la siguiente. Si el archivo sigue ocupado tras
la espera, el instalador se detiene antes de copiar el reemplazo e indica cómo
cerrar ORBIT y reintentar. El instalador conserva la reapertura de la aplicación
tras una actualización exitosa. El flujo original de descarga inicial sigue
usando la comprobación de Tauri.

Los mantenedores necesitan Rust, las herramientas MSVC y una clave de actualización
custodiada para generar releases. La firma del actualizador verifica la continuidad de
ORBIT. Un certificado Authenticode es una integración separada con Windows.

La primera prueba de distribución debe cubrir instalación limpia, ambas cuentas,
actualización desde una versión anterior firmada con la misma clave y rechazo de un
paquete con firma inválida. Revisar este ADR antes de dar capacidades nativas a un
origen remoto, cambiar de firmante o habilitar otro sistema operativo.
