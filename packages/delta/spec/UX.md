# delta — UX y sistema de juego

## El delta (escena `delta-v0`)

Composición espacial (todo wireframe, fondo `0x05050a` heredado del kit):

```
        ▲ cima-a (grifo A)   ▲ cima-b (grifo B)   ▲ cima-c (grifo C, cerrado)
         \                    /                     |
          río-a (cinta)   río-b (cinta)             │ presión…
           \                /                       │
   terrazas (nav-graph de plataformas y pasarelas)  │
             \            /                    ┌────┴─────────┐
              ~~~~ MAR ~~~~ (plano ondulado)   │  LA CANTERA  │
              boyas · islas de cristal         │ cámaras+pasillos
                                               │ (grid 4×3)   │
                                               └──────────────┘
```

- **Cimas**: plataformas altas con el grifo como artilugio (válvula wireframe
  que gira con `aperture`; un manómetro vertical muestra `pressure` y
  parpadea en rojo cerca de 1).
- **Ríos**: cintas de puntos instanciados (gotas). Gota sin etiquetar =
  punto azul tenue; etiquetada = cristal facetado brillante; spill/riada =
  salpicadura roja que cae fuera del cauce.
- **Mar**: plano de líneas ondulado; `murk` lo enturbia (opacidad/color),
  los cristales forman islas que crecen. Las gotas que llegan **persisten**:
  las etiquetadas flotan formando clusters dinámicos por etiqueta y se
  apelotonan hacia el final del mar; las sin etiquetar se hunden y quedan
  rescatables con `salvage` ([MAR.md](MAR.md), fase 1.6). Colapso = el mar
  sube y traga terrazas.
  > ⚠️ **Entregado vs. planeado**: la subida del mar al colapsar es real
  > (`delta-stage.mjs:284`, sube a `y=3.2`). El **shake de cámara y el fade
  > son WP-19 (fase 2), SIN ENTREGAR** — hoy no hay temblor. Esta línea decía
  > «(shake + fade)» a secas y CASOS.md lo copió como si el humano fuese a
  > verlo, lo que hizo fallar una validación en 2026-07-15. Si añades UX aquí,
  > marca qué está construido y qué es intención.
- **Cantera**: cajas wireframe (cámaras) unidas por aristas (pasillos).
  Pasillo fantasma = línea discontinua gris; `digging` = pulso ámbar;
  abierto = línea sólida. Cámara cacheada emite un glow suave al pisarse.

## Sujetos en escena

- **tier stick** (multitud, agentes): monigote procedural — cabeza (círculo),
  columna, brazos y piernas de 2 segmentos (13 articulaciones), todo
  `LineSegments`/cilindros finos instanciados. Poses paramétricas: idle
  (respira), walk (ciclo 8 keyframes), ride (agachado, brazos atrás), swim
  (braza), menu (brazos cruzados), y emotes (wave, nod, shake, thumbsUp)
  como capa aditiva sobre la pose base. Color por identidad (hash → HSL).
- **tier puppet** (jugadores, protagonistas): GLB existentes vía
  `loadPuppet` de ui-3d-kit (clip-map ya mapea walk/idle/sit/wave/thumbsUp).
- Sobre cada sujeto: label sprite (id) + **anillo de cloak**: un aro
  orbitando cuyo grosor/segmentos reflejan cuántas capacidades ofrece su
  preset. El aro es el "estás vestido": sin cloak no hay contacto.

## Las dos vistas del arg-console (:3021)

### `/views/tablero` — overview global (el dios-mapa)

Para proyectar en grande o para el MC. Cámara orbital libre sobre todo el
delta. HUD global: conn/room, tick, gotas en vuelo, presión por grifo,
`crystals / murk (capacidad)`, objetivo `[n/N etiquetadas, m/M excavadas]`,
actores conectados. Panel log DOM = **ledger del Notario** en vivo
(`arg:ledger` coloreado por kind). Sin input de juego: es espejo.

### `/views/jugador?actor=uno` — la vista encarnada

El mismo delta pero **desde la perspectiva del actor**: cámara chase suave
detrás del monigote (OrbitControls desactivado salvo modo inspección con
`Alt`). Zonas de interés: lo lejano se atenúa (fog + LOD de líneas), lo
cercano se intensifica; los objetos contactables dentro del radio muestran
su anillo de cloak pulsando.

**Controles teclado** (emiten `arg:intent`, nunca mutan local):

| tecla | intent |
| ----- | ------ |
| `W/A/S/D` o flechas | `move` (elige enlace del nav-graph según heading) |
| `E` | `ride` en embarcadero / `dismount` en río / entrar cámara en cantera |
| `Espacio` | `contact:request` al contactable más próximo |
| `1..9` | en río: `label:cast` con la etiqueta n del labelset del gamemap |
| `Q` | abrir/cerrar **menú de cloak** propio (inventario de presets) |
| `X` | `emote` rueda rápida (wave/nod/shake/thumbsUp) |

**HUD jugador**: conn, zona, pose, gota bajo los pies (uri corta), score
`labeled/excavated`, presión del grifo más cercano.

**Menú de contacto** (overlay DOM, estética terminal): al abrirse un
contacto llega la oferta HORSE del otro sujeto y se renderiza en tres
columnas — `PROMPTS` (triggers: click = ejecutar), `TOOLS` (acciones con
mini-form de args), `RESOURCES` (lecturas: click = leer y mostrar). Operar
un grifo es exactamente esto: contacto con el artilugio → tool
`tap.set_aperture(value)`. El feedback (resultado JSON-RPC) aparece como
mensaje en el propio menú y como emote/efecto en escena.

**Panel tracking** (franja inferior): el índice que el actor va pisando —
en río: `corpus/índice/uri` de la gota; en cantera: recurso de la cámara.
Botón «abrir en navegador» = deep-link a firehose-browser/cache-browser.
Además el evento `arg:track` ya viaja por la room: un firehose-browser o
cache-browser abiertos en otras ventanas del jugador cargan el recurso
automáticamente (el juego como *navegador que navega navegadores*).

## Bucle de sesión demo (3 visores)

1. `npm run demo:arg` → levanta socket-server (si falta), autoridad y
   arg-console; imprime tres URLs.
2. Navegador 1: `/views/tablero` — el juego entero.
3. Navegador 2: `/views/jugador?actor=uno` — jugador 1 (WASD).
4. Navegador 3: `/views/jugador?actor=dos` — jugador 2.
5. Guion sugerido de 3 minutos: `uno` sube a cima-a, contacta el grifo y
   abre `aperture 0.6`; `dos` monta el río y etiqueta gotas con `1/2/3`;
   el tablero muestra cristales llegando al mar y el ledger corriendo;
   `uno` baja a la cantera, pisa cámaras (tracking en vivo) y excava un
   pasillo fantasma; si nadie etiqueta, el murk sube y a la tercera riada
   el delta colapsa.

## Progresión (inventario de presets)

El jugador activa presets de su start pack (menú `Q`); cada preset añade
capacidades a su cloak (y por tanto a lo que otros ven al contactarle).
Umbrales de desbloqueo (v1: fijos en gamemap): 5 etiquetas → preset
`aleph-firehose-browse`; 3 excavaciones → preset de viajes de línea. La
ficha deriva físicas: un preset puede subir `walkSpeed` o permitir nadar
(v1: tabla simple `presetId → modificadores`).

## UX-2 — Shell HTML (feedback de la primera partida real, 2026-07-13)

**Ley del proyecto**: el 3D es el mapa y sus símbolos clickables; TODA la
operativa, lectura y control vive en HTML fuera del canvas. Nunca "llenar el
3D de mil cosas".

1. **Stage responsivo** — el canvas ocupa el 100% del viewport disponible y
   se redimensiona con el navegador (el `createSceneManager` ya tiene resize
   observer; el contenedor no debe fijar ancho). Sin scroll horizontal nunca.
2. **Paneles como ventanitas HTML manejables** — HUD/leyenda, ledger
   («chat» del tablero), tracking, menú de contacto y panel de cloak son
   ventanitas DOM con barra de título: **colapsables** (▸/▾) todas,
   **arrastrables** la leyenda y el ledger. Estado (posición + colapso)
   persiste en `localStorage` por vista.
3. **Inspector de flujo y cantera** — click (raycast) sobre un símbolo 3D
   abre su panel HTML:
   - **grifo**: presión/apertura/estado + cola upstream y los mensajes ya en
     cauce (uri, corpus, etiqueta, progreso); botones de apertura si hay
     contacto abierto.
   - **río/mar**: lista de gotas en vuelo / cristales y murk; click en una
     gota → deep-link al firehose-browser.
   - **cámara**: recurso (uri), estado `cached/ghost/digging`, deep-link al
     cache-browser si procede.
4. **Deep-links honestos** — solo se ofrece enlace si el recurso existe de
   verdad: refs sintéticos se marcan `「sintético」` sin enlace; cámaras
   `ghost` muestran «no excavado aún». El suscriptor de tracking de los
   browsers comprueba existencia en disco antes de navegar y responde con
   estado `ghost` en vez de dejar que la página muera con ENOENT.
5. **Browsers en modo juego** — cache/firehose-browser con `?actor=` muestran
   una franja superior de juego: actor seguido, conexión a la room y último
   focus (con su estado). La relación juego ↔ browser tiene que ser visible,
   no adivinada.
6. **Contacto = operativa real** (con WP-11/12): el menú de contacto ejecuta
   tools MCP y rutas REST reales de sujetos que implementen el protocolo
   (bots rabbit/spider/horse, servidores linea/firehose, presets del
   PresetStore); el feedback JSON-RPC vuelve al panel y como emote/efecto
   del monigote. El inventario `Q` se llena del PresetStore real.
