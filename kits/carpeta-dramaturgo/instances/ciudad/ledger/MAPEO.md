# MAPEO ledger → actos (ciudad · capa lectura)

Capa **dramaturgo = lectura**. No produce mundos gamemap; la escena vive en
engine Z02/Z03. Aquí solo se proyecta lo que el ledger/track ya asentó.

## Rutas

| pieza | ruta |
| ----- | ---- |
| Instancia | `kits/carpeta-dramaturgo/instances/ciudad/` |
| Story-board | `…/ciudad/readerapp/story-board.json` |
| Fixture ledger Z04 (canónico) | `…/ciudad/ledger/fixture-z04-federation.json` |
| Fixture ledger Z03 (histórico) | `…/ciudad/ledger/fixture-z03-mvp.json` |
| Proyector | `…/ciudad/scripts/project-ledger-to-story-board.mjs` |
| Smoke peer (origen ledger) | `packages/ciudad/fixtures/federation-smoke.mjs` |
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

## Gap Z04 — cerrado (D1 post-Z04 ✅)

CA ficha: tras e2e Z04, el acto «un barrio despertó» se regenera desde ledger
de rabbits r/s/h. **Z04 ✅** (`b020a81`) → fixture canónico
`fixture-z04-federation.json` volcado por `federation-smoke.mjs` con
`CIUDAD_LEDGER_OUT` tras gate smoke OK (peer `ext-rabbit`,
`horseMode: "horse"`; coreografía limpia 1× applyIntent). Sin campo
`gap` / `gap_z04`. El fixture Z03 queda histórico (`horseMode: stub`).

## Regenerar

```bash
# 1) smoke offline + volcado ledger (cwd packages/ciudad o desde GL root)
CIUDAD_LEDGER_OUT=../../kits/carpeta-dramaturgo/instances/ciudad/ledger/fixture-z04-federation.json \
  node packages/ciudad/fixtures/federation-smoke.mjs

# 2) proyectar + validar (cwd games-library)
node kits/carpeta-dramaturgo/instances/ciudad/scripts/project-ledger-to-story-board.mjs
node kits/carpeta-dramaturgo/scripts/validate-story-board.mjs \
  kits/carpeta-dramaturgo/instances/ciudad/readerapp/story-board.json
```
