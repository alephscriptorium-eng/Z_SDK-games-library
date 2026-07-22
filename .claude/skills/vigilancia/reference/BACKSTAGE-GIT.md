# Layout BACKSTAGE_GIT · convención `cantera/`

El backstage (cuadernos / addendas / depósitos custodiados) es un repo
hermano o rama de pulsos. Este skill documenta el **layout recomendado**
para no colisionar vocabulario con `_fuentes/` (FS del atlas =
checkouts de lectura).

## Layout recomendado

```text
BACKSTAGE_GIT/          # raíz de la rama de pulsos del carril
  addendas/             # o pulsos/entregas del vigía
  handoffs/             # opcional
  cantera/              # depósitos custodiados (materiales fuente)
    branding/           # banners, logos, plantillas
    planes/             # planes originales archivados
    …
```

| path | rol |
| ---- | --- |
| raíz de rama | pulsos · addendas · entregas del vigía |
| **`cantera/`** | depósitos custodiados (branding, planes, lore de zine) |
| `_fuentes/<checkout>/` (FS atlas) | área de **checkouts** de lectura — otro concepto |

«Cantera» = vocabulario del paquete (`site-web`: datos que no dirigen).
Un solo vocablo por concepto.

## Worktree por rol

El backstage se monta en **worktree propio** (un worktree por rol:
vigía / custodio / lectura de cantera). No compartir worktree con la
obra del mundo. Caso fundante doble con **checkout declarado**
(`swarm-orquestacion` · `reference/lecciones-vnext.md`).

## Migración `fuentes/` → `cantera/`

Si un backstage legacy usa `fuentes/` para depósitos custodiados:

1. Renombrar a `cantera/` (commit del custodio; trivial).
2. Actualizar punteros en addendas / briefs (tips pineados).
3. No confundir con `_fuentes/` del atlas (checkouts FS).

## Cruce con site-web

La **cantera custodiada** del mundo puede vivir en el backstage
privado; el WP la consulta por **tip pineado** (solo lectura). Ver
`site-web` · `reference/pack-marca.md` y SKILL §Separación método/datos.
