# MAPA-TALLER — territorio de obra / lab

| dato | valor |
| ---- | ----- |
| Territorio | taller de obra (`{{MUNDO_TALLER}}`) — opcional |
| Canónico | este fichero (`plan/MAPA-TALLER.md`) |
| Fecha semilla | {{FECHA}} · generado por `montar-plan` |

Solo si el mundo usa un lab/taller separado del atlas. Si no aplica:
borrá este fichero o dejá una fila «(no aplica)» con commit de gobierno.

| path | misión | ¿en git? |
| ---- | ------ | -------- |
| `{{MUNDO_TALLER}}/` | Checkout(s) de obra del carril | **No** (típico) |

## REGLA DEL MAPA-TALLER

**Entrada en el taller sin fila en este mapa = FAIL de ronda del vigía;
ampliar el mapa = commit de gobierno.**

1. Toda entrada de la raíz del taller tiene fila.
2. El vigía contrastará **taller == mapa** cuando este fichero exista.
3. Ampliación o corrección = commit de gobierno (este fichero).
