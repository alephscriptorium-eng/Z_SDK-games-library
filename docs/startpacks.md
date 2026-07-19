# Start packs — consumo y release

Cada release de datos es un paquete `@zeus/startpack-<game>` + acta +
tarball. Dos canales: GitHub Release (tag + acta + tarball — operativo) y registry
npm `@zeus` (por nombre — estado en [Futuros](/games/futuros)).

La carga (`loadStartPack`) vive en **`@zeus/startpack-kit`**; cada
`@zeus/startpack-*` es un thin wrapper (game + enrich). Sin copias del
loader por juego.

## Juegos soportados

| game | paquete | comando Notario |
| ---- | ------- | --------------- |
| `delta` | `@zeus/startpack-delta` | `npm run release:startpack -- --game delta` |
| `pozo` | `@zeus/startpack-pozo` | `npm run release:startpack -- --game pozo` |
| `sketch` | `@zeus/startpack-sketch` | `npm run release:startpack -- --game sketch` |
| `solve-coagula` | `@zeus/startpack-solve-coagula` | `npm run release:startpack -- --game solve-coagula` |
| `plaza` | `@zeus/startpack-plaza` | `npm run release:startpack -- --game plaza` |

Pipeline **parametrizado** (misma forma; no hay camino especial hardcodeado
por juego).

## Contenido de un start pack

```
manifest.json     # schema zeus.startpack/v0
index.mjs         # thin wrapper → @zeus/startpack-kit loadStartPack
seeds/            # gamemap + presets (delta) / scene (sketch) / story-board (solve, plaza)
volumes/          # VOLUMES sintéticos de arranque (fixtures)
acta/ACTA.md      # sin acta no hay release
```

Kit compartido: `packages/startpack-kit` (`@zeus/startpack-kit`).

## Instalar

### Registry

```bash
npm install @zeus/startpack-delta
```

### Tarball / GitHub Release

```bash
# tras Notario local o descarga del Release (versión = la del tag vivo):
npm install ./zeus-startpack-delta-<version>.tgz
# o URL del asset en GitHub Releases
```

Qué hay publicado ahora: [Releases](/releases) → GitHub Releases.

## Arrancar una ronda desde el pack

```bash
export ZEUS_STARTPACK_ROOT=$(node -e "console.log(require('path').dirname(require.resolve('@zeus/startpack-delta/package.json')))")
# o unpack del tarball y apuntar ZEUS_STARTPACK_ROOT ahí
npm run demo:arg          # autoridad delta aplica pack.env (VOLUMES + seed)
# ZEUS_STARTPACK_REQUIRED=1 fuerza fallo si no hay pack
```

Helpers:

- `scripts/resolve-startpack.mjs` — resuelve pack instalado o `ZEUS_STARTPACK_ROOT`
- `scripts/notario-release.mjs` — valida, escribe acta, `npm pack`, opcional
  `--publish-github` / `--publish-npm`

## Pipeline Notario (GitHub Release)

```bash
npm run release:startpack -- --game delta --publish-github
```

Crea tag `startpack-delta-v<version>` con assets: tarball + acta.

El espejo GitHub Release cubre el consumo público. El publish al registry
npm es un paso aparte del pipeline (credencial ops); no forma parte de la
doctrina de este documento. Estado del publish: [Futuros](/games/futuros).

## Tests

```bash
npm run test:startpack
npm run e2e:startpack
```
