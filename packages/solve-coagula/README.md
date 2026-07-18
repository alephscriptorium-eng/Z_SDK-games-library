# @zeus/solve-coagula — SOLVE ET COAGULA (WP-U87)

Tercer juego de producto (mundo A). **No** endurece la regla de los dos
juegos (delta+pozo siguen siendo el mínimo del engine).

Recreado con:

1. **CARPETA DRAMATURGO** (U86) → `dramaturgia/` (constitución + blockchain +
   story-board + uichain overlay desde el original
   `scriptorium-network-games/SOLVE_ET_COAGULA`, sin modificar el original).
2. **Start pack / Notario** (U62) → `@zeus/startpack-solve-coagula` con
   fixture **linea-aleph** (historial Wikipedia SolveCoagula).
3. **Mesh** — authority-kit + player-mcp-kit + vista lectora con
   **widgets** `@zeus/view-kit` (WP-U113: `panel-elenco` runtime).

El editor U70 **no** materializa aún juegos narrativos (solo `sketch`); ver
informe WP-U87 §hallazgos. Dialectos story-board en editor → U114.

## Widgets (view-kit)

La vista monta `/view-kit` y renderiza widgets del story-board vía
`createDefaultWidgetRegistry` / `mountStoryWidgets`. Primer runtime:
`panel-elenco` (payload en `dramaturgia/readerapp/widgets/panel-elenco.json`).
Otros ids (`panel-heatmap`, …) quedan como placeholder «sin runtime»
hasta WPs siguientes. Specs uichain `*.prompt.md` siguen siendo moldes
generativos; el runtime vive en el kit.

## Arranque

```bash
# desde Z_SDK-games-library
npm run demo:solve-coagula
# e2e casos C-01..C-03
npm run e2e:solve-coagula-mcp
```

Navegador solo con `ZEUS_OPEN_BROWSER=1`.

Puertos MCP/vista: `@zeus/presets-sdk/env` slots `solvePlayer` /
`solveView` (defaults 4132 / 3026; overrides `ZEUS_MCP_SOLVE` /
`ZEUS_PORT_SOLVE_VIEW`).

## Intents

| intent | efecto |
| ------ | ------ |
| `join` | lector en `vestibulo` |
| `open_act` | abre `act-0`…`act-7` del story-board |
| `consult_linea` | lee meta del corpus linea-aleph (fixture/montaje) |
