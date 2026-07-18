# Z_SDK-games-library

Repo hermano de [`Z_SDK`](https://github.com/alephscriptorium-eng/Z_SDK)
(D-10 / D-11 / ARQUITECTURA §6): hogar de los **juegos** Zeus y de sus
releases de datos (start packs vía registry `@zeus` + GitHub Releases).

Hoy (WP-U60): **scaffold vacío**. La migración de `delta` / `pozo` desde el
monorepo es **WP-U61** — este repo no hardcodea un solo juego como «el» juego
(regla de los dos juegos, PRACTICAS §1.11).

## Relación con Z_SDK

| Repo | Contenido |
| ---- | --------- |
| `Z_SDK` | engine · editor · mesh · examples (hasta U61 también `packages/games/`) |
| `Z_SDK-games-library` | juegos + start packs (este repo) |

Consumo previsto tras U61: paquetes `@zeus/*` del **registry propio**
(`npm.scriptorium.escrivivir.co`), no `file:` al monorepo.

## Arranque (scaffold)

```bash
npm install
npm test
```

## Plan-lite

`plan/` enlaza PRACTICAS y la plantilla de reporte desde `Z_SDK` — no copia
los cuerpos. Ver [`plan/README.md`](./plan/README.md).

## Licencia

Misma familia que Z_SDK: GPL-3.0-or-later + capa Animus Iocandi. Ver
[`LICENSE.md`](./LICENSE.md).
