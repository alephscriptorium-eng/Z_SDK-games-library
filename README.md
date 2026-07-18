# Z_SDK-games-library

Repo hermano de [`Z_SDK`](https://github.com/alephscriptorium-eng/Z_SDK)
(D-10 / D-11 / ARQUITECTURA §6): hogar de los **juegos** Zeus (`delta`,
`pozo`, **`solve-coagula`**), sus **start packs** (`@zeus/startpack-<game>`
vía registry `@zeus` + GitHub Releases — WP-U62) y la **CARPETA DRAMATURGO**
(kit de experiencia narrativo — WP-U86).

**Catálogo público** (WP-U107 / D-23): VitePress + GitHub Pages + piel zine.
Dominio objetivo: `https://games.z-sdk.escrivivir.co/` (DNS/Custom domain =
ops usuario). Fuentes: [`docs/`](./docs/).

```bash
npm run docs:dev    # local
npm run docs:build  # artefacto Pages
```

Migración desde el monorepo: **WP-U61** ✅. Pipeline de datos: **WP-U62**.
Kit dramaturgo: **WP-U86** → [`kits/carpeta-dramaturgo/`](./kits/carpeta-dramaturgo/).
Tercer juego: **WP-U87** → [`packages/solve-coagula/`](./packages/solve-coagula/).

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
npm test                 # unit delta + pozo + solve + startpack + carpeta
npm run demo:arg         # contra mesh del monorepo (socket-server…)
npm run demo:pozo
npm run demo:solve-coagula
npm run e2e:arg          # e2e delta
npm run e2e:pozo-mcp     # e2e pozo
npm run e2e:solve-coagula-mcp
npm run instantiate:carpeta-dramaturgo -- --slug mi-juego --title "…"
npm run instantiate:carpeta-dramaturgo -- --slug from-solve --from SOLVE_ET_COAGULA --force
```

### CARPETA DRAMATURGO

Ver [`kits/carpeta-dramaturgo/README.md`](./kits/carpeta-dramaturgo/README.md).
Instancia juguete: `instances/toy-plaza/` · import obra (`--from`):
`instances/from-solve-mini/` (fixture) o slug `SOLVE_ET_COAGULA` /
`ALEPH_ET_OMEGA`.

### SOLVE ET COAGULA (3.er juego)

Ver [`packages/solve-coagula/README.md`](./packages/solve-coagula/README.md).
Start pack: `@zeus/startpack-solve-coagula`.

Navegador: solo si `ZEUS_OPEN_BROWSER=1`.

## Layout

```
packages/delta/                 # arg-domain, arg-feeds, arg-console, …
packages/pozo/                  # segundo juego (regla de los dos juegos)
packages/solve-coagula/         # tercer juego (mundo A / WP-U87)
packages/startpack-kit/         # @zeus/startpack-kit (loadStartPack único · WP-U110)
packages/startpack-delta/       # @zeus/startpack-delta
packages/startpack-pozo/        # @zeus/startpack-pozo
packages/startpack-sketch/      # @zeus/startpack-sketch
packages/startpack-solve-coagula/
e2e/                            # matriz e2e de juegos + startpack-round
docs/                           # catálogo VitePress (portada + releases + specs)
docs/startpacks.md              # consumo y release
```

## Plan-lite

`plan/` enlaza PRACTICAS y la plantilla de reporte desde `Z_SDK`. Ver
[`plan/README.md`](./plan/README.md).

## Licencia

Misma familia que Z_SDK: GPL-3.0-or-later + capa Animus Iocandi. Ver
[`LICENSE.md`](./LICENSE.md).
