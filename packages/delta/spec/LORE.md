# delta — ARG del Escriptorio

> ARG multijugador sobre el runtime Scriptorium. Nombre del juego: **delta**.

## Idea madre

delta no es un visualizador de datos: es un **juego cuyo tablero son los
volúmenes de datos reales del Scriptorium, y cuyas jugadas los hacen crecer**.
Jugar no es leer la línea: es decidir qué contiene, cuándo se pincha el
firehose, qué se etiqueta, qué se excava y se cachea. El mundo del juego es la
*política de crecimiento* de DISK_01 (firehose) y DISK_02 (wikicache),
proyectada como un delta habitable.

Inspiración (no modelización) de [parlament](https://pub.escrivivir.co/parlament/):

| parlament                  | delta                                               |
| -------------------------- | --------------------------------------------------- |
| "el vivo puede ser caótico; el retorno no" | la riada es caótica; solo lo etiquetado/cacheado cristaliza |
| Firehose (presión semántica del Público)   | **La Riada**: ríos de microposts sin etiquetar       |
| Arrakis BOE (ledger que notariza)          | **El Notario**: ledger append-only de cristalizaciones (`arg:ledger`) |
| MC que coordina la Room                    | **La Autoridad**: proceso master que arbitra físicas e intents |
| Elenco (habitantes activos)                | jugadores y agentes con **cloak MCP**                |
| Público que empuja                         | la **presión** que acumulan los grifos cerrados      |
| Room / capa viva                           | la room Socket.IO `ARG_DELTA`                        |
| validación + firma para volver a la red    | gate de aprobación (`APROBAR`) para mutar volúmenes reales |

## Las dos fuerzas

### 1. AGUA — La Riada (masiva, rápida, hay que gobernarla)

En las **cimas** del delta hay **grifos** (taps): tomas del firehose. Un grifo
abierto suelta un **río** de gotas — cada gota es un micropost real (o
sintético) sin etiquetar. Un grifo cerrado **acumula presión** (el firehose no
deja de empujar aunque no lo mires); si la presión revienta, hay **riada**:
las gotas caen sin cauce, inundan y se pierden (corpus `discarded`).

- **Navegar el río** = surfear la secuencia de mensajes sin etiquetar: el
  jugador montado en el río va recibiendo cada gota en su navegador real
  (firehose-browser) vía tracking de posición.
- **Etiquetar en marcha** (`label:cast`) cristaliza la gota: se vuelve sólida,
  llega al **mar** y se deposita (corpus `labeled`). El mar es el corpus
  etiquetado: **nadar en el mar** = consultar lo ya cristalizado.
- **Colapso**: si el vertido sin etiquetar supera el umbral, el delta se
  inunda (game over de ronda / cue de gamemap). El juego cooperativo es la
  gestión del flujo: cuánto abres, cuántos etiquetadores hay río abajo.

### 2. PIEDRA — La Cantera (estática, estable, se consulta y se excava)

En el flanco del delta, un **laberinto de galerías**: las **cámaras** son
conceptos estables (nodos/años/registros de la wikicache) y los **pasillos**
son los hipervínculos entre ellos. Es la homología dura del cache-browser:

- **Caminar una galería** = hacer una query estable: al entrar en una cámara
  el juego emite `arg:track` y el navegador real del jugador (cache-browser)
  carga el recurso (nodo, oldid, wikitext, registro).
- Los pasillos hacia contenido **no cacheado** existen como **fantasmas**
  (wireframe discontinuo): se ven, no se cruzan. **Excavar** (`excavate`) un
  pasillo fantasma lanza un *viaje* (fetch on-demand estilo `cache_wikitext`,
  con gate de aprobación cuando el volumen es real) y, al completarse, el
  pasillo se vuelve sólido: **el laberinto crece porque se jugó**.
- La Cantera es la memoria del juego: lo que una partida excava queda para
  las siguientes (los *start packs* del storage git son laberintos semilla).

## Sujetos: la cloak MCP

Todo lo que actúa en el delta — jugador, agente, artilugio — viste una
**cloak**: su ficha de capacidades MCP (un *preset* de `@zeus/presets-sdk`
resuelto como oferta HORSE). La cloak es a la vez identidad, inventario y
protocolo de contacto:

- **Contacto**: cuando dos sujetos se acercan y uno lo solicita, se
  intercambian ofertas (tools / resources / prompts) y se despliega el **menú
  de contacto**: prompts como triggers, tools como acciones, resources como
  lecturas. Toda interacción sujeto↔sujeto o sujeto↔cosa pasa por ahí.
- **Inventario**: el jugador arranca con un *start pack* de presets y
  desbloquea más jugando (etiquetar N gotas → tools de firehose; excavar M
  pasillos → prompts de viaje). Activar un preset cambia lo que tu cloak
  ofrece y lo que tus físicas permiten.
- Los **artilugios** (grifos, boyas, portales de galería) también llevan
  cloak: operar un grifo ES llamar a su tool con el menú de contacto.

## Estética

Monigotes y wireframes: cero texturas, todo geometría barata e instanciada,
para que la cantidad sea el espectáculo (cientos de gotas, decenas de
sujetos). Dos tiers:

- **tier stick**: monigotes procedurales de segmentos (~13 articulaciones,
  poses paramétricas), instanciables en masa — multitud, agentes ambiente.
- **tier puppet**: los GLB existentes (SK_Alephillo / Xbot / RobotExpressive,
  capas base+aditivas de `ui-3d-kit`) — jugadores y protagonistas.

El delta: terrazas wireframe, ríos como cintas de gotas instanciadas, mar como
plano ondulado de líneas, cantera como cajas y aristas. La expresividad sale
de la articulación y el movimiento, no del material.

## El bucle de juego (una ronda)

1. La Autoridad carga un **gamemap** (escena + semillas + cues + objetivos).
2. Los grifos acumulan presión; alguien tiene que subir y pactar aperturas.
3. Río abajo, surfistas etiquetan gotas; el mar acumula flujo cristalizado.
4. En la Cantera, expediciones consultan y excavan; el laberinto crece.
5. Todo lo cristalizado (etiquetas, excavaciones, cache/curate/milestone del
   DJ) queda en el ledger del Notario; lo caótico (riadas, vertidos) se pierde.
6. **Vaciar** (WP-U83): el jugador puede **purgar el vertido blando** del mar
   (`empty`) — desechar gotas hundidas para liberar murk. El coste narrativo
   es la oportunidad: esas gotas ya no se rescatan (alternativa a salvage).
   Roles `player`/`dj`, gemelos de `empty_playable` en volumes-ops.
7. La ronda termina por objetivo (X gotas etiquetadas, Y pasillos excavados)
   o por colapso (inundación). El delta resultante ES el nuevo estado de los
   volúmenes: la partida infló — o liberó — los datos.

## El manipulador de líneas (rol `dj`)

El Tablero (player-ui) no es otro juego: es la vista del **manipulador de
líneas** del mismo mundo. Con rol `dj` emite `cache` / `curate` / `milestone`
sobre el line-board del dominio — la misma autoridad, el mismo ledger, el
mismo score. Cadena: materializar un registro → curar su `delta_status` →
anclar milestone. El cableado de decks en player-ui es WP-U31.
