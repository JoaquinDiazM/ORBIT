# ADR 0013: servidor docente y cliente instalable con estudio sin conexión

- Estado: aceptado e implementado en 1.0.0 alfa (UPD-027).
- Fecha: 2026-10-31
- Enmienda: ADR 0001, 0003, 0007 y 0008 para el modo online de 1.0.0.

## Contexto

JoaquinDiazM autorizó UPD-027 como único punto de 1.0.0 hasta `en-revision`. Confirmó un
servidor del equipo docente en Windows/Linux, cuentas por alias y contraseña, estudio sin
conexión con sincronización, y una aplicación Windows instalable desde el navegador. El ensayo
de dos máquinas precede al piloto de diez estudiantes, dos docentes y dos cursos plantilla.
El curso completo de Electromagnetismo sigue fuera de esta entrega.

El prototipo estático y sus perfiles no proporcionan autorización entre personas. Tampoco se
puede extender al servidor el reinicio total de perfiles del helper local: el usuario exige
conservar avances y decidir explícitamente las incompatibilidades.

## Decisión

### Dos modos explícitos

Conservar la distribución estática, el Editor offline y el helper local de origen fijo. Añadir
un servidor opcional de cursos con APIs propias y páginas marcadas como online. Un fallo de
conexión nunca concede acceso docente ni transforma una página online en una sesión local.
No se reutilizan tokens, locks o endpoints del helper de desarrollo como autenticación remota.

Cada instancia de curso tiene identidad independiente de su plantilla editorial. Dos cursos
pueden partir del mismo documento conservando IDs académicos; sus cuentas, avances y ediciones
son independientes. Solo se materializan documentos que superen los contratos y la validación
de progresión existentes. Un digest verifica integridad, no autoría ni firma personal.

### Servidor pequeño y portable

Usar Node.js 24 y sus módulos nativos, sin dependencia npm adicional. Persistir un estado
versionado en un directorio privado separado del build, con un único escritor, reemplazo
atómico y recuperación comprobable. Validar el estado y las ediciones al abrirlo. Las copias
incluyen metadatos de formato e integridad; restaurar exige detener el servicio, verificar el
archivo y conservar una copia de seguridad del estado reemplazado. Una restauración cambia la
época de identidad para que un cliente antiguo no resucite progreso o credenciales.

Este diseño cubre un servidor y el piloto pequeño. No ofrece múltiples escritores, alta
disponibilidad ni almacenamiento de red compartido. El directorio de datos no se aloja en
OneDrive u otro sincronizador mientras el servicio esté en uso. Revisar esta decisión antes
de superar estos límites; no añadir una base de datos por anticipación.

### Identidad y permisos

El administrador crea cursos y docentes y asigna los cursos. Un docente administra únicamente
los cursos asignados. Cada cuenta de estudiante pertenece a un solo curso; para otro curso se
crea otra cuenta. El alias es único en el servidor. No hay registro abierto, correo, analítica
ni respuestas/intentos en el monitor. Las cuentas administrativas no son perfiles de juego.

Las contraseñas se procesan con scrypt, sal aleatoria individual y parámetros explícitos; no
se pueden recuperar, solo restablecer. Hay límites de peticiones y de recursos criptográficos.
Las sesiones son aleatorias, caducan y usan cookies HttpOnly/SameSite; las mutaciones verifican
origen, formato JSON y protección CSRF. No almacenar contraseñas ni tokens de sesión en el
almacenamiento del navegador o los logs. Servir por HTTPS para Internet o VPN; HTTP se admite
solo en loopback para desarrollo o un túnel autenticado. Una VPN no reemplaza HTTPS.

La [guía de OWASP sobre contraseñas](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
documenta scrypt como alternativa cuando no se dispone de Argon2id; se elige el módulo nativo
con un costo equivalente a N=2^15, r=8, p=3 y sal aleatoria de al menos 16 bytes, siguiendo la
[API crypto de Node](https://nodejs.org/docs/latest-v24.x/api/crypto.html).

### Progreso y funcionamiento sin conexión

El servidor almacena únicamente finalizaciones por cuenta/curso/revisión; Owl muestra avance
y finalización. El motor deriva conceptos, recompensas y apertura. No sincronizar posiciones,
respuestas, intentos, preferencias personales ni concesiones de Debug. Las escrituras son
idempotentes y no permiten que un curso o una cuenta sobrescriban otros.
UPD-036 guarda los IDs de las etapas superadas de las lecciones en el dispositivo, con la
cuenta, curso, revisión y generación del progreso local. La sincronización y Owl conservan
el contrato de finalizaciones de nodos.

Después de un acceso válido, el estudiante puede preparar este dispositivo para estudiar sin
conexión. La copia de curso, el progreso y su identidad se aíslan por servidor/cuenta/curso.
La interfaz explica que los datos quedan en ese dispositivo y exige un acceso offline explícito;
no simula validar una contraseña sin servidor. Al reconectar, vuelve a comprobar sesión,
generación de cuenta y revisión antes de sincronizar. Una respuesta tardía nunca sobrescribe
finalizaciones posteriores ni cambia la identidad activa.

Eliminar un estudiante borra cuenta y progreso juntos, invalida sus sesiones y retira las
copias internas que permitirían recuperarlo inadvertidamente. Un dispositivo desconectado no
puede recibir una revocación inmediata; al reconectar no puede recrear la cuenta eliminada.
Las copias exportadas están bajo custodia del administrador y contienen datos privados; su
conservación y eliminación deben incluirse en la operación del equipo docente.

### Edición y publicación

Los borradores se guardan en el dispositivo por servidor/cuenta/curso. Importar/exportar permite
trasladarlos sin introducir colaboración simultánea. La interfaz distingue guardar borrador
de publicar. La autoría académica mantiene Spider, compilación y preview reales.

Publicar exige mantenimiento explícito, que cierra el acceso y sincronización estudiantiles.
Una copia offline ya descargada puede seguir funcionando y se reconcilia al reconectar.
El servidor valida el documento, comprueba revisión base y calcula un plan ligado a su digest.
Una publicación compatible conserva finalizaciones. Si cambia un contrato académico, elimina
IDs o invalida prerrequisitos, el plan identifica finalizaciones afectadas y exige confirmar su
reinicio parcial. El historial conserva esa decisión para reconciliar clientes antiguos;
revisiones desconocidas se rechazan sin borrar silenciosamente su copia local.

La publicación online no ejecuta Git, no cambia archivos fuente del repositorio ni usa el
coordinador local que reinicia los tres perfiles. La actualización del producto y la de un
curso son operaciones distintas, ambas con copia previa y compatibilidad comprobada.

UPD-036 añade la frase del mapamundi al documento editorial como texto opcional. Docentes
asignados la editan desde Spider. Una cuenta administradora usa un control limitado en la
vista administrativa de ORBIT Editor. Su operación comprueba la cuenta y la revisión en la
transacción, publica durante mantenimiento y solo acepta la frase de un nodo activo. La
publicación exige que las finalizaciones se conserven.

### Aplicación instalable y distribución

Usar PWA para la aplicación Windows, con manifiesto, iconos y caché explícita de recursos.
No introducir Electron, instalador .exe ni motor adicional. La instalación la proporciona
Edge/Chrome y requiere un origen seguro; véanse
[MDN sobre instalación](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)
y la [documentación de Edge](https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps-chromium/how-to/).
La caché no intercepta ni almacena respuestas de cuentas, sesiones o APIs. La edición offline
se valida y almacena aparte; una actualización de recursos no reinicia avances.

El build y un paquete portable deben ofrecer instrucciones verificables para iniciar,
respaldar, restaurar y actualizar en Windows/Linux. No se contrata ni publica infraestructura
durante esta implementación. La instalación del navegador y el ensayo humano quedan como
revisión aplicable, separados de las pruebas automáticas.

## Alternativas consideradas

- Solo sitio estático: conservarlo como modo offline, pero no satisface cuentas y cursos.
- Backend externo o servicio global: añade proveedores y operación que el usuario descartó.
- Framework de servidor, SQLite externo o Electron: mayores dependencias y empaquetado; no son
  necesarios para un único escritor y el tamaño del piloto. Revisar si cambia la escala.
- Cuentas compartidas entre cursos y borradores colaborativos: complican permisos y baja;
  el usuario eligió cuentas por curso y publicación durante mantenimiento.
- Reset total al publicar: contradice la conservación de avance solicitada.

## Consecuencias y regla de revisión

Esta decisión amplía expresamente el límite estático para el modo online autorizado. Conserva
movimiento, Red única, apertura derivada, IDs, fuentes académicas y separación de autoría.
Introduce operación y custodia de datos a cargo del equipo docente, con límites explícitos.
Antes de revisar el cambio deben probarse permisos negativos, aislamiento, reconexión,
incompatibilidades, eliminación, recuperación y ejecución en ambas plataformas. Reconsiderar
este ADR ante varias instancias escritoras, datos adicionales, cuentas multicurso, publicación
sin mantenimiento, colaboración remota o una nueva dependencia.
