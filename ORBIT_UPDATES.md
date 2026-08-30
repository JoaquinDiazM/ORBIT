# Registro vivo de actualizaciones de ORBIT

Este archivo es la cola operativa canónica para el trabajo entre JoaquinDiazM y los
agentes de desarrollo de ORBIT. Una descripción expresa una intención; **solo el campo
`Estado` autoriza una acción**. `CHANGELOG.md` sigue siendo el registro de lo ya publicado y
`docs/ROADMAP.md` describe la dirección estratégica.

## Uso rápido para JoaquinDiazM

No necesitas completar una plantilla técnica.

1. Para proponer algo nuevo, escribe un título y un párrafo libre en **Bandeja de entrada**.
   El agente asignará ID, tipo, preguntas, criterios, pruebas e impacto de versión.
2. Para permitir que comience un punto suficientemente definido, cambia únicamente su
   estado a `autorizado`.
3. Cuando el agente lo deje en `en-revision`, prueba el resultado. Si requiere cambios,
   escribe las observaciones en el mismo punto y vuelve a `autorizado`. Si está conforme,
   cambia únicamente el estado a `aprobado`.
4. Varios puntos pueden compartir versión. Cuando sepas que no añadirás otro ID a esa entrega,
   indica que su **cohorte está cerrada**; hasta entonces puede implementarse y revisarse, pero
   no publicarse.
5. Activa al agente en el chat. Una cohorte cerrada se publica una sola vez, después de que
   todos sus IDs estén `aprobado`.

Solo JoaquinDiazM puede establecer `autorizado`, `aprobado`, `pospuesto` o `descartado`, ya
sea editando este archivo o dando una instrucción explícita que identifique el ID y el estado.
El agente no debe inferir aprobación a partir de elogios, silencio o una descripción extensa.
Solo JoaquinDiazM puede cerrar o reabrir una cohorte de versión.

## Estados permitidos

| Estado | Responsable | Significado y acción permitida |
|---|---|---|
| `propuesto` | Usuario o agente | Idea registrada. Puede refinarse, pero no se implementa. |
| `faltan-detalles` | Agente | Hay una decisión bloqueante. El agente escribe solo las preguntas mínimas y una recomendación comprensible. No modifica el producto. |
| `autorizado` | Solo usuario | Permite la revisión técnica previa y, si el alcance es sólido, la implementación. Si sigue ambiguo, vuelve a `faltan-detalles` sin tocar código. |
| `en-implementacion` | Agente | Hay trabajo local en curso dentro de la cohorte inmediata. Puede haber varios IDs de esa misma cohorte si sus alcances son independientes. |
| `en-revision` | Agente | Implementación y pruebas locales terminadas. Espera revisión del usuario; puede quedar en un commit local de control, pero todavía no se versiona, no se incluye en el changelog ni se sube. |
| `aprobado` | Solo usuario | El resultado fue aceptado y su alcance queda congelado. Espera a los demás IDs de su cohorte; no autoriza un push parcial. |
| `publicando` | Agente | La cohorte completa está aprobada y su commit de release está preparado o en tránsito al remoto. Incluye una versión resuelta y se recupera antes que cualquier otro trabajo. |
| `bloqueado` | Agente | Un impedimento técnico o externo verificable impide continuar. Debe registrar causa, responsable y condición para reanudar. |
| `publicado` | Agente | El cambio aprobado quedó versionado, incluido en el changelog, confirmado, subido y verificado en el remoto. Es terminal; cualquier ampliación usa otro ID. |
| `pospuesto` | Solo usuario | No se trabaja hasta una nueva decisión. |
| `descartado` | Solo usuario | No se implementa: el agente archiva de inmediato la ficha completa en `docs/UPDATES_HISTORY.md` y la retira de esta cola, sin versión ni changelog. |

Flujo normal:

```text
propuesto → autorizado → en-implementacion → en-revision → aprobado
cohorte completa aprobada y cerrada → publicando → publicado y archivado
propuesto → faltan-detalles → autorizado
autorizado → faltan-detalles  (si el preflight descubre una decisión material)
en-revision → autorizado      (si el usuario solicita correcciones)
```

Un punto `en-revision` con correcciones solicitadas vuelve a `autorizado`. Un punto
`aprobado` que falla al revalidarse vuelve a `en-revision` o `bloqueado`; nunca se publica
un resultado distinto del que el usuario aprobó. Si corregirlo cambia el alcance acordado,
vuelve a `faltan-detalles` o `autorizado` para una nueva decisión. `pospuesto` solo se reactiva
por instrucción explícita del usuario. Un punto `descartado` sale de la cola; para reactivarlo,
el usuario debe pedir expresamente que su ficha vuelva desde el historial con un estado activo.

## Orden obligatorio para el agente al ser activado

1. Leer este archivo completo, ejecutar `git fetch origin` y comparar HEAD con `origin/main`.
   Auditar `git log origin/main..HEAD` y `git diff origin/main...HEAD`: todo commit local que
   viajaría en el próximo push debe pertenecer a la cohorte inmediata. Si aparece uno ajeno o
   dudoso, bloquear la publicación y pedir dirección. Si el checkout tiene por delante un commit
   documental que archivó una cohorte ya verificada —local sin cohorte, remoto con sus IDs
   `publicando`—, subir y verificar exactamente ese cierre antes de cualquier otra acción.
   En esa misma lectura, archivar primero toda ficha cuyo estado sea `descartado`: moverla completa
   a la sección correspondiente de `docs/UPDATES_HISTORY.md`, añadir la fecha de descarte y
   retirarla de esta cola. Este trámite no modifica versión ni changelog y no autoriza código.
2. Recuperar primero una cohorte `publicando`, esté confirmada o todavía preparada en el índice
   o working tree. Si no existe aún el commit de release, comprobar que versión, changelog,
   estados y rutas sucias corresponden exactamente al lote y completar una sola vez esa misma
   preparación; ante mezcla o duda, pasar a `bloqueado`. Si el commit existe pero todavía no
   llegó al remoto, reintentar el mismo release sin cambiar versión ni duplicar changelog. Una
   cohorte aún `aprobado` con versión o changelog ya editados se trata también como preparación
   interrumpida, no como un release nuevo. Tras verificar el release, leer desde ese commit la
   lista original de cohorte —por ejemplo con `git show <hash>:ORBIT_UPDATES.md`— y exigir que el
   manifiesto histórico y las fichas coincidan exactamente antes de vaciar la cohorte. Crear un
   commit documental breve de cierre, subirlo y verificarlo.
3. Si la cohorte inmediata está cerrada y **todos** sus IDs están `aprobado`, revalidar el lote,
   confirmar primero en un commit local el árbol exacto con esos estados `aprobado`, resolver una
   sola versión, actualizar `CHANGELOG.md` y los archivos de versión, inspeccionar cada hunk y
   cambiar todos esos IDs a `publicando` dentro de un único commit de release. Hacer el push del
   release —que incluirá solo los commits locales ya auditados— y verificar el remoto antes del
   cierre documental del paso 2. Si falta una aprobación, no publicar parcialmente.
4. Recuperar cualquier ID `en-implementacion` de la cohorte inmediata. Distintos IDs de esa
   misma versión pueden avanzar en paralelo cuando sus rutas no se solapan; no se mezcla trabajo
   de otra versión.
5. Examinar los `autorizado` incluidos en la cohorte inmediata. Antes de editar, convertir cada
   intención en criterios verificables, declarar fuera de alcance y revisar invariantes. Si falta
   una decisión material, cambiarla a `faltan-detalles` y preguntar; si no, marcarla
   `en-implementacion` y proceder.
6. Al completar un ID, registrar pruebas y revisión manual, cambiarlo a `en-revision` y crear de
   preferencia un commit local coherente. No hacer push, no modificar versión ni changelog.
7. Mientras exista una cohorte inmediata sin publicar, no implementar IDs destinados a una
   versión posterior. Sí se pueden refinar sus especificaciones y preguntas, incluso moverlos a
   `faltan-detalles`, sin tocar el producto por ellos.
8. Informar preguntas pendientes. No tocar código por puntos `propuesto`, `en-revision` o
   `pospuesto`; un punto `descartado` únicamente se archiva como indica el paso 1.

El límite es **una sola cohorte de versión en implementación, revisión o publicación por
checkout**, no un solo ID. Todos los puntos activos deben pertenecer a esa versión inmediata;
los futuros esperan. Nunca se usa `git add -A`: se preparan rutas explícitas y se inspecciona
cada hunk, porque una ruta también podría contener cambios ajenos.

## Versionado y publicación

`auto` es el valor predeterminado. Antes de implementar, el agente asigna el punto autorizado a
la cohorte inmediata compatible o propone una cohorte futura. Si el usuario fija una versión
explícita, se conserva. La escala es:

- `X` — hito clave o contrato deliberadamente incompatible;
- `Y` — capacidad o subsistema grande;
- `Z` — arreglo, documentación, pulido o cambio compatible leve.

La cohorte inmediata debe ser la siguiente versión coherente respecto de la publicada. Una
cohorte futura no se implementa mientras la inmediata siga abierta, en revisión, aprobada o en
publicación. El usuario puede añadir IDs mientras la cohorte esté `abierta`; solo él puede
declararla `cerrada`, y ese cierre congela la lista hasta una reapertura explícita.

Al publicar, el agente sincroniza `package.json`, `package-lock.json` y `src/config.js`, añade
una sola sección de cohorte a `CHANGELOG.md`, ejecuta `npm run check`, crea el commit de release,
hace el push del release y comprueba que `origin/main` apunte al mismo commit. El release deja
todos los IDs de la cohorte `publicando`; así, una interrupción se recupera de forma idempotente.
El commit documental posterior añade un manifiesto con la lista exacta de IDs, mueve todas sus
fichas a `docs/UPDATES_HISTORY.md` con la misma versión, fecha y hash, las retira de este archivo,
hace el segundo push de cierre y vuelve a verificar el remoto. No hay pushes parciales de IDs.
Las pruebas exigen que la última cohorte histórica coincida con la versión del paquete una vez
terminado `publicando`. El changelog resume el producto publicado; el historial conserva la
conversación y evidencia de cada UPD.

## Forma mínima de una actualización

El usuario puede limitarse al título, `Estado` y **Solicitud original**. El agente mantiene el
resto sin exigir que el usuario conozca Node.js, la arquitectura o los archivos implicados.

```markdown
### [ID asignado por el agente] — Título

- Estado: `propuesto`
- Tipo: `feature | bug | contenido | infraestructura | documentación | épica`
- Versión objetivo: `auto`

#### Solicitud original

Un párrafo libre.

#### Especificación elaborada por el agente

- Objetivo observable:
- Decisiones confirmadas:
- Criterios de aceptación:
- Fuera de alcance:
- Dependencias, invariantes o ADR:

#### Preguntas bloqueantes

- Ninguna.

#### Implementación y revisión

- Base revisada:
- Rutas propias:
- Resultado: no iniciada.
- Pruebas: no aplican todavía.
- Cómo revisar para JoaquinDiazM:
- Observaciones del usuario: ninguna.
```

## Bandeja de entrada

<!--
Añade aquí una idea en lenguaje natural. No necesita ID ni detalles técnicos.
- Título:
  Descripción:
-->

Sin propuestas pendientes de clasificar.

## Cohorte inmediata

Sin cohorte inmediata en preparación.

## Actualizaciones activas

### UPD-001 — Hub de gadgets y explorador de campos vectoriales

- Estado: `propuesto`
- Tipo: `épica`
- Versión objetivo: `0.5.0`
- Impacto sugerido: `Y` cuando se defina una primera capacidad completa.
- Próximo responsable: JoaquinDiazM, que debe decidir si autoriza este punto cuando corresponda
  preparar la cohorte 0.5.0.

#### Solicitud original

Convertir el menú de gadgets en un compendio de herramientas pedagógicas reutilizables. El
primer caso sería un explorador de campos vectoriales 2D en el que el usuario escriba funciones
y elija sistemas de coordenadas; posteriormente podrían incorporarse utilidades como una carta
de Smith. Las herramientas desbloqueadas deberían seguir disponibles desde el menú lateral y
ser utilizables en otros lugares de aprendizaje.

#### Especificación elaborada por el agente

- Objetivo observable: pendiente de limitar a un primer MVP seguro.
- Decisiones confirmadas: el valor pedagógico debe estar en la herramienta, no en una
  proyección decorativa sobre el mapamundi.
- Criterios de aceptación: se redactarán después de fijar el primer gadget.
- Fuera de alcance provisional: evaluar JavaScript arbitrario, un motor 3D o implementar a la
  vez todos los gadgets futuros.
- Dependencias, invariantes o ADR: reutilizar `VectorField2D` y una gramática matemática
  limitada; revisar desbloqueos del Árbol II, accesibilidad y costo de entrada.

#### Preguntas bloqueantes

1. Para la primera iteración, ¿aceptamos la recomendación de limitar el explorador a campos 2D
   cartesianos, con flechas y líneas de flujo, antes de añadir otros sistemas de coordenadas?
2. ¿El explorador debe reemplazar por completo la superposición actual del Lente de Campo
   activada con `G`, o ambos comportamientos deben coexistir?.

#### Implementación y revisión

- Resultado: no iniciada; la descripción no autoriza cambios.
- Pruebas: no aplican todavía.
- Observaciones del usuario: para la primera pregunta bloquente centrate en ese y en una calculadora cientifica (Esta no es desbloqueable, todos la deben tener desde el inicio). Puedes dejar el esqueleto del gadget de la carta smith, creando el nodo+conexion tambien, pero no gastaremos recursos en una primera version de los nuevos gadgets solo para construir una carta smith completamete operativa, funcional y util para resolver ejercicios. En definitiva hay que quitar la superposicion actual del lente de campo y lo del boton G, ahora sera un menu al que se accede en la barra lateral izquierda con un click

### UPD-002 — Sistema de servidor online

- Estado: `pospuesto`
- Tipo: `épica`
- Versión objetivo: `auto`
- Impacto sugerido: se decidirá al dividir la épica; una operación real multiusuario será un
  hito mayor que una especificación o prototipo aislado.
- Próximo responsable: JoaquinDiazM.

#### Solicitud original

Operar ORBIT desde un computador del cuerpo docente, con reinicio recuperable, cuentas de
curso, progreso separado por estudiante, checkpoints solicitados por docentes, presencia de
otros usuarios en el mapamundi, estadísticas generales, un rol docente y actualizaciones de
contenido mediante ORBIT Editor durante mantenciones planificadas.

#### Especificación elaborada por el agente

- Objetivo observable: la primera entrega segura será una especificación/ADR; no el servidor
  completo.
- Decisiones confirmadas: debe tolerar reinicios sin perder el último estado persistido y
  diferenciar estudiantes de personal docente.
- Criterios de aceptación provisionales: arquitectura, modelo de datos, amenazas, respaldo,
  recuperación, despliegue, actualización y rollback documentados antes de código productivo.
- Fuera de alcance provisional: escoger tecnologías o exponer datos personales sin requisitos
  operativos y de privacidad.
- Dependencias, invariantes o ADR: backend, autenticación, persistencia y colaboración requieren
  uno o más ADR; contradicen deliberadamente la restricción estática vigente y deben reemplazarla
  de forma explícita, no accidental.

#### Preguntas bloqueantes

1. ¿La primera instalación deberá funcionar solo dentro de la red universitaria/VPN o también
   desde Internet público? Recomendación inicial: red institucional o VPN, salvo necesidad real
   de acceso público.
2. ¿Qué sistema operativo usará el computador docente y se permite instalar servicios,
   contenedores y una base de datos?
3. ¿Cuántos estudiantes simultáneos y cuántos cursos debe soportar la primera instalación?
4. ¿Aceptamos guardar cada avance relevante inmediatamente y usar los checkpoints como copias
   recuperables? Guardar únicamente al crear un checkpoint podría perder progreso entre cortes.
5. ¿Los demás estudiantes aparecerán con nombre real, seudónimo o avatar anónimo?

#### Implementación y revisión

- Resultado: no iniciada; debe dividirse en diseño, persistencia, cuentas, presencia, rol
  docente, estadísticas, respaldo y publicación editorial.
- Pruebas: no aplican todavía.
- Observaciones del usuario: pendientes.

### UPD-011 — Menú de ajustes para herramientas auxiliares

- Estado: `propuesto`
- Tipo: `feature`
- Versión objetivo: `0.4.3`
- Impacto sugerido: `Z`.
- Próximo responsable: JoaquinDiazM, que debe decidir si autoriza este punto y si 0.4.3
  contendrá también UPD-012.

#### Solicitud original

Envolver algunos menús del panel izquierdo en un único acceso primario. El nuevo menú
**Ajustes** debe reunir los accesos actuales a Visual, Sonido y Ayuda para recuperar espacio de
la barra ante futuras incorporaciones; el diseño exacto queda delegado al agente.

#### Especificación elaborada por el agente

- Objetivo observable: sustituir los tres accesos primarios Visual, Sonido y Ayuda por un único
  acceso Ajustes, desde el que se abren esas mismas vistas sin perder capacidad.
- Decisiones confirmadas: Árboles, Símbolos, Constantes, Formulario y Glosario permanecen como
  accesos propios; este punto reorganiza navegación, no preferencias ni contenido.
- Criterios de aceptación: Ajustes permite llegar con puntero y teclado a las tres vistas; los
  atajos `H` y `M`, foco, exclusividad de paneles, persistencia y layout responsive se conservan;
  el dock reduce sus accesos persistentes sin ocultar el estado activo.
- Fuera de alcance: añadir ajustes nuevos, cambiar la semántica de Visual o Sonido o rediseñar
  por completo el dock.
- Dependencias, invariantes o ADR: preservar la pila de paneles y el wiring de audio; no requiere
  dependencia ni ADR.

#### Preguntas bloqueantes

- Ninguna; el alcance está listo para que el usuario decida si lo autoriza.

#### Implementación y revisión

- Resultado: no iniciada; la descripción no autoriza cambios.
- Pruebas: no aplican todavía.
- Cómo revisar para JoaquinDiazM: pendiente de implementación.
- Observaciones del usuario: ninguna.

### UPD-012 — Progreso porcentual en el HUD

- Estado: `propuesto`
- Tipo: `feature`
- Versión objetivo: `0.4.3`
- Impacto sugerido: `Z`.
- Próximo responsable: JoaquinDiazM, que debe decidir si autoriza este punto y si 0.4.3
  contendrá también UPD-011.

#### Solicitud original

Reemplazar la sección **Conceptos** del HUD superior por **Progreso**. En lugar del contador
actual, mostrar una barra de avance con el porcentaje centrado, calculado a partir de lo mismo
que cuenta hoy esa sección.

#### Especificación elaborada por el agente

- Objetivo observable: el HUD muestra una barra Progreso y un porcentaje derivados de conceptos
  adquiridos sobre el total vigente.
- Decisiones confirmadas: se conserva exactamente la fuente conceptual del contador actual; el
  porcentaje es estado derivado y no se persiste.
- Criterios de aceptación: se actualiza al progresar o cambiar de perfil; permanece entre 0 y
  100; comunica porcentaje y equivalente «X de Y» a tecnologías asistivas; no depende solo del
  color y se mantiene legible en los cortes responsive.
- Fuera de alcance: redefinir el progreso, ponderar zonas o actividades, añadir analítica o
  cambiar el esquema de guardado.
- Dependencias, invariantes o ADR: una única fuente de verdad en `ProgressionModel`; no requiere
  dependencia ni ADR.

#### Preguntas bloqueantes

- Ninguna; se recomienda redondear al entero más cercano y conservar «X de Y» como texto
  accesible.

#### Implementación y revisión

- Resultado: no iniciada; la descripción no autoriza cambios.
- Pruebas: no aplican todavía.
- Cómo revisar para JoaquinDiazM: pendiente de implementación.
- Observaciones del usuario: ninguna.

### UPD-013 — Bowerbird: personalización visual de zonas

- Estado: `faltan-detalles`
- Tipo: `feature`
- Versión objetivo: `0.5.0`
- Impacto sugerido: `Y`; el objetivo provisional debe coordinarse con los demás puntos de 0.5.0
  antes de cerrar esa cohorte.
- Próximo responsable: JoaquinDiazM, que debe resolver la política estudiantil y el catálogo
  visual mínimo.

#### Solicitud original

Añadir al menú de ORBIT Editor un modo **Bowerbird**, disponible para Estudiante y Docente, que
permita configurar la apariencia de hexágonos o zonas sin moverlos como Bee. Debe ampliar las
opciones de colores, dibujos estáticos o móviles y contornos.

#### Especificación elaborada por el agente

- Objetivo observable: Bowerbird previsualiza y configura paleta, motivos y contorno de una zona
  sin alterar posición, anillo, contenido ni progresión.
- Decisiones confirmadas: es una herramienta visual distinta de Bee; no cambia geometría ni
  topología y debe existir para ambos perfiles con alcances de persistencia explícitos.
- Criterios de aceptación provisionales: selección accesible de zona, vista previa inmediata,
  presets legibles más allá del color, animaciones compatibles con `prefers-reduced-motion`,
  historial y saneamiento editorial para Docente, y ninguna mutación lógica o geométrica.
- Fuera de alcance: dibujo o código arbitrario, carga libre de imágenes, editor gráfico general,
  publicación del curso o assets sin procedencia y licencia.
- Dependencias, invariantes o ADR: requiere una definición visual compartida por ambos renderers,
  decidir migración del documento editorial `v1` y reconciliar la política Estudiante de solo
  lectura con personalizaciones locales.

#### Preguntas bloqueantes

1. ¿Docente modifica el borrador común mientras Estudiante guarda una apariencia local aislada
   y visible solo en su propio ORBIT? Recomendación: sí; Estudiante nunca altera el curso base.
2. ¿Aceptamos para el MVP presets versionados de paleta, contorno y motivos propios, sin selector
   de archivos ni dibujo libre?
3. ¿Estudiante puede decorar todas las zonas o solo las ya desbloqueadas? Recomendación inicial:
   todas, dejando claro que la apariencia no concede progreso.
4. ¿La exportación del curso incluye solo el borrador Docente y deja las preferencias personales
   en una clave separada? Recomendación: sí.

#### Implementación y revisión

- Resultado: no iniciada; faltan decisiones de persistencia y alcance estudiantil.
- Pruebas: no aplican todavía.
- Cómo revisar para JoaquinDiazM: responder las cuatro preguntas antes de autorizar.
- Observaciones del usuario: ninguna.

### UPD-014 — Aplicar una edición del curso

- Estado: `faltan-detalles`
- Tipo: `infraestructura`
- Versión objetivo: `auto`
- Impacto sugerido: `Y` si se limita a una aplicación local; una publicación remota depende de
  UPD-002 y puede requerir otro alcance de versión.
- Próximo responsable: JoaquinDiazM, que debe definir qué significa aplicar o subir en la
  arquitectura estática actual.

#### Solicitud original

Añadir a Resumen de ORBIT Editor una sección con un botón para subir o aplicar la edición. La
primera versión no resolverá conflictos: reiniciará el progreso de todos los perfiles antes de
usar la configuración nueva y mostrará una confirmación que advierta cuánto avance perderá cada
perfil.

#### Especificación elaborada por el agente

- Objetivo observable: una acción confirmada valida el borrador, explica el progreso afectado y
  aplica la configuración al destino acordado sin dejar estados parciales.
- Decisiones confirmadas: la primera política será reinicio total, no mezcla de progreso; debe
  existir una advertencia cuantificada y confirmación explícita.
- Criterios de aceptación provisionales: validar y respaldar antes de perder datos; mostrar por
  perfil el avance afectado; aplicar y resetear de forma atómica o no hacer ninguna de ambas;
  mantener una ruta recuperable; el resultado debe volver a pasar validación y build cuando
  corresponda.
- Fuera de alcance: resolución de conflictos, edición simultánea, cuentas reales, despliegue
  remoto improvisado, escritura silenciosa al repositorio o resets parciales.
- Dependencias, invariantes o ADR: ADR 0007 separa Editor de fuentes, despliegue y progreso; una
  aplicación directa exige revisarlo. Depende del esquema editorial final y de UPD-002 para
  afectar cuentas remotas.

#### Preguntas bloqueantes

1. ¿«Subir/aplicar» significa usar el borrador solo en este navegador, modificar fuentes y build
   mediante una herramienta local, o publicar al futuro servidor? Recomendación: no simular una
   subida remota antes de UPD-002.
2. ¿«Todos los perfiles» son Estudiante, Docente y Debug de este navegador o todas las cuentas
   futuras del curso? El sitio estático solo puede conocer los tres estados locales.
3. ¿Debe aplicar únicamente Spider/Bee, también Bowerbird o todo el futuro documento editorial?
4. ¿Aceptas validar y crear respaldo antes de aplicar, y resetear solo cuando se confirme que la
   operación puede completarse?
5. ¿La advertencia debe contar lugares completados y conceptos adquiridos por perfil?
   Recomendación: mostrar ambos y declarar el reinicio total.

#### Implementación y revisión

- Resultado: no iniciada; el Editor actual solo exporta JSON y no existe un destino de
  publicación acordado.
- Pruebas: no aplican todavía.
- Cómo revisar para JoaquinDiazM: responder las cinco preguntas antes de autorizar.
- Observaciones del usuario: ninguna.

## Historial

Las cohortes verificadas y las propuestas descartadas se retiran de este archivo y se conservan,
junto con cada ficha y sus intercambios, en
[`docs/UPDATES_HISTORY.md`](docs/UPDATES_HISTORY.md). `CHANGELOG.md` mantiene solo el resumen
orientado a quienes usan ORBIT; los descartes no reciben versión ni entrada de changelog.

La cohorte ORBIT 0.4.2 está publicada y archivada bajo esta metodología.
