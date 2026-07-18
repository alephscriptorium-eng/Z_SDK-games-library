# delta (ARG)

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

### Modo provisional (`file:` / `.deps`)

Hasta publish real de `@zeus/*` al registry, este repo resuelve el monorepo
hermano vía dependencias `file:.deps/zeus-sdk/...` (setup:
`npm run setup:zeus-sdk` / `preinstall`, o `ZEUS_SDK_ROOT`). Es el camino de
desarrollo local documentado; no es el contrato de consumo público.

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
