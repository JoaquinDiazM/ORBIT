# ADR 0012: navegación Global y Directa sobre el mismo progreso

- Estado: aceptado para implementar UPD-026; publicación pendiente de revisión humana.
- Fecha: 2026-09-19

## Contexto

UPD-026 añade una vista del mundo centrada en las relaciones académicas. El usuario confirmó
que sus vecinos deben reorganizarse y permitir caminar entre zonas que no comparten frontera
en el mapa Global. Delegó la resolución de apertura, posición y regreso, conservando la Red
de aprendizaje como autoridad. La cohorte 0.9.0 contiene únicamente esta actualización.

## Decisión

Global conserva la cartografía editorial. Directa proyecta la zona actual en el centro y
selecciona hasta seis zonas distintas: primero todas las relacionadas por conexiones
académicas entrantes o salientes, después Base si cabe y finalmente otras zonas mediante un
orden pseudoaleatorio estable por revisión y centro. Los lugares laterales, inventariados y
las conexiones dentro de la propia zona no aumentan ese grado. No se recortan conexiones.

La apertura sigue derivándose del grafo académico y de la adyacencia canónica, como en ADR
0009; elegir Directa no abre ni cierra zonas. En Directa la adyacencia efectiva para caminar
es la de su proyección. Toda frontera visual compartida cumple la misma regla: ambos lados
deben estar abiertos. El movimiento dentro de cada hexágono permanece continuo.

La posición persistida conserva zona y coordenadas canónicas. La proyección aplica una
traslación a zonas, lugares, jugador, colisiones y guías. Al cruzar, recentra sobre la zona
de llegada y conserva el desplazamiento local. Cambiar de modo no concede progreso ni mueve
al estudiante a otro lugar. El índice académico se prepara fuera del loop de animación.

La selección por prioridad puede ser asimétrica: una zona de relleno puede conducir a otra
que ya tiene seis vecinos académicos y no ofrece la procedencia. El historial efímero de
recorrido permite **Volver a la zona anterior** desde Visual si ambas zonas siguen abiertas.
Cuando la procedencia sí forma parte de los vecinos, se coloca en el lado opuesto al cruce.
Global permanece disponible. El historial no se guarda ni forma otra fuente de apertura.

`settings.navigationMode` admite `global` y `direct`, con Global por defecto. Es una
preferencia opcional compatible con progreso v4; no cambia IDs, revisión del curso ni esquema.
El filtro Oculta/Directo/Total de la Red sigue siendo independiente.

El Editor rechaza nuevas publicaciones con más de seis zonas relacionadas y enumera las
zonas implicadas. Un borrador inválido se conserva para repararlo. Las ediciones históricas
ya firmadas se verifican primero contra su digest y se materializan conservando ese exceso
como advertencia; mantienen Global y explican por qué Directa está deshabilitada. Ninguna
otra validación se relaja y una nueva publicación sigue exigiendo el límite.

La edición publicada `69b47331…` ya cumple el límite y no se modifica. Para la semilla de
documentos nuevos, el recorrido real de Spider reubicó `atacama-array` de `applications` a
`antennas`, conservando offset, fuente, IDs y todas las conexiones. Así `applications` pasa
de siete a seis zonas relacionadas. La fábrica reproduce solo esta posición; importar o
migrar documentos existentes conserva su cartografía, incluso si requiere reparación.

## Alternativas consideradas

- Mantener vecinos geográficos en Directa no cumple la reorganización solicitada.
- Abrir zonas según los vecinos mostrados produciría diferencias de progreso entre modos.
- Recortar aristas para cumplir seis perdería relaciones pedagógicas.
- Reservar siempre un vecino para el regreso desplazaría una conexión académica prioritaria.
- Guardar coordenadas proyectadas haría que el mismo guardado significara posiciones distintas
  al cambiar de centro, revisión o modo.

## Consecuencias

Se añade una representación transitable sin duplicar progreso ni sustituir la geometría
editorial. La nueva restricción exige repartir una zona demasiado general antes de publicar.
No se añaden dependencias, animaciones obligatorias, backend ni herramientas editoriales.
El cambio de proyección es inmediato y conserva las preferencias de movimiento reducido.

## Regla de revisión

Probar selección determinista, grado simétrico, apertura común, cruces y bloqueos, retorno,
posición canónica, fallos de almacenamiento, guardados antiguos y ediciones históricas.
JoaquinDiazM revisará teclado, legibilidad y recorrido real en Edge antes de aprobar 0.9.0.
