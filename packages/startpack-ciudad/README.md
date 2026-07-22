# `@zeus/startpack-ciudad`

Start pack with the **city as a flat gamemap scene**: plaza + zigurat (governance),
six district zones, twenty-four barrio anchors (with playable `estado`), DRY streets
as walk links, plus an `arbol` catalog (buildings / maquinarias) for lifecycle
consumers. The game engine ignores `arbol` (content-only; D-8 intact).

```bash
npm run generate -w @zeus/startpack-ciudad
npm test -w @zeus/startpack-ciudad
npm run release:startpack -- --game ciudad --dry-run
```

Loader: `loadStartPack()` → `{ gamemap, scene, arbol, zones, volumesRoot, actaPath, env }`.

Scene for `@zeus/game-engine`: `toMapScene(gamemap)` or `pack.scene`, then
`createMapEngine(pack.scene)`.

## Census provenance (`estado`)

Playable barrio `estado` is authored in the sprint city cantera file
`cantera/CIUDAD/CENSO-ESTADOS.md`. The pack ships a build-time projection at
`data/censo-estados.json`. `scripts/generate-seeds.mjs` reads that census
(optional `--censo <md|json>`) and writes `seeds/gamemap.json`. Runtime never
opens cantera paths.

## Health fields (`arbol.maquinarias`)

Each maquinaria may declare `puerto` + `health` (path or token). Consumers
such as `@zeus/ciudad` (`salud` probes) may derive read-only
`http-status` URLs (`http://127.0.0.1:<puerto><health>`). The startpack
does not probe; it only ships the catalog fields. Package↔edificio catalog
ids remain optional (`catalogId`) for lifecycle — not rewritten here.

## Solape with `@zeus/startpack-plaza`

| | plaza | ciudad |
|---|---|---|
| game id | `plaza` | `ciudad` |
| gamemap id | `plaza-demo` | `ciudad-demo` |
| purpose | narrative juguete (story-board + line + casos) | topology scene (nodos/enlaces/anclas + zones + arbol) |
| reuses | `@zeus/startpack-kit` loader, `zeus.startpack/v0` manifest, volumes/acta layout, notario channel | same |
| extends | — | flat engine scene + barrio `estado` + `arbol` catalog |
| does not duplicate | plaza story-board / line juguete / labelset narrative | no `plaza-demo` ids; no story-board required for CA |

## Blind package

Published tree must not name upstream monorepo paths. Package name `@zeus/…`
is the scoped exception.
