# Historial de actualizaciones de ORBIT

Este archivo conserva las fichas completas y los intercambios de las cohortes publicadas.
`ORBIT_UPDATES.md` contiene únicamente la cola operativa; `CHANGELOG.md` resume los cambios del
producto para quienes usan ORBIT.

Una cohorte se incorpora aquí solo después de verificar su commit de release en `origin/main`.
Cada sección publicada registra la versión, fecha, hash del release y las fichas UPD retiradas
de la cola. Los IDs son permanentes y no se reutilizan.

El manifiesto de cada cohorte enumera todos sus IDs. Las fichas que siguen deben coincidir
exactamente con esa lista y repetir la misma versión, fecha y hash; las pruebas del repositorio
rechazan omisiones o datos mezclados entre releases. Desde 0.4.1, la última cohorte archivada
debe coincidir con la versión del paquete, salvo durante el estado recuperable `publicando`.
El formato es:

```markdown
## ORBIT X.Y.Z — AAAA-MM-DD

- Estado de la cohorte: `publicado`
- IDs: `UPD-000`, `UPD-001`
- Commit de release: `<hash de 40 caracteres>`

### UPD-000 — Título conservado

- Estado: `publicado`
- Tipo: `...`
- Versión publicada: `X.Y.Z`
- Fecha: AAAA-MM-DD.
- Commit de release: `<el mismo hash>`
- Resultado: resumen verificable.

<!-- Sigue la ficha completa retirada de ORBIT_UPDATES.md. -->
```

## Cohortes publicadas

Ninguna registrada todavía bajo esta metodología.
