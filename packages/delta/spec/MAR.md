# delta — El mar vivo (diseño, v1)

Las gotas que llegan al mar dejan de evaporarse en contadores: persisten como
población acotada. Las **etiquetadas flotan** formando clusters por etiqueta de
afinidad (dinámicos, derivados de los datos — jamás hardcodeados) y se
apelotonan hacia el final del mar. Las **sin etiquetar se hunden**, pero siguen
siendo jugables: el jugador puede clickarlas para lanzarlas a su
firehose-browser o **rescatarlas** etiquetándolas (suben a flote).

Compatible por construcción: `crystals`/`murk`/`collapsed` siguen siendo la
única verdad del colapso y de las islas; la población del mar es una capa
adicional sobre el mismo flujo. Referencias: [CONTRATO.md](CONTRATO.md),
[UX.md](UX.md), [BACKLOG.md](BACKLOG.md) fase 1.6.

## 1. Dominio (flow-engine)

### Población del mar

```js
sea.droplets: [ { id, ref:{corpus,uri,index}, label: null|string,
                  state: 'floating'|'sunken', seq } ]   // seq = orden de llegada
```

- **Llegada** (progress ≥ 1, sin cambios en contadores):
  - con `label` → `crystals++` (como hoy) **y** entra como `floating`.
  - sin `label` → `murk++` (como hoy) **y** entra como `sunken`.
- **Rescate** (`salvage`): gota `sunken` + etiqueta válida ⇒ pasa a `floating`,
  `murk -= 1` (clamp 0), `crystals += 1`, `commitLabel(ref,label)` (ledger-only
  en modo real, P3) y evento ledger `kind:'label'` con `detail.salvage = true`
  (así el triage del Notario no distingue casos). Contrajuego del colapso: da
  algo que hacer cuando el murk sube.
- **Pool acotado** (G-ARG.5): `seaPoolMax = { floating: 96, sunken: 48 }`
  (parámetro de `scene.mar`, no constante mágica). Overflow FIFO por `seq`:
  la flotante más vieja «se consolida» en las islas (ya está contada en
  crystals — solo desaparece del pool, evento `sea:consolidate`), la hundida
  más vieja «se pierde en el fondo» (ya contada en murk, evento `sea:lost`).
  Los contadores nunca se tocan en el overflow.

### Layout puro y determinista (`sea-layout.mjs`, browser-safe)

Mismo patrón que `resolveTrackRef`: función pura en `@zeus/arg-domain`,
compartida por autoridad (validar proximidad de `salvage`) y visores (render).
Sin RNG ni estado: mismos datos ⇒ mismas posiciones en todas las ventanas.

```js
seaLayout(seaDroplets, marDef) → { clusters: [{label, center, members}],
                                    positions: { [dropletId]: {x,y,z} } }
```

- **Clusters dinámicos**: uno por cada `label` distinto presente en las gotas
  flotantes (se derivan de los datos; el labelset del gamemap NO se consulta
  para el layout — si mañana hay 7 etiquetas, salen 7 clusters). Orden estable:
  por `seq` de la primera gota de cada label.
- **Centroides**: arco a lo largo del borde lejano del mar («el final», z
  máximo de `marDef.bounds`), equiespaciados según nº de clusters.
- **Empaquetado**: dentro de cada cluster, espiral phyllotaxis por orden de
  llegada — las nuevas entran por fuera y el conjunto se apelotona hacia el
  fondo. `y` ligeramente positivo (flotan sobre la superficie).
- **Hundidas**: dispersión determinista por hash(id) sobre la mitad cercana
  del mar, `y < 0` (bajo la malla ondulada), sin clusters.
- `marDef.bounds` es nuevo en la escena (`delta-v0`): hoy delta-stage
  hardcodea el plano 46×26 en z=19; pasa a datos de escena y el render lo lee.

### Snapshot (presupuesto G-ARG.5)

Array compacto, estado implícito (label ⇒ floating):

```js
sea: { crystals, murk, murkCapacity, collapsed,
       droplets: [[id, label|null, uri, seq]] }
```

~144 gotas × ~60 bytes ≈ 9 KB — cabe en el presupuesto de 32 KB. Test de
budget obligatorio con el pool lleno.

## 2. Intents nuevos (contrato §3)

| intent       | args               | validación (reducer puro, G-ARG.4)                    | efecto |
| ------------ | ------------------ | ----------------------------------------------------- | ------ |
| `salvage`    | `dropletId, label` | gota existe y `sunken`; `label ∈ labelset`; actor en `zone:'mar'` **o** en nodo orilla/boya a ≤ `contactRadius` de la posición `seaLayout` de la gota | op `sea:salvage` + `actor:score labeled` |
| `track:cast` | `dropletId`        | gota existe en el mar (flotante o hundida)             | sin mutación: la autoridad emite `arg:track {actorId, ref, hint:'firehose-browser'}` |

`track:cast` reutiliza tal cual la tubería WP-13/WP-26 (suscriptor server-side
del firehose-browser + deep-links honestos): «lanzar la gota al navegador» es
solo un `arg:track` a petición. Refs sintéticos siguen la regla `「sintético」`.

## 3. Render e interacción (arg-console)

- **`kit/sea-droplets.mjs`** (gemelo de `river-droplets.mjs`): InstancedMesh.
  Flotantes = cristal facetado con bobbing (fase por hash(id), coherente con
  la ola del delta-stage); hundidas = tenues bajo la superficie con animación
  de hundimiento al llegar; rescate = ascenso + destello. Posiciones desde
  `seaLayout` (proyección pura, G-ARG.1). Etiqueta de cluster = sprite de
  texto (labels.mjs) sobre cada centroide, creado/retirado dinámicamente.
- **Picking por instancia**: raycast sobre InstancedMesh da `instanceId`;
  el mapa instanceId→dropletId vive en el módulo y el pickable expone
  `userData = { kind:'seaDroplet', id }` resuelto en el hit.
- **Vista jugador**: click en gota del mar abre **ventanita de acción**
  (patrón cloak-panel, que sí emite intents): uri + corpus, botones del
  labelset (→ `salvage`) si está hundida y hay proximidad, botón «abrir en
  firehose» (→ `track:cast` + deep-link local honesto).
- **Tablero e inspector**: el inspector sigue siendo solo-lectura; su panel
  de mar pasa a listar clusters con recuento, flotantes y hundidas con uri y
  deep-link (sección «llegadas» actual se conserva).

## 4. MCP del jugador (arg-player-mcp)

- Tools: `player_salvage {dropletId, label}` (semántica verificable: espera
  ledger `label` con `detail.salvage`), `player_track {dropletId}` (espera
  `arg:track` propio en `arg://tracks/tail`).
- `player_observe` gana `what:'sea'` con clusters + gotas (ya existe el enum;
  ampliar la proyección).
- Resource `arg://sea` (clusters, flotantes, hundidas, contadores).
- CASOS: C-17 (rescatar una gota hundida y verla flotar en su cluster) y
  C-18 (lanzar una gota del mar al firehose-browser y verla cargada).

## 5. Decisiones tomadas (ajustables al implementar)

1. **CONFIRMADO (2026-07-15)** — el rescate decrementa murk (−1, clamp 0) y
   suma crystals (+1): así el estado final es independiente del camino
   (etiquetar en cauce ≡ verter y rescatar) y el mar es tablero de
   contrajuego. Notas de implementación: (a) el clamp es defensivo — con las
   reglas actuales `murk` nunca baja del nº de hundidas en el pool (las
   riadas solo suman; cada hundida aportó exactamente +1); si un test ve el
   clamp activarse, es un bug, no gameplay. (b) El colapso es cerrojo:
   `salvage` solo es válido mientras `!collapsed`; rescatar no des-colapsa.
2. Proximidad de `salvage` = zona mar o nodo orilla/boya cercano; NO se puede
   rescatar desde el tablero (dios-mapa mira, no juega).
3. `track:cast` no muta dominio ni puntúa — es lectura dirigida.
4. Pool 96/48: elegido para que el snapshot quede ~1/3 del presupuesto G-ARG.5
   con 200 gotas de río en vuelo. Medir en el test de budget, no a ojo.
