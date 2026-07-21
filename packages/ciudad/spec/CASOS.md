# ciudad — Playbook de casos (humano + agente MCP)

Juego de engine sobre `@zeus/startpack-ciudad`: un rabbit entra, camina
entre anchors por calles, anuncia en plaza y despierta un barrio `latente`
ofreciendo un tool (horse stub hasta Z06). Formato playbook-kit.

## Cómo conectar

| pieza | URL |
| ----- | --- |
| MCP jugador **rabbit** | `http://localhost:4133/mcp` · health `…/mcp/health` |
| Autoridad | `npm run authority -w @zeus/ciudad` (room `CIUDAD_DEMO`) |
| Peer externo r/s/h (Z04) | `npm run federation-smoke -w @zeus/ciudad` · vivo `npm run e2e:ciudad-federation` |
| Mock control-plane | `POST /bots` · `GET /peers` · `GET /actor-registry` (OpenAPI mcp-core) |

- Transporte: Streamable HTTP (`POST /mcp`, JSON-RPC `initialize` + `tools/call`).
- Espera `/mcp/health` → `connected: true` antes de tools.
- Override puerto: `ZEUS_MCP_CIUDAD`.
- Federación: el peer externo usa **solo** `@zeus/rooms` + `@zeus/protocol`
  (`makeIntent` / events `intent|state|track|ledger`) — cero acceso al dominio
  de la authority (eje IV).

Convención de pasos: `` `tool {args JSON}` `` sobre el MCP del actor.
Pasos peer Z04: control-plane + intents rooms + `HORSE tools/call`.

**Gap Z06:** `wake` asienta el offer de tool en ledger (`horseMode:"stub"`).
La contraparte física `tools/call` por horse llega con `@zeus/mcp-launcher`
(y en Z04 el `barrio-horse` local ejercita `horseMode:"horse"`).

---

## C-01 — MVP: entra → walk → wake → snapshot

- **Precondición**: autoridad emitiendo `state` con escena del startpack;
  health `connected: true`. Barrio `blockly-editor` en seeds está `latente`.
- **Pasos del agente (rabbit)**:
  1. `player_join {}`
  2. `player_walk {"nodeId":"zigurat"}`
  3. `player_walk {"anchorId":"ancla-blockly-editor"}`
  4. `player_wake {"tool":"barrio.ping","barrioId":"blockly-editor"}`
  5. `player_state {}`
- **Qué observa el humano**: el rabbit aparece en plaza, camina a editores
  vía zigurat, llega al ancla Blockly, el barrio pasa a `vivo`.
- **Criterio de éxito**: paso 4 `ok:true` con `evidencia.barrio.estado:"vivo"`;
  paso 5 muestra `lastWake.barrioId:"blockly-editor"` y ledger `kind:"wake"`.
- **Errores esperados**: ninguno en el camino feliz.

## C-02 — rechazo: wake sobre barrio muerto

- **Precondición**: C-01 join hecho; barrio `workflow-editor` en seeds es `muerto`.
- **Pasos del agente (rabbit)**:
  1. `player_walk {"anchorId":"ancla-workflow-editor"}`
  2. `player_wake {"tool":"barrio.ping","barrioId":"workflow-editor"}`
- **Qué observa el humano**: el rabbit llega al ancla pero el barrio no
  despierta; queda `muerto`.
- **Criterio de éxito**: paso 2 `ok:false`, `error:"barrio_muerto"`.
- **Errores esperados**: `barrio_muerto`, `fuera_de_barrio`, `actor_desconocido`.

## C-03 — federación: peer externo r/s/h → wake horse

- **Precondición**: autoridad ciudad emitiendo `state`; mock (o real) control-plane
  r/s/h en local; barrio `blockly-editor` `latente`. Sin servicios aleph vivos.
  Peer = segundo cliente rooms/protocol (no MCP player-kit).
- **Pasos del agente (peer externo)**:
  1. `cp_start_bot {"role":"rabbit","room":"CIUDAD_DEMO","peer":"ext-rabbit"}`
  2. `cp_start_bot {"role":"spider","room":"CIUDAD_DEMO"}`
  3. `cp_start_bot {"role":"horse","room":"CIUDAD_DEMO"}`
  4. `rooms_intent {"intent":"join","kind":"player"}`
  5. `rooms_intent {"intent":"announce","message":"federación"}`
  6. `rnfp_activate {"capability":"rnfp.distrito"}`
  7. `rooms_intent {"intent":"walk","nodeId":"zigurat"}`
  8. `rooms_intent {"intent":"walk","anchorId":"ancla-blockly-editor"}`
  9. `horse_tools_call {"name":"barrio.ping","arguments":{"barrioId":"blockly-editor","actorId":"ext-rabbit"}}`
  10. `rooms_state {}`
- **Qué observa el humano**: el peer se anuncia en plaza, federación RNFP
  enciende el cruce, horse despierta el barrio sin tocar el estado interno
  de la authority.
- **Criterio de éxito**: snapshot vía rooms muestra
  `barrios.blockly-editor.estado:"vivo"` y `lastWake.horseMode:"horse"`;
  `GET /actor-registry` tiene peer spider `rnfp:"active"`.
- **Errores esperados**: `rnfp_inactive_distrito_bloqueado` si se intenta
  el cruce antes del rito; `barrio_muerto` si el destino no es latente.
- **Comando**: `npm run federation-smoke -w @zeus/ciudad` (in-process) ·
  `npm run e2e:ciudad-federation` (socket+authority vivos; deferible si A1).

## C-04 — tres jugadores: visitante + corriente + residente oráculo

- **Precondición**: autoridad con escena startpack; barrio `prolog-editor`
  `latente`. Contrato de mapeo (`jugador:*` / `residente:<edificio>`).
- **Pasos del agente (corriente peer + visitante tipado)**:
  1. `rooms_intent {"intent":"join","playerType":"visitante"}`
  2. `rooms_intent {"intent":"join","playerType":"corriente"}`
  3. `rooms_intent {"intent":"walk","nodeId":"zigurat"}`
  4. `rooms_intent {"intent":"walk","anchorId":"ancla-prolog-editor"}`
  5. `rooms_intent {"intent":"wake","tool":"oraculo.consultar","barrioId":"prolog-editor"}`
  6. `rooms_state {}`
  7. `rooms_intent {"intent":"sleep","barrioId":"prolog-editor"}`
  8. `rooms_state {}`
- **Qué observa el humano**: tres tipos distinguibles tras el wake; tras
  sleep el residente desaparece y el barrio vuelve a `latente`.
- **Criterio de éxito**: paso 6 snapshot con `playerType` visitante +
  corriente + `residente:prolog-editor`; paso 8 sin residente y barrio
  `latente` (misma fuente de verdad).
- **Errores esperados**: `residente_solo_por_wake`, `barrio_no_vivo`.

## C-05 — loop: decay vivo → latente → muerto

- **Precondición**: autoridad con escena startpack; reloj/decay configurables
  (`decayVivoMs` / `decayLatenteMs`); barrio `blockly-editor` despertado y
  **sin visita** durante el umbral vivo (la autoridad aplica decay en `tick`).
- **Pasos del agente (rabbit)**:
  1. `player_join {}`
  2. `player_walk {"nodeId":"zigurat"}`
  3. `player_walk {"anchorId":"ancla-blockly-editor"}`
  4. `player_wake {"tool":"barrio.ping","barrioId":"blockly-editor"}`
  5. `player_state {}`
- **Qué observa el humano**: tras el wake el barrio está `vivo`; si nadie
  visita y pasan los umbrales de decay, pasa a `latente` y luego `muerto`
  (más lento). Snapshot expone `lastDecay` y ledger `kind:"decay"`.
- **Criterio de éxito**: paso 4 `ok:true`; paso 5 (o snapshot posterior al
  tick de autoridad) muestra la transición de estado sin visita.
- **Errores esperados**: `barrio_muerto` si se intenta wake tras decay a muerto.

## C-06 — loop: energía wake / announce

- **Precondición**: actor con presupuesto de energía (`initialEnergy`);
  `wake` cuesta; `announce` en plaza recarga (tope `maxEnergy`).
- **Pasos del agente (rabbit)**:
  1. `player_join {}`
  2. `player_walk {"nodeId":"zigurat"}`
  3. `player_walk {"anchorId":"ancla-blockly-editor"}`
  4. `player_wake {"tool":"barrio.ping","barrioId":"blockly-editor"}`
  5. `player_state {}`
  6. `player_walk {"nodeId":"plaza"}`
  7. `player_announce {"message":"reposo"}`
  8. `player_state {}`
- **Qué observa el humano**: tras wake baja `actors.*.energy`; announce en
  plaza la sube. Sin energía, un wake extra falla.
- **Criterio de éxito**: paso 5 con energy menor que al join; paso 7
  `ok:true`; paso 8 energy mayor que en paso 5. Error `energia_insuficiente`
  si se wake sin presupuesto.
- **Errores esperados**: `energia_insuficiente`, `fuera_de_plaza`.

## C-07 — loop: objetivo colectivo (≥K vivos)

- **Precondición**: umbral `aliveTargetK` (default 15; el seed ya trae varios
  `vivo`); snapshot legible para tablero / operator-ui (contrato `objetivo`,
  sin ganador individual).
- **Pasos del agente (rabbit)**:
  1. `player_join {}`
  2. `player_state {}`
  3. `player_walk {"nodeId":"zigurat"}`
  4. `player_walk {"anchorId":"ancla-blockly-editor"}`
  5. `player_wake {"tool":"barrio.ping","barrioId":"blockly-editor"}`
  6. `player_state {}`
- **Qué observa el humano**: el bien/mal común aparece en snapshot como
  `objetivo.vivos`, `objetivo.umbral`, `objetivo.cumplido`.
- **Criterio de éxito**: con umbral = vivos_seed+1, paso 2
  `objetivo.cumplido:false`; paso 6 `objetivo.vivos >= umbral` y
  `cumplido:true` tras el wake.
- **Errores esperados**: ninguno en el camino feliz.
