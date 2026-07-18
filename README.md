# Z_SDK-games-library

Repo hermano de [`Z_SDK`](https://github.com/alephscriptorium-eng/Z_SDK)
(D-10 / D-11 / ARQUITECTURA §6): hogar de los **juegos** Zeus (`delta`,
`pozo`) y de sus releases de datos (start packs vía registry `@zeus` +
GitHub Releases — WP-U62).

Migración desde el monorepo: **WP-U61**.

## Relación con Z_SDK

| Repo | Contenido |
| ---- | --------- |
| `Z_SDK` | engine · editor · mesh · examples |
| `Z_SDK-games-library` | juegos + (futuro) start packs |

## Consumo de `@zeus/*` (engine/mesh)

Publish real al registry propio (`npm.scriptorium.escrivivir.co`, D-7)
sigue **gated** (ops / `NPM_TOKEN`). Mientras tanto este repo usa
**`file:` temporal** vía dependencias `file:` en el package.json raíz → `.deps/zeus-sdk/...`.

| Pieza | Detalle |
| ----- | ------- |
| Ruta | `.deps/zeus-sdk` (symlink/junction o clone) |
| Setup | `npm run setup:zeus-sdk` (también `preinstall`) |
| Env | `ZEUS_SDK_ROOT` opcional si el monorepo no es `../zeus-sdk` |
| Retiro | tras publish real de `engine/*` (U55): quitar deps `file:` y
  resolver `@zeus/*` solo desde el registry |

No hay un segundo camino silencioso: o registry (cuando exista publish) o
este `file:` documentado.

## Arranque

```bash
# monorepo hermano en ../zeus-sdk (o ZEUS_SDK_ROOT=…)
npm install
npm test                 # unit delta + pozo
npm run demo:arg         # contra mesh del monorepo (socket-server…)
npm run demo:pozo
npm run e2e:arg          # e2e delta
npm run e2e:pozo-mcp     # e2e pozo
```

Navegador: solo si `ZEUS_OPEN_BROWSER=1`.

## Layout

```
packages/delta/   # arg-domain, arg-feeds, arg-console, arg-demos, arg-player-mcp, spec/
packages/pozo/    # segundo juego (regla de los dos juegos)
e2e/              # matriz e2e de juegos (antes en Z_SDK/e2e)
```

## Plan-lite

`plan/` enlaza PRACTICAS y la plantilla de reporte desde `Z_SDK`. Ver
[`plan/README.md`](./plan/README.md).

## Licencia

Misma familia que Z_SDK: GPL-3.0-or-later + capa Animus Iocandi. Ver
[`LICENSE.md`](./LICENSE.md).
