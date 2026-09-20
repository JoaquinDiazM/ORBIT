# Fuente académica en Spider

Esta guía describe la autoría académica publicada en ORBIT 0.8.0 y el procedimiento de agentes
de UPD-025. Las autorizaciones vigentes están en [`ORBIT_UPDATES.md`](../ORBIT_UPDATES.md) y las
entregas publicadas en el [historial](UPDATES_HISTORY.md). La primera ruta sigue siendo
Electromagnetismo y el contenido de muestra continúa siendo provisional.

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

Todo cambio autorizado al cuerpo académico de una lección, misión o NPC se realiza mediante la
UI real de **ORBIT Editor → Spider → Modificar → Editar contenido**. Esto incluye objetivos,
texto, TeX, etapas, ejercicios, explicaciones, fuentes y concesiones admitidas. La regla de
[AGENTS.md](../AGENTS.md) se aplica junto con la autorización de la cohorte inmediata; UPD-025
documenta el procedimiento y no autoriza por sí sola contenido nuevo ni mejoras del motor.

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

Editar directamente `src/data/`, construir un JSON editorial fuera del Editor, llamar al modelo
o a una API no sustituye este recorrido. Tampoco lo hacen un DOM simulado ni una prueba
headless: registra esas ejecuciones como automatización, nunca como autoría o preview en la UI
real. Los fixtures, compiladores, API y pruebas aisladas siguen permitidos para validar el motor.

Si aparece una dificultad, reproduce el fallo y conserva la fuente mínima y el diagnóstico.
Corrige el compilador, renderer o controlador solo dentro del alcance autorizado de la cohorte;
una ampliación requiere registrarse y autorizarse en la cola. Tras la corrección, repite desde
Spider el cambio y su preview. Si la UI no está disponible o no puedes demostrar el aislamiento,
declara la autoría y el preview
**pendientes**: puedes avanzar la automatización autorizada del motor, pero no editar el JSON o
los datos directamente como atajo ni dar el recorrido por superado.

Esta autoría aislada no es la revisión manual canónica. JoaquinDiazM u otro desarrollador
realiza la importación, revisión y **Aplicar** en Edge externo, con el servicio canónico iniciado
desde un terminal visible de VS Code. El agente no pulsa **Aplicar** sobre el curso o los
perfiles reales y congela las escrituras al checkout desde la validación humana hasta recibir
el resultado. Pruebas automáticas, autoría/preview aislados y revisión humana se registran por
separado.

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
