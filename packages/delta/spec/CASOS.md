# delta — Playbook de casos de validación (humano + agente MCP)

Documento bilingüe humano/agente: un **agente LLM** conectado a
`@zeus/arg-player-mcp` ejecuta los pasos (llamadas MCP literales) mientras un
**humano** observa las vistas del arg-console (:3021) y los navegadores
reales. Cada caso termina con evidencia verificable en `arg:state` /
`arg:ledger` (la respuesta de cada tool es `{ ok, error?, evidencia }`).

## Cómo conectar

| pieza | URL |
| ----- | --- |
| MCP jugador **uno** | `http://localhost:4121/mcp` · health `http://localhost:4121/mcp/health` |
| MCP jugador **dos** | `http://localhost:4122/mcp` · health `http://localhost:4122/mcp/health` |
| MCP Inspector (deep-link) | `http://localhost:4121/docs` / `http://localhost:4122/docs` (arranca antes `npm run spec:inspector`) |
| Vistas humanas | `npm run demo:arg` → tablero `:3021/views/tablero`, jugador `:3021/views/jugador?actor=uno` (y `?actor=dos`), cache-browser `:3015/?actor=…`, firehose-browser `:3016/?actor=…` |

- Transporte: Streamable HTTP (`POST /mcp`, JSON-RPC `initialize` +
  `tools/call`). Espera a que `/mcp/health` responda `connected: true` antes
  de llamar tools (el wrapper reintenta la room en segundo plano).
- Una instancia = UN actor: el servidor de :4121 solo actúa como `uno`, el de
  :4122 solo como `dos` (G-ARG.1: emite intents, jamás muta dominio).
- El playbook completo vive en el resource `arg://casos`; el prompt MCP
  `validar-caso {casoId}` devuelve un caso listo para ejecutar.
- Rechazos: la autoridad ignora intents inválidos (no-op). El wrapper detecta
  el no-op (~3 s) y devuelve `ok:false` con la regla probable del reducer.

Convención de pasos: `tool {args JSON}` sobre el MCP del actor indicado.

---

# ⚠️ LÉEME ANTES DE EMPEZAR

> Escrito el 2026-07-15 tras una sesión de validación real. Cada punto de aquí
> costó un tropiezo. Léelo entero: te ahorra la sesión que yo perdí.

## 1. La ronda CADUCA. Esto lo cambia todo.

**El delta se suicida solo si lo dejas quieto.** No es un bug, es el contrato
§2 («el firehose empuja aunque no lo mires»): con un grifo a apertura 0 la
presión sube a `inflowRate` (0,02/s) → revienta → la riada vierte murk → el
murk pasa de 60 y el mar **colapsa**.

**Tienes ~6 minutos de ronda.** Calculado desde `delta-v0.mjs` y confirmado
contra el ledger de dos rondas reales:

| paso | número | de dónde sale |
| ---- | ------ | ------------- |
| primera riada | **50 s** | presión 0→1 a `inflowRate` 0,02/s |
| murk por riada | **3,2** | `burstDurationSec` 4 × `floodMurkRate` 0,8 |
| ciclo entre riadas | **35 s** | 4 burst + 6 `burstCooldownSec` + 25 (recarga 0,5→1) |
| murk/ciclo (2 grifos) | **6,4** | los dos grifos revientan en paralelo |
| riadas hasta morir | **20** | 60 `murkCapacity` / 6,4 = 9,4 ⇒ muere en el 10º par |
| **colapso** | **≈ 366 s ≈ 6 min** | 50 + 9×35 + 1,5 |

El modelo predice 20 riadas y que el murk se detenga en **60,16** (a 10 Hz sube
0,16/tick, cruza 60 y el motor se congela). Ambas rondas observadas: 20 riadas,
murk 60,16. Cuadra al decimal — puedes fiarte de estos números.

> ⚠️ Aviso metodológico, y va en serio: la primera versión de esta nota decía
> «~13 min» y «9 riadas». **Las dos cifras eran falsas.** Salieron de mirar el
> ledger con `n:10` (solo se ven las 9 últimas riadas) y de leer el reloj cuando
> me asomé, no cuando colapsó. Si vas a escribir un número aquí, **derívalo del
> código y contrástalo con el ledger completo**. No lo estimes a ojo.

Y lo que lo hace grave: al colapsar, `flow-engine.tick` hace
`if (sea.collapsed) return`. **Grifos, ríos y mar quedan congelados.** Todo caso
que ejecutes después valida contra un cadáver y falla por la razón equivocada.

Consecuencias operativas, no negociables:

- **Tienes ~6 min de ronda.** Presupuesta antes de empezar: no te da para los
  21 casos del tirón. De ahí el plan de secuencias en 3 rondas.
- **Abrir un grifo ALARGA la ronda** (contraintuitivo): la fórmula es
  `pressure += inflowRate·dt·(1-aperture) − releaseRate·dt·aperture`. Con
  apertura > 0 la presión **baja** y ese grifo deja de reventar. El precio es
  que nacen gotas, y cada gota que llega sin etiquetar suma 1 de murk.
  Mueras por riada o por vertido, mueres.
- **C-06 y C-15 son DESTRUCTIVOS**: van al final, en una ronda desechable.
  Ejecutarlos «en orden» mata todo lo que venga detrás.
- **Reiniciar es barato** (~20 s) y te da ronda limpia. Ante la duda, reinicia:
  es más rápido que depurar un delta congelado.

Cómo saber si tu ronda sigue viva, antes de fiarte de nada:

```
player_observe {"what":"sea"}   → collapsed debe ser false
```

## 2. Montaje: móntalo así o lo pagarás

- **Arranca sin ventanas** (default): `npm run demo:arg`. Solo abre navegador
  con `ZEUS_OPEN_BROWSER=1` (hasta **5** ventanas, 3 de ellas escenas Three.js
  con WebGL a 60 fps — para un `arg:state` a 10 Hz eso clava GPUs integradas
  al 95%). Abre **solo la vista del caso** (casi siempre el tablero).
- **Usa Chrome + la extensión «Claude in Chrome»** (`mcp__claude-in-chrome__*`).
  Es la diferencia entre validar y adivinar: **te deja ver la escena tú mismo**
  (`computer {action:"screenshot"}`, `read_console_messages`) en vez de depender
  de que el humano te la describa. Requiere que el humano abra el panel lateral
  de Claude en Chrome y firme; si no está conectada, dile eso — tú no firmas.

- **Si ves la GPU integrada clavada: NO toques el código.** Trampa cara,
  comprobada. En un portátil híbrido (p. ej. Intel UHD + NVIDIA Quadro) las
  escenas van a la integrada y la funden, mientras la dedicada se rasca la
  barriga. Parece un bug de render y **no lo es**: `ui-3d-kit/src/core/
  scene-manager.mjs:147` **ya pide** `powerPreference: 'high-performance'`. Lo
  que pasa es que en Windows el navegador elige adaptador **una vez, a nivel de
  proceso**, según la preferencia del sistema, e ignora ese atributo del
  contexto WebGL. La palanca está fuera del repo:
  - El **humano** fija el navegador a «Alto rendimiento» en Configuración →
    Sistema → Pantalla → Gráficos (registro `HKCU:\SOFTWARE\Microsoft\DirectX\
    UserGpuPreferences`). **Es un ajuste del sistema: lo toca él, no tú.**
  - Requiere **cerrar el navegador del todo** y reabrir; no basta con recargar.
  - Se verifica en `about:support` (Firefox) o `chrome://gpu` (Chrome):
    el renderizador WebGL debe nombrar la GPU dedicada.
  - Y aun así, **abre una sola vista**: el arreglo de GPU no te salva de tres
    escenas Three.js compitiendo.

- **Para con `npm run stop:arg`** (console, los dos MCP de jugador, cache y
  firehose), o con **Ctrl+C** en el launcher, que cascadea y se lleva también a
  la autoridad. Deja vivo el **socket-server** (:3017) a propósito: es infra
  compartida y el launcher la reutiliza si ya está.
- **Si algo sobrevive, sospecha de un huérfano.** Un servicio de una sesión
  anterior te da health verde y delta muerto — el peor de los mundos. La
  comprobación cuesta un segundo:
  ```powershell
  # 3017 socket · 3021 console · 3015 cache · 3016 firehose · 4121/4122 MCP
  foreach ($p in @(3017,3021,3015,3016,4121,4122)) {
    $c = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
    if ($c) { "puerto $p ocupado por pid $($c[0].OwningProcess)" }
  }
  ```
  Y ojo con la **autoridad**: no escucha en ningún puerto (es cliente de la
  room), así que **matar por puerto no la alcanza**. Una autoridad huérfana
  sigue emitiendo `arg:state` y, si arrancas otra, tendrás **dos autoridades
  peleándose por la misma room**. Si ves estado incoherente, búscala:
  `Get-CimInstance Win32_Process -Filter "Name='node.exe'"` y mira quién corre
  `apps/authority`.
- **Antes de nada**: `/mcp/health` con `connected: true` **y** `lastStateTs`
  fresco (< 2 s). `connected` solo dice que hay room; el `ts` dice que la
  autoridad está viva. Y aunque los dos estén bien, **comprueba que la ronda no
  venga colapsada** (`player_observe {"what":"sea"}` → `collapsed:false`): un
  servicio huérfano de una sesión anterior te da health verde y delta muerto.

## 3. La regla de oro: NO INVENTES OBSERVACIONES

Este playbook nació con observaciones escritas «a ojo» que **nadie había
visto**. Un caso que afirma algo falso es peor que un caso que falta: convierte
la validación en teatro.

- Si no lo has visto, se escribe `⏳ sin verificar`. No «debería verse».
- **Ambos resultados son datos.** Que el humano diga «no aparece nada» no es un
  fracaso tuyo: es el hallazgo. Anótalo y sigue.
- Que la evidencia MCP salga `ok:true` **no** implica que se vea en pantalla.
  Dominio y render son dos cosas: el gate G-ARG.1 los separa a propósito.
- **Este playbook miente en al menos un sitio.** C-15 promete un «shake» de
  cámara que **no existe**: el único shake del repo está en `BACKLOG.md` como
  WP-19, fase 2, sin entregar. Verificado por grep. Si una observación te suena
  demasiado cinematográfica, búscala en el código antes de creerla.

## 4. No lo hagas todo de golpe

Ejecutar los 21 casos del tirón no valida nada: acabas con un montón de
`ok:true` y cero certeza de que el juego se vea. Pero parar a conversar caso por
caso mata la ronda (punto 1).

**El equilibrio**: agrupa en **secuencias** (S-1…S-7). Dentro de una secuencia
disparas MCP sin parar; al final **paras una vez** y le das al humano un
**checklist granular** de todo lo que debería haber visto. La granularidad va en
el checklist, no en las paradas.

## 5. Esto también sirve para generar tareas de mejora

No es solo un semáforo. Cada ítem de checklist lleva un **ID estable**
(`V1.2`, `V3.4`…) precisamente para poder citarlo en un backlog. Al anotar usa:

| marca | significado | qué hacer con ello |
| ----- | ----------- | ------------------ |
| ✅ | se vio lo que se esperaba | nada |
| ❌ | **no** se vio / falla | tarea de **bug**, citando el ID |
| ⚠️ | MCP dice ok pero la vista no acompaña | tarea de **render**, la más valiosa |
| 💡 | funciona, pero es pobre / confuso / feo | tarea de **mejora de UX** |
| ⏳ | no se pudo comprobar | dilo, no lo rellenes |

El `⚠️` es el oro: significa que el dominio va bien y la proyección no —
exactamente lo que un test verde jamás detecta.

Registra la pasada en un fichero aparte (p. ej. `VALIDACION.md`), **no aquí**:
este documento es el guion; el acta de cada sesión es otra cosa.

---

# PLAN DE SECUENCIAS

Tres rondas. El orden no es estético: está diseñado para que la ronda no se
muera debajo de ti.

| ronda | secuencias | por qué así |
| ----- | ---------- | ----------- |
| **A** — la espina | S-0 arranque · S-1 movimiento · S-2 grifo · S-3 río · S-4 mar | Es la cadena causal del juego: sin grifo no hay gotas, sin gotas no hay río ni mar. Abrir el grifo en S-2 **alarga** la ronda. |
| **B** — lo seco | *(reinicia)* S-5 cantera · S-6 cloaks y social | No dependen del flujo. Ronda limpia para no arrastrar murk de A. |
| **C** — la demolición | *(reinicia)* S-7 riada y colapso | **Destructiva**: congela el dominio. Ronda desechable, y última. |

## S-0 · Arranque *(sin reloj todavía)*

1. `npm run demo:arg` _(default sin ventanas; `ZEUS_OPEN_BROWSER=1` solo si quieres auto-abrir)_
2. Espera `/mcp/health` → `connected:true` y `lastStateTs` < 2 s en :4121 y :4122.
3. Abre **solo** el tablero en Chrome: `http://localhost:3021/views/tablero`
4. Captura tú mismo la pantalla y léela.

**PARADA 0 — checklist** *(el reloj arranca al terminar)*

- `V0.1` ¿El tablero dibuja el delta? (plataformas, cauces, mar, rejilla de cantera)
- `V0.2` ¿La leyenda dice `conn connected` y `room ARG_DELTA`?
- `V0.3` ¿`murk 0/60` y el mar se ve **azul** (no marrón)? Si es marrón, la ronda ya venía muerta: reinicia.
- `V0.4` ¿`actores 0` y `gotas en vuelo 0`?
- `V0.5` ¿Consola del navegador sin errores?

## S-1 · Movimiento — C-01, C-02, C-02b, C-03

Dispara seguido, sin parar: `player_join {}` → `player_move {"nodeId":"terraza-a"}`
→ `player_move {"nodeId":"cima-a"}` *(debe fallar: `sin_enlace`)* →
`player_goto {"nodeId":"cima-a"}`.

**PARADA 1 — checklist** (tablero)

- `V1.1` ¿Apareció un monigote en la **plaza** (centro) al hacer join?
- `V1.2` ¿La leyenda pasó a `actores 1`?
- `V1.3` ¿Se **ve caminar** por la pasarela, o teletransporta?
- `V1.4` ¿La pose cambia a `walk` en tránsito y vuelve a `idle` al parar?
- `V1.5` En el move inválido: ¿el monigote **no** se movió? (rechazo silencioso)
- `V1.6` ¿El `goto` encadenó los dos saltos hasta la cima, sin cortes?
- `V1.7` 💡 ¿Se distingue **cuál** de los monigotes eres? ¿Hace falta?

## S-2 · Grifo — C-04, C-04b, C-05

`player_tap_set {"tapId":"grifo-a","aperture":0.75}` *(debe fallar: `sin_contacto`)*
→ `player_contact {"targetId":"grifo-a"}` → `player_tap_set {...0.75}`
→ `player_observe {"what":"taps"}`.

> Al abrir el grifo **la presión empieza a bajar**: acabas de alargar la ronda.

**PARADA 2 — checklist** (tablero, cima A)

- `V2.1` ¿El anillo/marca de cloak del grifo **reacciona** al abrir contacto?
- `V2.2` ¿Se abrió el **panel de contacto** con la oferta HORSE?
- `V2.3` En el `tap_set` sin contacto: ¿la válvula **no** giró?
- `V2.4` Con contacto: ¿la **válvula gira** hasta la apertura pedida?
- `V2.5` ¿El **manómetro baja** ahora que el grifo suelta?
- `V2.6` ¿**Nacen gotas** azules en el río A?
- `V2.7` ¿`gotas en vuelo` sube en la leyenda?
- `V2.8` 💡 ¿Se entiende de un vistazo la relación grifo→presión→gotas?

## S-3 · Río — C-07, C-08, C-09

`player_goto {"nodeId":"embarcadero-a"}` → `player_ride {"riverId":"rio-a"}`
→ `player_label {"label":"agora","tries":20}` → sondea `player_state {}` hasta
`riding: null` → `player_observe {"what":"tracks","n":5}`.

**PARADA 3 — checklist** (tablero + firehose-browser si lo abriste)

- `V3.1` ¿El monigote **monta** y baja el cauce (pose `ride`)?
- `V3.2` ¿**Adelanta** a las gotas? (el jinete va ~15% más rápido)
- `V3.3` Al etiquetar: ¿la gota se vuelve **cristal facetado brillante**?
- `V3.4` ¿Se ve **cuál** gota etiquetaste, o es indistinguible del resto?
- `V3.5` ¿La franja de **tracking** muestra la uri de la gota pisada?
- `V3.6` ¿El firehose-browser **navegó** al recurso? (si es sintético debe decir `「sintético」`, no reventar)
- `V3.7` ¿**Desmontó solo** en la desembocadura, sin llamar a `dismount`?
- `V3.8` Al llegar el cristal: ¿**crece la islita** del mar? ¿Sube `mar 💧`?
- `V3.9` 💡 ¿Hay feedback de que etiquetar sirvió de algo?

## S-4 · Mar vivo — C-17, C-18, C-33 *(fase 1.6 + ciclo vaciar)*

Requiere gotas llegadas. `player_observe {"what":"sea"}` → localiza una con
`label:null` → `player_cloak_equip {"presetId":"aleph-firehose-browse"}` →
`player_goto {"nodeId":"boya-1"}` → `player_salvage {...,"label":"memoria"}`
→ (otra ronda de vertido) `player_empty {}` →
`player_observe {"what":"sea"}` → `player_track {"dropletId":"…"}`.

**PARADA 4 — checklist** (tablero, zona mar)

- `V4.1` ¿Las gotas **sin etiquetar** se ven **hundidas** bajo la superficie?
- `V4.2` ¿Las **etiquetadas flotan** y se agrupan por etiqueta?
- `V4.3` ¿Los clusters tienen **letrero** con su etiqueta?
- `V4.4` ¿Se **apelotonan hacia el fondo** del mar, como pide el diseño?
- `V4.5` Al rescatar: ¿la gota **asciende con destello** y se une a su cluster?
- `V4.6` ¿Nace un cluster nuevo si la etiqueta no existía aún?
- `V4.7` ¿El mar **se aclara** un punto al rescatar? (murk −1)
- `V4.8` Con `player_track`: ¿el firehose-browser **carga la gota**?
- `V4.9` Al vaciar (C-33): ¿desaparecen las hundidas **sin** destello de rescate?
- `V4.10` 💡 ¿Se entiende la diferencia salvage (recuperar) vs empty (purgar)?

## S-5 · Cantera — C-11, C-12, C-12b *(ronda B, reinicia antes)*

`player_goto {"nodeId":"camara-0-2"}` → `player_observe {"what":"tracks"}` →
`player_excavate {"corridorId":"pasillo-camara-2-0--camara-3-0"}` *(debe fallar:
`fuera_de_camara`)* → `player_excavate {"corridorId":"pasillo-camara-0-2--camara-1-2","waitOpen":true}`.

**PARADA 5 — checklist**

- `V5.1` ¿El cache-browser cargó el recurso de la cámara pisada? ¿O dijo «no excavado aún» honestamente (sin ENOENT)?
- `V5.2` En el excavate lejano: ¿ningún pasillo cambió?
- `V5.3` ¿El pasillo **pulsa en ámbar** durante `digging`?
- `V5.4` ¿Pasa a **línea sólida** al abrir?
- `V5.5` ¿Las cámaras de ambos extremos pasan a `cached` con glow?
- `V5.6` 💡 ¿Se entiende qué se ha excavado y para qué?

## S-6 · Cloaks y social — C-10, C-13, C-14, C-16

Con dos actores (`:4121` uno, `:4122` dos). Nadar prohibido/permitido, equipar
preset, contacto jugador↔jugador, los cuatro emotes.

**PARADA 6 — checklist**

- `V6.1` Con `aleph-tronco-puro`: ¿se queda en la orilla y **no** nada?
- `V6.2` Con `aleph-firehose-browse`: ¿entra al agua con **pose de braza**?
- `V6.3` ¿Cambia el **anillo de cloak** al equipar?
- `V6.4` ¿El inventario `Q` marca el preset equipado?
- `V6.5` ¿Se abre el menú de contacto con las **ofertas HORSE cruzadas**?
- `V6.6` ¿Se ven los cuatro emotes (`wave`/`nod`/`shake`/`thumbsUp`) sobre la pose?
- `V6.7` 💡 ¿Se distinguen entre sí los emotes, o son todos «el monigote se menea»?

## S-7 · Riada y colapso — C-06, C-15 *(ronda C, DESECHABLE, la última)*

⚠️ **Esto congela el dominio.** No planees nada después.

Cierra el grifo y **mira el manómetro subir** (~50 s hasta reventar): ahí está
C-06, que en la sesión anterior solo se pudo verificar por ledger, nunca en
vivo. Luego deja que el murk se acumule hasta el colapso.

**PARADA 7 — checklist**

- `V7.1` ¿El **manómetro sube** visiblemente con el grifo cerrado?
- `V7.2` ¿**Parpadea en rojo** cerca de 1?
- `V7.3` Al reventar: ¿hay **salpicadura roja fuera del cauce**?
- `V7.4` ¿El mar **se enturbia** progresivamente (azul → marrón)?
- `V7.5` Al colapsar: ¿el mar **sube y traga** las terrazas?
- `V7.6` ⚠️ **NO esperes «shake» de cámara: no existe.** Está en el WP-19
  (fase 2, sin entregar). Si el humano no ve temblor, **es correcto** — el
  error está en el playbook, no en el juego. → tarea: entregar WP-19 o borrar
  la promesa.
- `V7.7` 💡 ¿El colapso se siente como un final, o el juego simplemente se para?

---

## C-01 — join y spawn en plaza

- **Precondición**: demo levantada (autoridad emitiendo `arg:state`), health `connected: true`.
- **Pasos del agente (uno)**:
  1. `player_join {}`
  2. `player_state {}`
- **Qué observa el humano**: en el **tablero** aparece un monigote nuevo en la plaza; en `jugador?actor=uno` la cámara chase lo encuadra.
- **Criterio de éxito**: `ok:true` con `evidencia.actor` → `nodeId:"plaza"`, `zone:"terraza"`, `pose:"idle"`, `score:{labeled:0,excavated:0}`.
- **Errores esperados**: ninguno. Repetir `player_join` es idempotente.

## C-02 — move válido plaza → terraza-a

- **Precondición**: C-01 (uno en `plaza`).
- **Pasos del agente (uno)**:
  1. `player_move {"nodeId":"terraza-a"}`
- **Qué observa el humano**: en el tablero/jugador el monigote camina la pasarela (pose `walk`) y se detiene en la terraza oeste.
- **Criterio de éxito**: `ok:true`, `evidencia.actor.nodeId === "terraza-a"`, `llegada:true` (durante el tránsito la pose fue `walk`).
- **Errores esperados**: ninguno.

## C-02b — move inválido sin enlace (no-op)

- **Precondición**: uno en `plaza` (o cualquier nodo NO adyacente a `cima-a`).
- **Pasos del agente (uno)**:
  1. `player_move {"nodeId":"cima-a"}`
- **Qué observa el humano**: nada — el monigote NO se mueve (la autoridad ignora el intent).
- **Criterio de éxito**: `ok:false`, `error:"sin_enlace"` (regla probable por dry-run del reducer); el actor sigue en su nodo.
- **Errores esperados**: `sin_enlace`.

## C-03 — goto multi-salto plaza → cima-a

- **Precondición**: uno en `plaza`.
- **Pasos del agente (uno)**:
  1. `player_goto {"nodeId":"cima-a"}`
- **Qué observa el humano**: en `jugador?actor=uno` la **chase cam** sigue al monigote plaza → terraza-a → cima-a; en la cima ve el grifo A con su manómetro.
- **Criterio de éxito**: `ok:true`, `evidencia.ruta === ["terraza-a","cima-a"]`, `evidencia.actor.nodeId === "cima-a"`, `zone:"cima"`.
- **Errores esperados**: ninguno.

## C-04 — contacto con el grifo

- **Precondición**: C-03 (uno en `cima-a`, dentro del radio de contacto 3.5).
- **Pasos del agente (uno)**:
  1. `player_contact {"targetId":"grifo-a"}`
- **Qué observa el humano**: el **anillo de cloak** del grifo pulsa; en la vista jugador se abre el **panel de contacto** (PROMPTS/TOOLS/RESOURCES vía HORSE).
- **Criterio de éxito**: `ok:true`, `evidencia.contacto.state === "open"` con `contactId "c-grifo-a--uno"`.
- **Errores esperados**: `fuera_de_alcance` si no está en la cima.

## C-04b — tap_set SIN contacto ⇒ rechazado

- **Precondición**: SIN contacto abierto con `grifo-a` (si C-04 lo abrió, `player_contact_close {}` primero). La apertura actual debe ser distinta de la pedida.
- **Pasos del agente (uno)**:
  1. `player_tap_set {"tapId":"grifo-a","aperture":0.75}`
- **Qué observa el humano**: la válvula NO gira, la apertura no cambia.
- **Criterio de éxito**: `ok:false`, `error:"sin_contacto"` (regla REAL del reducer: `tap:set` exige contacto abierto).
- **Errores esperados**: `sin_contacto`.

## C-05 — tap_set 0.75 con contacto

- **Precondición**: C-04 (contacto `open` con `grifo-a`), uno en `cima-a`.
- **Pasos del agente (uno)**:
  1. `player_tap_set {"tapId":"grifo-a","aperture":0.75}`
  2. `player_observe {"what":"taps"}`
- **Qué observa el humano**: la **válvula gira**, el **manómetro baja** (releaseRate alivia presión) y empiezan a **nacer gotas** en el río A (puntos azules).
- **Criterio de éxito**: paso 1 `ok:true` con `evidencia.grifo.aperture === 0.75`; en pocos segundos `player_state` muestra `rios["rio-a"].gotasEnVuelo > 0`.
- **Errores esperados**: `apertura_invalida` si el valor sale de 0..1.

## C-06 — presión: grifo cerrado ⇒ riada (burst)

- **Precondición**: contacto abierto con `grifo-a` (C-04). Caso lento: ~50 s con el grifo cerrado (inflowRate 0.02/s).
- **Pasos del agente (uno)**:
  1. `player_tap_set {"tapId":"grifo-a","aperture":0}`
  2. Repetir `player_observe {"what":"taps"}` cada ~5 s hasta que `grifo-a.state === "burst"`.
  3. `player_observe {"what":"ledger","n":10}`
- **Qué observa el humano**: el **manómetro sube** y parpadea en rojo cerca de 1; al llegar, **riada**: salpicadura roja fuera del cauce y el murk del mar sube.
- **Criterio de éxito**: `taps["grifo-a"].state` pasa por `burst` (luego `cooldown` con `pressure 0.5`); el ledger contiene una entrada `kind:"burst"` con `detail.tapId:"grifo-a"`.
- **Errores esperados**: ninguno (la presión es física del dominio, no requiere más intents).

## C-07 — ride en embarcadero-a + surf

- **Precondición**: gotas fluyendo en `rio-a` (C-05, apertura > 0 desde hace unos segundos).
- **Pasos del agente (uno)**:
  1. `player_goto {"nodeId":"embarcadero-a"}`
  2. `player_ride {"riverId":"rio-a"}`
  3. `player_observe {"what":"tracks","n":5}`
- **Qué observa el humano**: el monigote se agacha (pose `ride`) y **surfea el cauce adelantando gotas** (el jinete va un 15% más rápido que el flujo); la **franja inferior de tracking** de la vista jugador muestra la uri de la gota pisada, y un **firehose-browser** abierto con `?actor=uno` va cargando esos recursos.
- **Criterio de éxito**: paso 2 `ok:true` con `evidencia.riding.riverId === "rio-a"` (embarca a progress 0.5); paso 3 devuelve entradas `arg:track` con `actorId:"uno"` y `hint:"firehose-browser"` cuando pisa gotas.
- **Errores esperados**: `fuera_de_embarcadero` si no hizo el paso 1; `ya_montado` si repite.

## C-08 — label:cast montado ⇒ ledger + score + cristal

- **Precondición**: C-07 (uno montado en `rio-a` con gotas alrededor).
- **Pasos del agente (uno)**:
  1. `player_label {"label":"agora","tries":20}`
  2. `player_observe {"what":"sea"}` (repetir tras ~20 s)
- **Qué observa el humano**: la gota pisada se vuelve **cristal facetado brillante**; al llegar a la desembocadura el cristal suma y la **islita del mar crece**.
- **Criterio de éxito**: paso 1 `ok:true` con `evidencia.ledger.kind === "label"`, `actorId:"uno"` y `evidencia.score.labeled` incrementado; más tarde `sea.crystals` sube en 1.
- **Errores esperados**: `no_montado`, `sin_gota` (ninguna gota bajo los pies en ningún intento), `etiqueta_invalida` (fuera del labelset `agora|memoria|ruido`), `ya_etiquetada`.

## C-09 — auto-dismount en la desembocadura

- **Precondición**: uno montado en `rio-a` (C-07/C-08).
- **Pasos del agente (uno)**:
  1. Esperar sin emitir intents y sondear `player_state {}` cada ~3 s hasta que `riding` sea `null`.
- **Qué observa el humano**: el monigote llega a la boca del río y **desmonta solo en la orilla del mar** (pose `idle`).
- **Criterio de éxito**: `actor.riding === null`, `actor.nodeId === "orilla-mar"`, `zone:"mar"` — sin haber llamado a `player_dismount`.
- **Errores esperados**: si se llama `player_dismount` DESPUÉS del auto-dismount ⇒ `ok:false, error:"no_montado"` (también evidencia válida del caso).

## C-10 — nadar: cloak que prohíbe vs cloak que permite

- **Precondición**: uno en `orilla-mar` (C-09 o `player_goto {"nodeId":"orilla-mar"}`). OJO: SIN cloak equipado nadar está permitido por defecto — para ver el rechazo hay que vestir un preset que lo prohíba.
- **Pasos del agente (uno)**:
  1. `player_cloak_equip {"presetId":"aleph-tronco-puro"}` (swimAllowed: false)
  2. `player_move {"nodeId":"boya-1"}` ⇒ debe fallar
  3. `player_cloak_equip {"presetId":"aleph-firehose-browse"}` (swimAllowed: true, walk ×1.25)
  4. `player_move {"nodeId":"boya-1"}` ⇒ debe nadar
- **Qué observa el humano**: con el tronco puro el monigote se queda en la orilla; con el cloak firehose entra al agua con **pose braza (`swim`)** hasta la boya 1.
- **Criterio de éxito**: paso 2 `ok:false, error:"nadar_no_permitido"`; paso 4 `ok:true` con llegada a `boya-1` (pose `swim` durante el tránsito, `zone:"mar"`).
- **Errores esperados**: `nadar_no_permitido` (solo en el paso 2).

## C-11 — cantera: pisar una cámara ⇒ track (o ghost honesto)

- **Precondición**: uno con los pies en tierra (p.ej. `orilla-mar`). La cámara de entrada `camara-0-2` viene cacheada por el start pack en feeds reales; en sintético puede ser ghost.
- **Pasos del agente (uno)**:
  1. `player_goto {"nodeId":"camara-0-2"}` (ruta … → `cantera-entrada` → `camara-0-2`; la boca siempre está abierta)
  2. `player_observe {"what":"tracks","n":5}`
- **Qué observa el humano**: el monigote entra en la cantera; si la cámara está `cached`, un **cache-browser** abierto con `?actor=uno` **carga el recurso** de la cámara; si está `ghost`, el browser lo dice honestamente («no excavado aún») y no navega.
- **Criterio de éxito**: paso 1 `ok:true` con `nodeId:"camara-0-2"`, `zone:"cantera"`; si la cámara estaba `cached`, paso 2 muestra un `arg:track` con `hint:"cache-browser"` y su `ref.uri`; si estaba `ghost`, la ausencia de track es el resultado correcto (verificable en `arg://scene` → `cantera.camaras`).
- **Errores esperados**: ninguno.

## C-12 — excavate pasillo ghost ⇒ digging → open

- **Precondición**: C-11 (uno en `camara-0-2`); el pasillo `pasillo-camara-0-2--camara-1-2` en estado `ghost` (verifícalo en `arg://scene`). En feeds reales añade `"approval":"APROBAR"` (token `resolveMcpApprovalToken`).
- **Pasos del agente (uno)**:
  1. `player_excavate {"corridorId":"pasillo-camara-0-2--camara-1-2","waitOpen":true}`
- **Qué observa el humano**: la línea discontinua gris del pasillo **pulsa en ámbar** (`digging`, ~2.5 s en sintético) y luego se vuelve **sólida** (`open`); las cámaras de ambos extremos pasan a `cached` con glow.
- **Criterio de éxito**: `ok:true` con `evidencia.pasillo.state === "open"` y `evidencia.ledger.kind === "excavate"`; el score `excavated` del actor sube en 1.
- **Errores esperados**: `ya_abierto` / `ya_excavando` al repetir; `aprobacion_requerida` en feeds reales sin approval (se manifiesta como timeout con nota, la autoridad no lo reduce).

## C-12b — excavate no adyacente ⇒ fuera_de_camara

- **Precondición**: uno en `camara-0-2`; un pasillo `ghost` LEJOS de su cámara, p.ej. `pasillo-camara-2-0--camara-3-0`.
- **Pasos del agente (uno)**:
  1. `player_excavate {"corridorId":"pasillo-camara-2-0--camara-3-0"}`
- **Qué observa el humano**: nada — ningún pasillo cambia.
- **Criterio de éxito**: `ok:false`, `error:"fuera_de_camara"`.
- **Errores esperados**: `fuera_de_camara` (si ese pasillo ya no está ghost, elige otro no adyacente: primero se evalúa el estado del pasillo).

## C-13 — cloak:equip del PresetStore ⇒ anillo e inventario

- **Precondición**: uno unido (C-01). Presets del start pack: `aleph-tronco-puro`, `aleph-firehose-browse` (sembrados con `npm run seed:aleph`).
- **Pasos del agente (uno)**:
  1. `player_cloak_equip {"presetId":"aleph-firehose-browse","label":"firehose"}`
  2. `player_state {}`
- **Qué observa el humano**: sobre el monigote aparece/cambia el **anillo de cloak**; en la vista jugador el **inventario `Q`** marca el preset equipado.
- **Criterio de éxito**: `ok:true` con `evidencia.cloak.presetId === "aleph-firehose-browse"` y `evidencia.fisica` (walk ×1.25, nada permitido); `player_state` refleja el cloak.
- **Errores esperados**: `preset_requerido` con presetId vacío.

## C-14 — contacto jugador ↔ jugador (WP-11)

- **Precondición**: los DOS MCP conectados (uno :4121, dos :4122); ambos actores unidos y en el MISMO nodo (p.ej. `plaza`).
- **Pasos del agente**:
  1. (dos) `player_join {}` · (dos) `player_goto {"nodeId":"plaza"}` si hace falta
  2. (uno) `player_goto {"nodeId":"plaza"}` si hace falta
  3. (uno) `player_contact {"targetId":"dos"}`
- **Qué observa el humano**: en ambas vistas jugador se abre el **menú de contacto** con las **ofertas HORSE cruzadas** (prompts/tools/resources del cloak del otro).
- **Criterio de éxito**: paso 3 `ok:true` con `evidencia.contacto` `{a,b} = {dos,uno}` y `state:"open"` (contactId `c-dos--uno`).
- **Errores esperados**: `fuera_de_alcance` (a más de 3.5 de distancia), `contacto_consigo` si el targetId es el propio actor.

## C-15 — colapso: murk > capacidad (fin de ronda)

- **Precondición**: partida avanzada. Caso LARGO (minutos): cada gota que llega al mar sin etiquetar suma 1 de murk (capacidad 60) y cada riada vierte 0.8/s durante 4 s.
- **Pasos del agente (uno)**:
  1. `player_contact {"targetId":"grifo-a"}` + `player_tap_set {"tapId":"grifo-a","aperture":1}` (nadie etiqueta: todo se vierte)
  2. Opcional acelerar con riadas: alternar `player_tap_set {"tapId":"grifo-a","aperture":0}` y dejar reventar (C-06) las veces que haga falta.
  3. Sondear `player_observe {"what":"sea"}` hasta `collapsed: true`; después `player_observe {"what":"ledger","n":10}`.
- **Qué observa el humano**: el mar se **enturbia** progresivamente (azul → marrón) y, al superar la capacidad, **sube** hasta tragar las terrazas (`delta-stage.mjs:284` lo eleva a `y=3.2`).
  ⚠️ **Corregido 2026-07-15**: este caso prometía «shake + fade» de cámara. **No existe**: el único shake de cámara del repo está en `BACKLOG.md` como **WP-19 (fase 2, sin entregar)**; el otro `shake` del código es el emote de negar con la cabeza. Si el humano no ve temblor, **el juego está bien y el playbook estaba mal**. (UX.md ya lleva la misma anotación; la promesa vive solo como intención de diseño del WP-19.)
- **Criterio de éxito**: `sea.collapsed === true` y entrada de ledger `kind:"collapse"` con `detail.murk > detail.capacity`.
  **Verificado en vivo 2026-07-15** (accidentalmente, con la demo desatendida ~13 min): `{crystals:0, murk:60.16, murkCapacity:60, collapsed:true}` + ledger `seq 21 · collapse · {murk:60.1599…, capacity:60}`, precedido de 9 × `burst`. La evidencia MCP de este caso está confirmada; lo que sigue **sin** verificar es la parte visual de «sube y traga las terrazas».
- **Errores esperados**: ninguno (es la física del vertido).

## C-16 — emotes visibles en el monigote

- **Precondición**: uno unido (C-01).
- **Pasos del agente (uno)**:
  1. `player_emote {"name":"wave"}`
  2. `player_emote {"name":"nod"}`
  3. `player_emote {"name":"shake"}`
  4. `player_emote {"name":"thumbsUp"}`
- **Qué observa el humano**: el monigote **saluda / asiente / niega / levanta el pulgar** como capa aditiva sobre su pose (cada emote dura ~2.5 s).
- **Criterio de éxito**: cada llamada `ok:true` con `evidencia.emote === name` (visto en `arg:state` antes de expirar el TTL).
- **Errores esperados**: el reducer rechaza nombres fuera de `wave|nod|shake|thumbsUp` (`emote_invalido`) — el tool ya lo impide con su enum.

---

## Fase 1.6 — Mar vivo ([MAR.md](MAR.md), WP-28..32)

Los casos siguientes requieren la fase 1.6 desplegada. Antes de ejecutarlos,
verifica con `tools/list` que el MCP expone `player_salvage` y `player_track`;
si no están, la fase aún no ha sido entregada por el swarm y el caso se
reporta como `pendiente_de_fase`, no como fallo.

## C-17 — rescatar una gota hundida del mar (salvage)

- **Precondición**: fase 1.6 desplegada. Al menos una gota **hundida** en el
  mar: genera vertido con C-05 (grifo abierto, nadie etiqueta) y espera ~20 s
  a que lleguen gotas sin etiquetar. Verifícalo con `player_observe {"what":"sea"}`
  → `droplets` con entradas de `label: null`.
- **Pasos del agente (uno)**:
  1. `player_observe {"what":"sea"}` → anota `murk`, `crystals` y el `dropletId` de una gota con `label: null`.
  2. `player_cloak_equip {"presetId":"aleph-firehose-browse"}` (permite nadar)
  3. `player_goto {"nodeId":"boya-1"}` (el rescate exige proximidad: zona mar, o orilla/boya a ≤ 3.5 de la posición de la gota)
  4. `player_salvage {"dropletId":"<id del paso 1>","label":"memoria"}`
  5. `player_observe {"what":"sea"}`
- **Qué observa el humano**: la gota tenue bajo la superficie **asciende con un destello**, se vuelve cristal y **se une al cluster «memoria»** apelotonado hacia el final del mar (si es la primera con esa etiqueta, nace el cluster con su letrero); el mar se aclara un punto.
- **Criterio de éxito**: paso 4 `ok:true` con `evidencia.ledger.kind === "label"` y `detail.salvage === true`, y `score.labeled` incrementado; paso 5: la gota aparece flotante con `label:"memoria"`, `murk` bajó en 1 y `crystals` subió en 1 respecto al paso 1.
- **Errores esperados**: `gota_invalida` (id inexistente o ya flotante), `etiqueta_invalida` (fuera del labelset), `fuera_de_alcance` (lejos de la gota), `nadar_no_permitido` en el paso 3 sin cloak nadador.

## C-18 — lanzar una gota del mar al firehose-browser (track:cast)

- **Precondición**: fase 1.6 desplegada. Un **firehose-browser** abierto con `?actor=uno` (:3016). Al menos una gota en el mar, flotante o hundida (C-08 o C-17 la dejan).
- **Pasos del agente (uno)**:
  1. `player_observe {"what":"sea"}` → anota un `dropletId` y su `uri`.
  2. `player_track {"dropletId":"<id del paso 1>"}`
  3. `player_observe {"what":"tracks","n":5}`
- **Qué observa el humano**: el firehose-browser del jugador **navega al recurso de la gota** (deep-link honesto: si el ref es sintético, la franja de juego lo marca `「sintético」` sin ENOENT; no navega).
- **Criterio de éxito**: paso 2 `ok:true` con evidencia del `arg:track` emitido; paso 3 muestra un track con `actorId:"uno"`, `hint:"firehose-browser"` y el `ref.uri` de la gota. Sin mutación de dominio: score, `crystals` y `murk` intactos.
- **Errores esperados**: `gota_invalida` (la gota ya salió del pool por overflow — elige otra del paso 1).

---

## Fase DJ — manipulador de líneas (WP-U30)

Dominio + ledger listos; **tools MCP `dj_*` y decks de player-ui llegan en
WP-U31**. Hasta entonces:

- Verificación automática: `npm run test:arg-domain` (reducer + domain-state
  con evidencia de ledger).
- Pasos abajo usan nombres provisionales `dj_cache` / `dj_curate` /
  `dj_milestone`. Si `tools/list` no los expone, el caso se reporta como
  `pendiente_de_fase` (U31), **no** como fallo de dominio.

Semilla de demo del line-board: línea `linea-aleph`, registros `P03` / `P04`
(pending, no cacheados).

## C-30 — cache (rol dj) ⇒ ledger + score.cached

- **Precondición**: dominio U30; actor con rol `dj` unido (join). Hasta U31
  la evidencia sale del test de domain-state / autoridad con
  `role:"dj"` en el intent. Si `tools/list` no expone `dj_cache`, reportar
  `pendiente_de_fase` (U31), no fallo de dominio.
- **Pasos del agente (dj)**:
  1. `dj_cache {"lineId":"linea-aleph","registroId":"P03"}`
  2. `dj_cache {"lineId":"linea-aleph","registroId":"P03"}` *(repetir ⇒ rechazo)*
  3. Intent equivalente con `role:"player"` (o sin role) ⇒ `rol_no_autorizado`
- **Qué observa el humano**: en el tablero DJ (U31) el registro pasa a
  «cacheado»; hasta entonces, evidencia solo en ledger/`arg:state.lines`.
- **Criterio de éxito**: paso 1 `ok:true` con `evidencia.ledger.kind ===
  "cache"`, `actorId` del dj, `detail.lineId/registroId`; `score.cached`
  +1; `arg:state.lines.regs` marca cached=1 para P03. Paso 2
  `error:"ya_cacheado"`. Paso 3 `error:"rol_no_autorizado"`.
- **Errores esperados**: `linea_invalida`, `registro_invalido`,
  `ya_cacheado`, `rol_no_autorizado`, `aprobacion_requerida` (feeds reales
  sin approval).

## C-31 — curate (rol dj) pending→draft→curated

- **Precondición**: C-30 (P03 cacheado).
- **Pasos del agente (dj)**:
  1. `dj_curate {"lineId":"linea-aleph","registroId":"P03"}`
  2. `dj_curate {"lineId":"linea-aleph","registroId":"P03","to":"curated"}`
  3. `dj_curate {"lineId":"linea-aleph","registroId":"P03"}` *(⇒ ya_curado)*
  4. `dj_curate {"lineId":"linea-aleph","registroId":"P04"}` *(P04 no cacheado ⇒ no_cacheado)*
- **Qué observa el humano**: el estado editorial del registro avanza en el
  deck de curación (U31).
- **Criterio de éxito**: pasos 1–2 `ok:true` con ledger `kind:"curate"` y
  `detail.status` `draft` luego `curated`; `score.curated` +2. Paso 3
  `error:"ya_curado"`. Paso 4 `error:"no_cacheado"`.
- **Errores esperados**: `no_cacheado`, `status_salto` (pending→curated de
  un golpe), `ya_curado`, `rol_no_autorizado`.

## C-32 — milestone (rol dj) sobre curated

- **Precondición**: C-31 (P03 en `curated`).
- **Pasos del agente (dj)**:
  1. `dj_milestone {"lineId":"linea-aleph","registroId":"P03","reasons":["byte_delta"]}`
  2. `dj_milestone {"lineId":"linea-aleph","registroId":"P03","reasons":["byte_delta"]}` *(⇒ ya_milestone)*
  3. Sobre un registro solo `draft` ⇒ `no_curado`
- **Qué observa el humano**: el registro queda anclado como hito en el
  manipulador (U31).
- **Criterio de éxito**: paso 1 `ok:true` con ledger `kind:"milestone"`,
  `detail.reasons` incluye `"byte_delta"`, `score.milestoned` +1;
  `lines.regs` marca milestone=1. Paso 2 `error:"ya_milestone"`.
- **Errores esperados**: `no_cacheado`, `no_curado`, `ya_milestone`,
  `rol_no_autorizado`.

---

## Fase ciclo crecer/vaciar (WP-U83)

Crecer = cache/curate/milestone (C-30..C-32). Vaciar = `player_empty`:
purgar gotas hundidas del mar (vertido blando). Coste narrativo: esas gotas
**ya no se pueden rescatar** (alternativa a C-17 salvage). Roles alineados
con `empty_playable` de volumes-ops (player|dj). El ledger del juego asienta
`kind:"empty"` con `detail.opsIntent:"empty_playable"`; la autoridad puede
gemelar asiento ops.

## C-33 — vaciar vertido blando del mar (empty)

- **Precondición**: al menos una gota **hundida** en el mar (genera vertido
  con C-05: grifo abierto, nadie etiqueta; espera ~20 s). Actor en
  `orilla-mar` / `boya-*` / zona mar. Verifica con
  `player_observe {"what":"sea"}` → `droplets` con `label: null`.
- **Pasos del agente (uno)**:
  1. `player_observe {"what":"sea"}` → anota `murk` y cuántas hundidas hay.
  2. `player_goto {"nodeId":"orilla-mar"}` (o `boya-1` con cloak nadador).
  3. `player_empty {}`
  4. `player_observe {"what":"sea"}` · `player_observe {"what":"ledger","n":5}`
  5. `player_empty {}` *(repetir ⇒ `nada_que_vaciar`)*
- **Qué observa el humano**: las gotas tenues bajo la superficie **desaparecen**;
  el mar se aclara (murk baja); no hay destello de rescate (eso es salvage).
- **Criterio de éxito**: paso 3 `ok:true` con `evidencia.ledger.kind ===
  "empty"`, `actorId:"uno"`, `detail.removed ≥ 1`,
  `detail.opsIntent === "empty_playable"`, `score.emptied` +1; paso 4 murk
  menor que en el paso 1 y cero hundidas; paso 5 `ok:false`,
  `error:"nada_que_vaciar"`.
- **Errores esperados**: `fuera_de_mar`, `nada_que_vaciar`, `mar_colapsado`,
  `rol_no_autorizado` (p.ej. operator).
