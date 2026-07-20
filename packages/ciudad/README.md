# @zeus/ciudad

Juego de engine sobre `@zeus/startpack-ciudad` (patrón pozo). Un rabbit entra,
camina entre anchors por calles, anuncia en plaza y despierta barrios
`latente` ofreciendo un tool.

## Qué incluye

| pieza | ruta |
| ----- | ---- |
| Dominio puro | `src/domain.mjs` — join / walk / announce / wake |
| Contrato | `src/contract.mjs` — `game: 'ciudad'` |
| Escena | `src/scene.mjs` — proyección desde gamemap del startpack |
| Autoridad | `src/authority.mjs` — una room, una autoridad |
| MCP jugador | `src/player-mcp/` — tools player_* |
| Playbook | `spec/CASOS.md` — C-01 MVP + C-02 rechazo muerto |
| Smoke | `fixtures/mvp-smoke.mjs` |

## Arranque

```bash
npm test -w @zeus/ciudad
npm run smoke -w @zeus/ciudad
npm run authority -w @zeus/ciudad   # requiere scriptorium + startpack
npm run start:mcp -w @zeus/ciudad
```

Overrides: `ZEUS_CIUDAD_ROOM`, `ZEUS_MCP_CIUDAD` (default `:4133`),
`ZEUS_STARTPACK_CIUDAD`, `ZEUS_PORT_SCRIPTORIUM`.

## Gap horse / Z06

`wake` asienta el offer (`horseMode: stub`) en ledger. La contraparte física
`tools/call` por horse depende de `@zeus/mcp-launcher` (WP-Z06) — no se
parchea el engine desde el juego.

## Roles

`player` = rabbit · `operator` = plaza · `dj` = dramaturgo (Z07).
