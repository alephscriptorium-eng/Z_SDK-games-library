# plan/ — lite (games-library)

Este repo **no** duplica el protocolo de swarm del monorepo. La fuente de
verdad de prácticas, roles y backlog de refundación vive en `Z_SDK`:

| Artefacto | Dónde |
| --------- | ----- |
| PRACTICAS (cuerpo) | [`Z_SDK/plan/PRACTICAS.md`](https://github.com/alephscriptorium-eng/Z_SDK/blob/main/plan/PRACTICAS.md) |
| Plantilla de reporte | [`Z_SDK/plan/REPORTES/PLANTILLA.md`](https://github.com/alephscriptorium-eng/Z_SDK/blob/main/plan/REPORTES/PLANTILLA.md) |
| Roles swarm | [`Z_SDK/plan/roles/`](https://github.com/alephscriptorium-eng/Z_SDK/tree/main/plan/roles) |
| Diseño games-library | [`Z_SDK/plan/ARQUITECTURA.md` §6](https://github.com/alephscriptorium-eng/Z_SDK/blob/main/plan/ARQUITECTURA.md) |

En este árbol solo hay **stubs con enlace** (`PRACTICAS.md`,
`REPORTES/PLANTILLA.md`) para que un agente abra `plan/` aquí y llegue al
cuerpo sin copiarlo.

Cuando el swarm abra WPs propios de la library (post-U61), los reportes
pueden vivir en `plan/REPORTES/` de este repo usando la plantilla enlazada.

**Estación skills (SEM-g):** calibración local en [`ESTACION.md`](ESTACION.md)
— `@alephscript/skills-scriptorium@0.8.0`, espejo `.claude/skills/`.
