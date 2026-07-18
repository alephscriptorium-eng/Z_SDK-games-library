# delta — Backlog para el swarm

Convención: cada WP es autocontenido, con criterios de aceptación (CA)
verificables por test o e2e. El **vertical slice** (marcado ✅ slice) lo
entrega la sesión fundacional; el resto es paralelizable por el swarm.
Referencias: [CONTRATO.md](CONTRATO.md), [UX.md](UX.md), [LORE.md](LORE.md).

## Fase 0 — Fundación (✅ slice)

- **WP-00 · Esqueleto workspace** — `packages/delta/{arg-domain,arg-console,arg-demos}`
  en workspaces raíz, scripts `start:arg-console`, `demo:arg`, `test:arg`.
  CA: `npm install` limpio; `npm run test:arg` verde.
- **WP-01 · arg-domain: escena y nav-graph** — `delta-v0` (cimas, terrazas,
  embarcaderos, orillas, boyas, entrada cantera) como datos puros + helpers
  de muestreo (reutiliza el modelo link/progress de `@zeus/game-engine`).
  CA: test de integridad del grafo (todo nodo alcanzable).
- **WP-02 · arg-domain: flow-engine** — grifos (presión/apertura/burst),
  ríos (gotas, spawn desde feed, cristal/spill), mar (crystals/murk/colapso).
  CA: tests de la regla de presión, ciclo de gota, colapso.
- **WP-03 · arg-domain: maze-engine** — cámaras/pasillos, ghost→digging→open,
  tracking de cámara pisada. CA: tests excavate + idempotencia.
- **WP-04 · arg-domain: reducers + domain-state** — `reduceArgIntent` puro
  (tabla del contrato §3), `createArgDomainState` (applyIntent/tick/snapshot
  compacto §G-ARG.5). CA: tests de intents válidos/inválidos (G-ARG.4).
- **WP-05 · feeds sintéticos** — firehose determinista con seed + laberinto
  sintético, interfaz §4. CA: mismas seeds ⇒ mismas gotas.
- **WP-06 · arg-console: server + view-kit** — portal :3021 derivado del
  view-kit del 3d-monitor (autocontenido: copia evolucionada, no import).
  CA: `/health` lista vistas; shell con import map y `#viewer-config`.
- **WP-07 · arg-console: monigote stick** — puppet procedural paramétrico
  (13 articulaciones, poses idle/walk/ride/swim/menu + emotes aditivos),
  misma interfaz duck-type que `loadPuppet` (setBase/playAdditive/update).
  CA: demo standalone en vista + unit test de interfaz sin three.
- **WP-08 · arg-console: vista tablero** — overview global (UX §tablero):
  delta completo, grifos con manómetro, ríos instanciados, mar, cantera,
  actores, ledger DOM. CA: renderiza snapshot sintético grabado (fixture).
- **WP-09 · arg-console: vista jugador** — cámara chase, controles teclado →
  `arg:intent`, HUD jugador, panel tracking. CA: e2e — tecla emite intent
  correcto por socket (sin mutar escena local, G-ARG.1).
- **WP-10 · arg-demos: autoridad + demo 3 visores** — proceso authority
  (10 Hz, arg:state/track/ledger), launcher `demo:arg` con URLs impresas.
  CA: e2e Node estilo `e2e/player-3d-demo.mjs` — dos clientes join, uno
  abre grifo, gotas fluyen, un label:cast llega al ledger.

## Fase 1 — Cloak MCP y navegadores reales (swarm)

- **WP-11 · Contacto + menú de cloak (protocolo REAL)** — `contact:request/close`
  en dominio; overlay DOM 3 columnas (UX §menú y §UX-2.6) consumiendo oferta
  HORSE real (`resolvePresetOffer`/`PresetHorseProxy` de presets-sdk).
  Sujetos reales a integrar, que YA existen: bots de `ping-pong-bots`
  (ping/pong/rabbit/spider/horse + `horse-preset-hub`), servidores MCP
  linea/firehose y rutas REST de presets (`/api/mcp/*`). Grifo como artilugio
  con cloak (tool `tap.set_aperture`). El resultado JSON-RPC/REST vuelve al
  panel de contacto y como emote/efecto del monigote. CA: e2e con bot horse
  real — contacto → oferta → `tools/call` → apertura cambia en `arg:state`;
  y una llamada REST real con feedback en panel.
- **WP-12 · Inventario de presets (PresetStore real)** — menú `Q` se llena
  del PresetStore (`GET /api/mcp/presets`, seeds `aleph-presets.json`) + los
  del start pack del gamemap; activar preset ⇒ `cloak` del actor actualizada
  (intent) + re-broadcast de oferta HORSE + modificadores de físicas (tabla
  presetId→mods). Hoy el panel Q es stub y sale vacío porque `join` no envía
  cloak. CA: test de derivación de físicas; e2e — activar preset se refleja
  en `arg:state.actors[..].cloak` y en la oferta re-broadcast.
- **WP-13 · arg:track → navegadores reales** — suscriptor **server-side** en
  firehose-browser y cache-browser (`@zeus/rooms` + `GET /api/track/focus`);
  página hace poll y navega con `openFile`. CA: e2e G-ARG-E2E.6 — actor en
  `camara-0-2` → focus resuelto en cache-browser.
- **WP-14 · Feeds reales (ledger-first)** — `@zeus/arg-feeds` node-only:
  lectura MCP read-only; `commitLabel` ledger-only (sin escritura :3008);
  `excavate` → `cache_wikitext` con gate `APROBAR`; `auto` probe + degrade;
  start packs opcionales (`gamemap.seeds`). CA: e2e MCP aislado + escenario
  `auto` sin MCP.
- **WP-15 · Gates grep** — test estilo `grep-gates.test.mjs` con G-ARG.1..5.
  CA: gates rojos si se viola (probar con violación sintética).

## Fase 1.5 — Shell HTML (feedback primera partida, UX §UX-2)

- **WP-24 · Shell responsivo + ventanitas** — canvas 100% del viewport con
  resize; HUD/leyenda, ledger, tracking, contacto y cloak como ventanitas
  DOM con barra de título, colapsables (leyenda y ledger además arrastrables),
  estado persistido en localStorage por vista. CA: sin scroll horizontal a
  cualquier tamaño; colapso/posición sobreviven a un reload.
- **WP-25 · Inspector de flujo y cantera** — raycast sobre símbolos 3D
  (grifo, río, mar, cámara) abre panel HTML con los MENSAJES: gotas en cauce
  (uri/corpus/label/progress), presión del grifo, cristales/murk del mar,
  recurso y estado de la cámara. Click en gota/cámara → deep-link honesto.
  CA: e2e — snapshot con gotas ⇒ el inspector lista sus uris.
- **WP-26 · Browsers en modo juego + deep-links honestos** — franja de juego
  en cache/firehose-browser (`?actor=`: actor, conexión, último focus); el
  suscriptor de tracking comprueba existencia en disco antes de navegar y
  expone estado `ghost` (nunca ENOENT crudo al usuario); los refs sintéticos
  se marcan `「sintético」` sin enlace. CA: e2e — focus a ref inexistente ⇒
  respuesta `ghost` y la página muestra «no excavado aún», cero ENOENT.

- **WP-27 · arg-player-mcp (jugador como servidor MCP)** — un MCP por actor
  (uno :4121, dos :4122, patrón `createStandardMcpServer`) que envuelve al
  jugador: tools `player_join/move/goto/ride/label/contact/tap_set/excavate/
  cloak_equip/observe` con **semántica verificable** (emite intent y espera
  evidencia en `arg:state`/`arg:ledger`), resources `arg://player/state`,
  `arg://scene`, `arg://casos`. Playbook `spec/CASOS.md`: casos C-01..C-16
  con pasos MCP literales para el agente y qué observa el humano en cada
  vista. Dos instancias en `demo:arg`. CA: e2e `arg-mcp` (6 gates) — un
  cliente JSON-RPC ejecuta C-01/03/04b/05 y el label de C-08 vía MCP.

## Fase 1.6 — Mar vivo (swarm) — diseño en [MAR.md](MAR.md)

Orden: WP-28 desbloquea a los demás; WP-29 antes que WP-31/WP-32.
WP-30 puede arrancar en paralelo con WP-29 contra fixtures.

- **WP-28 · arg-domain: población del mar + sea-layout** — el flow-engine
  deja de destruir gotas al llegar: pool acotado `sea.droplets` con estados
  `floating` (etiquetada) / `sunken` (sin etiquetar), rescate (`salvage` op:
  sunken→floating, murk−1, crystals+1, commitLabel, ledger `label` con
  `detail.salvage`), overflow FIFO por seq (consolidate/lost, contadores
  intactos). `sea-layout.mjs` puro browser-safe: clusters dinámicos por label
  presente (nada hardcodeado), centroides en arco hacia el final del mar
  (`marDef.bounds`, nuevo en delta-v0), phyllotaxis por llegada, hundidas
  dispersas por hash(id) bajo superficie. Snapshot compacto
  `sea.droplets:[[id,label,uri,seq]]`. CA: tests — llegada etiquetada/sin
  etiquetar, salvage con clamp, overflow no toca contadores, mismo input ⇒
  mismo layout, budget G-ARG.5 con pool lleno + 200 gotas de río.
- **WP-29 · contrato + reducer: `salvage` y `track:cast`** — CONTRATO.md §2/§3
  actualizado (MAR.md §2); handlers puros: `salvage` valida gota sunken,
  label ∈ labelset y proximidad (zona mar u orilla/boya ≤ contactRadius de la
  posición seaLayout); `track:cast` valida existencia y hace que la autoridad
  emita `arg:track {hint:'firehose-browser'}` sin mutar dominio. CA: tests de
  reducer válidos/inválidos (G-ARG.4); e2e — `track:cast` produce `arg:track`
  del actor correcto.
- **WP-30 · arg-console: sea-droplets + picking por instancia** — gemelo de
  `river-droplets.mjs`: InstancedMesh con posiciones de seaLayout; flotantes
  cristal con bobbing, hundidas tenues bajo la malla con animación de
  hundimiento, ascenso+destello al rescatar; sprites de cluster dinámicos
  (crear/retirar según labels presentes). Raycast con `instanceId` →
  `{kind:'seaDroplet', id}` en pickables. Solo proyección (G-ARG.1). CA:
  fixture con clusters ⇒ posiciones esperadas; picking resuelve dropletId;
  inspector de mar lista clusters/flotantes/hundidas con uri.
- **WP-31 · vista jugador: ventanita de acción del mar** — click en gota del
  mar abre panel de acción (patrón cloak-panel, emite intents): botones del
  labelset → `salvage` (solo si sunken y hay proximidad), «abrir en firehose»
  → `track:cast` + deep-link honesto local (regla `「sintético」` de WP-26).
  Inspector del tablero queda solo-lectura. CA: e2e — click en gota hundida +
  botón etiqueta emite `salvage` correcto por socket; tras `arg:state` la gota
  aparece flotante en su cluster y el ledger registra `detail.salvage`.
- **WP-32 · arg-player-mcp: mar jugable por agentes** — tools
  `player_salvage` (verificable vía ledger) y `player_track` (verificable vía
  `arg://tracks/tail`); `player_observe what:'sea'` con clusters; resource
  `arg://sea`. Los casos C-17/C-18 YA están redactados en CASOS.md (con test
  de coherencia en casos.test.mjs) — no re-redactar: implementar los tools
  hasta que los pasos pasen tal cual. CA: e2e arg-mcp — cliente JSON-RPC
  ejecuta C-17 y C-18 contra la demo.

## Fase 2 — Juego completo (swarm)

- **WP-16 · Gamemaps y cues** — loader de gamemap (§2), cues temporales/por
  evento, objetivos y fin de ronda (colapso/victoria) con pantalla final.
- **WP-17 · Agentes ambiente** — bots stick con cloak que etiquetan/excavan
  solos (drivers estilo `walk-demo`), presión social del Público.
- **WP-18 · Multitud instanciada** — 200+ sticks con InstancedMesh y LOD;
  presupuesto 60 fps con 500 gotas + 200 actores en tablero.
- **WP-19 · Riada y colapso espectacular** — burst con partículas, mar que
  sube, shake de cámara; sonido opcional (WebAudio procedural, sin assets).
- **WP-20 · Persistencia de ronda + Notario** — ledger a disco (append-only
  JSON); compactador post-ronda (único escritor DISK): triage `raw→labeled`,
  manifest cantera, commit git = nuevo start pack. MCP opcional `commit_round`
  con gate `APROBAR` (acto jugable en el mar).
- **WP-23 · Notario MCP** — (si no se fusiona con WP-20) tool `commit_round`,
  replay idempotente del ledger, diff revisable.
- **WP-21 · Puppets GLB para jugadores** — tier puppet en vista jugador
  (clip-map existente), selección de skin al join.
- **WP-22 · Espectador embebido** — vista tablero como iframe/panel en
  player-ui u operator-ui (proyección, sin lógica).

## Riesgos conocidos

- El tamaño de `arg:state` con cientos de gotas (mitigación: arrays
  compactos + maze diff, G-ARG.5; si no basta, delta-encoding de rivers).
- Dos sistemas de animación (stick + GLB): mantener la interfaz duck-type
  única de puppet (WP-07) para que el adapter no distinga tiers.
- Latencia de MCP real en `excavate` (digging asíncrono ya lo modela).
