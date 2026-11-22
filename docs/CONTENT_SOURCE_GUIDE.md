# Fuente académica en Spider

Esta guía describe la fuente académica vigente de Spider. Los criterios de rigor, progresión y
fuentes están en [Autoría de contenido](CONTENT_AUTHORING.md); los controles y la aplicación,
en la [guía del Editor](EDITOR_GUIDE.md). La primera ruta sigue siendo Electromagnetismo y el
contenido de muestra continúa siendo provisional.

## Editar un nodo

En Editor Docente abre **Spider → Modificar**, selecciona una lección, misión o NPC y pulsa
**Editar contenido**. El ID y las conexiones del nodo siguen administrándose fuera de la
fuente. La ventana presenta el texto, sus diagnósticos, plantillas y una previsualización.

La fuente válida se guarda en el documento editorial y participa en Deshacer/Rehacer,
exportación JSON, diff y aplicación. Un texto incompleto se conserva como borrador recuperable;
los diagnósticos indican la línea y columna. Ese texto no sustituye la última fuente válida del
curso. Exporta la fuente antes de abandonar un navegador con problemas de almacenamiento.

Si el documento cambió mientras había un texto recuperable, el Editor muestra un conflicto.
Revisa ambas versiones antes de conservar el borrador sobre la base actual o descartarlo.
Cambiar de nodo, cerrar el editor de fuente o recargar no debe perder el texto recuperable.

La previsualización usa el mismo renderer, figuras y evaluación que ORBIT. Sus respuestas y
etapas pertenecen únicamente a esa vista; no completan lugares ni conceden progreso real.
**Validar** en Resumen comprueba el curso completo. En mantenimiento, **Volver a comprobar
servicio** prueba el borrador con la suite completa en una copia temporal y muestra los fallos
antes de aplicar. **Aplicar** sigue necesitando mantenimiento, esa comprobación aprobada,
revisión del impacto, confirmación y la sesión canónica de autoría.

## Procedimiento obligatorio para agentes

La [política de autoría de agentes](../AGENTS.md#autoría-de-contenido-por-agentes) exige la UI
real de Spider y una autorización vigente en [`ORBIT_UPDATES.md`](../ORBIT_UPDATES.md). Para
cada cambio académico:

1. Identifica la UPD y los nodos afectados. Prepara una copia temporal del proyecto y un navegador
   con perfil y almacenamiento propios, cuyo aislamiento del entorno del desarrollador compruebes.
   Identifica la sesión, raíz, URL y PID; cualquier servicio debe ser acotado y estar en primer
   plano. No ocupes una sesión canónica ni adoptes procesos ajenos.
2. Abre la UI real en modo Docente, selecciona el nodo en Spider y edita su fuente mediante
   **Modificar → Editar contenido**. Usa los controles de fuente, diagnósticos y plantillas;
   conserva IDs y trazabilidad científica. Para un nodo nuevo, créalo primero con Spider y
   continúa por esa misma ruta de modificación.
3. Comprueba en esa ventana los diagnósticos, la fuente válida y la previsualización. Recorre las
   etapas y las respuestas pertinentes, y valida el documento desde Resumen. Registra nodo/ID,
   fuente o exportación resultante, validación y comportamiento observado en el preview.
4. Exporta el borrador desde los controles del Editor a un archivo temporal para la posterior
   importación y revisión humana. Identifica ese archivo en la entrega; no lo copies al
   artefacto canónico ni lo versiones como sustituto de **Aplicar**. Cierra las sesiones y
   procesos propios, retira la copia y sus cachés y declara cualquier exportación conservada
   para la entrega. No uses ni limpies perfiles, cachés o progreso reales del desarrollador.

Si falla el Editor, conserva pasos, nodo, fuente mínima, diagnóstico y resultado esperado.
Corrige el motor solo dentro del alcance autorizado y vuelve a Spider; una ampliación requiere
su propio punto en la cola. Sin UI o aislamiento comprobado, declara autoría y preview
**pendientes**. Editar datos/JSON, llamar al modelo/API o usar DOM simulado/headless no sustituye
el recorrido; los fixtures y pruebas aisladas comprueban el motor.

Entrega la exportación al desarrollador para importación, revisión y **Aplicar** en Edge externo
con servicio iniciado desde un terminal visible de VS Code. El agente no aplica al curso ni a
los perfiles reales y congela el checkout entre validación humana y resultado de aplicación.
Registra automatización, autoría/preview aislados y revisión humana por separado.

## Sintaxis

La primera línea es `@orbit 1`. El formato acepta párrafos, listas con `-`, encabezados `##`
para secciones y encabezados `# Etapa <id> | <título>` para etapas. Los bloques cercados
`orbit:metadata`, `orbit:section` y `orbit:exercise` contienen JSON con campos admitidos.
El serializador usa también bloques tipados auxiliares para preservar texto y estructuras
existentes sin pérdida. Las plantillas del Editor son la referencia práctica para cada figura
y tipo de ejercicio.

Ejemplo mínimo de sintaxis con un problema ilustrativo:

~~~~markdown
@orbit 1

```orbit:metadata
{
  "objective": "Calcular la magnitud de una fuerza en un campo uniforme.",
  "grants": {}
}
```

## Modelo

En este ejemplo simplificado, la magnitud de la fuerza satisface $F=qE$ para una carga positiva.

```orbit:exercise
{
  "type": "numeric",
  "prompt": "Una carga de 3 C está en un campo uniforme de 2 N/C. ¿Cuál es la magnitud de la fuerza?",
  "expected": 6,
  "absoluteTolerance": 0.01,
  "unit": "N",
  "explanation": "La ley aplicable es $F=qE$: 3 C por 2 N/C da 6 N. La fuerza apunta en el sentido del campo por ser positiva la carga."
}
```
~~~~

Para expresiones en prosa usa `$...$` o `\(...\)`; `$$...$$` y `\[...\]` admiten modo bloque.
En `equation.tex` y `promptPrefix` escribe TeX sin delimitadores. Dentro de una cadena JSON,
una barra invertida se escribe duplicada: `"\\nabla f"`. La vista usa KaTeX local con MathML.

Los ejercicios admiten alternativas, respuesta numérica con unidad/tolerancia, expresiones,
secuencias guiadas/binarias y confirmaciones. Las figuras son componentes registrados de campos
vectoriales y tres cargas; no pueden añadirse scripts ni paquetes a la fuente. Los NPC conservan
su cierre no evaluativo.

No se admite HTML, código ejecutable, figuras desconocidas ni enlaces con esquemas ejecutables.
El compilador localiza errores de estructura, tipos y límites. La fuente de un nodo tiene un
límite de 180 000 bytes; el documento completo conserva el máximo de 900 000 bytes.

## Etapas y ejercicios

Usa las plantillas de la ventana de fuente para insertar estructuras admitidas. Los contratos
completos están en las [plantillas editoriales](../src/editor/content-source-templates.js), el
[compilador](../src/core/content-source.js) y el [validador](../src/core/validator.js); no es
necesario escribir objetos runtime del catálogo.

| Tipo | Datos y criterio de uso |
|---|---|
| `choice` | Consigna, alternativas, `answerIndex` y explicación. |
| `numeric` | `expected`, unidad, tolerancia absoluta o relativa y explicación; acepta coma o punto decimal. Usa tolerancia absoluta cerca de cero y relativa cuando varíe la escala. |
| `expression` | Política matemática restringida y explicación; evalúa equivalencia numérica, funcional o por gradiente, sin ejecutar código del autor. |
| `sequence` | Intervenciones guiadas o binarias; el andamiaje y la retroalimentación dependen de la política elegida. |
| `none` | Etapa de lectura; **Continuar** abre la siguiente. |
| `acknowledge` | Orientación, encuentro no evaluativo o cierre narrativo; no concede un concepto central. |

Cada etapa tiene ID estable y único dentro del nodo. Una etapa evaluada abre la siguiente solo
después de una respuesta correcta; un nodo académico que concede progreso termina con un
ejercicio evaluable. Los lugares heredados con secciones y ejercicio siguen funcionando como
una sola etapa. El avance interno y las respuestas parciales pertenecen a la sesión: el hecho
durable es completar el lugar.

Un NPC puede registrar un encuentro con `acknowledge`, sin alternativas ni respuesta esperada;
una biblioteca puede desbloquearse por ese encuentro. La evaluación y concesión de un concepto
central corresponden a una lección o misión separada. El tipo interno `action` pertenece a
herramientas del sistema y no se usa como ejercicio académico.

El evaluador de expresiones usa gramática restringida, límites de complejidad, puntos fijos y
derivación automática. La comparación determinista no demuestra equivalencia simbólica global:
una expresión construida para coincidir solo en los puntos de prueba puede dar un falso positivo.

## Figuras y matemática accesibles

Toda ecuación incluye una descripción visible. KaTeX genera salida visual y MathML con
`trust: false`; no se admiten HTML ni comandos que requieran confianza. Las expresiones se
compilan con la configuración de producción durante las pruebas.

Las figuras de campos 2D deben usar dominio, escala y muestreo comparables cuando se pide
comparar campos. La presentación `point-charge-field` usa una alternativa y un descriptor con:

- dominio cuadrado y punto de observación dentro de él;
- exactamente tres cargas de IDs únicos, posición válida y valor normalizado en `[-1,1]`;
- rango de carga que incluya cero, paso de teclado positivo y radio de singularidad explícito;
- título, descripción y caption que expliquen el modelo normalizado.

La figura de tres cargas admite puntero y teclado, muestra contribuciones y suma, y declara la
singularidad si una carga coincide con el punto de observación. Posiciones, valores y foco son
efímeros: no se incorporan al progreso ni se suaviza la singularidad para ocultarla. Estas figuras
registradas apoyan actividades concretas; la fuente no incorpora un motor gráfico general.

## Ancho y teclado

Arrastra el borde izquierdo de la ventana para ampliar fuente y preview. También puedes enfocar
el separador con Tab y usar ←/→; Shift cambia el ancho en pasos mayores. Inicio o **Restaurar
ancho** recupera el valor predeterminado. Escape cancela un arrastre activo. ORBIT y Editor
recuerdan sus anchos por separado, fuera del contenido y del progreso.

## Compatibilidad

El documento Docente migra `v5 → v6` y conserva cuerpos, IDs, nombres, posición, inventario y
tombstones. Una edición histórica conserva su firma y revisión original antes de migrarse en
memoria. Renombrar un nodo no regenera su cuerpo. El progreso sigue en esquema `v4`; una nueva
edición aplicada utiliza el reinicio específico ya descrito en la
[guía del Editor](EDITOR_GUIDE.md).
