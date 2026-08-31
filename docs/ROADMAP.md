# Hoja de ruta

Esta hoja de ruta prioriza valor pedagógico y control de alcance. No representa fechas comprometidas.

La hoja de ruta expresa dirección estratégica, no autorización de implementación. La cola
operativa, sus preguntas, revisión humana y estado de publicación viven en
[`ORBIT_UPDATES.md`](../ORBIT_UPDATES.md). Un hito mencionado aquí solo se trabaja cuando su
punto correspondiente está `autorizado`.

ORBIT significa **Open Roadmap for Building Intuition and Theory**. Los hitos hasta `1.0`
describen la ruta actual de Electromagnetismo. Migrar y conectar cursos diferentes es
una dirección posterior: el prototipo todavía no ofrece una arquitectura multicurso.

## 0.1 — Base técnica y mecánica

Estado: completado en este prototipo.

- Mundo abstracto de siete hexágonos.
- Movimiento libre en Canvas 2D.
- Árbol I y regla de fronteras.
- Árbol II con lugares y recompensas.
- Ejercicios mínimos.
- Persistencia por perfiles.
- Debugger.
- Validación de progresión.
- Build estático y GitHub Pages.

## 0.2 — Esqueleto académico

Estado: cartografía y mecánicas de soporte implementadas; profundidad académica aún provisional.

- Definir entre diez y doce resultados de aprendizaje principales.
- Elaborar matriz resultado–prerrequisito–evidencia–ejercicio–aplicación.
- Separar tronco común y rutas laterales.
- Determinar alcance respecto de un curso universitario real.
- Diseñar taxonomía de dificultad y tipos de solución.
- Implementar consulta temática básica.
- Poblar y revisar los 19 hexágonos actuales más allá de sus nodos demostrativos.

Criterio de salida: el mapa completo puede representarse como grafo curricular aunque la mayoría de los nodos todavía sean placeholders.

## 0.3 — Nodo vertical de referencia

Candidato: inducción de Faraday.

- Contexto histórico trazable.
- Experimento y visualización.
- Derivación matemática.
- Aplicación a generador o transformador.
- Ejemplo resuelto.
- Dos problemas guiados.
- Cuatro problemas de evaluación.
- Una misión transversal.
- Errores frecuentes.
- Revisión por al menos otra persona con experiencia docente.

Criterio de salida: sirve como plantilla de calidad para todos los nodos posteriores.

## 0.4 — Base de autoría visual

Estado: base cartográfica implementada en `0.4.0`; no es todavía un editor completo de cursos.

- Mantener **ORBIT** (`index.html`) con exactamente tres perfiles locales de avance separado:
  Estudiante, Docente y Debug; migrar el antiguo `normal` a Estudiante.
- Reservar las superficies de depuración para Debug y permitir que el perfil Docente
  autocomplete las
  lecciones y misiones evaluables al interactuar.
- Mantener **ORBIT Editor** (`editor.html`) con Docente completo por defecto, Estudiante en
  consulta con Spider/Bee bloqueados y Debug bloqueado antes de crear el modelo.
- Incorporar docks General y Editor retractables y operables con puntero o teclado.
- Implementar Spider para mover nodos y editar requisitos directos `completedLocations`, conservando conceptos/recompensas como relaciones derivadas de solo lectura.
- Implementar Bee para intercambiar zonas dentro de `tier 1` o `tier 2`, con Base fija y rechazo entre anillos.
- Versionar el borrador como esquema editorial `v1`, separado del progreso Estudiante `v3`.
- Añadir autoguardado, importación/exportación JSON validada y deshacer/rehacer.
- Conservar el dataset canónico de 19 zonas, 20 conceptos, 28 lugares, 13 parejas derivadas y cuatro requisitos directos `completedLocations`.
- Mantener operación estática: los perfiles y bloqueos son conveniencias locales, sin backend,
  cuentas, autenticación, dependencia nueva ni publicación automática.

El sistema de contenido escalable que antes ocupaba este hito permanece pendiente como línea posterior:

- evaluar Markdown/MDX mediante ADR;
- separar enunciados y soluciones;
- extender TeX/MathML a ejemplos, soluciones y vista imprimible;
- incorporar ejercicios parametrizados con trazabilidad;
- validar metadatos pedagógicos;
- crear vista imprimible.

## 0.5 — Herramientas y edición versionada

Estado: `0.5.1` publicada; las herramientas y la edición versionada están operativas.

- Incorporar **Gadgets** con calculadora siempre disponible, Explorador de campos 2D
  desbloqueable y Carta de Smith opcional.
- Ampliar ORBIT Editor con **Bowerbird**, separando apariencia Docente publicable y preferencias
  Estudiante personales mediante un catálogo versionado.
- Migrar el documento Docente a `v2` y el progreso a `v4` ligado a la revisión del curso.
- Materializar una edición publicada con digest y ofrecer Validar → impacto → confirmar → aplicar
  mediante un helper exclusivo de loopback, con bloqueo, respaldo, rollback y reset específico.
- Conservar el sitio construido estático, sin backend público, cuentas, mutación de Git ni
  despliegue automático.
- Conservar 19 zonas y ampliar a 29 lugares, 14 parejas derivadas y cinco requisitos directos.

## 0.6 — Curso mínimo utilizable

- Reemplazar los dos árboles históricos por una Red de aprendizaje única de lecciones/misiones
  y apertura territorial derivada por elegibilidad y adyacencia.
- Migrar ORBIT Editor a documento `v3`: Spider administra pertenencia y conexiones académicas,
  mientras NPC, gadgets y transportes permanecen laterales e interactivos.
- Validar raíz única, DAG, 21 nodos académicos, 30 conexiones explícitas, 19 zonas alcanzables y
  disponibilidad de todos los lugares laterales.
- Cinco regiones principales completas.
- Al menos treinta problemas originales revisados.
- Consulta temática funcional.
- Navegación por objetivos de aprendizaje.
- Prueba piloto reducida con estudiantes.
- Registro de errores y mejoras.

## 0.7 — Instrumentación y aplicaciones

- Líneas de transmisión.
- Ondas y energía electromagnética.
- Antenas.
- Interferometría e instrumentación astronómica.
- Misión de enlace Tierra–Luna.
- Transportes narrativos asociados a tecnologías estudiadas.

## 1.0 — Recurso abierto estable

- Diez a doce unidades principales.
- Sesenta a ochenta problemas de alta calidad.
- Soluciones completas y respuestas finales diferenciadas.
- Revisión científica e histórica.
- Documentación de contribución.
- Accesibilidad auditada.
- Resultados de una prueba piloto documentados.
- Licencias y atribuciones completas.

## Ideas posteriores, no comprometidas

- Rutas de cursos adicionales con contratos explícitos de prerrequisitos, equivalencias y conexiones transversales.
- Sincronización opcional entre dispositivos.
- Paquetes de contenido de terceros.
- Edición visual de contenido académico y creación de entidades sobre la base de Editor.
- Publicación remota, cuentas autenticadas y asignación protegida de roles; la matriz local y el
  helper loopback vigentes no adelantan esa seguridad.
- Idioma inglés.
- Integración con LMS mediante un estándar abierto.
- Simulaciones interactivas propias.
- Audio regional más allá del ambiente global provisional.

Cada idea debe demostrar que mejora el aprendizaje o la mantenibilidad antes de aumentar la complejidad.
