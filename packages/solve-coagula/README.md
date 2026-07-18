# @zeus/solve-coagula — SOLVE ET COAGULA (WP-U87)

Tercer juego de producto (mundo A). **No** endurece la regla de los dos
juegos (delta+pozo siguen siendo el mínimo del engine).

Recreado con:

1. **CARPETA DRAMATURGO** (U86) → `dramaturgia/` (constitución + blockchain +
   story-board + uichain overlay desde el original
   `scriptorium-network-games/SOLVE_ET_COAGULA`, sin modificar el original).
2. **Start pack / Notario** (U62) → `@zeus/startpack-solve-coagula` con
   fixture **linea-aleph** (historial Wikipedia SolveCoagula).
3. **Mesh** — authority-kit + player-mcp-kit + vista lectora.

El editor U70 **no** materializa aún juegos narrativos (solo `sketch`); ver
informe WP-U87 §hallazgos.

## Arranque

```bash
# desde Z_SDK-games-library
npm run demo:solve-coagula
# e2e casos C-01..C-03
npm run e2e:solve-coagula-mcp
```

Navegador solo con `ZEUS_OPEN_BROWSER=1`.

## Intents

| intent | efecto |
| ------ | ------ |
| `join` | lector en `vestibulo` |
| `open_act` | abre `act-0`…`act-7` del story-board |
| `consult_linea` | lee meta del corpus linea-aleph (fixture/montaje) |
