# MAPEO ledger → actos (ciudad · capa lectura)

Capa **dramaturgo = lectura**. No produce mundos gamemap; la escena vive en
engine Z02/Z03. Aquí solo se proyecta lo que el ledger/track ya asentó.

## Rutas

| pieza | ruta |
| ----- | ---- |
| Instancia | `kits/carpeta-dramaturgo/instances/ciudad/` |
| Story-board | `…/ciudad/readerapp/story-board.json` |
| Fixture ledger Z03 | `…/ciudad/ledger/fixture-z03-mvp.json` |
| Proyector | `…/ciudad/scripts/project-ledger-to-story-board.mjs` |
| Materia engine (solo lectura) | `packages/ciudad` (`drainOutbox` ledger+tracks) |

## Eventos significativos → actos

| evento engine | fuente | acto | título |
| ------------- | ------ | ---- | ------ |
| (semilla kit) | plantilla instantiate | `act-0` | Semilla |
| `announce` | `ledger[].kind === 'announce'` | `act-1` | Presencia en plaza |
| cruce de distrito | `tracks[].hint === 'walk'` con `ref.barrioId` | `act-2` | Cruce de distrito |
| wake de barrio | `ledger[].kind === 'wake'` | `act-3` | Un barrio despertó |

Walks sin `barrioId` (p. ej. plaza→zigurat) quedan en el fixture como
tracks intermedios; **no** generan acto (no son cruce a barrio).

## REIC (TRAMA-AGUA §5.5 → flags CLI)

Invocación (sin fork del kit):

```bash
node kits/carpeta-dramaturgo/scripts/instantiate.mjs \
  --slug ciudad \
  --title "Ciudad" \
  --theme "agua/caudal — trama de ventana de contexto (lectura del ledger del engine)" \
  --reic-r "agua/caudal" \
  --reic-e "compuertas/gates" \
  --reic-i "ventanas/vasos" \
  --reic-c "ciclo/retorno" \
  --force
```

## Gap Z04

CA ficha: tras e2e Z04, el acto «un barrio despertó» debe aparecer regenerado
desde ledger de rabbits r/s/h. **Z04 aún no ✅** → fixture ledger Z03 + gap
literal `pendiente Z04 e2e` (campo `gap` del JSON y metadato del story-board).

## Regenerar

```bash
node kits/carpeta-dramaturgo/instances/ciudad/scripts/project-ledger-to-story-board.mjs
node kits/carpeta-dramaturgo/scripts/validate-story-board.mjs \
  kits/carpeta-dramaturgo/instances/ciudad/readerapp/story-board.json
```
