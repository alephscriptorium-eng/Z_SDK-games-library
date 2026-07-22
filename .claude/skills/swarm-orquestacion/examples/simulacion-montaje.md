# Simulación documentada — montaje de plan/ solo con el skill

**CA del skill:** un agente fresco (o simulación documentada) monta el
`plan/` de un mundo nuevo **solo** con este skill (roles + BRIEF + plantilla
+ ejes).

## Procedimiento ejecutado

1. Destino temporal vacío (mundo nuevo sin `plan/` previo).
2. Invocar `scripts/montar-plan.sh` apuntando a ese destino.
3. Verificar árbol mínimo y que los roles/ejes/plantilla están presentes.
4. Verificar ceguera = 0 sobre `skills/swarm-orquestacion/`.

## Comando canónico

```bash
TMP=$(mktemp -d)
bash skills/swarm-orquestacion/scripts/montar-plan.sh "$TMP"
find "$TMP/plan" -type f | sort
bash skills/swarm-orquestacion/scripts/comprobar-ceguera.sh
```

## Árbol esperado

```text
plan/
  BACKLOG.md
  DECISIONES.md
  PRACTICAS.md
  VISION.md
  REPORTES/PLANTILLA.md
  roles/
    BRIEF.md
    CORRECCION.md
    ORQUESTADOR.md
    README.md
    REVISION.md
    WORKER.md
    ciclo.md
    ejes-ca.md
```

## Criterio de éxito

- El directorio `plan/` existe y es operable (orquestador puede abrir
  `roles/ORQUESTADOR.md` y un worker `roles/WORKER.md` + BRIEF).
- No hizo falta consultar datos de ningún mundo real ni histórico de
  vigilancia.
- `comprobar-ceguera.sh` → `ceguera: 0`.

La salida literal de la corrida vive en el reporte del WP que publica este
skill (no en el skill: evita acoplar evidencia de sesión al método).
