# ADR 0008: apariencia por alcance y aplicación local recuperable

- Estado: aceptado
- Fecha: 2026-08-30
- Enmienda: [ADR 0007](0007-static-local-editor.md)

## Contexto

ADR 0007 separó ORBIT, el borrador editorial y el progreso, y dejó la aplicación del JSON como
un paso manual. La cohorte 0.5.0 incorpora dos capacidades que obligan a revisar esa frontera:

1. **Bowerbird** permite que Docente configure la apariencia publicada de las zonas y que
   Estudiante mantenga preferencias visuales privadas sin modificar el curso.
2. **Aplicar edición** debe consumir Spider, Bee y Bowerbird, explicar el avance local que se
   perderá, validar, respaldar, reiniciar los tres perfiles y actualizar fuentes/build en un
   entorno de autoría local.

Una página web estática no puede escribir archivos del repositorio ni ejecutar el build. Fingir
esa capacidad en la interfaz, mezclar preferencias personales con el documento Docente o borrar
almacenamiento indiscriminadamente produciría contratos difíciles de migrar al futuro servidor.

## Decisión

### Documento Docente y preferencias Estudiante

El documento `orbit-editor-project` avanza a esquema `v2`. Conserva Spider y Bee e incorpora:

- `appearanceCatalogVersion` en la raíz;
- una terna `appearance` por zona con IDs versionados de paleta, motivo y contorno.

La clave primaria pasa a `orbit-editor:v2:electromagnetism-applied`. El valor `v1` es solo una
fuente de migración; se valida por completo antes de guardar `v2`. Un esquema o catálogo futuro
desconocido se rechaza y el valor original no se sobrescribe.

Estudiante no muta ese documento. Sus elecciones Bowerbird viven en
`orbit-bowerbird:v1:electromagnetism-applied:student`, contienen únicamente overrides por zona y
nunca se incluyen al exportar o aplicar el curso. Docente usa la apariencia del borrador común;
Debug no carga preferencias personales.

La resolución visual sigue esta precedencia:

```text
preferencia personal Estudiante → apariencia publicada → apariencia canónica
```

La progresión conserva autoridad: una zona bloqueada se representa con la apariencia neutral,
aunque exista un override preparado. Al desbloquearse se revela la apariencia resuelta. Motivos
animados respetan `prefers-reduced-motion` y no alteran geometría, requisitos ni recompensas.

### Edición desplegable

La configuración aplicada se representa mediante `orbit-course-edition` esquema `v1`, con
curso, revisión anterior y nueva, política de reset, fecha, digest y un documento Docente `v2`
completo. Su fuente tiene una ruta fija:

```text
public/data/courses/electromagnetism-applied.edition.json
```

El runtime valida y materializa esa edición sobre los datos académicos canónicos. Solo puede
cambiar las coordenadas de zonas, su apariencia, `areaId + offset` de lugares y requisitos
directos `completedLocations`; el contenido, conceptos, recompensas, anillos y IDs continúan en
los módulos canónicos.

### Validar, confirmar y aplicar

Resumen implementa fases explícitas:

1. validar el documento y la progresión, calcular el diff y contar lugares completados y
   conceptos adquiridos por Estudiante, Docente y Debug;
2. mostrar qué se elimina y qué se conserva;
3. exigir una confirmación accesible en línea ligada al digest validado;
4. aplicar con journal y respaldo, o restaurar el estado anterior.

Cualquier edición posterior invalida el plan. El reset elimina solo las claves de progreso
canónicas y legadas de los tres perfiles. Conserva el borrador Docente, las preferencias
Bowerbird Estudiante y datos no relacionados. No se usa `localStorage.clear()`.

El progreso avanza a esquema `v4` e identifica `courseId` y `courseRevision`. Un perfil de otra
revisión no puede resucitar avance sobre la edición nueva. La migración `v3 → v4` solo conserva
avance en la revisión inicial declarada compatible; una revisión aplicada exige un estado nuevo.
Las instancias de ORBIT mantienen un bloqueo compartido y la aplicación requiere el bloqueo
exclusivo. Si Web Locks no está disponible o queda otra pestaña activa, la operación segura se
rechaza antes del reset.

### Helper de autoría local

Tanto el servidor de desarrollo como el comando de autoría fijan `127.0.0.1:4173`, sin fallback
ni override de puerto. El comando separado de autoría sirve el sitio y habilita exclusivamente
la operación de mantenimiento. Usa ruta fuente fija, límite de cuerpo, token aleatorio de
sesión, mismo origen y sin CORS. Antes de recuperar reserva atómicamente un
único proceso helper por checkout. La escritura se hace mediante archivo temporal y reemplazo; después ejecuta las
comprobaciones y el build, y restaura fuente/build si falla.

Mientras existe un journal del repositorio, los servidores locales no sirven la entrada de
ORBIT Estudiante; Editor continúa disponible para resolverla. Un journal del navegador se
inspecciona y recupera bajo el mismo Web Lock antes de crear progreso. Esto impide que una pestaña
o un segundo proceso conviertan una edición pendiente en estado de curso utilizable.

El helper no acepta rutas del cliente, no crea commits, no prepara el índice, no hace push y no
se copia a `dist`. Solo inspecciona `git status` para exigir un checkout limpio; no muta Git. El
sitio construido continúa siendo estático; esta herramienta no es el backend ni la publicación
remota de UPD-002.

### Apagado controlado del servicio local

`npm run dev` y `npm run editor:author` comparten un protocolo de control distinto de la sesión
que aplica ediciones. Un GET same-origin entrega un token efímero solo en memoria y un POST JSON
autenticado solicita el apagado. El servidor responde antes de cerrar su listener; no enumera ni
termina procesos por PID. El helper de autoría rechaza la solicitud mientras esté ocupado o haya
un journal que deba finalizarse o recuperarse, y libera su lock al cerrar en reposo.

El control permanece oculto en el HTML. Solo ORBIT Editor Docente lo revela tras validar una
sesión compatible y exige doble activación temporal. No aparece en Estudiante o Debug, no opera
desde un hosting estático y no constituye autenticación: protege contra accidentes y peticiones
web cruzadas, no contra software local con acceso al equipo.

## Alternativas consideradas

### Incluir preferencias Estudiante en el JSON Docente

Descartado porque convertiría una elección personal en definición del curso y expondría datos
ajenos al exportar o aplicar.

### Reescribir módulos JavaScript desde el navegador

Descartado porque una página estática no tiene esa autoridad y porque transformaciones de texto
sobre `world.js` o `locations.js` serían frágiles. El artefacto JSON fijo mantiene una frontera
validable.

### Aplicar solo en `localStorage`

Descartado como flujo completo: serviría para una previsualización privada, pero no actualizaría
la fuente ni el build que se desplegarán. El helper local hace explícita esa segunda autoridad.

### Borrar todo el almacenamiento del origen

Descartado porque eliminaría el borrador, las preferencias personales y posibles datos no
relacionados, sin mejorar la consistencia del progreso.

### Simular publicación remota

Descartado. Cuentas, permisos, mantenimiento y reset multiusuario pertenecen a UPD-002. El
contrato de edición y pérdida de progreso es reutilizable, pero 0.5.0 opera solo en este equipo.

## Consecuencias

### Positivas

- Spider, Bee y Bowerbird forman un único documento Docente versionado.
- La personalización Estudiante queda aislada y no concede progreso.
- La edición aplicada es auditable por revisión y digest.
- El reset local es cuantificado, específico, recuperable y no borra datos ajenos.
- Fuente, build y navegador comparten el mismo contrato sin introducir un backend público.
- La revisión de curso en el progreso prepara una migración segura hacia cuentas futuras.

### Negativas

- Aplicar fuentes exige iniciar explícitamente el helper local; un hosting estático no puede
  realizar esa operación.
- Deben cerrarse otras pestañas de ORBIT para obtener el bloqueo exclusivo.
- El documento editorial, la edición desplegable, las preferencias y el progreso tienen ciclos
  de migración distintos que requieren pruebas independientes.
- La transacción entre navegador y sistema de archivos necesita compensación y evidencia; no
  existe una primitiva atómica común a ambos medios.

## Invariantes verificables

- Bowerbird no cambia `q`, `r`, `areaId`, offsets, requisitos, concesiones ni progreso.
- Una zona bloqueada nunca revela su decoración preparada.
- El documento Docente exportado no contiene preferencias Bowerbird Estudiante.
- Aplicar consume un documento Docente `v2` completo y rechaza esquemas/catálogos desconocidos.
- Ningún reset borra el borrador Docente ni las preferencias Bowerbird Estudiante.
- Un progreso de otra revisión del curso no se acepta como progreso vigente.
- Un fallo anterior a la confirmación no modifica fuentes, build, edición activa ni progreso.
- Un fallo durante la aplicación conserva evidencia suficiente para restaurar o recuperarse.
- Ningún runtime crea progreso mientras exista una transacción de curso pendiente o ambigua.
- Un solo helper opera cada checkout y el origen real de autoría es `127.0.0.1:4173`.
- El apagado web solo cierra el servicio ORBIT que emitió su token, responde antes del cierre y
  nunca interrumpe una operación o journal de autoría.
- El helper solo escucha en loopback, solo escribe la ruta canónica y no muta Git; su única
  operación Git es inspeccionar `git status`.
- `dist` contiene el mismo artefacto y digest registrados por `build-info.json`.

## Regla de revisión

Revisar este ADR antes de incorporar publicación remota, cuentas, varias rutas, colaboración,
resolución de conflictos, resets parciales, assets Bowerbird cargados por usuarios, edición de
contenido académico o cualquier operación del helper fuera de loopback. ADR 0007 continúa
vigente para la separación de aplicaciones y grafos salvo en las fronteras enmendadas aquí.
