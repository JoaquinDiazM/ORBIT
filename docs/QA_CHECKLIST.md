# Control de calidad

Catálogo de comprobaciones del modo estático y del servidor docente. La ficha de [ORBIT_UPDATES.md](../ORBIT_UPDATES.md)
registra cuáles corresponden al cambio, sus resultados y lo pendiente. Una casilla describe una
comprobación; no acredita que se haya ejecutado. La evidencia de versiones publicadas queda en
[UPDATES_HISTORY.md](UPDATES_HISTORY.md), no en esta lista.

La revisión manual canónica corresponde a JoaquinDiazM u otro desarrollador, en **Edge externo**
y con el servicio iniciado desde un terminal **visible de VS Code**. Las pruebas de agentes usan
entornos aislados según [AGENTS.md](../AGENTS.md). La autoría académica mediante UI aislada no
sustituye esa revisión ni la aplicación humana.

## Preparación y evidencia

- [ ] Leer los `AGENTS.md` aplicables y confirmar alcance, invariantes y criterios del cambio.
- [ ] Ejecutar `npm run check` y registrar resultado, revisión y limitaciones de la automatización.
- [ ] Entregar el preflight de [ORBIT_UPDATES.md](../ORBIT_UPDATES.md): cambios staged/unstaged,
      puerto/PID 4173, identidad del lock, journals/tombstones, procesos propios, `no-store` y
      concordancia fuente/build. No adoptar ni detener procesos ajenos.
- [ ] Para los helpers de desarrollo/autoría, usar `http://127.0.0.1:4173`, sin puertos alternativos.
      El servidor docente usa su origen declarado y datos privados separados. No inventar perfiles
      ni limpiar el almacenamiento real por parte del agente.
- [ ] Exportar el borrador antes de importaciones o restauraciones que puedan reemplazarlo.
- [ ] Registrar aparte automatización, preflight y revisión humana. Congelar escrituras del agente
      en fuente, build, cola y Git entre la validación humana y el resultado de **Aplicar**.

## Movimiento, mundo y Red de aprendizaje

- [ ] WASD/flechas permiten movimiento continuo; la diagonal conserva velocidad y las fronteras
      cerradas impiden cruzar sin vibración. Abrir una zona habilita todas sus aristas compartidas.
- [ ] Cámara y zoom mantienen al personaje localizable. Las sombras de los transportes conservan
      su orientación y comportamiento en los ocho rumbos.
- [ ] `Ctrl` + clic primario sin arrastre centra en una zona abierta; clic ordinario, botones o
      modificadores distintos no disparan el salto. `Ctrl` + flecha actúa una vez desde el mapa,
      sin interceptar campos. El salto persiste posición, rechaza zonas cerradas y no concede progreso.
- [ ] Cada lugar queda dentro del margen seguro. La Red contiene solo lecciones/misiones, tiene
      raíz única `vector-workshop`, no presenta ciclos y alcanza todos sus nodos activos.
- [ ] Una zona no inicial se abre por adyacencia y elegibilidad académica, sin exigir previamente
      la apertura de esa misma zona. Zonas, fronteras y disponibilidad siguen siendo derivados.
- [ ] NPC, gadgets y transportes quedan fuera de la Red, se habilitan con su zona y requieren una
      interacción para completarse. Recompensas y conceptos no crean una segunda vía de apertura.
- [ ] Las guías apuntan prerrequisito → destino: brillante/continua hacia completado o completable,
      tenue/discontinua desde completable hacia bloqueado. No revelan extremos ocultos.
- [ ] Oculta conserva solo la conexión causal **NUEVO**; Directo filtra por adyacencia efectiva;
      Total muestra todas las relaciones elegibles. El filtro no cambia requisitos ni progreso.
- [ ] **NUEVO**, su fuente causal y el historial de regreso son efímeros; la preferencia del filtro
      sí sobrevive recarga. Zonas · Red refleja el estado sin duplicar controles de Visual.
- [ ] Global/Directa conservan apertura y posición canónicas; Directa muestra hasta seis vecinas
      más el centro, conserva cruces/bloqueos y permite regresar. Las ediciones históricas con exceso
      de relaciones explican su restricción; una nueva publicación rechaza ese exceso.

Guion específico de navegación: [UPD-026](reviews/UPD-026.md). Las cantidades de zonas, nodos y
conexiones se contrastan con la edición revisada y el validador, sin convertir un corte histórico
en una cifra obligatoria para todas las ediciones.

## Actividades, contenido y herramientas

- [ ] Los enunciados son autosuficientes; se aceptan respuestas correctas y se rechazan incorrectas
      o vacías. Números declaran unidad/tolerancia y admiten coma decimal y notación científica.
- [ ] Las expresiones usan evaluación restringida; entradas desconocidas no ejecutan código.
      Las secuencias no conceden progreso antes de la salida ni duplican recompensas.
- [ ] Etapas activas, disponibles y bloqueadas se anuncian por texto. Las soluciones justifican
      ley, geometría, signos, unidades y límites, además del cálculo.
- [ ] Fuentes trazables, aproximaciones y licencias están presentes donde corresponde; se distinguen
      observación, formulación y aplicación. No hay evaluaciones internas copiadas ni contenido
      provisional presentado como un curso terminado.
- [ ] Docente autocompleta solo lecciones/misiones evaluables; las lecturas, NPC, herramientas y
      transportes conservan interacción. Estudiante no autocompleta.
- [ ] Gadgets abre un panel desde cualquier zona. La calculadora funciona sin recompensa; el
      Explorador de campos y la Carta de Smith respetan sus desbloqueos y parámetros efímeros.
- [ ] `smith-chart-station` se habilita con su zona, requiere interacción y no bloquea la ruta.
      La Carta de Smith se identifica como esqueleto estático, sin cálculo RF completo.
- [ ] Figuras de campos/cargas funcionan con puntero y teclado, muestran singularidades y límites,
      y no conceden progreso. Revisar el contrato específico del nodo modificado y sus pruebas.
- [ ] Símbolos, constantes, fórmulas y glosario conservan consulta y condición de acceso; una fuente
      se comunica una vez al desbloquearse, sin cuadros bibliográficos repetidos.

La autoría se realiza en Spider según [CONTENT_AUTHORING.md](CONTENT_AUTHORING.md) y
[CONTENT_SOURCE_GUIDE.md](CONTENT_SOURCE_GUIDE.md). Los contratos del Taller Vectorial,
Coulomb y Superconductividad conservan pruebas específicas en `tests/` y sus IDs publicados.

## Persistencia y perfiles del modo estático

- [ ] Estudiante, Docente y Debug tienen avances independientes; cambiar selector o recargar no
      copia logros entre perfiles. Son modos locales y no se anuncian como autenticación.
- [ ] Progreso `v4` conserva `courseId` y `courseRevision`. Una revisión distinta no reactiva
      logros incompatibles; `normal` y `aea-progress` migran solo bajo compatibilidad explícita.
- [ ] Migraciones preservan ajustes compatibles, incluidos volúmenes por categoría, filtro de Red
      y navegación. Exportar/importar/reset producen el estado esperado y sanean IDs desconocidos.
- [ ] El documento Docente `v6`, las preferencias Bowerbird `v1`, la edición y el progreso no mezclan
      campos ni claves. Solo la aplicación explícita inspecciona y reinicia los progresos.
- [ ] Fallos de escritura revierten memoria y controles sin emitir éxito; guardar posición no
      detiene el siguiente frame ni impide liberar el bloqueo al cerrar.
- [ ] Esquemas futuros de progreso o preferencias no se degradan ni sobrescriben. Importaciones
      inválidas conservan el último estado válido y muestran un diagnóstico accesible.
- [ ] Todo cambio incompatible incluye migración o decisión de reinicio documentada.

## Servidor docente, cuentas y estudio sin conexión

- [ ] Login, selección y cierre de sesión son operables con teclado. Un error de red o de sesión
      no concede permisos ni abre automáticamente el modo estático; las queries no cambian el rol.
- [ ] Administrador y docentes tienen funciones separadas. Las pruebas negativas rechazan leer
      o modificar otro curso y mezclas de identidad entre peticiones, pestañas o dispositivos.
- [ ] Owl muestra solo avance y finalización del curso. Restablecer contraseña conserva el avance;
      eliminar estudiante retira cuenta y avance e impide que un cliente antiguo los recree.
- [ ] Borradores e importaciones quedan por servidor/cuenta/curso. Publicar exige mantenimiento,
      revisión base y plan vigente; una incompatibilidad requiere decisión explícita. Un borrador
      antiguo puede exportarse antes de sustituirlo y nunca se atribuye a una revisión nueva.
- [ ] Una copia offline exige elección explícita y anuncia qué datos quedan en el dispositivo.
      Cerrar acceso retira esa entrada aunque la sesión remota haya caducado; conserva los avances
      pendientes de la cuenta. Fallos de cierre local o remoto se informan por separado.
- [ ] Desconectar, avanzar y reconectar une finalizaciones sin perder cambios tardíos. Revisión
      desconocida, acuse incompleto o cambio de generación conservan la copia local sin reactivarla
      silenciosamente. Dos ventanas no escriben simultáneamente el mismo avance local.
- [ ] Recursos de la aplicación y copia del curso tienen estados diferenciados. La PWA se instala
      desde Edge/Chrome, abre sin red y actualiza al cerrar sus ventanas; una descarga fallida conserva
      la copia anterior. La caché no contiene respuestas de cuentas, sesiones ni API.
- [ ] El paquete extraído verifica sus archivos y funciona en Windows/Linux. Copia y restauración
      conservan cursos y avances, invalidan sesiones anteriores y permiten recuperar un estado dañado
      sin destruirlo. Origen, HTTPS, rutas privadas y bloqueo de escritor fallan de forma cerrada.
- [ ] Registrar por separado ensayos automáticos y revisión humana: primero docente/estudiante en
      dos máquinas y luego piloto de 10 estudiantes, 2 docentes y 2 cursos. Comprobar instalación,
      foco, errores de consola y reconexión reales antes de aprobar.

Comandos y operación: [SERVER_GUIDE.md](SERVER_GUIDE.md). Evidencia y guion específico de la
candidata: [informe de UPD-027](reviews/UPD-027.md).

## Interfaz, accesibilidad y Debug

- [ ] Ambas entradas cargan sin errores de consola; un fallo de arranque muestra diagnóstico y
      recuperación en lugar de una espera infinita.
- [ ] Acciones esenciales operables con teclado, foco visible y retorno al control de apertura.
      En compacto, el foco permanece dentro del panel visible; Esc cierra por niveles.
- [ ] La ventana principal convive con un panel secundario. Abrir otra herramienta sustituye ese
      secundario; Ajustes agrupa Visual, Sonido y Ayuda sin controles ocultos enfocados.
- [ ] Progreso muestra porcentaje conceptual derivado y equivalente accesible X de Y, actualizado
      al reiniciar o cambiar perfil. La información no depende solo del color.
- [ ] Texto, docks y controles son utilizables con zoom de 200 %, ventana estrecha y reducción
      de movimiento. Controles nuevos aparecen en la ayuda; H/M no activan paneles ni audio.
- [ ] KaTeX conserva caption, MathML, fallback legible y desplazamiento por teclado si desborda.
- [ ] El separador de paneles admite puntero, foco/flechas y restauración; Escape cancela el gesto.
      El ancho persiste por producto y no oculta controles en modo compacto.
- [ ] Solo Debug expone Terminal de Cartografía, overlays, F2/tecla grave y `window.OrbitDebug`.
      Estudiante/Docente no admiten esas acciones por render, foco, hit testing ni API.
- [ ] Noclip, teletransporte, completar cercano, exportar/importar y reset funcionan; apagar noclip
      fuera de una zona abierta retorna a spawn. `?debug=1` no concede capacidad editorial.

Referencia de herramientas: [DEBUGGING.md](DEBUGGING.md).

## ORBIT Editor

- [ ] Docente dispone de Spider/Bee/Bowerbird, historial e importación/exportación. Estudiante
      consulta Spider/Bee y cambia solo su Bowerbird; los intentos de mutación mantienen documento
      y foco y explican la restricción. Debug queda bloqueado sin crear modelo ni renderer.
- [ ] Los docks se contraen por separado sin perder el control para reabrirlos; `aria-expanded`,
      teclado y foco reflejan su estado. Pan/zoom y gestos editoriales no disparan acciones de ORBIT.
- [ ] Spider mueve nodos con puntero y teclado, incluida transferencia de zona, conservando margen
      seguro y coincidencia del inspector con el Canvas. Esc/pointercancel cancela sin cambios parciales.
- [ ] Conectar rechaza autorrelaciones, duplicados, ciclos y extremos laterales. Retirar de la Red
      conserva el lugar y elimina aristas incidentes; reincorporar no inventa conexiones.
- [ ] Crear/renombrar/inventariar/reinsertar/borrar preserva contenido e IDs monotónicos. Inventariar
      enumera las conexiones eliminadas; borrar exige Inventario y respeta nodos protegidos/tombstones.
- [ ] Bee conserva Base fija y niveles estructurales; permite intercambios dentro del mismo nivel,
      nombres/rótulos configurables y rechaza cruces de nivel sin cambios parciales.
- [ ] Bowerbird Docente participa de historial/exportación; las preferencias de Estudiante quedan
      fuera del historial y la exportación Docente. La
      precedencia personal → publicada → canónica solo se aplica a zonas abiertas; las bloqueadas
      permanecen neutrales y los motivos respetan reducción de movimiento.
- [ ] Deshacer/rehacer y autoguardado conservan los datos. Importar/restaurar inicia historial nuevo;
      una importación inválida no reemplaza el borrador. Datos ilegibles o futuros se preservan
      hasta una recuperación explícita, sin autoguardado destructivo.
- [ ] Migraciones editoriales `v1`–`v5` llegan a `v6` preservando mapa, red, inventario y cuerpos.
      Los artefactos históricos se autentican antes de migrarse y conservan su revisión original.
- [ ] Spider → Modificar → Editar contenido permite escribir, compilar y recorrer el preview.
      Renombrar conserva cuerpo; deshacer/rehacer, recarga y round-trip JSON conservan fuente válida.
- [ ] Una fuente incompleta informa línea/columna, conserva el borrador y distingue la última
      fuente válida. Exportar/importar recupera el texto; validar/aplicar no incorpora el inválido.
- [ ] Plantillas, ejercicios, etapas y figuras registradas conservan paridad con ORBIT. NPC mantiene
      cierres no evaluativos; figuras inéditas y contenido ejecutable se rechazan. El preview es efímero
      y nunca modifica progreso ni concede recompensas.

## Aplicación y recuperación locales

- [ ] En `dev`, ORBIT y Editor están disponibles; Resumen valida y muestra diff/impacto, pero explica
      por qué confirmación y Aplicar están bloqueados. En autoría, todas las entradas ORBIT responden
      `503 maintenance` y Editor permanece accesible para aplicar o recuperar.
- [ ] Una pestaña ORBIT anterior detecta mantenimiento, detiene subsistemas, libera su bloqueo y
      recarga; un shell cacheado comprueba el modo antes de crear progreso.
- [ ] Volver a comprobar servicio prueba el candidato en una copia temporal y muestra diagnóstico.
      Edición, desconexión o cambio de sesión invalidan evidencia; sondeos automáticos no lanzan suites.
- [ ] Diff e impacto cubren contenido, nombres, ciclo de vida, mapa, red y apariencia, más los tres
      perfiles. La confirmación queda ligada a revisión/digest y un cambio invalida el plan.
- [ ] Otra pestaña con bloqueo compartido impide aplicar antes del reset. La exclusión por checkout
      y el origen fijo rechazan una segunda instancia sin alterar fuente, journal o servicio ajeno.
- [ ] Aplicar admite cambios locales sin consultar/mutar Git, conserva las otras rutas y respalda
      la fuente. Reset elimina solo el progreso anunciado y conserva documento, preferencias y datos ajenos.
- [ ] Fuente, `dist` y `build-info.json` coinciden tras aplicar; después de detener autoría y reiniciar
      `dev`, los tres perfiles muestran la nueva revisión y el reset esperado.
- [ ] Fallos de check/build restauran fuente/build; interrupciones dejan recuperación verificable y
      bloquean otra aplicación. Journals inválidos o de otra transacción fallan cerrado sin borrar datos.
- [ ] Finalizar exige edición íntegra y ausencia de los progresos que debían reiniciarse; divergencias
      conservan evidencia. Arranque y segunda pestaña no revierten una transacción activa.
- [ ] La automatización de servicios cubre origen/token/JSON, límites de cuerpo, rutas fijas, whitelist
      de assets, symlinks, autoridades ambiguas, abortos de petición y rechazo de rutas privadas.
- [ ] Detener servidor exige sesión válida y doble activación; no aparece en Estudiante/Debug/hosting
      estático, no mata PIDs y se rechaza con operaciones/journals pendientes. El cierre libera sus recursos.
- [ ] Registrar qué pestañas, servicios y recursos propios se cerraron y qué dejó activo el desarrollador.

Procedimiento operativo y recuperación: [EDITOR_GUIDE.md](EDITOR_GUIDE.md) y
[DEVELOPMENT.md](DEVELOPMENT.md). Estas comprobaciones no autorizan a un agente a operar el perfil
real, borrar un journal o sustituir una edición validada por el humano.

## Audio y distribución

- [ ] No hay reproducción antes del primer gesto. Ambiente se pausa al ocultar la pestaña; los
      volúmenes Ambiente/Efectos persisten y cero silencia solo su categoría.
- [ ] Cada acción solicita un único cue pertinente: transición, interacción, clic, zona nueva o
      teletransporte. Un cue específico sustituye al predeterminado y no duplica señales de finalización.
- [ ] Los seis recursos se pueden escuchar desde Debug, tienen archivo, sidecar, manifiesto,
      atribución y punto de uso verificable. El audio nunca es la única señal de estado.
- [ ] Se conservan las licencias individuales y la cadena de atribución de
      [ATTRIBUTION.md](../public/assets/audio/ATTRIBUTION.md).
- [ ] `dist/` incluye ambas entradas, 404, módulos, recursos, edición y KaTeX local; no contiene
      referencias a `node_modules` ni el helper. Rutas relativas funcionan bajo subruta.
- [ ] El workflow supera check; Pages solo publica con `ENABLE_PAGES=true`. README y capturas
      identifican correctamente la versión representada, sin presentar evidencia histórica como actual.
- [ ] La cohorte sigue el protocolo de aprobación/publicación de [ORBIT_UPDATES.md](../ORBIT_UPDATES.md).
      Exportar, aplicar localmente y desplegar conservan responsabilidades distintas.
