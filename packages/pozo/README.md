# @zeus/pozo

Segundo juego mínimo del monorepo (D-8 / regla de los dos juegos). Nace en
`packages/pozo` y se construye **solo importando engine** (`@zeus/protocol`,
`@zeus/authority-kit`, `@zeus/player-mcp-kit`, `@zeus/playbook-kit`,
`@zeus/view-kit`, más mesh vía presets-sdk/rooms).

## Qué incluye

| pieza | ruta |
| ----- | ---- |
| Dominio puro | `src/domain.mjs` — pozo, nodos, feed drip, `draw_drop` + `empty` (WP-U83) + `force:activate`/`force:deactivate` (WP-U92) |
| Contrato | `src/contract.mjs` — `game: 'pozo'`, catálogo intents (player + operator/dj forces) |
| Autoridad | `src/authority.mjs` — `startAuthority({ game: 'pozo', … })` + gemelo ops `empty_playable` |
| MCP jugador | `src/player-mcp/` — `player_join` / `player_draw_drop` / `player_empty` / `player_state` |
| Vista | `src/view/` + `assets/js/pozo-main.mjs` — view-kit |
| Playbook | `spec/CASOS.md` — C-01 join, C-02 draw_drop, C-03 empty |
| Launcher | `launch.mjs` — `npm run demo:pozo` |

## Arranque

```bash
npm run demo:pozo
```

Levanta socket-server + autoridad + vista (`:3025` por defecto) + MCP (`:4131`).
No abre navegador salvo `ZEUS_OPEN_BROWSER=1`.

Overrides: `ZEUS_POZO_ROOM`, `ZEUS_MCP_POZO`, `ZEUS_PORT_POZO_VIEW`,
`ZEUS_PORT_SCRIPTORIUM`, `ZEUS_SCRIPTORIUM_URL`.

## Tests

```bash
npm test -w @zeus/pozo
npm run e2e:pozo-mcp
```

## Nota de puertos

Los defaults `4131` / `3025` viven en el juego (`readEnvPort`) porque
`presets-sdk/env` aún no declara slots `pozoPlayer` / `pozoView`. Eso es un
hallazgo de mejora del SDK (no se parchea engine desde este WP).
