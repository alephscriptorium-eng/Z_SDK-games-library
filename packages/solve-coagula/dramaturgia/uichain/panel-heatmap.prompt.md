# uichain — panel-heatmap

**Bloque origen:** `blockchain/block-1.md` · **Agentchain:** `agentchain/composer-2.5/block-1.md`

## Objetivo

Heat map de 24 artículos desde `INDICE2.md` / linea2 — órbita enciclopedista de SolveCoagula.

## Datos (DRY)

- `network-engine/linea-aleph/INDICE2.md`
- `network-engine/linea-aleph/manifest2.json` (clusters, `in_linea1`)
- Story-board act-1

## Visualización

- Grid o treemap: artículo × bytes × Δ temporal
- Resaltar demarcación + pseudociencia como polos
- Satélites enlazados desde block-1

## Reglas UX

- Escala de color por Δbytes, no por opinión
- Tooltip con oldid SC si `in_linea2`

## Criterios de aceptación

- [ ] 24 artículos visibles sin truncar a muestra irrisoria
- [ ] Vacío para artículos sin cuerpo cacheado
