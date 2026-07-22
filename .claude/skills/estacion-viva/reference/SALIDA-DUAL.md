# SALIDA DUAL — PO / scrum

Fase 7 del boot: de serie, dos caras de salida bajo `OUT_DIR`.

## Ficheros

| fichero | audiencia | contenido |
| ------- | --------- | --------- |
| `salida-po.md` | Product Owner / custodio | estado de estación, riesgos, decisión pedida |
| `salida-scrum.md` | equipo / orquestador | checklist de fases, PIDs, paths, siguiente acción táctica |

## Forma mínima (PO)

```markdown
# Salida PO · estación viva

- estación: <WORLD_ROOT>
- boot: OK | FAIL
- estado regenerado desde bitácora: sí/no
- juego (GAME_MCP + peercard): OK | FAIL | pendiente C8
- pedir decisión: <una frase o «ninguna»>
```

## Forma mínima (scrum)

```markdown
# Salida scrum · estación viva

- fases 1–7: [x]/[ ]
- watcher.pid: <n|muerto>
- OUT_DIR: <ruta>
- pulso: <resumen una línea>
- siguiente: <acción táctica>
```

## Reglas

- Se emiten **siempre** al completar (o abortar) el boot — no son
  opt-in.
- Cara PO: sin jerga de implementación innecesaria; una decisión clara.
- Cara scrum: paths y checklist literales para el siguiente agente.
- Ambas caras de la **cara pública del skill** siguen ceguera = 0;
  las salidas de una instancia real viven en `OUT_DIR` del consumidor
  (dato), no se commitean en este skill.
