# @zeus/ciudad

Juego de engine sobre `@zeus/startpack-ciudad` (patrón pozo). Un rabbit entra,
camina entre anchors por calles, anuncia en plaza y despierta barrios
`latente` ofreciendo un tool. Los **tres jugadores** (residente / visitante /
corriente) se distinguen por contrato de mapeo — sin canal nuevo.

## Qué incluye

| pieza | ruta |
| ----- | ---- |
| Dominio puro | `src/domain.mjs` — join / walk / announce / wake / sleep |
| Contrato | `src/contract.mjs` — `game: 'ciudad'` |
| Mapeo jugadores | `src/jugadores.mjs` — tipo → rol + `features[]` |
| Lore | `spec/LORE.md` · `spec/FLUJO-RESIDENTE.md` |
| Escena | `src/scene.mjs` — proyección desde gamemap del startpack |
| Autoridad | `src/authority.mjs` — una room, una autoridad |
| MCP jugador | `src/player-mcp/` — tools player_* |
| Playbook | `spec/CASOS.md` — C-01..C-04 |
| Smoke | `fixtures/mvp-smoke.mjs` · `fixtures/tablero-jugadores.mjs` |

## Arranque

```bash
npm test -w @zeus/ciudad
npm run smoke -w @zeus/ciudad
npm run tablero-jugadores -w @zeus/ciudad
npm run authority -w @zeus/ciudad   # requiere scriptorium + startpack
npm run start:mcp -w @zeus/ciudad
```

Overrides: `ZEUS_CIUDAD_ROOM`, `ZEUS_MCP_CIUDAD` (default `:4133`),
`ZEUS_STARTPACK_CIUDAD`, `ZEUS_PORT_SCRIPTORIUM`.

## Tres jugadores (mapeo)

| Tipo | Rol catálogo | Features |
| ---- | ------------ | -------- |
| residente | `operator` | `jugador:residente` + `residente:<edificio>` |
| visitante | `player` | `jugador:visitante` |
| corriente | `player` | `jugador:corriente` |

Residente nace con `wake` (edificio `vivo`) y se retira con `sleep` el
mismo tick. Clientes eje IV: **tablero** (`tablero-jugadores`) y
**cronista** (proyector dramaturgo).

## Gap horse / federación

`wake` asienta el offer (`horseMode: stub|horse`) en ledger. Federación
peer externo: `npm run federation-smoke -w @zeus/ciudad`.

## Roles

`player` = visitante o corriente · `operator` = residente (edificio) ·
`dj` = cronista (solo narrar).
