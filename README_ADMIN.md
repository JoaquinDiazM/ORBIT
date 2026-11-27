# Administrar un servidor ORBIT

## Requisitos

- Una máquina Windows o Linux con Node.js 24 y almacenamiento persistente.
- Una cuenta de servicio sin privilegios administrativos y un directorio de datos privado.
- Para servir a otros equipos, una dirección DNS estable y un certificado TLS que esos
  equipos reconozcan. Confirma con tu equipo de red qué equipos pueden acceder.

El paquete portable incluye la aplicación web y el servidor. La administración se realiza
desde el navegador. [Descargar Node.js 24](https://nodejs.org/en/download/archive/v24).

## Descargar y verificar el paquete

Desde [GitHub Releases](https://github.com/JoaquinDiazM/ORBIT/releases/latest), descarga `orbit-servidor.tar.gz` y `orbit-servidor.tar.gz.sha256` en la misma carpeta.

En Linux, comprueba la huella y extrae el paquete.

```bash
sha256sum -c orbit-servidor.tar.gz.sha256 && tar -xzf orbit-servidor.tar.gz
```

En PowerShell, comprueba la misma huella antes de extraer.

```powershell
$esperado = ((Get-Content -Raw -LiteralPath orbit-servidor.tar.gz.sha256).Trim() -split '\s+')[0]
$real = (Get-FileHash -LiteralPath orbit-servidor.tar.gz -Algorithm SHA256).Hash
if ($real -ne $esperado) { throw 'La huella del paquete no coincide.' }
tar -xzf orbit-servidor.tar.gz
```

Entra en la carpeta extraída y ejecuta estos comandos. Sigue solo si Node muestra una versión
24.x y el verificador termina correctamente.

```text
node --version
node scripts/verify-package.mjs
```

## Inicializar una instancia

Elige una ruta absoluta para los datos, con permisos de lectura y escritura solo para la
cuenta de servicio y sus operadores autorizados. Usa almacenamiento local y mantenlo fuera del
paquete, de las carpetas públicas y de las carpetas sincronizadas. Sustituye
`RUTA_PRIVADA` por esa ruta en todos los comandos.

```text
node scripts/orbit-server.mjs init --data "RUTA_PRIVADA" --admin administrador
```

Ejecuta este paso una sola vez. Introduce y confirma una contraseña única de al menos 12
caracteres cuando la terminal la solicite. Guárdala en un gestor de contraseñas.

## Iniciar y publicar el servidor

Para comprobar el arranque en la misma máquina, usa el navegador con la dirección que imprime
este comando.

```text
node scripts/orbit-server.mjs serve --data "RUTA_PRIVADA" --host 127.0.0.1 --port 8080 --origin http://127.0.0.1:8080
```

Para dar acceso a otros equipos, detén la sesión local con **Ctrl+C** e inicia el servicio
con HTTPS. Sustituye el dominio, el puerto y las rutas PEM. `--origin` debe coincidir
exactamente con el dominio y el puerto de la dirección que vas a compartir.

```text
node scripts/orbit-server.mjs serve --data "RUTA_PRIVADA" --host 0.0.0.0 --port 8443 --origin https://cursos.ejemplo.edu:8443 --tls-cert "CERTIFICADO_PEM" --tls-key "CLAVE_PEM"
```

- Limita el acceso al puerto HTTPS según la audiencia del curso. Protege la clave TLS con
  permisos de lectura restringidos y renueva el certificado antes de que caduque.
- Usa una sola instancia por directorio de datos. Para operación continua, supervisa el
  proceso con el gestor de servicios del sistema y revisa los errores de arranque.
- Tras detener el servicio, relánzalo con el mismo `--data`. Si aparece un bloqueo, consulta
  la recuperación en la [guía operativa](docs/SERVER_GUIDE.md#relanzar-con-los-datos-existentes).

Comprueba desde otro equipo autorizado que el enlace abre con un certificado válido antes
de distribuirlo.

## Crear un curso y dar acceso

1. Entra por el enlace del servidor con la cuenta administradora. Crea un docente y un curso,
   y asigna ese curso al docente.
2. Entra como docente en **ORBIT Editor** para preparar o importar el contenido. Activa
   **Mantenimiento** antes de publicar cambios y revisa su impacto en el avance.
3. En **Owl**, crea las cuentas de los estudiantes. Entrega por un canal privado la dirección
   HTTPS y las credenciales de ORBIT de cada participante.
4. Comprueba con una cuenta de estudiante que el curso abre y que su avance aparece en Owl.

## Copias y actualizaciones

### Actualización asistida

En Linux, usa una carpeta de instancia con `datos/`, `packages/` y un enlace
`current` al paquete activo dentro de `packages/`. Instala una copia verificada
de `scripts/update-server.mjs` en la raíz de la instancia. Si tu paquete todavía
carece del asistente, obtén el archivo desde una copia verificada del paquete
nuevo o desde el checkout revisado para tu ensayo.

Detén el servidor con **Ctrl+C** y, desde la raíz de la instancia, ejecuta:

```bash
node update-server.mjs
```

Elige `latest` o una etiqueta como `v1.2.3`. Para ensayar con un paquete candidato,
usa `node update-server.mjs --root DIRECTORIO_PRUEBA --archive CANDIDATO.tar.gz`.
El archivo `CANDIDATO.tar.gz.sha256` debe estar junto al candidato. El asistente
verifica el paquete, muestra el plan y pide confirmación antes de cambiar `current`.
Después verifica y arranca la instancia con tus comandos habituales.

- Los cursos, las cuentas y los avances permanecen en `datos/`. El docente puede
  consultar el avance desde Owl y decide las operaciones sobre él.
- Puedes conservar una copia privada en `backups/`. Si eliges una copia temporal,
  se usa para comprobar la compatibilidad durante la actualización.
- De forma predeterminada se aplica la compatibilidad habitual. La opción de
  versión exacta controla el acceso al servidor y la reconexión offline. Exige
  la versión web del servidor y compara también la versión de los lanzadores
  Windows que la declaran. Los lanzadores anteriores que carecen de ese identificador
  se comprueban como clientes web.
- Si la comprobación falla o cancelas el plan, sigue seleccionado el paquete
  anterior. Para recuperar un paquete tras una actualización compatible, detén
  el servicio, apunta `current` al anterior, verifícalo y vuelve a arrancar con
  la misma ruta de datos. Si un cambio posterior vuelve incompatibles esos datos,
  usa un respaldo compatible según la guía de restauración.

### Procedimiento manual

Detén el servidor antes de respaldar, restaurar o cambiar el programa.

```text
node scripts/orbit-server.mjs backup --data "RUTA_PRIVADA" --output "ARCHIVO_NUEVO"
node scripts/orbit-server.mjs restore --data "RUTA_DESTINO" --input "ARCHIVO_COPIA"
```

- Guarda copias cifradas con acceso restringido. Verifica periódicamente que puedas restaurar
  una copia en un directorio aparte. Las copias contienen cuentas y avances.
- Para actualizar, respalda los datos, extrae y verifica la nueva versión en otra carpeta y
  vuelve a ejecutar `serve` con la misma ruta `--data` y el mismo origen HTTPS.
- Una restauración invalida las sesiones activas. Revisa las bajas posteriores a la copia
  antes de volver a abrir el servicio.

Consulta la [guía operativa](docs/SERVER_GUIDE.md) para aislar bloqueos, recuperar un
estado anterior y preparar borradores offline.
