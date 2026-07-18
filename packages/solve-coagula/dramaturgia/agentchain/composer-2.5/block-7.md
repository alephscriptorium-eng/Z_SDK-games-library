# User

¿Cómo lee un humano la historia Solve et Coagula como transmedia — no solo como blockchain?

Diseña el **story-board** de los bloques 0–5: qué paneles, qué timeline dual (artículo ↔ talk) y qué comando `ayuda` expondría un lector interactivo. Especifica qué widgets uichain harían falta (estado de caché, dual-rail nov/oct). El artefacto `solve-coagula-story-board.json` aún no existe: propón su esquema honestamente.

# Agent

## Story-board: seis actos, dos carriles

Un lector humano no debería abrir diecinueve celdas composer: debería **recorrer** la blockchain 0–5 como obra transmedia —con paneles que alternan artículo, conversación, retórica, evolución y pendiente bibliográfico.

### Mapa de paneles (bloques → escenas)

| Panel | Blockchain | Modo lector | Widget uichain sugerido |
|-------|------------|-------------|-------------------------|
| **El constructor** | 0 | Perfil REIC + elenco | `panel-elenco` — tabla roles clicables → oldids |
| **El mapa** | 1 | Árbol + heat map artículo | `panel-heatmap` — 24 artículos desde `INDICE2` |
| **El vestuario** | 2 | Talk nov + oct | `panel-timeline-dual` — carril artículo ↔ talk ±24 h |
| **El thumb** | 3 | Genealogía Matrix | `panel-modulo` — oldids 11951034→12763920 |
| **El epílogo vivo** | 4 | Delta SC→actual | `panel-estado-cache` — cobertura `audit-talk`, `delta-sc-actual` |
| **El grafo pendiente** | 5 | Referencias (gap) | `panel-viaje` — estado Fase 1 `extract_wikilinks.py` |

### Timeline dual (noviembre + octubre)

Inspirado en los viajes talk **block-13** (pseudo nov) y **block-17** (dem oct):

```
Carril A (NS0)     ●──12719652──●──12720368──●──12909144──●──12910974
Carril B (talk)         ○12719797─○12720101─○12719917     (UT, no sala)
                        └─ ±0,5 h ─┘
```

Widget `timeline-dual`: dos pistas sincronizadas; clic en arista abre `audit-talk.json` → `article_alignment`.

### Comando `ayuda` (esquema propuesto)

```
ayuda
├── paneles          → lista 0–5 + estado caché
├── timeline nov     → dual-rail pseudociencia (48 talk / 0 sala)
├── timeline oct     → dual-rail demarcación (136 talk / 3 sala)
├── arquetipos       → enlace a block-6 (capa interpretativa)
└── referencias      → gap block-5 + runbook § referencias-demarcacion
```

### Esquema `solve-coagula-story-board.json` — **materializado**

Ubicación: [`readerapp/solve-coagula-story-board.json`](../../readerapp/solve-coagula-story-board.json). Specs UI: [`uichain/*.prompt.md`](../../uichain/). Ayuda: [`readerapp/AYUDA.md`](../../readerapp/AYUDA.md).

```json
{
  "version": 1,
  "acts": [
    { "id": "act-0", "blockchain": 0, "title": "Constructor", "widgets": ["panel-elenco"] },
    { "id": "act-1", "blockchain": 1, "title": "Mapa", "widgets": ["panel-heatmap"] },
    { "id": "act-2", "blockchain": 2, "title": "Vestuario", "widgets": ["panel-timeline-dual"] },
    { "id": "act-3", "blockchain": 3, "title": "Matrix", "widgets": ["panel-modulo"] },
    { "id": "act-4", "blockchain": 4, "title": "Delta", "widgets": ["panel-estado-cache"] },
    { "id": "act-5", "blockchain": 5, "title": "Referencias", "widgets": ["panel-viaje"], "status": "blocked_until_fase_1" },
    { "id": "act-6", "blockchain": 6, "title": "Arquetipos", "widgets": ["panel-drama"], "optional": true }
  ],
  "dual_rails": [
    { "id": "nov-pseudo", "article_milestones": [12719652, 12720368, 12909144, 12910974], "talk_vistas": ["usuario-discusion-analiza", "usuario-discusion-solvecoagula"] },
    { "id": "oct-dem", "article_milestones": [11951034, 11951164, 11957942], "talk_vistas": ["usuario-discusion-solvecoagula", "usuario-discusion-ctrl-z", "usuario-discusion-pabloallo"] }
  ],
  "cache_panels": {
    "audit_talk": "network-engine/linea-aleph/cache/audit-talk.json",
    "participant_register": "network-engine/linea-aleph/cache/talk/participant-register.json"
  }
}
```

### Integración honesta

| Artefacto | Estado |
|-----------|--------|
| `solve-coagula-story-board.json` | ✅ `readerapp/solve-coagula-story-board.json` |
| Widgets uichain | ✅ `uichain/panel-*.prompt.md` (6 specs) |
| `readerapp/AYUDA.md` | ✅ árbol `ayuda` documentado |
| `readerapp/storychain/` | ✅ promo Track 06; paralelo narrativo |
| Respuestas canónicas 0–7 | ✅ `agentchain/composer-2.5/block-0..7.md` |
| Referencias (act-5) | ✅ índice en `INDICE-REFERENCIAS.md`; Wave A parcial |

Enlazado desde `index.md` § Arquitectura y skill `linea-aleph-browser`.
