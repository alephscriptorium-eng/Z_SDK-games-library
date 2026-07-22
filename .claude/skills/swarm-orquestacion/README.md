# swarm-orquestacion — activación

Skill de protocolo de swarm (roles + ciclo + cinco ejes de CA).

**Versión de método** de este skill: **v0.6** (convivencia
multi-orquestador; fuente única
`reference/convivencia-multi-orquestador.md`, sobre reglas 1–17 en
`reference/reglas-metodo-v05.md`). Es el eje del badge del catálogo
(DC-18), distinto del **semver del paquete** npm. Política y
correspondencia (método = minor del paquete; patch sin cambio de
contrato): `README.md` raíz del paquete (DC-22).

> Procedimiento canónico de consumo (versión **fijada**, adaptadores por
> runner, dedup, verificación C8): README raíz del paquete o
> `skills.s-sdk.escrivivir.co/guide/consumo`. Los pasos de abajo son la
> activación específica de este skill.

## Activar en un mundo

1. Instalá el paquete con versión **exacta** (`npm install --save-exact
   @alephscript/skills-scriptorium@X.Y.Z` desde el registry del
   consumidor; nunca `latest`). Solo para desarrollo del propio skill:
   `npm pack` + install por ruta.
2. Localizá el skill:
   `node_modules/@alephscript/skills-scriptorium/skills/swarm-orquestacion/`
   (o la ruta del checkout hermano).
3. Generá el `plan/` del mundo:

```bash
bash skills/swarm-orquestacion/scripts/montar-plan.sh /ruta/al/mundo
```

4. Pegá en el chat del orquestador el contenido de
   `plan/roles/ORQUESTADOR.md` (ya copiado por el script).
5. Para cada WP: BRIEF + `plan/roles/WORKER.md` en un chat nuevo.

## Gate · CHANGELOG de gobierno (opt-in)

El script `scripts/verificar-changelog.mjs` comprueba el **CHANGELOG de
gobierno** del mundo (uno, WP-id-keyed, derivado del BACKLOG). No verifica
CHANGELOG de paquete (N, changesets/semver). Opt-in: hay que declarar rol y
rutas — adoptable en monorepos sin asumir un único changelog en la raíz.

```bash
node skills/swarm-orquestacion/scripts/verificar-changelog.mjs \
  --role gobierno --version X.Y.Z \
  --changelog CHANGELOG.md --backlog plan/BACKLOG.md
```

`--role paquete` se rechaza a propósito. Detalle: `reference/reglas-metodo-v04.md`
(§ práctica CHANGELOG) y `--help` del script.

## Ceguera (cara pública)

Antes de publicar o empacar, en la raíz del paquete:

```bash
bash skills/swarm-orquestacion/scripts/comprobar-ceguera.sh
```

Debe salir `ceguera: 0` sobre `skills/swarm-orquestacion/`.

Además (regla 14): verificar el **historial reachable**, no solo el
árbol — p. ej. `git log -p -- skills/swarm-orquestacion/` medido con
`grep -c` / `grep -q` (nunca `grep | head && echo OK`). Fuga en commit
intermedio = squash antes del merge.

## Qué no va aquí

Datos de sesión de un mundo concreto, histórico de vigilancia, handoffs.
Eso es **instancia** del consumidor (`instancias/` o calibración local), no
método.
