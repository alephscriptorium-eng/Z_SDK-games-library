# Lecciones vNext (método)

Cuatro lecciones de operación asentadas en el corte **0.7.0**. PORT al
skill — no reescritura tribal. Cruzan `swarm-orquestacion` +
`vigilancia` + checkout declarado del brief.

## 1 · Sucesión de vigía

La estación del vigía es **viva** (proceso/estación del carril), no un
subagente del orquestador. Gate `Rn-<carril>`: **sin PASS no hay 🔶**.
El vigía re-verifica CA de facto post-merge (C8 canal real). No se
sustituye por un chat auxiliar «de vigilancia».

Ver: skill `vigilancia` · `reference/ESTACION.md` · convivencia §8.

## 2 · Checkout declarado

Si el WP escribe fuera del `MUNDO_RAIZ` del índice, el brief nombra el
**path FS exacto** del checkout de obra. Casos fundantes:

| caso | checkout de obra |
| ---- | ---------------- |
| IB-01 | fuentes / cuadernos (lectura) declarados en mapa de raíz |
| IB-21 | librería (skill nuevo) en checkout hermano declarado |
| N0-02 / #15 | librería en checkout declarado (piel fanzine) |
| LIB-070 | patrón taller: clone materializado bajo taller `S_LAB` (path declarado en brief + mapa S-LAB + RAIZ) |

Atlas (gitlinks) = SOLO LECTURA; obra = checkout declarado.

## 3 · Worktree por rol

Un WP = una rama `wp/*` = (si hay paralelo) un worktree. Un worktree
por rol (worker / reporte / backstage). No mezclar roles en el mismo
worktree. Aplica a **todo** repo tocado, incluidos hermanos
(`reglas-metodo` · aislamiento).

## 4 · Raíz por constelación

| raíz | rol |
| ---- | --- |
| Atlas del carril (p. ej. `C:\S`) | mapa · estación · fuentes · gitlinks |
| Taller (p. ej. `C:\S_LAB`) | checkouts de obra por mundo / librería |

Nada nuevo sin declaración en el mapa canónico de esa raíz. Copia-release
FS regenerada desde el canónico en git.
