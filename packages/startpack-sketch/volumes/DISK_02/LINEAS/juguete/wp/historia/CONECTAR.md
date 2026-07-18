# Conectar satélite — juguete

Generado por `conectar-satelite` (@zeus/linea-kit).

## Remotos

| familia | archivo | notas |
| ------- | ------ | ----- |
| wiki (estática) | `remotes.json` → remotes.wiki | fetch con gate de aprobación |
| ATProto (stream) | remotes.atproto | export a DISK_01; no en este tool |
| SSB (gossip) | remotes.ssb | `@zeus/ssb-system` sync CLI |

## MCP

Ver `mcp-satelite.json`. Para servir la línea:

```bash
# Apuntar linea-system al LINEAS root que contiene esta línea
node -e "import('@zeus/linea-system').then(m => m.startAll('<LINEAS_ROOT>'))"
```

O en tests: `createServer(config, lineData)` con `loadLineaData(lineasRoot)`.

El contrato de entrada al mesh es el **validador U80**, no este archivo.
