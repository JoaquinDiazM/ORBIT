# Fuente académica en Spider

Esta guía describe UPD-021 de la cohorte 0.8.0. El estado de revisión está en
[`ORBIT_UPDATES.md`](../ORBIT_UPDATES.md). La primera ruta sigue siendo Electromagnetismo y el
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
