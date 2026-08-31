# ADR 0002: dos grafos de conocimiento separados

- Estado: reemplazado por [ADR 0009](0009-single-learning-network.md)
- Fecha: 2026-08-25

## Contexto

> Esta decisión describe el contrato histórico vigente hasta ORBIT 0.5.1. ADR 0009 lo reemplaza
> por una Red de aprendizaje única y apertura territorial derivada.

El mundo necesita una progresión territorial general y, al mismo tiempo, desbloqueos locales más finos. Mezclar ambas funciones en un único grafo produciría requisitos difíciles de interpretar y podría convertir gadgets o personajes opcionales en bloqueos involuntarios.

## Decisión

Se modelan dos capas:

1. **Árbol I:** requisitos de zonas. Abre hexágonos completos.
2. **Árbol II:** requisitos de lugares y recompensas dentro de zonas accesibles.

El movimiento visual no se representa como grafo. Es continuo dentro de la geometría disponible.

La frontera entre dos hexágonos es transitable únicamente cuando ambos están abiertos.

## Consecuencias positivas

- Separación clara entre avance curricular general y exploración local.
- Rutas opcionales sin bloquear el tronco.
- Explicación visual sencilla de fronteras.
- Validación de bloqueos más directa.
- Libertad de movimiento conservada.

## Consecuencias negativas

- Los autores deben decidir explícitamente a qué árbol pertenece cada requisito.
- Algunos recorridos históricos complejos pueden necesitar conceptos compartidos o ramas, no un árbol estrictamente lineal.
- La palabra “árbol” es narrativa; la implementación admite grafos dirigidos acíclicos cuando aparezcan bifurcaciones.

## Invariantes

- Ninguna zona depende exclusivamente de contenido dentro de ella.
- Los elementos locales no abren territorios salvo que concedan explícitamente un concepto requerido por el Árbol I.
- Disponibilidad y fronteras se derivan desde el progreso.
