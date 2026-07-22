# vigilancia

Skill de protocolo: vigilancia read-only de un swarm parametrizado por
«el mundo». Activar desde el paquete; calibrar `WORLD_ROOT` / `OUT_DIR`
(y opcionalmente `SIBLING_ROOT`) en el consumidor.

Cubre pulso clásico (worktrees, locks, CI) y **pulso multi-carril**:
etiquetas `Rn-<carril>`, higiene §8 pre-despacho, freeze por
`index.lock` sostenido, addendas que no mezclan carriles. Doctrina:
`reference/ESTACION.md`. Formato de elevación:
`reference/ADDENDA-DOS-CARAS.md`.

Datos de sesión (bitácoras, logs, addendas reales) → `instancias/` o
calibración local. Este directorio solo lleva método + fixture sintética.

Corpus público de-identificado: `instancias/ejemplo-M/` (parámetro «M»).
Doctrina de costuras del swarm: skill `swarm-orquestacion` →
`reference/RE-PLAN-protocolo-swarm.md`.

Ceguera del skill: `scripts/comprobar-ceguera.sh` → `ceguera: 0`.

Consumo canónico (versión fijada + dedup + C8): README raíz del paquete o
`skills.s-sdk.escrivivir.co/guide/consumo`.
