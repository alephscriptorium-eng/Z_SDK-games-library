# delta — ARG (`packages/delta/*`)

Juego multijugador three.js sobre el runtime Zeus (rooms + contrato único):
el tablero son los volúmenes de datos (firehose + wikicache) y jugar los hace
crecer. Dominio puro + autoridad (`@zeus/authority-kit`) + vistas + MCP por
actor. Derivado evolucionado del `3d-monitor`, autocontenido en esta familia.

| paquete | qué es |
| ------- | ------ |
| [`arg-domain`](arg-domain/) | dominio puro: capa delta sobre `@zeus/protocol`, escena `delta-v0`, flow/maze engines, reducers, feeds sintéticos |
| [`arg-feeds`](arg-feeds/) | adaptador delta (maze) + familias vía `@zeus/feed-kit` |
| [`arg-console`](arg-console/) | portal de vistas — `tablero` (overview) y `jugador` (vista encarnada) |
| [`arg-player-mcp`](arg-player-mcp/) | MCP por actor sobre `@zeus/player-mcp-kit` |
| [`arg-demos`](arg-demos/) | autoridad del juego (10 Hz vía authority-kit) + launcher de la demo de 3 visores |

## Dosier

- [spec/LORE.md](spec/LORE.md) — concepto, las dos fuerzas (Riada/Cantera), mapping con parlament
- [spec/CONTRATO.md](spec/CONTRATO.md) — entidades, wire `arg:*`, invariantes y gates
- [spec/UX.md](spec/UX.md) — sistema de juego, controles, menú de cloak MCP, las dos vistas
- [spec/CASOS.md](spec/CASOS.md) — playbook de validación (método CASOS / `@zeus/playbook-kit`)
- [spec/BACKLOG.md](spec/BACKLOG.md) — work packages del juego (features delta; distinto del backlog de refundación del SDK)

## Demo rápida (3 visores)

```bash
npm run demo:arg
# Navegador 1 → http://localhost:3021/views/tablero
# Navegador 2 → http://localhost:3021/views/jugador?actor=uno
# Navegador 3 → http://localhost:3021/views/jugador?actor=dos
```

Controles jugador: `WASD` mover · `E` montar/bajar del río · `1..3` etiquetar
gota · `Espacio` contacto · `Q` inventario · `X` emote.

No abre navegador salvo `ZEUS_OPEN_BROWSER=1`.

## Disciplina

Una sola autoridad (`arg-demos` + `@zeus/authority-kit`); las vistas solo
emiten intents y proyectan snapshots (gates G-ARG.1..5). Transporte:
socket-server, room del juego (`ARG_DELTA` / env). Segundo juego de referencia
del SDK: **pozo** (`npm run demo:pozo`) — el engine no nombra a ninguno (D-8).
