# SOLVE ET COAGULA — Playbook de casos (humano + agente MCP)

Tercer juego (mundo A / WP-U87): dramaturgia + corpus linea-aleph + mesh.
Formato playbook-kit.

## Cómo conectar

| pieza | URL |
| ----- | --- |
| MCP jugador **uno** | `http://localhost:4132/mcp` · health `…/mcp/health` |
| Vista | `npm run demo:solve-coagula` → `http://localhost:3026/views/solve-coagula` |

- Transporte: Streamable HTTP (`POST /mcp`, JSON-RPC `initialize` + `tools/call`).
- Espera `/mcp/health` → `connected: true` antes de tools.
- Navegador: solo con `ZEUS_OPEN_BROWSER=1` (default no abre).

Convención de pasos: `` `tool {args JSON}` `` sobre el MCP del actor.

---

## C-01 — join en el vestíbulo

- **Precondición**: demo levantada (autoridad emitiendo `state`), health `connected: true`.
- **Pasos del agente (uno)**:
  1. `player_join {}`
  2. `player_state {}`
- **Qué observa el humano**: en la vista hay actos listados; HUD `actors ≥ 1`.
- **Criterio de éxito**: `ok:true` con `evidencia.actor.nodeId:"vestibulo"`.
- **Errores esperados**: ninguno. Repetir `player_join` es idempotente.

## C-02 — abrir acto 0

- **Precondición**: C-01 (uno en `vestibulo`).
- **Pasos del agente (uno)**:
  1. `player_open_act {"actId":"act-0"}`
  2. `player_state {}`
- **Qué observa el humano**: acto Constructor / act-0 activo.
- **Criterio de éxito**: `ok:true` con `evidencia.act.id:"act-0"` y asiento ledger `kind:"open_act"`.
- **Errores esperados**: `act_desconocido` si el id no existe.

## C-03 — consultar linea-aleph

- **Precondición**: C-01; start pack / fixture linea montado (`registro_count` en state).
- **Pasos del agente (uno)**:
  1. `player_consult_linea {}`
  2. `player_state {}`
- **Qué observa el humano**: la vista muestra meta linea (título + registros).
- **Criterio de éxito**: `ok:true` con `evidencia.linea.registro_count` ≥ 1 y ledger `kind:"consult_linea"`.
- **Errores esperados**: `linea_ausente` si no hay fixture/montaje.
