# Descripción maestra del proyecto

## Nombre de trabajo

**Atlas de Electromagnetismo Aplicado**

## Propósito

Crear un recurso educativo abierto, complementario a un curso universitario formal de electromagnetismo o electromagnetismo aplicado. Su público principal son estudiantes que consideran estudiar Ingeniería Eléctrica o que cursan sus primeros semestres de especialidad y que ya dominan, como mínimo, cálculo, álgebra lineal y física clásica.

El proyecto nace de tres años de experiencia del autor como integrante del cuerpo docente de Electromagnetismo Aplicado del Departamento de Ingeniería Eléctrica de la Universidad de Chile. Debe transformar esa experiencia en un recurso público útil, revisable y presentable en un currículo profesional, sin copiar material docente restringido.

## Tesis pedagógica

La adquisición histórica de las ideas electromagnéticas ofrece una secuencia narrativa particularmente fértil: cada época enfrenta fenómenos que las herramientas disponibles todavía no explican; nuevos experimentos obligan a formular representaciones matemáticas; esas representaciones abren aplicaciones tecnológicas.

La historia se usa para responder tres preguntas:

1. ¿Qué problema no podía resolverse todavía?
2. ¿Qué nueva herramienta conceptual o matemática se volvió necesaria?
3. ¿Qué tecnología fue posible después?

La historia no sustituye el orden de prerrequisitos. El currículo es un grafo conceptual disfrazado de expedición histórica, no una cronología rígida.

## Experiencia del estudiante

El estudiante controla un personaje que se mueve libremente en un mundo abstracto bidimensional. El movimiento visual nunca queda restringido a nodos o caminos: puede recorrer cualquier punto físicamente accesible de una zona abierta.

El mundo está dividido en hexágonos. Cada hexágono es una región conceptual amplia y contiene lugares concretos: laboratorios, observatorios, archivos, estaciones, personajes, transportes, gadgets y misiones.

La experiencia combina dos modos que deberán coexistir en una versión futura:

- **Modo Expedición:** progresión narrativa y desbloqueos espaciales.
- **Modo Atlas:** acceso académico directo por tema, útil para repasar antes de una evaluación.

La versión `0.3.0` conserva la Expedición de dos anillos e incorpora la primera capa del modo Atlas: un menú de consulta con simbología, constantes, formulario y glosario derivados del progreso. El acceso académico directo por tema y la profundidad curricular completa siguen siendo hitos posteriores.

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

## Dirección narrativa

El protagonista es el estudiante, no una colección de científicos presentados como héroes aislados. Cada etapa sigue la estructura:

> fenómeno sin explicar → evidencia → nueva representación → formalización → problema resuelto → tecnología disponible.

Los lugares pueden inspirarse en sitios históricos reales, pero el mapa no reproduce continentes ni océanos. Es un mundo propio que permite ordenar el conocimiento con libertad y representar una historia global de la ciencia.

La progresión de transportes debe ser ligera y significativa. Caminar, carro eléctrico, tren, radio, aeronave o nave espacial son recompensas visuales; no deben convertirse en minijuegos que distraigan del contenido.

## Culminación prevista

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

La interfaz debe verse suficientemente clara para probar la experiencia, pero la excelencia del proyecto se medirá por rigor, progresión, calidad de ejercicios, trazabilidad y utilidad para estudiantes.

## Definición del producto

**Recurso educativo abierto e interactivo, con elementos ligeros de juego y navegación basada en dos grafos de conocimiento.**

No se presenta todavía como MOOC ni como videojuego completo. Técnicamente es una aplicación web estática y, pedagógicamente, un atlas narrativo de aprendizaje.

## Criterios de éxito a mediano plazo

- Columna vertebral de resultados de aprendizaje revisada por docentes.
- Diez a doce regiones o unidades principales.
- Sesenta a ochenta problemas originales de alta calidad.
- Correspondencia explícita entre resultados, actividades y evaluaciones.
- Modo Atlas y modo Expedición.
- Pruebas piloto con estudiantes.
- Registro de errores conceptuales frecuentes.
- Accesibilidad razonable y navegación por teclado.
- Repositorio abierto, documentado y fácil de contribuir.
