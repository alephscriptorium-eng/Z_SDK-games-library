# delta — Contrato de dominio (v1)

Capa de juego sobre el contrato único [`@zeus/protocol`](../../lib/protocol/spec/CONTRATO.md)
(`state|intent|track|ledger` + `game` + roles + Peer Card). Este documento
conserva lo específico de delta; lo genérico no se duplica.

Contrato entre la **Autoridad** (único proceso que muta el estado del juego),
los **visores** (arg-console: tablero y jugador), los **sujetos** (jugadores,
agentes, artilugios con cloak MCP) y los **navegadores reales** (cache-browser
/ firehose-browser que reciben tracking).

Transporte: room Socket.IO del socket-server (puerto vía `presets-sdk/env`),
room por defecto **`ARG_DELTA`**. Wire actual: eventos `arg:state|intent|track|ledger`
(alias históricos); el envelope lleva `game: "delta"`. Los visores consumen con
`onChannelEvent` (dual direct/envelope + dedupe, patrón 3d-monitor).

## 1. Principios (heredan la disciplina session-domain)

- **P1 — Una autoridad**: solo `arg-authority` ejecuta motores y muta dominio.
  Visores y sujetos emiten *intents* y proyectan *snapshots*. Jamás corren su
  propio engine como verdad (gate G-ARG.1, estilo G-D6).
- **P2 — Intents validados**: todo `arg:intent` pasa por un reducer puro que
  lo acepta o lo ignora (inválido = no-op, nunca crash).
- **P3 — Lo caótico no retorna**: mutar volúmenes reales (etiquetar corpus,
  cachear wikitext) exige cristalización: reducción válida + gate de
  aprobación (`resolveMcpApprovalToken`, default `APROBAR`) cuando
  `volumes.mode === 'real'`. Todo lo cristalizado emite `arg:ledger`.
- **P4 — Snapshots + dead reckoning**: la autoridad publica `arg:state` a
  10 Hz (cambio o heartbeat 1000 ms); los visores interpolan entre snapshots.
- **P5 — Cloak primero**: toda interacción sujeto↔sujeto/cosa se negocia vía
  oferta MCP (canal HORSE existente); el juego no inventa un segundo RPC.

## 2. Entidades

### Actor (sujeto)
```js
{
  id: 'uno',                    // estable en la room (usuario o bot)
  kind: 'player'|'agent'|'artefacto',
  tier: 'stick'|'puppet',       // render hint (híbrido por tier)
  cloak: { presetId, label },   // ficha MCP; la oferta viaja por HORSE
  zone: 'terraza'|'rio'|'mar'|'cantera',
  // posición sobre el nav-graph (modelo link/progress de game-engine):
  nodeId,                        // parado en nodo del nav-graph
  linkId, direction, progress,   // o caminando un enlace (0..1)
  riding: { riverId, progress }, // o montado en un río (anula link)
  pose: 'idle'|'walk'|'ride'|'swim'|'sit'|'menu',
  emote: null|'wave'|'thumbsUp'|'nod'|'shake',
  score: { labeled: 0, excavated: 0, cached: 0, curated: 0, milestoned: 0, emptied: 0 }
}
```

### Tap (grifo — artilugio con cloak)
```js
{
  id: 'tap-a', summitNodeId, riverId,
  aperture: 0..1,      // cuánto suelta
  pressure: 0..1,      // acumulada por el feed upstream mientras no fluye
  state: 'ok'|'burst', // burst: presión llegó a 1 → riada
  burstCooldownSec
}
```
Regla de presión (por tick, `dt` en segundos):
`pressure += inflowRate*dt*(1-aperture) - releaseRate*dt*aperture`, clamp 0..1;
`pressure===1 → burst` (riada: `floodRate` gotas/s caen como `spill` durante
`burstDurationSec`, luego cooldown y `pressure=0.5`).

### Droplet (gota = mensaje)
```js
{
  id, riverId, progress: 0..1,   // avanza a flowSpeed * apertura del tap
  ref: { corpus: 'raw'|'candidate', uri, index },  // recurso real del feed
  label: null|string,            // etiquetada en marcha
  state: 'flowing'|'crystal'|'spill'
}
```
Al llegar a `progress=1`: `label ? → mar.crystals++` (y side-effect corpus
`labeled` si real) `: → mar.murk++` (vertido sin etiquetar).

### Sea (mar)
```js
{ crystals, murk, murkCapacity, collapsed: bool }
```
`murk > murkCapacity → collapsed` (fin de ronda por inundación).

### Maze (cantera)
```js
{
  chambers: { [id]: { ref:{kind:'nodo'|'registro'|'oldid', uri}, state:'cached'|'ghost', pos } },
  corridors: { [id]: { a, b, state:'open'|'ghost'|'digging' } }
}
```
`excavate(corridorId)`: `ghost → digging` (side-effect: viaje de cache; en
modo real requiere `approval`) → al resolver, `open` + `arg:ledger`.

### Line board (tablero del manipulador — WP-U30)

Hermanos de `label:cast` / `excavate` con rol `dj`. El dominio materializa el
ciclo de crecimiento de una línea (DATOS.md §4) sin tocar disco: el side-effect
de volumen (fetch `cache_wikitext`, escritura de markdown) vive en el borde de
autoridad / Notario.

```js
{
  rev,
  // snapshot compacto (presupuesto G-ARG.5):
  regs: [ [lineId, registroId, cached:0|1, status:0|1|2, milestone:0|1], ... ]
  // status: 0 pending | 1 draft | 2 curated
}
```

Registro vivo (vista del reducer):
```js
{ id, oldid?, cached: bool, deltaStatus: 'pending'|'draft'|'curated',
  milestone: null | { reasons: string[] } }
```

| intent | args | muta | score | ledger kind |
| ------ | ---- | ---- | ----- | ----------- |
| `cache` | `lineId, registroId, approval?` | `cached: false→true` | `cached++` | `cache` |
| `curate` | `lineId, registroId, to?: 'draft'\|'curated'` | un paso `pending→draft→curated` (exige cached) | `curated++` | `curate` |
| `milestone` | `lineId, registroId, reasons?` | ancla milestone (exige curated) | `milestoned++` | `milestone` |

### Vaciar (ciclo DATOS §4 — WP-U83)

Mitad «vaciar» del mapa: purgar vertido blando del mar. Roles `player`|`dj`
(alineados con volumes-ops `empty_playable`). Dominio puro; el gemelo ops lo
asienta la autoridad en el borde.

| intent | args | muta | score | ledger kind |
| ------ | ---- | ---- | ----- | ----------- |
| `empty` | _(ninguno)_ | quita gotas `sunken`; `murk − removed` | `emptied++` | `empty` (`detail.opsIntent: empty_playable`) |

Rechazos: `fuera_de_mar`, `nada_que_vaciar`, `mar_colapsado`,
`rol_no_autorizado`. Coste narrativo: las gotas purgadas no se pueden
`salvage`.

### Operator (visor — WP-U32)

| intent | args | muta | ledger kind |
| ------ | ---- | ---- | ----------- |
| `inspect` | `targetId?, label?` | ninguna (asiento ledger) | `inspect` |

Solo rol `operator`. `rol_no_autorizado` si llega con rol `player`/`dj`.

Rechazos explicables (DJ): `linea_invalida`, `registro_invalido`, `ya_cacheado`,
`no_cacheado`, `status_invalido` / `status_salto` / `status_retroceso` /
`ya_curado`, `no_curado`, `ya_milestone`, `rol_no_autorizado` (player u
operator sobre intents `dj`). En feeds reales, `cache` exige el mismo gate
`approval` que `excavate`.

### Contact (contacto de cloaks)
```js
{ id, a, b, state:'requested'|'open'|'closed', openedAt }
```
La autoridad solo arbitra proximidad y estado; el intercambio de ofertas y las
llamadas tools/prompts van por HORSE entre los propios sujetos (P5).

### Gamemap (partitura de ronda)
```js
{
  id, sceneId: 'delta-v0',
  seeds: { mazePack, firehoseCursor },          // start packs (storage git)
  objetivo: { labeled: N, excavated: M },
  cues: [ { atSec|onEvent, action } ]           // secuencias dirigidas
}
```

## 3. Eventos

### Inbound (sujeto → autoridad): `arg:intent`
```js
{ v:1, from, ts, actorId, intent, ...args }
```
| intent            | args                                    | efecto |
| ----------------- | --------------------------------------- | ------ |
| `join`            | `kind, tier, cloak`                      | alta de actor en nodo spawn |
| `move`            | `linkId, direction` \| `nodeId`          | caminar el nav-graph |
| `ride`            | `riverId`                                | montar el río en su embarcadero |
| `dismount`        | —                                        | bajar en la orilla más próxima |
| `swim`            | `to: nodeId`                             | moverse por boyas del mar |
| `tap:set`         | `tapId, aperture`                        | requiere contacto abierto con el grifo |
| `label:cast`      | `dropletId, label`                       | solo la gota bajo el actor (riding) |
| `excavate`        | `corridorId, approval?`                  | solo desde cámara adyacente |
| `contact:request` | `targetId`                               | requiere proximidad (radio de zona) |
| `contact:close`   | `contactId`                              | |
| `cloak:equip`     | `presetId, label?`                       | equipa ficha MCP en el actor |
| `emote`           | `name`                                   | expresividad, sin física |
| `salvage`         | `dropletId, label`                       | gota hundida + proximidad mar/orilla/boya |
| `track:cast`      | `dropletId`                              | sin mutación; emite `arg:track` firehose |
| `cache` *(rol dj)* | `lineId, registroId, approval?`         | registro ghost → cached; ledger + score |
| `curate` *(rol dj)* | `lineId, registroId, to?`              | pending→draft→curated (un paso; exige cached) |
| `milestone` *(rol dj)* | `lineId, registroId, reasons?`      | ancla milestone (exige curated) |

### Outbound (autoridad → room)

**`arg:state`** — snapshot compacto 10 Hz:
```js
{ v:1, from:'arg-authority', ts, tick, reason:'change'|'heartbeat',
  sceneId, gamemapId,
  actors: { [id]: Actor },                 // compacto
  taps:   { [id]: {aperture,pressure,state} },
  rivers: { [id]: { droplets:[[id,progress,state,label?,uri?]] } },  // arrays compactos (uri → inspector WP-25)
  sea:    { crystals, murk, murkCapacity, collapsed },
  maze:   { rev, changed?: {chambers,corridors} },  // rev + diff; full si rev=0
  lines:  { rev, regs: [[lineId,registroId,cached,status,milestone],...] },
  contacts: { [id]: {a,b,state} },
  objetivo: { labeled:[n,N], excavated:[m,M] } }
```

**`arg:track`** — navegación → navegadores reales (por actor, on-change):
```js
{ v:1, actorId, zone,
  ref: { kind:'micropost'|'nodo'|'registro'|'oldid'|'corpus', uri, index },
  hint: 'firehose-browser'|'cache-browser' }
```
El índice/recurso que el jugador "pisa" (gota bajo sus pies, cámara en la que
entra). Los navegadores reales del jugador se suscriben a la room y cargan
`uri` cuando `actorId` es el suyo.

**`arg:ledger`** — cristalizaciones append-only:
```js
{ v:1, seq, ts, kind:'label'|'excavate'|'burst'|'collapse'|'objetivo'|'cache'|'curate'|'milestone',
  actorId?, ref?, detail }
```

**HORSE** (existente, sin cambios): ofertas de cloak
(`broadcastPresetOffer`) y JSON-RPC MCP entre sujetos (`PresetHorseProxy`).

## 4. Feeds (volúmenes reales con arranque garantizado)

Interfaz única para alimentar el juego:
```js
feed = { kind, nextDroplets(count) -> [{corpus,uri,index}],
         commitLabel(ref,label) -> Promise, }        // riada
graphSource = { loadMaze() -> {chambers,corridors},
                excavateCorridor(corridor, approval) -> Promise } // cantera
```

### Cristalización en dos tiempos (P3 ampliado)

- **Durante la partida (runtime)**: lectura MCP de volúmenes; mutaciones solo
  en `arg:ledger` append-only. `commitLabel` en modo `real` **no escribe
  DISK_01** — retorna `{ ok, committed: false, ledgerOnly: true }`. La
  autoridad puede bufferizar opcionalmente en `ledger/round-<gamemapId>.jsonl`.
- **Post-ronda (Notario, WP-20/23)**: único escritor — compacta ledger,
  triage manifest `raw→labeled`, commit git = nuevo start pack. Gate
  `APROBAR` humano en la firma de ronda, no en cada etiqueta suelta.
- **`excavateCorridor` en modo `real`**: fetch on-demand en runtime vía MCP
  `cache_wikitext` (gate `APROBAR` en el intent `excavate`); el asiento en
  manifest/start pack queda para el Notario.

Implementaciones (resolución vía env `ZEUS_ARG_FEEDS` = `volumes.mode`):
- `real`: lectura contra `linea-firehose` (:3008) y `linea-system` (:4111)
  vía `@zeus/arg-feeds` (solo autoridad). Sin tool de escritura en :3008.
- `synthetic`: generador determinista (seed en gamemap) con la misma forma
  (`@zeus/arg-domain`).
- `auto`: probe `/mcp/health`; si MCP no responde, degrada a sintético con
  warning — la demo corre en cualquier máquina.

URIs estables de gotas reales: `firehose://post/raw/{batch}/{filename}`.

### arg:track → navegadores reales (WP-13)

`resolveTrackRef` en `@zeus/arg-domain` (puro, browser-safe) traduce
`ref.uri` a `{ browser, path, linea?|corpus? }`. Cada navegador real lleva
un suscriptor **server-side** (`cache-browser#<actor>` / `firehose-browser#<actor>`)
que escucha `arg:track`, filtra por `actorId` + `hint`, y expone
`GET /api/track/focus`. La página hace poll 1 s y llama `openFile`/`setQuery`.
Identidad del actor: env `ZEUS_ARG_TRACK_ACTOR` o query `?actor=` (mismo
contrato que vista jugador).

## 5. Invariantes y gates (grep-gates, estilo session-domain)

- **G-ARG.1** — ningún visor importa motores de `@zeus/arg-domain` como
  autoridad (solo `arg-demos/apps/authority` puede `createArgDomainState`).
- **G-ARG.2** — visores consumen `arg:state` exclusivamente vía
  `onChannelEvent`; prohibido escuchar `ROOM_MESSAGE` a pelo en vistas.
- **G-ARG.3** — en runtime solo ledger append + fetch on-demand (`cache_wikitext`
  con approval); escritura a DISK solo vía Notario post-ronda. Prohibido importar
  `@zeus/arg-feeds` o APIs de mutación de volúmenes desde visores.
- **G-ARG.4** — `reduceArgIntent` es puro: mismo estado + mismo intent ⇒
  mismo resultado; intents inválidos devuelven el estado intacto.
- **G-ARG.5** — `arg:state` cabe en un frame: rivers como arrays compactos,
  maze como rev+diff. Presupuesto: ≤ 32 KB por snapshot con 200 gotas.

## 6. Puertos y nombres

| pieza          | valor                                        |
| -------------- | -------------------------------------------- |
| room           | `ARG_DELTA` (`ZEUS_ARG_ROOM`)                |
| arg-console    | **:3021** (`ZEUS_PORT_ARG_CONSOLE`)          |
| autoridad      | user `arg-authority`                          |
| actores demo   | `uno`, `dos` (query `?actor=` en vista jugador) |
| escena v0      | `delta-v0` (3 cimas/grifos, 2 ríos, 1 mar, cantera 4×3) |
