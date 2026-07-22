# GAME-MCP — peercard + registry

Fase 5 del boot: conexión al juego. Params `GAME_MCP` (obligatorio) +
peercard firmada + kit del **registry**.

## Contrato

1. **`GAME_MCP`** — URL o descriptor del servidor MCP de juego que el
   mundo expone al agente. Sin este param el boot **falla** en fase 5.
2. **Peercard firmada** — el agente no entra solo con `type` /
   `features`. Debe presentar una peercard emitida/verificada por el
   asiento del mundo (mismo carril de identidad que la puerta del
   consumidor). Path típico de sesión: `$OUT_DIR/peercard.json` (o
   calibración local).
3. **Kit del registry (C8)** — resolver
   **`player-mcp-kit@0.1.3`** desde el canal de registry del ecosistema
   (npm view / install limpio). **Prohibido** usar un checkout hermano
   o raíz ajena como dependencia de prueba o de runtime.

## C8 (canal de verificación = canal de uso)

Antes de declarar la conexión lista:

```bash
# Ejemplo de forma (el consumidor sustituye registry URL):
npm view player-mcp-kit@0.1.3 --registry=<URL_REGISTRY_DEL_MUNDO> version
# exit 0 · versión impresa = 0.1.3
```

Si el registry no está al alcance en el entorno del worker, el boot de
fixture marca la fase 5 como **declarada** (contrato documentado +
peercard de fixture presente) y deja `<pendiente C8 live>` explícito.
La vía E2E permitida sigue siendo: (a) registry limpio · (b) fixture
copiada — ver convivencia multi-orquestador §7.

## Peercard (mínimo)

Campos mínimos que el boot comprueba en fixture / sesión:

| campo | rol |
| ----- | --- |
| `id` | identidad del peer |
| `sig` | firma / sello del asiento |
| `issuedAt` | marca temporal |
| `features` | capacidades anunciadas (p. ej. incluye juego) |

El mundo emite y verifica el asiento; este skill solo **exige** la
card antes de dar por hecha la fase 5.

## Anti-patrones

| síntoma | mitigación |
| ------- | ---------- |
| `GAME_MCP` vacío | fallar fase 5 |
| agent join sin peercard | exigir card firmada |
| `file:../hermano/...` al kit | registry `@0.1.3` o fixture scratch |
| reimplementar el runtime del kit aquí | documentar + apuntar al registry |
