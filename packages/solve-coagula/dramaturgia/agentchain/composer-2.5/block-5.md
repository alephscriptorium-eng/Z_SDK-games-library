# User

Tras enviarle a solvecoagula el tramo bloques 0-4, ha comentado un dato importante: "No habéis puesto foco en las más de doscientas referencias que aporté en la entrada de demarcación". Vamos a cargar la caché de esto. Diseñar un plan de big picture. Hacer el mapa de referencia y cómo esos enlaces contribuyen a la conversación.

# Agent

## El hueco que señaló el constructor

El inventario completo de 200+ referencias **no está materializado** en índices dedicados — este bloque diseña el viaje, no fabrica el mapa.

El cierre de SolveCoagula en demarcación ([12763920](https://es.wikipedia.org/w/index.php?title=Problema_de_la_demarcación&oldid=12763920)) no es solo prosa filosófica: es un **grafo de enlaces** —bibliografía, `{{cita}}`, wikilinks internos, referencias a revistas, TVE, CERN— que articula el argumento desde Alcock hasta Matrix, Tipler, Nobel y falsacionismo. Inventario verificado 2026-06-22: **259** etiquetas `<ref>`, **832** destinos únicos, **774** artículos NS0 únicos en `refs-12763920-index.json`. La cifra del constructor (**200+**) queda **confirmada**.

Los bloques 0–4 trataron arquitectura, REIC, delta de bytes y Matrix como módulo —pero **no** el rol conversacional de cada enlace en la red epistemológica. Ese es el gap.

### Qué hay cacheado hoy

| Capa | Cobertura | Limitación |
|------|-----------|------------|
| Cierre SC `12763920` | ✅ wikitext + índice | `refs-12763920-index.json` generado |
| Milestones dem | 99/99 meta, ~31 % cuerpos | No todas las versiones del grafo |
| Viajes hipervinculados | ✅ Fase 1–2 | `2026-referencias-dem.json`, clusters |
| Talk oct | ✅ 136 cuerpos vestuario | Wave D: 0 hits talk×refs |
| Índice referencias | ✅ | `INDICE-REFERENCIAS.md` |

### Plan big picture — viaje `referencias-demarcacion`

**Fase 1 — Inventario (sin fetch masivo)**

```bash
cd network-engine/linea-aleph
python scripts/extract_wikilinks.py --oldid 12763920 --output cache/viajes/refs-12763920-index.json
# (o parser wikitext local: [[...]], {{cite}}, <ref>)
```

Salida: lista tipada `{target, namespace, sección_origen, tipo: internal|biblio|external}`.

**Fase 2 — Clasificación temática**

| Cluster | Ejemplos esperados | Pregunta |
|---------|-------------------|----------|
| Paranormal/Matrix | Bostrom, Alcock, Tipler | ¿Pop como puente a física? |
| Filosofía clásica | Popper, Kuhn, Feyerabend, Quine | Núcleo demarcatorio |
| Autoridad científica | Josephson, Guth, Linde | ¿Quién legitima lo «no falsable»? |
| Cultura/media | NYT, TVE, CERN | Retórica de prestigio |
| Satélites internos | Pseudociencia, Falsacionismo, Cuerdas | Puentes al grafo SC |

**Fase 3 — Cacheo selectivo (oleadas)**

| Wave | Targets | Script |
|------|---------|--------|
| **A** | Top 30 enlaces internos NS0 por frecuencia en 12763920 | `fetch_snapshot.py` SC_cierre de cada título |
| **B** | Referencias externas con URL en `<ref>` | meta only + muestra 10 % cuerpo destino |
| **C** | Diff grafo 11951034 → 12763920 → 166864369 | `fetch_compare.py` + diff de conjuntos enlace |
| **D** | Talk: menciones de títulos citados en UT oct | cruce `participant-register.json` × índice refs |

**Fase 4 — Mapa de conversación**

Cada enlace no es aislamiento bibliográfico: es **acto de traducción** (inglés → español), **invitación al lector** (pop antes de Popper), o **puente** hacia pseudociencia (cuerdas, holismo). El mapa debe responder:

1. ¿Qué referencias **solo** aparecen en demarcación SC y fueron podadas después?
2. ¿Cuáles enlazan a artículos que SC también editó (`in_linea2`)?
3. ¿Qué refs cita Pabloallo o Fernando Estel en talk oct —alineación o tensión?

### Contribución a la conversación (hipótesis verificable post-inventario)

- **Constructor:** refs como alfabetización del lector — Matrix ref antes de leer Popper.
- **Comunidad post-SC:** poda selectiva de clusters paranormal/autoridad — no borrado aleatorio.
- **Talk oct:** crítica a «conclusiones» sin citar bibliografía — desacople roca/engranaje (block-18).

### Qué falta para responder con rigor

| Entregable | Estado |
|------------|--------|
| `refs-12763920-index.json` | ✅ 1118 entradas tipadas, 832 destinos únicos |
| Conteo exacto 200+ | ✅ 259 `<ref>`, 832 únicos |
| Cuerpos destino top-30 | ⚠️ Wave A parcial (~29; HTTP 429 en batch) |
| Grafo diff SC→actual | ✅ `refs-wave-c-diff.json` |
| Cruce talk×refs | ✅ `refs-wave-d-talk-cross.json` (0 hits — vacío explícito) |

**Veredicto:** Fase 1–2 completas; mapa conversacional parcialmente respondible. Wave A requiere reanudar con `--sleep 1.5`; oleada B (refs externas meta) y cruce `in_linea2` pendientes.

### Próximo paso recomendado

1. Reanudar Wave A: `fetch_snapshot.py --latest --title <destino> --sleep 1.5` para top NS0 faltantes.
2. Cruzar destinos con `manifest2.json` (`in_linea2`).
3. Índice humano: [`INDICE-REFERENCIAS.md`](../../../../network-engine/linea-aleph/INDICE-REFERENCIAS.md).
