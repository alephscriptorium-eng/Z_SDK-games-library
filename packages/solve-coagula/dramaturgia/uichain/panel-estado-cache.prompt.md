# uichain — panel-estado-cache

**Bloque origen:** `blockchain/block-4.md` · **Agentchain:** `agentchain/composer-2.5/block-4.md`

## Objetivo

Panel de cobertura caché y deltas SC→actual para demarcación y pseudociencia.

## Datos (DRY)

- `network-engine/linea-aleph/snapshots/delta-sc-actual.md` (status: curated)
- `network-engine/linea-aleph/snapshots/delta-extremo.md`
- `network-engine/linea-aleph/pseudociencia/snapshots/delta-extremo.md`
- `snapshots/actual/meta.json`, `pseudociencia/snapshots/actual/meta.json`
- `cache/audit-talk.json`

## Visualización

- Barras % cuerpos cacheados (dem milestones, talk oct/nov)
- Tarjetas extremos: previo / sc_cierre / actual con `fetched` flag
- Enlace a delta markdown curado

## Reglas UX

- `fetched: false` en talk `actual` → badge amarillo, no error
- Distinguir meta sin cuerpo vs cuerpo sin meta

## Criterios de aceptación

- [ ] dem actual 166864369 muestra fetched:true
- [ ] pseudo actual 173863282 muestra fetched:true
- [ ] Oleada post-sc-milestones marcada pendiente
