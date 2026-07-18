# pozo

Segundo juego mínimo de la library (D-8 / regla de los dos juegos). Se
construye solo importando engine (`protocol`, `authority-kit`,
`player-mcp-kit`, `playbook-kit`, `view-kit`) más mesh vía presets/rooms.

| Pieza | Ruta en el repo |
| ----- | --------------- |
| Dominio + autoridad + vista | `packages/pozo/` |
| Playbook | `packages/pozo/spec/CASOS.md` |
| Launcher | `packages/pozo/launch.mjs` |
| Start pack | `@zeus/startpack-pozo` |

## Cómo jugarlo / levantarlo

```bash
npm install
npm run demo:pozo
```

Levanta socket-server + autoridad + vista + MCP. No abre navegador salvo
`ZEUS_OPEN_BROWSER=1`. Overrides: `ZEUS_POZO_ROOM`, `ZEUS_MCP_POZO`,
`ZEUS_PORT_POZO_VIEW`, `ZEUS_SCRIPTORIUM_URL`.

Desde start pack (tras instalar — ver [Releases](/releases)):

```bash
export ZEUS_STARTPACK_ROOT=$(node -e "console.log(require('path').dirname(require.resolve('@zeus/startpack-pozo/package.json')))")
npm run demo:pozo
```

## Spec

- [CASOS.md](https://github.com/alephscriptorium-eng/Z_SDK-games-library/blob/main/packages/pozo/spec/CASOS.md)
- [README del juego](https://github.com/alephscriptorium-eng/Z_SDK-games-library/blob/main/packages/pozo/README.md)

## Releases

Ver [Releases · pozo](/releases#pozo).
