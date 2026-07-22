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
| Salud | `src/salud.mjs` — probes `npm-view` / `http-status` / `smoke` → `applySalud` · shape ACL |
| Edificios | `src/edificios.mjs` — edificio↔paquete (solo ids catálogo fleet) · gentes=capabilities · rechazo fuera |
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
npm run salud-smoke -w @zeus/ciudad
npm run edificios-smoke -w @zeus/ciudad
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

## Salud real ↔ mapa

Probes read-only/idempotentes (`@zeus/ciudad/salud`): `npm-view`,
`http-status`, `smoke`. `domain.applySalud` sincroniza el estado del barrio;
`wakeConSalud` hace del wake la acción real (probe → wake `salud.<kind>`).
Smoke: `npm run salud-smoke -w @zeus/ciudad` (npm view canal
`npm.scriptorium.escrivivir.co` → `@zeus/protocol`).

**Default sin capability:** solo probes. **Exigen capability** (ACL /
ownership, fuera de este pack): `maq.launch|stop|restart`, `npm.publish`,
`git.force-push`, `acl.write`, `process.kill` — ver
`SALUD_SHAPE_FOR_ACL` / `CAPABILITY_REQUIRED`. Mapping edificio↔paquete de
catálogo = `@zeus/ciudad/edificios` (consume este shape; no reinventar probes).

## Edificios ↔ paquetes

Destino canónico: `src/edificios.mjs`. Solo ids del catálogo fleet
(`CATALOG_SEED` / patrón mcp-launcher). Gentes = `capabilities`. Arbol del
startpack: `catalogId` fuera de catálogo → `rechazados` (no se inventa
superficie). Cara salud: `saludBindingDesdeVinculo` → `npm-view` del
`workspace`. Smoke: `npm run edificios-smoke -w @zeus/ciudad`. Snapshot
expone `edificios.byEdificio` / `edificios.rechazados`.

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

**Puerta:** el peer entra con peercard firmada (E02 seat) y resuelve
`startpack-ciudad-v0.1.0` como base default (`enterWithPuerta` en
`fixtures/federation/peer-external.mjs`). 2º cliente de la puerta junto a
operator-ui.

**MCP jugador:** un proceso = un actor; bootstrap firma peercard
(peer-card-seat) y la reenvía en `CLIENT_REGISTER` — mismo carril que la
puerta (`src/player-mcp/`). Tools: join / walk / announce / wake / state /
leer_parte. Resources: `ciudad://player/state` · `scene` · `casos`.

## Roles

`player` = visitante o corriente · `operator` = residente (edificio) ·
`dj` = cronista (solo narrar). Lectura del story-board canónico y re-emisión
como `announce` en plaza: `src/cronista.mjs` · smoke
`npm run cronista-smoke -w @zeus/ciudad` · 2º lector
`npm run story-board-reader -w @zeus/ciudad`.
