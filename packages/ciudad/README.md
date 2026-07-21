# @zeus/ciudad

Juego de engine sobre `@zeus/startpack-ciudad` (patrón pozo). Un rabbit entra,
camina entre anchors por calles, anuncia en plaza y despierta barrios
`latente` ofreciendo un tool. Los **tres jugadores** (residente / visitante /
corriente) se distinguen por contrato de mapeo — sin canal nuevo.

## Qué incluye

| pieza | ruta |
| ----- | ---- |
| Dominio puro | `src/domain.mjs` — join / walk / announce / wake / sleep + loop (decay / energía / objetivo / presencia / acta) |
| Contrato | `src/contract.mjs` — `game: 'ciudad'` · `LOOP_DEFAULTS` · snapshot `objetivo` |
| Presencia | `src/presencia.mjs` — SeñalDePresencia v1 · FuentePresencia · adapter mock |
| Acta | `src/acta.mjs` — ActaDeBarrio v1 · plaza ledger · wake sin acta → `roto` · `completarReparacion` |
| Misiones | `src/misiones.mjs` — selección censo (zona + decay) · viaje A→B · idle = random-walk |
| Mapeo jugadores | `src/jugadores.mjs` — tipo → rol + `features[]` |
| Lore | `spec/LORE.md` · `spec/FLUJO-RESIDENTE.md` |
| Escena | `src/scene.mjs` — proyección desde gamemap del startpack |
| Autoridad | `src/authority.mjs` — una room, una autoridad |
| MCP jugador | `src/player-mcp/` — tools player_* |
| Playbook | `spec/CASOS.md` — C-01..C-07 |
| Smoke | `fixtures/mvp-smoke.mjs` · `fixtures/loop-smoke.mjs` · `fixtures/presencia-smoke.mjs` · `fixtures/tablero-jugadores.mjs` · `fixtures/misiones-smoke.mjs` |

## Arranque

```bash
npm test -w @zeus/ciudad
npm run smoke -w @zeus/ciudad
npm run loop-smoke -w @zeus/ciudad
npm run presencia-smoke -w @zeus/ciudad
npm run tablero-jugadores -w @zeus/ciudad
npm run misiones-smoke -w @zeus/ciudad
npm run authority -w @zeus/ciudad   # requiere scriptorium + startpack
npm run start:mcp -w @zeus/ciudad
```

## Misiones (ciudadanos con intención)

Destino canónico: `src/misiones.mjs` (`@zeus/ciudad/misiones`). Origen =
zona home del censo; destino = barrio `latente`/`muerto`/`roto` (bias decay).
Camino vía `@zeus/linea-kit/viaje` (`planPath` / `runViaje` /
`viajeToWalkIntents`). Sin misión activa: `nextIdleWalk` (random-walk sobre
enlaces). El dominio solo aplica `walk`; no reimplementa pathfinding.


Overrides: `ZEUS_CIUDAD_ROOM`, `ZEUS_MCP_CIUDAD` (default `:4133`),
`ZEUS_STARTPACK_CIUDAD`, `ZEUS_PORT_SCRIPTORIUM`.

## Loop (decay · energía · objetivo · presencia)

Reducer puro: `tick` aplica decay con reloj inyectable (`now`); `wake` gasta
energía; `announce` en plaza recarga; snapshot expone
`objetivo: { vivos, umbral, cumplido }` (bien común, sin ganador individual).
**Presencia:** señales `SeñalDePresencia` vía `tick(..., { señales })` o
`FuentePresencia` (`attachFuentePresencia`); barrio con señal en los últimos
`ticksPresencia` (`TICKS_PRESENCIA` en `LOOP_DEFAULTS`) no degrada. Clase
`flujo` cuenta presencia y **no** recarga energía (solo `announce`). Adapter
mock en `presencia.mjs`; health/paradas/zona = solo interfaz.

## Acta de barrio + `roto` (§A3)

Ventanas terminan; solo plaza/ledger sobrevive. `sleep` emite **ActaDeBarrio
v1** al ledger (`kind: acta`). Wake sin acta persistida → barrio `roto`
(drift). Misión reparar: adapter `completarReparacion(barrioId, viaje)` tras
viaje Z10 de juguete (`@zeus/linea-kit/viaje` · `runViajeReparacionJuguete`);
sale de `roto` → `latente` y reescribe acta. Seeds traen acta fundacional.

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
