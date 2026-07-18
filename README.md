# Z_SDK-games-library

Repo hermano de [`Z_SDK`](https://github.com/alephscriptorium-eng/Z_SDK)
(D-10 / D-11 / ARQUITECTURA §6): hogar de los **juegos** Zeus (`delta`,
`pozo`) y de sus **start packs** (`@zeus/startpack-<game>` vía registry
`@zeus` + GitHub Releases — WP-U62).

Migración desde el monorepo: **WP-U61** ✅. Pipeline de datos: **WP-U62**.

## Relación con Z_SDK

| Repo | Contenido |
| ---- | --------- |
| `Z_SDK` | engine · editor · mesh · examples · fixtures VOLUMES |
| `Z_SDK-games-library` | juegos + start packs + acta/releases |

## Consumo de `@zeus/*` (engine/mesh)

Publish real al registry propio (`npm.scriptorium.escrivivir.co`, D-7)
sigue **gated** (ops / `NPM_TOKEN`). Mientras tanto este repo usa
**`file:` temporal** vía dependencias `file:` en el package.json raíz → `.deps/zeus-sdk/...`.

| Pieza | Detalle |
| ----- | ------- |
| Ruta | `.deps/zeus-sdk` (symlink/junction o clone) |
| Setup | `npm run setup:zeus-sdk` (también `preinstall`) |
| Path | `resolveZeusSdkRoot()` siempre aplica `realpath` — spawns mesh
  usan el path real (Windows: junction no rompe `isMain`) |
| Env | `ZEUS_SDK_ROOT` opcional; el default `.deps` basta sin exportarlo |
| Retiro | tras publish real de `engine/*` (U55): quitar deps `file:` y
  resolver `@zeus/*` solo desde el registry |

No hay un segundo camino silencioso: o registry (cuando exista publish) o
este `file:` documentado.

## Start packs

Ver [`docs/startpacks.md`](./docs/startpacks.md).

```bash
npm run test:startpack
npm run release:startpack -- --game delta              # tarball + acta
npm run release:startpack -- --game delta --publish-github
npm run e2e:startpack                                  # ronda desde tarball
```

## Arranque

```bash
# monorepo hermano en ../zeus-sdk (o ZEUS_SDK_ROOT=…)
npm install
npm test                 # unit delta + pozo + startpack
npm run demo:arg         # contra mesh del monorepo (socket-server…)
npm run demo:pozo
npm run e2e:arg          # e2e delta
npm run e2e:pozo-mcp     # e2e pozo
```

Navegador: solo si `ZEUS_OPEN_BROWSER=1`.

## Layout

```
packages/delta/            # arg-domain, arg-feeds, arg-console, arg-demos, …
packages/pozo/             # segundo juego (regla de los dos juegos)
packages/startpack-delta/  # @zeus/startpack-delta
packages/startpack-pozo/   # @zeus/startpack-pozo
e2e/                       # matriz e2e de juegos + startpack-round
docs/startpacks.md         # consumo y release
```

## Plan-lite

`plan/` enlaza PRACTICAS y la plantilla de reporte desde `Z_SDK`. Ver
[`plan/README.md`](./plan/README.md).

## Licencia

Misma familia que Z_SDK: GPL-3.0-or-later + capa Animus Iocandi. Ver
[`LICENSE.md`](./LICENSE.md).
