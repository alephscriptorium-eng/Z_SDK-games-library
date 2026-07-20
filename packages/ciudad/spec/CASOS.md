# ciudad — Playbook de casos (humano + agente MCP)

Juego de engine sobre `@zeus/startpack-ciudad`: un rabbit entra, camina
entre anchors por calles, anuncia en plaza y despierta un barrio `latente`
ofreciendo un tool (horse stub hasta Z06). Formato playbook-kit.

## Cómo conectar

| pieza | URL |
| ----- | --- |
| MCP jugador **rabbit** | `http://localhost:4133/mcp` · health `…/mcp/health` |
| Autoridad | `npm run authority -w @zeus/ciudad` (room `CIUDAD_DEMO`) |

- Transporte: Streamable HTTP (`POST /mcp`, JSON-RPC `initialize` + `tools/call`).
- Espera `/mcp/health` → `connected: true` antes de tools.
- Override puerto: `ZEUS_MCP_CIUDAD`.

Convención de pasos: `` `tool {args JSON}` `` sobre el MCP del actor.

**Gap Z06:** `wake` asienta el offer de tool en ledger (`horseMode:"stub"`).
La contraparte física `tools/call` por horse llega con `@zeus/mcp-launcher`.

---

## C-01 — MVP: entra → walk → wake → snapshot

- **Precondición**: autoridad emitiendo `state` con escena del startpack;
  health `connected: true`. Barrio `blockly-editor` en seeds está `latente`.
- **Pasos del agente (rabbit)**:
  1. `player_join {}`
  2. `player_walk {"nodeId":"zigurat"}`
  3. `player_walk {"anchorId":"ancla-blockly-editor"}`
  4. `player_wake {"tool":"barrio.ping","barrioId":"blockly-editor"}`
  5. `player_state {}`
- **Qué observa el humano**: el rabbit aparece en plaza, camina a editores
  vía zigurat, llega al ancla Blockly, el barrio pasa a `vivo`.
- **Criterio de éxito**: paso 4 `ok:true` con `evidencia.barrio.estado:"vivo"`;
  paso 5 muestra `lastWake.barrioId:"blockly-editor"` y ledger `kind:"wake"`.
- **Errores esperados**: ninguno en el camino feliz.

## C-02 — rechazo: wake sobre barrio muerto

- **Precondición**: C-01 join hecho; barrio `workflow-editor` en seeds es `muerto`.
- **Pasos del agente (rabbit)**:
  1. `player_walk {"anchorId":"ancla-workflow-editor"}`
  2. `player_wake {"tool":"barrio.ping","barrioId":"workflow-editor"}`
- **Qué observa el humano**: el rabbit llega al ancla pero el barrio no
  despierta; queda `muerto`.
- **Criterio de éxito**: paso 2 `ok:false`, `error:"barrio_muerto"`.
- **Errores esperados**: `barrio_muerto`, `fuera_de_barrio`, `actor_desconocido`.
