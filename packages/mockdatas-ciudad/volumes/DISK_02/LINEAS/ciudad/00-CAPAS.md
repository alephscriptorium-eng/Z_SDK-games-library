# Capas del índice-ciudad

Trabajo por capas. Cada capa debe poder consultarse sola sin cargar toda la ciudad.

| # | Capa | Estado | Entregable |
|---|------|--------|------------|
| 0 | Metáfora + carpeta | ✅ | `README.md`, este archivo |
| 1 | Barrios (= gitmodules) | ✅ | `01-BARRIOS/_INDICE.md` |
| 2 | Locales/naves (= plugins) | ✅ | `02-LOCALES-Y-NAVES/_INDICE.md` |
| 3 | Edificios (= agentes) | ✅ inventario | `03-EDIFICIOS/_INDICE.md` + `GRAFO/print-agentes.txt` |
| 4 | Packs (= prompts/instructions/skills/templates) | ✅ inventario | `04-PACKS/_INDICE.md` |
| 5 | Grafo de handoffs / bridges | ✅ | `GRAFO/` capa 5 + **5.1** (`05.1-INDICE.md`) |
| 6 | Fichas profundas por barrio | ✅ | `01-BARRIOS/_FICHAS.md` + `NN-*.md` (24) |
| 7 | Validación DRY vs Funcional/Tecnico | ✅ | `07-DRY-VALIDACION.md` |
| 7.1 | Sync DRY (aplicar gaps) | ✅ | Tecnico/Funcional/registry/bridges/ciudad — ver `07.1-PLAN-SYNC-DRY.md` |
| Z | Zigurat (`VsCodeExtension`) | ✅ | `00-ZIGURAT/` — teatro-orquestador IDE (transversal) |

## Reglas de actualización

1. Contrastar siempre con disco (`.gitmodules`, `registry.json`, glob de `*.agent.md`).
2. No confiar ciegamente en AGENTS.md / Tecnico.md / @ox si el escaneo discrepa → anotar en §Discrepancias.
3. Un archivo índice por capa; fichas individuales solo cuando la capa lo pida.
