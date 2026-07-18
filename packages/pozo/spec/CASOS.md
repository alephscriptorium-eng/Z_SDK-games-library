# pozo — Playbook de casos (humano + agente MCP)

Juego mínimo A PROPÓSITO (D-8): un pozo, nodos, feed, intents con ledger
(`draw_drop` cosechar / `empty` vaciar). Formato playbook-kit.

## Cómo conectar

| pieza | URL |
| ----- | --- |
| MCP jugador **uno** | `http://localhost:4131/mcp` · health `…/mcp/health` |
| Vista | `npm run demo:pozo` → `http://localhost:3025/views/pozo` |

- Transporte: Streamable HTTP (`POST /mcp`, JSON-RPC `initialize` + `tools/call`).
- Espera `/mcp/health` → `connected: true` antes de tools.
- Navegador: solo con `ZEUS_OPEN_BROWSER=1` (default no abre).

Convención de pasos: `` `tool {args JSON}` `` sobre el MCP del actor.

---

## C-01 — join en la orilla

- **Precondición**: demo levantada (autoridad emitiendo `state`), health `connected: true`.
- **Pasos del agente (uno)**:
  1. `player_join {}`
  2. `player_state {}`
- **Qué observa el humano**: en la vista aparece un actor en la orilla; HUD `actors ≥ 1`.
- **Criterio de éxito**: `ok:true` con `evidencia.actor.nodeId:"orilla"`.
- **Errores esperados**: ninguno. Repetir `player_join` es idempotente.

## C-02 — sacar gota y etiquetarla

- **Precondición**: C-01 (uno en `orilla`); pozo con `well.level ≥ 1`.
- **Pasos del agente (uno)**:
  1. `player_draw_drop {"label":"eco"}`
  2. `player_state {}`
- **Qué observa el humano**: HUD `drop` muestra `eco (uno)`; el nivel del pozo baja uno.
- **Criterio de éxito**: `ok:true` con `evidencia.drop.label:"eco"` y asiento ledger `kind:"label"`.
- **Errores esperados**: ninguno. Si el pozo está seco → `ok:false` `error:"pozo_seco"`.

## C-03 — vaciar el pozo (empty)

- **Precondición**: C-01; pozo con `well.level ≥ 1` (si está seco, espera el
  drip del feed o reinicia).
- **Pasos del agente (uno)**:
  1. `player_state {}` → anota `well.level`.
  2. `player_empty {}`
  3. `player_state {}`
  4. `player_empty {}` *(⇒ `pozo_ya_vacio`)*
- **Qué observa el humano**: el nivel del pozo cae a 0 de golpe; no nace gota
  etiquetada (eso es draw_drop). Coste narrativo: se derramó el agua que se
  podría haber cosechado.
- **Criterio de éxito**: paso 2 `ok:true` con `evidencia.well.level === 0`,
  `score.emptied` +1; el ledger (vía autoridad) asienta `kind:"empty"` con
  `detail.opsIntent:"empty_playable"` y `detail.drained` = nivel del paso 1.
  Paso 4 `ok:false`, `error:"pozo_ya_vacio"`.
- **Errores esperados**: `pozo_ya_vacio`, `actor_desconocido`,
  `rol_no_autorizado`.
