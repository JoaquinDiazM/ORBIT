# ORBIT: instalación y operación del servidor docente

**ORBIT 1.0.1 alfa.** Esta guía acompaña al paquete portable. Para los ensayos de la alfa,
usa cuentas y datos de prueba. La evidencia se mantiene en el repositorio.

## Qué necesita cada persona

- Estudiante: enlace del docente, alias y contraseña; Edge o Chrome si desea instalar la aplicación.
- Docente: navegador y acceso a su curso. Puede preparar borradores sin Internet en Editor offline.
- Administrador: máquina Windows/Linux con Node.js 24, almacenamiento privado y conectividad.
  No es necesario instalar npm, Python o dependencias adicionales al usar el paquete portable.

Obtén Node.js 24 desde la [descarga oficial](https://nodejs.org/en/download). La instalación
del servidor es distinta de instalar la aplicación en el navegador de un estudiante.

ORBIT no aloja un servicio global. Para Internet, la institución debe proporcionar un nombre,
certificado HTTPS y acceso de red a su servidor. Si exige VPN, cada participante se conecta a
ella antes de abrir el enlace. La VPN no sustituye HTTPS. No expongas los helpers de desarrollo.

## Obtener y comprobar un paquete

Desde el repositorio, el desarrollador prepara el paquete con `npm ci` y `npm run package`.
La carpeta `artifacts` contiene el directorio portable, su `.tar.gz` y el SHA-256 del archivo.
El sufijo `preview` identifica un paquete generado directamente desde el checkout.
El paquete incluye KaTeX y sus licencias; no contiene cuentas, datos del servidor ni contraseñas.

Tras la publicación de una release aprobada, su workflow comprueba que la etiqueta `vX.Y.Z`
coincida con la versión del paquete y adjunta `orbit-servidor.tar.gz` y su checksum a
[Descargas de ORBIT](https://github.com/JoaquinDiazM/ORBIT/releases). El docente descarga y
extrae ese archivo; no necesita clonar el repositorio ni ejecutar un build.

Extrae el archivo y abre una terminal dentro de su carpeta. En Windows y Linux:

```text
node --version
node scripts/verify-package.mjs
```

La comprobación detecta archivos cambiados o incompletos e imprime la versión del paquete
instalado. La etiqueta de ORBIT muestra la versión del build que sirve ese paquete. Comprueba
la procedencia y la huella que publicó quien distribuye el archivo.

## Preparar un borrador offline

```text
node scripts/orbit-offline.mjs
```

Abre `http://127.0.0.1:4173/editor.html`. Usa Spider, Bee y Bowerbird, o importa un documento
editorial existente. El borrador se guarda en este navegador; expórtalo para trasladarlo al curso
online. El Editor offline no crea cuentas ni publica en el servidor. La interfaz no equivale
a un curso completo: la plantilla distribuida contiene material demostrativo y provisional.

Detén este servicio con `Ctrl+C` al terminar. Si 4173 ya está ocupado, identifica tu servicio
abierto; el comando no cambia el puerto ni cierra procesos ajenos. Esta entrada no registra
caché PWA para no interferir con el origen de desarrollo y autoría.

## Iniciar el servidor

Los datos deben estar fuera del paquete, del directorio público y de carpetas sincronizadas
como OneDrive. Usa una carpeta privada de tu usuario y conserva esa ruta entre actualizaciones.
La cuenta inicial es administradora del servidor; crea docentes y asígnales cursos desde su
panel. No uses la cuenta administradora para estudiar o editar actividades.

Desde el paquete, inicializa una vez usando una ruta privada elegida por ti. Por ejemplo,
`C:\ORBIT-datos` si tu usuario tiene permisos allí, o `/home/tu-usuario/orbit-datos` en Linux:

```text
node scripts/orbit-server.mjs init --data RUTA_PRIVADA --admin administrador
```

El comando pide dos veces una contraseña oculta de al menos doce caracteres. En automatización
aislada se admite `--password-file ARCHIVO`; protege ese archivo y retíralo después. Nunca
escribas la contraseña como un argumento del comando.

Para una prueba en la misma máquina:

```text
node scripts/orbit-server.mjs serve --data RUTA_PRIVADA --host 127.0.0.1 --port 8080 --origin http://127.0.0.1:8080
```

La terminal imprime el enlace. Abre el panel con la cuenta administradora, crea un docente y
un curso, asígnalo y vuelve a entrar como docente para importar el borrador o preparar otro.
Este enlace loopback no sirve directamente para otros equipos.

Para Internet/VPN, usa el nombre y certificado entregados por el administrador de red:

```text
node scripts/orbit-server.mjs serve --data RUTA_PRIVADA --host 0.0.0.0 --port 8443 --origin https://cursos.ejemplo.edu:8443 --tls-cert CERTIFICADO_PEM --tls-key CLAVE_PEM
```

Sustituye todos los ejemplos por tus rutas y nombre reales. El certificado debe ser confiable
para los navegadores participantes. El acceso al puerto debe estar permitido por la red;
ORBIT no abre el firewall ni configura VPN/DNS. No envíes contraseñas por HTTP en una red.
Si usas un túnel SSH para un ensayo, HTTP puede permanecer limitado al loopback del túnel.

### Relanzar con los datos existentes

Detén el servidor con `Ctrl+C` y vuelve a ejecutar `serve` con el mismo `--data`. El curso,
las cuentas y los avances se conservan en ese directorio. Usa `init` al crear otra instancia
en un directorio nuevo. Después del relanzamiento vuelve a iniciar sesión. Si el ensayo usa
un túnel temporal, abre el enlace que indique el arranque actual.

Inicia una sola instancia por directorio de datos. Si una interrupción deja un lock,
identifica su proceso antes de recuperarlo. Conserva los archivos de estado.

`node scripts/orbit-server.mjs diagnose-lock --data RUTA_PRIVADA` informa el propietario del
lock. Solo si el proceso de esta misma máquina ya no existe, y sin otro arranque concurrente,
usa `node scripts/orbit-server.mjs recover-lock --data RUTA_PRIVADA --token TOKEN_EXACTO` con
el token del diagnóstico. No detiene procesos y rechaza un propietario vivo o ambiguo.

## Cuentas, Owl y mantenimiento

El docente crea un alias único y contraseña para cada estudiante de su curso. Una cuenta
estudiantil pertenece a un curso; una misma persona usa otra cuenta en otro curso. Entrega
las credenciales por un canal apropiado. Owl muestra avance y finalización, sin respuestas
ni intentos. Restablecer contraseña conserva el avance; eliminar elimina cuenta y avance.

Prepara el borrador en este dispositivo e importa/exporta para trasladarlo. Para publicar,
activa mantenimiento, valida la edición y revisa su impacto. Si hay cambios incompatibles,
debes decidir explícitamente si reiniciar las finalizaciones afectadas. Reabre después el curso.
La publicación de contenido no cambia la versión del programa ni realiza commits.

## Estudio sin conexión e instalación Windows

Entra primero con conexión desde el dispositivo que usarás. La aplicación prepara sus recursos
y el curso guarda una copia separada por cuenta. Comprueba ambos estados antes de desconectarte.
Desde Edge/Chrome puedes instalar ORBIT desde el menú del navegador o el botón disponible;
aparecerá en su propia ventana. No necesita un instalador .exe.

El acceso offline usa datos ya descargados; no verifica una contraseña contra un servidor
desconectado. Evítalo en un navegador compartido. Al volver, se comprueban identidad, revisión
y permisos antes de unir finalizaciones. Si la sesión caducó, vuelve a ingresar. Una cuenta
eliminada no puede recrearse al sincronizar. Un dispositivo que permanece desconectado no puede
recibir de inmediato una baja o el cierre por mantenimiento.

Una actualización de la aplicación se prepara aparte y entra al cerrar todas sus ventanas y
abrirla de nuevo. No vacía avances. Una descarga incompleta conserva la copia anterior. Los
mensajes sobre copia del curso y sesión indican si todavía queda progreso por sincronizar.

## Custodia y actualizaciones

Las copias del servidor contienen cuentas, hashes de contraseña y avances. Mantén sus permisos
restringidos. La eliminación retira copias internas para evitar recuperación accidental; las
copias exportadas están bajo custodia del administrador y deben incluirse en su política de baja.

Con el servidor detenido, exporta una copia a un archivo nuevo:

```text
node scripts/orbit-server.mjs backup --data RUTA_PRIVADA --output RUTA_COPIA_NUEVA
```

Para restaurar una copia verificada, también con el servidor detenido:

```text
node scripts/orbit-server.mjs restore --data RUTA_PRIVADA --input RUTA_COPIA
```

Restaurar sobre un destino válido reemplaza el estado por el de la copia y conserva el anterior
en `previous.json`. Si el estado está dañado o necesitas recuperar desde su propio `previous.json`,
usa un directorio de destino nuevo o vacío: la carpeta original queda intacta.
Puede recuperar cuentas eliminadas después de la fecha de esa copia: revisa la custodia y
las bajas antes de reabrir. No restaura sesiones activas ni acepta sincronización de la época
anterior sin un nuevo ingreso.

Para actualizar el programa: detén el proceso, crea una copia verificable, extrae el paquete
nuevo en otra carpeta, compruébalo y usa la misma ruta privada de datos. No sobrescribas el
paquete que está ejecutándose. Un esquema desconocido se rechaza: no borres archivos para
forzar la apertura. Para volver atrás, restaura una copia compatible con el programa anterior.
Una restauración invalida sesiones y generaciones antiguas; los clientes deben volver a entrar.

Este MVP admite un proceso escritor por directorio de datos, no varias réplicas simultáneas.
Mantén la terminal visible durante las pruebas. Para operación permanente, el responsable de
la máquina decide cómo supervisar el proceso sin privilegios administrativos de ORBIT.
