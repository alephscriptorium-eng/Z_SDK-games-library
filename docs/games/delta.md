# delta (ARG)

**El Común** — construcción de ventana de contexto colaborativa: el archivo compartido crece al jugarlo y la sala gobierna su memoria común.

Juego multijugador three.js sobre el runtime Zeus: el tablero son los
volúmenes de datos (firehose + wikicache) y jugar los hace crecer. Dominio
puro + autoridad + vistas + MCP por actor.

| Pieza | Ruta en el repo |
| ----- | --------------- |
| Dominio | `packages/delta/arg-domain/` |
| Feeds | `packages/delta/arg-feeds/` |
| Consola / vistas | `packages/delta/arg-console/` |
| MCP jugador | `packages/delta/arg-player-mcp/` |
| Autoridad + demo | `packages/delta/arg-demos/` |
| Start pack | `@zeus/startpack-delta` |

## Cómo jugarlo / levantarlo

Desde la raíz de `Z_SDK-games-library`:

```bash
npm install
npm run demo:arg
```

Con `ZEUS_OPEN_BROWSER=1` abre visores; por defecto headless. Puertos y room
salen de `presets-sdk/env` / env del juego (`ZEUS_ARG_ROOM`, etc.).

### Mesh local (fallback DEV)

`npm install` resuelve `@zeus/*` del registry (`npm.scriptorium.escrivivir.co`).
Demos/e2e que levantan mesh no publicado (socket-server, static webrtc…)
siguen necesitando el monorepo hermano vía `resolveZeusSdkRoot()`:
`ZEUS_SDK_ROOT`, sibling `../zeus-sdk`, o `npm run setup:zeus-sdk`
(`.deps/zeus-sdk`). Eso **no** es dependencia `file:` de npm.

Desde start pack (tras instalar — ver [Releases](/releases)):

```bash
export ZEUS_STARTPACK_ROOT=$(node -e "console.log(require('path').dirname(require.resolve('@zeus/startpack-delta/package.json')))")
npm run demo:arg
```

## Spec

- [CONTRATO.md](https://github.com/alephscriptorium-eng/Z_SDK-games-library/blob/main/packages/delta/spec/CONTRATO.md)
- [CASOS.md](https://github.com/alephscriptorium-eng/Z_SDK-games-library/blob/main/packages/delta/spec/CASOS.md)
- [LORE.md](https://github.com/alephscriptorium-eng/Z_SDK-games-library/blob/main/packages/delta/spec/LORE.md)
- [UX.md](https://github.com/alephscriptorium-eng/Z_SDK-games-library/blob/main/packages/delta/spec/UX.md)
- [README del juego](https://github.com/alephscriptorium-eng/Z_SDK-games-library/blob/main/packages/delta/README.md)

## Releases

Ver [Releases · delta](/releases#delta).

Llévatela — del último release `startpack-delta-v*` en
[Releases](https://github.com/alephscriptorium-eng/Z_SDK-games-library/releases),
tomá el asset `.tgz` (acta incluida) e instalalo:

```bash
npm install ./zeus-startpack-delta-<version>.tgz
```

*Una obra de Scriptorium. Bajo animus iocandi.*
