# CARPETA DRAMATURGO — kit de experiencia (WP-U86)

Plantilla destilada de `scriptorium-network-games/{ALEPH_ET_OMEGA,SOLVE_ET_COAGULA}`
para que un **dramaturgo** (humano o agente) instancie un juego narrativo
**sin editar nada fuera de su carpeta de instancia**.

Los juegos originales en `scriptorium-network-games/` **no se tocan**.

## Qué incluye

| Pieza | Ruta |
| ----- | ---- |
| Constitución parametrizable | `plantilla/index.md` (título/tema + 4 ejes REIC) |
| 4 capas de cadenas | `blockchain/` · `agentchain/` · `readerapp/storychain/` · `readerapp/readerchain/` |
| Story-board | `plantilla/readerapp/story-board.json` + schema |
| UI specs | `plantilla/uichain/panel-*.prompt.md` |
| Ayuda / marcas / hot | `AYUDA.md` · `EPISTEM.md` · `*-hot.md` |
| Stubs skills externas | `plantilla/STUBS.md` |
| Instancia juguete (CA) | `instances/` (vía `instantiate.mjs`) |

## Instanciar (CA)

```bash
# desde la raíz de Z_SDK-games-library
node kits/carpeta-dramaturgo/scripts/instantiate.mjs \
  --slug toy-plaza \
  --title "Plaza de juguete" \
  --theme "una plaza pública y sus carteles" \
  --force

# valida el story-board de la instancia
node kits/carpeta-dramaturgo/scripts/validate-story-board.mjs \
  kits/carpeta-dramaturgo/instances/toy-plaza/readerapp/story-board.json
```

Todo el contenido nuevo vive en
`kits/carpeta-dramaturgo/instances/<slug>/`. No hace falta tocar
`packages/delta`, `packages/pozo`, ni el monorepo Z_SDK.

## Validar story-boards reales

El schema acepta los dos dialectos históricos (SOLVE = widgets en `acts[]`;
ALEPH = widgets en `blocks[].uichain`):

```bash
npm run test:carpeta-dramaturgo
# o
node kits/carpeta-dramaturgo/scripts/validate-story-board.mjs --fixtures
```

Schema: [`schema/story-board.schema.json`](./schema/story-board.schema.json).

## Regla de los dos juegos

Esta carpeta es **mundo A** (autoría). No hardcodea nombres de `delta` /
`pozo` en engine. El juguete de CA es una instancia de plantilla, no un
tercer juego de producto (eso es WP-U87).

## Lecturas

- DATOS.md §6 (kit de experiencia) en Z_SDK
- Fuentes: `SCRIPTORIUM_V0/scriptorium-network-games/{ALEPH_ET_OMEGA,SOLVE_ET_COAGULA}`
- Stubs: [`plantilla/STUBS.md`](./plantilla/STUBS.md)
