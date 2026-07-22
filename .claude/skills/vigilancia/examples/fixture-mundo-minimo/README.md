# Fixture — mundo mínimo sintético

Directorio vacío de ejemplo para probar el watcher contra un repo
**arbitrario**. Crear un git init temporal, opcionalmente `.worktrees/`,
apuntar `WORLD_ROOT` ahí y `OUT_DIR` a una carpeta temp.

Multi-carril / hermano: segundo git init temporal como `SIBLING_ROOT`
(solo pulso de locks/conteos) o segunda instancia del watcher con otro
par `(WORLD_ROOT, OUT_DIR)`.

No contiene histórico de sesión ni nombres de mundos reales.

