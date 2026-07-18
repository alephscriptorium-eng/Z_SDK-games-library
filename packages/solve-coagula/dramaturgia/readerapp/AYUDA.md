# Comando `ayuda` — árbol de navegación (Solve et Coagula)

Documentación para agentes y lectores humanos. **No es ejecutable** — describe rutas reales en el repo.

## Raíz

```
ayuda
├── paneles          → story-board acts 0–7 + estado caché
├── timeline nov     → dual-rail pseudociencia
├── timeline oct     → dual-rail demarcación
├── arquetipos       → blockchain block-6 (capa interpretativa)
├── referencias      → block-5 + INDICE-REFERENCIAS.md
└── deltas           → delta-sc-actual, delta-extremo
```

## paneles

| Acto | Blockchain | Widget | Fuente |
|------|------------|--------|--------|
| Constructor | 0 | `panel-elenco` | `composer-2.5/block-0.md`, REIC |
| Mapa | 1 | `panel-heatmap` | `INDICE2.md`, 24 artículos linea2 |
| Vestuario | 2 | `panel-timeline-dual` | `audit-talk.json`, block-2 |
| Matrix | 3 | `panel-modulo` | 11951034→12763920, block-3 |
| Delta | 4 | `panel-estado-cache` | `delta-sc-actual.md`, block-4 |
| Referencias | 5 | `panel-viaje` | `refs-12763920-index.json` |
| Arquetipos | 6 | `panel-drama` | block-6 (opcional) |

Manifest: [`solve-coagula-story-board.json`](solve-coagula-story-board.json). Specs UI: [`../uichain/`](../uichain/).

## timeline nov

- **Carril A:** milestones pseudo 12719652 → 12910974
- **Carril B:** UT Analiza + SolveCoagula (48 revs cacheadas; sala 0 en 2007)
- Alineación: `audit-talk.json` → `article_alignment` (±24 h)
- Spec: [`../uichain/panel-timeline-dual.prompt.md`](../uichain/panel-timeline-dual.prompt.md)

## timeline oct

- **Carril A:** 11663303 → 11951034 → 11957942 → 12763920
- **Carril B:** UT SolveCoagula, Ctrl_Z, Pabloallo (136 revs oct)
- Sala demarcación: 3 revs (solo 14 oct) — muda el 10 oct
- Spec: mismo `panel-timeline-dual`

## referencias

- Índice humano: `network-engine/linea-aleph/INDICE-REFERENCIAS.md`
- Índice máquina: `cache/viajes/refs-12763920-index.json` (832 destinos únicos, 259 `<ref>`)
- Runbook: `CACHE_RUNBOOK.md` § Viaje referencias-demarcacion
- Spec: [`../uichain/panel-viaje.prompt.md`](../uichain/panel-viaje.prompt.md)

## deltas

| Marco | Ruta | Estado |
|-------|------|--------|
| SC→actual dem | `linea-aleph/snapshots/delta-sc-actual.md` | curated |
| Previo→final dem | `linea-aleph/snapshots/delta-extremo.md` | curated |
| Previo→SC pseudo | `linea-aleph/pseudociencia/snapshots/delta-extremo.md` | curated |

## Convenciones

- 🟢 = hecho de archivo (oldid, bytes, caché verificada)
- 🟡 = conclusión de cadena (blockchain/agentchain)
- Vacío explícito cuando `fetched: false` en meta

---

*Materializado 2026-06-22. Ver `index.md` § Arquitectura.*
