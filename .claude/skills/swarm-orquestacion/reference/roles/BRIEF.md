# Brief para lanzar worker

_Plantilla que rellena el **orquestador** (tras marcar 🔶 en BACKLOG) y el
usuario pega en un **chat nuevo** junto con el rol WORKER._

---

```text
(rol) plan/roles/WORKER.md
  (o el equivalente activado desde el skill swarm-orquestacion)

WP: WP-<id> · <título>
Rama: wp/<id>-<slug>
Worktree: <WORKTREE_BASE>/mundo-wp-<id>   (solo si hay workers en paralelo)
Reporte: plan/REPORTES/WP-<id>-<slug>.md

Lecturas extra (además de PRACTICAS + WP en BACKLOG + VISION):
- plan/DECISIONES.md DE-?/DA-?
- (archivos concretos que el orquestador ya identificó)
- Eje CA aplicable: I | II | III | IV | V | (ninguno / varios)

Notas del orquestador:
- (conflictos con otros WPs en vuelo, orden de merge, excepciones de gates…)
- ALCANCE_DIFF = …
- MUNDO_RAIZ = …

Empieza: sitúate en rama/worktree, lee PRACTICAS entero, luego implementa.
```

---

## Notas de uso

- Un brief por WP; no reutilices el mismo chat para dos WPs.
- Declará el **eje** si el tipo de WP lo activa (extracción, demolición,
  auditoría, contrato, mediación con swarms ajenos).
- Paralelismo: worktree distinto por worker; dirs de entrega que no se pisen.
