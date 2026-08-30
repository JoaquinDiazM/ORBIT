# Descripción maestra del proyecto

## Nombre del proyecto

**ORBIT — Open Roadmap for Building Intuition and Theory**

## Ruta implementada actualmente

**Electromagnetismo**

## Propósito

Crear un recurso educativo abierto y transversal que ayude a construir intuición, teoría y conexiones entre rutas de aprendizaje universitarias. La implementación actual complementa un curso formal de electromagnetismo. Su público principal son estudiantes que consideran estudiar Ingeniería Eléctrica o que cursan sus primeros semestres de especialidad y que ya dominan, como mínimo, cálculo, álgebra lineal y física clásica.

ORBIT pretende migrar y conectar cursos de disciplinas diferentes en el futuro. Esa dirección no significa que la versión actual ya incluya un catálogo multicurso, equivalencias automáticas de prerrequisitos ni navegación entre programas; cada capacidad deberá diseñarse y validarse antes de declararse disponible.

La primera ruta nace de tres años de experiencia del autor como integrante del cuerpo docente de Electromagnetismo Aplicado del Departamento de Ingeniería Eléctrica de la Universidad de Chile. Debe transformar esa experiencia en un recurso público útil, revisable y presentable en un currículo profesional, sin copiar material docente restringido.

## Tesis pedagógica de la ruta actual

En la ruta de Electromagnetismo, la adquisición histórica de las ideas ofrece una secuencia narrativa particularmente fértil: cada época enfrenta fenómenos que las herramientas disponibles todavía no explican; nuevos experimentos obligan a formular representaciones matemáticas; esas representaciones abren aplicaciones tecnológicas. Otras rutas de ORBIT podrán necesitar estructuras causales distintas, siempre subordinadas a sus prerrequisitos y resultados de aprendizaje.

La historia se usa para responder tres preguntas:

1. ¿Qué problema no podía resolverse todavía?
2. ¿Qué nueva herramienta conceptual o matemática se volvió necesaria?
3. ¿Qué tecnología fue posible después?

La historia no sustituye el orden de prerrequisitos. El currículo es un grafo conceptual disfrazado de expedición histórica, no una cronología rígida.

## Dos experiencias del producto

### ORBIT

El estudiante controla un personaje que se mueve libremente en un mundo abstracto bidimensional. El movimiento visual nunca queda restringido a nodos o caminos: puede recorrer cualquier punto físicamente accesible de una zona abierta.

El mundo está dividido en hexágonos. Cada hexágono es una región conceptual amplia y contiene lugares concretos: laboratorios, observatorios, archivos, estaciones, personajes, transportes, gadgets y misiones.

La experiencia combina dos modos que deberán coexistir en una versión futura:

- **Modo Expedición:** progresión narrativa y desbloqueos espaciales.
- **Modo consulta temática:** acceso académico directo por tema, útil para repasar antes de una evaluación.

La versión `0.4.1` conserva sin reducción la Expedición publicada en 0.3.2: 19 zonas, 20 conceptos, 28 lugares y 13 parejas derivadas del Árbol II, de las cuales cuatro tienen un requisito `completedLocations` explícito canónico. El Taller Vectorial sirve como primer nodo desarrollado con mayor profundidad: reúne elementos diferenciales, una comparación visual de campos en SVG, un ejemplo cartesiano guiado y una evaluación cilíndrica independiente. El modo de consulta temática con acceso directo, la profundidad curricular completa y la conexión entre cursos siguen siendo hitos posteriores.

La entrada es `index.html` y ofrece exactamente tres modos locales con progreso `v3` separado:
Estudiante, Docente y Debug. El antiguo `normal` migra a Estudiante sin perder el avance
compatible. Docente se distingue por autocompletar al interactuar lecciones y misiones que
exigen respuesta; Debug conserva herramientas de inspección y avance forzado. El nodo, `F2` y
`window.OrbitDebug` no existen para Estudiante ni Docente. Esta matriz no son cuentas ni
autenticación.

### ORBIT Editor

La entrada `editor.html` sienta una base de autoría cartográfica local. Sin query usa Docente
completo; Estudiante entra en consulta con Spider, Bee y todas las mutaciones bloqueadas; Debug
queda bloqueado antes de crear el modelo. Mantiene una interfaz análoga, pero no ejecuta una
sesión de aprendizaje ni concede progreso.

Dos docks retractables separan operaciones generales y herramientas editoriales. **Spider** mueve lugares y edita únicamente dependencias directas `completedLocations`; conceptos y recompensas continúan como causas derivadas de solo lectura. **Bee** intercambia zonas dentro de su mismo anillo, sin mover la Base ni mezclar fundamentos de `tier 1` con aplicaciones de `tier 2`.

El borrador usa esquema editorial `v1`, autoguardado local, importación/exportación JSON e
historial. Es único e independiente de los tres avances `v3`: seleccionar un perfil no crea un
borrador propio. No se aplica automáticamente a ORBIT. Un docente o mantenedor debe revisar el
archivo exportado, integrarlo al repositorio, validar, construir y desplegar durante el
procedimiento operativo correspondiente.

## Dos grafos de conocimiento

### Árbol del conocimiento I: regiones

Abre hexágonos completos. Una zona se desbloquea cuando se satisfacen sus prerrequisitos conceptuales y existe una conexión geométrica con una zona ya abierta.

Regla de fronteras:

> Una arista compartida es transitable si y solo si los dos hexágonos adyacentes están abiertos. Cuando se abre un nuevo hexágono, se abren todas sus aristas compartidas con hexágonos previamente abiertos.

No se debe diseñar una región cuya única llave se encuentre dentro de esa misma región.

### Árbol del conocimiento II: contenido local

Controla elementos específicos dentro de zonas ya abiertas:

- lugares académicos;
- rutas laterales;
- problemas opcionales;
- personajes secundarios;
- gadgets;
- transportes;
- misiones integradoras;
- tecnologías y hitos narrativos.

Abrir una región no implica revelar ni habilitar todo lo que contiene. La disponibilidad local se deriva de conceptos, lugares completados y recompensas.

## Estructura deseada de un nodo académico maduro

1. El problema de la época.
2. La escena y los instrumentos disponibles.
3. La evidencia observada.
4. El modelo moderno.
5. La formalización matemática.
6. El puente hacia una aplicación ingenieril.
7. Un ejemplo completamente resuelto.
8. Problemas con andamiaje decreciente.
9. Problemas de evaluación con respuesta final oculta.
10. Una misión transversal.
11. Fuentes históricas y científicas.
12. Una recompensa o ruta coherente con lo aprendido.

La versión inicial contiene nodos mucho más breves para demostrar la arquitectura, no para fijar el estándar final de profundidad.

## Filosofía de ejercicios

La progresión pedagógica objetivo es:

> Observar → imitar → completar → resolver → transferir.

Los ejercicios pueden ser:

- ejemplos completamente resueltos;
- problemas guiados;
- problemas de evaluación sin pistas visibles;
- misiones transversales de diseño o análisis;
- preguntas conceptuales y de autoexplicación.

Una solución completa debe explicar la elección de la ley, la geometría, los signos, las unidades y los casos límite. Una respuesta numérica debe incluir unidad y tolerancia.

Las respuestas algebraicas que admiten varias formas válidas se evalúan por equivalencia matemática, no por igualdad textual. La política inicial admite comparación numérica, funcional y por gradiente mediante una gramática restringida y evaluación determinista; no ejecuta código ingresado por el estudiante.

Las figuras interactivas de esta etapa son SVG 2D generados desde funciones de campo. Su objetivo es apoyar una distinción conceptual concreta mediante dominio, escala y muestreo comparables. No constituyen un motor de gráficos general, una escena 3D ni una autorización para añadir dependencias.

Las fuentes se reservan para afirmaciones históricas, científicas o datos que necesitan trazabilidad. Operaciones elementales no requieren atribución. Cuando una fórmula, propiedad o constante con fuente se desbloquea, su procedencia se comunica una vez en esa transición. Los menús de **Símbolos**, **Constantes**, **Formulario** y **Glosario** conservan la consulta, pero no repiten un cuadro bibliográfico por entrada; el contexto docente de origen permanece centralizado en el README.

## Dirección narrativa

El protagonista es el estudiante, no una colección de científicos presentados como héroes aislados. Cada etapa sigue la estructura:

> fenómeno sin explicar → evidencia → nueva representación → formalización → problema resuelto → tecnología disponible.

Los lugares pueden inspirarse en sitios históricos reales, pero el mapa no reproduce continentes ni océanos. Es un mundo propio que permite ordenar el conocimiento con libertad y representar una historia global de la ciencia.

La progresión de transportes debe ser ligera y significativa. Caminar, carro eléctrico, tren, radio, aeronave o nave espacial son recompensas visuales; no deben convertirse en minijuegos que distraigan del contenido.

## Culminación prevista de la ruta actual

Una posible misión final es restablecer un enlace electromagnético Tierra–Luna, combinando propagación, antenas, potencia, densidad de flujo, retardo, ruido, polarización y presupuesto de enlace. Apollo 11 puede funcionar como recompensa narrativa, pero el desafío académico debe ser electromagnético.

Antes de ello, una aplicación en instrumentación astronómica e interferometría —por ejemplo inspirada en observatorios del desierto de Atacama— puede dar al proyecto una identidad técnica chilena y conectar ondas, fase, antenas y adquisición distribuida.

## Restricciones de alcance

El proyecto debe privilegiar contenido y ejercicios sobre producción audiovisual. En su etapa inicial no debe requerir:

- motor de juego;
- backend;
- cuentas de usuario;
- base de datos;
- instalación del estudiante;
- gráficos 3D;
- telemetría;
- assets costosos;
- animaciones largas.

La versión `0.4.1` no añade backend, autenticación, gráficos 3D, telemetría ni dependencias. El avance dentro de etapas, los parámetros de figuras y las respuestas parciales siguen siendo estado local de sesión. El progreso de ORBIT permanece en `v3`; el documento Editor comienza en `v1` bajo otra clave y otro contrato. Cambiar cualquiera de ellos requiere versionar y sanear el esquema correspondiente, sin confundir ambos espacios.

La entrada Editor no escribe archivos fuente, Git ni el servidor. Sus bloqueos por query no
constituyen control de acceso; la publicación sigue siendo manual y cualquier restricción real
para estudiantes o docentes debe proporcionarla la infraestructura externa.

La interfaz debe verse suficientemente clara para probar la experiencia, pero la excelencia del proyecto se medirá por rigor, progresión, calidad de ejercicios, trazabilidad y utilidad para estudiantes.

## Definición del producto

**Recurso educativo abierto e interactivo, con una experiencia de aprendizaje basada en dos grafos de conocimiento y una base local de autoría cartográfica.**

No se presenta todavía como MOOC, videojuego completo, LMS ni plataforma multicurso operativa. Técnicamente son dos entradas web estáticas sobre la misma primera ruta: ORBIT y ORBIT Editor. El segundo no es aún un editor completo de contenido ni un sistema de publicación.

## Criterios de éxito a mediano plazo

- Columna vertebral de resultados de aprendizaje revisada por docentes.
- Diez a doce regiones o unidades principales.
- Sesenta a ochenta problemas originales de alta calidad.
- Correspondencia explícita entre resultados, actividades y evaluaciones.
- Consulta temática y modo Expedición.
- Pruebas piloto con estudiantes.
- Registro de errores conceptuales frecuentes.
- Accesibilidad razonable y navegación por teclado.
- Repositorio abierto, documentado y fácil de contribuir.
