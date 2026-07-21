# MAPEO ledger → actos (ciudad · capa lectura)

Capa **dramaturgo = lectura**. No produce gamemap; la escena vive en
engine. Aquí solo se proyecta lo que el ledger/track ya asentó.

## Rutas

| pieza | ruta |
| ----- | ---- |
| Instancia | `kits/carpeta-dramaturgo/instances/ciudad/` |
| Story-board | `…/ciudad/readerapp/story-board.json` |
| Fixture ledger Z13 (canónico acto V) | `…/ciudad/ledger/fixture-z13-tres-jugadores.json` |
| Fixture ledger Z04 (federación) | `…/ciudad/ledger/fixture-z04-federation.json` |
| Fixture ledger Z03 (histórico) | `…/ciudad/ledger/fixture-z03-mvp.json` |
| Proyector | `…/ciudad/scripts/project-ledger-to-story-board.mjs` |
| Contrato tipos | `packages/ciudad/src/jugadores.mjs` |
| Tablero (cliente 1) | `packages/ciudad/fixtures/tablero-jugadores.mjs` |
| Dump ledger Z13 | `packages/ciudad/fixtures/z13-ledger-dump.mjs` |

## Eventos significativos → actos

| evento engine | fuente | acto | título | `player_origin` |
| ------------- | ------ | ---- | ------ | --------------- |
| (semilla kit) | plantilla instantiate | `act-0` | Semilla | — |
| `announce` | `ledger[].kind === 'announce'` | `act-N` | Presencia en plaza | desde `detail.jugador` / features |
| cruce de distrito | `tracks[].hint === 'walk'` con `ref.barrioId` | `act-N` | Cruce de distrito | idem |
| wake de barrio | `ledger[].kind === 'wake'` | `act-N` | Un barrio despertó | actor que despierta (+ `residente_id`) |
| sleep de barrio | `ledger[].kind === 'sleep'` | `act-N` | Un barrio se apagó | actor que apaga |

Walks sin `barrioId` quedan como tracks intermedios; **no** generan acto.

Tipología (Z13): el proyector importa `playerOriginFromLedgerEntry` del
contrato de mapeo — mismo vocabulario que el tablero (`classifySnapshotPlayers`).

## REIC

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

## Regenerar (acto V · tres jugadores)

```bash
# 1) dump ledger Z13
node packages/ciudad/fixtures/z13-ledger-dump.mjs

# 2) proyectar + validar
node kits/carpeta-dramaturgo/instances/ciudad/scripts/project-ledger-to-story-board.mjs
node kits/carpeta-dramaturgo/scripts/validate-story-board.mjs \
  kits/carpeta-dramaturgo/instances/ciudad/readerapp/story-board.json
```

Fixture Z04 sigue regenerable con `federation-smoke` + `--fixture` explícito.
