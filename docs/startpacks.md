# Start packs — consumo y release (WP-U62)

Cada release de datos es un paquete `@zeus/startpack-<game>` + acta +
tarball. Canal primario: registry npm propio (D-7). Espejo: GitHub Release
en este repo.

## Juegos soportados

| game | paquete | comando Notario |
| ---- | ------- | --------------- |
| `delta` | `@zeus/startpack-delta` | `npm run release:startpack -- --game delta` |
| `pozo` | `@zeus/startpack-pozo` | `npm run release:startpack -- --game pozo` |
| `sketch` | `@zeus/startpack-sketch` | `npm run release:startpack -- --game sketch` |
| `solve-coagula` | `@zeus/startpack-solve-coagula` | `npm run release:startpack -- --game solve-coagula` |

Pipeline **parametrizado** (misma forma; no hay camino especial hardcodeado
por juego).

## Contenido de un start pack

```
manifest.json     # schema zeus.startpack/v0
index.mjs         # loadStartPack()
seeds/            # gamemap + presets (delta)
volumes/          # VOLUMES sintéticos de arranque (fixtures)
acta/ACTA.md      # sin acta no hay release
```

## Instalar

### Registry (cuando ops tenga `NPM_TOKEN` startpacks)

```bash
npm install @zeus/startpack-delta
```

### Tarball / GitHub Release (equivalente documentado)

```bash
# tras Notario local o descarga del Release:
npm install ./zeus-startpack-delta-0.1.0.tgz
# o
npm install https://github.com/alephscriptorium-eng/Z_SDK-games-library/releases/download/startpack-delta-v0.1.0/zeus-startpack-delta-0.1.0.tgz
```

Publish real al registry puede estar ⏳ — el tarball + Release cubren el CA.

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

## GitHub Release

```bash
npm run release:startpack -- --game delta --publish-github
```

Crea tag `startpack-delta-v<version>` con assets: tarball + acta.

## Tests

```bash
npm run test:startpack
npm run e2e:startpack
```
