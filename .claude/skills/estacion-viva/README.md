# estacion-viva

Skill de protocolo: boot y mantenimiento de una **estación viva**
parametrizada por «el mundo». Activar desde el paquete; calibrar
`WORLD_ROOT`, `GAME_MCP` y `OUT_DIR` en el consumidor.

Cubre las **7 fases de boot**: cargar estación → regenerar estado desde
bitácora (fuente única) → relanzar watcher de sesión con whitelist de
`.claude/skills/` → pulso → conexión al juego (peercard firmada + kit
del registry) → modo debug → salida dual PO/scrum.

Datos de sesión (bitácoras reales, peercards firmadas, logs) →
calibración local o `instancias/` del consumidor. Este directorio solo
lleva método + fixture sintética (`examples/fixture-tick-cero/`).

Doctrina de watcher / pulso: skill `vigilancia` (componer; no duplicar
árboles). Contrato de convivencia multi-orquestador: skill
`swarm-orquestacion` → `reference/convivencia-multi-orquestador.md`
(§7 E2E por registry o fixture copiada — no checkout hermano).

Ceguera del skill: `scripts/comprobar-ceguera.sh` → `ceguera: 0`.

Agente fresco (eje IV): seguir solo `SKILL.md` +
`scripts/reproduce-boot.sh`.

Consumo canónico del paquete: README raíz o portal de skills del
registry `@alephscript/skills-scriptorium`.
