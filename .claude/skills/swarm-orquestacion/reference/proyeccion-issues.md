# Proyección del backlog a issues (sin sync bidireccional)

Método para proyectar el scrum de markdown a un tracker de issues
externo. **No es sync**: es **proyección**. El markdown local es la
**fuente de verdad única** (regla 15); los issues son un artefacto
desechable, regenerable, sin autoridad.

Herramienta: `scripts/proyectar-backlog.mjs` (Node ≥18 + `gh` CLI
autenticado para el adaptador GitHub). Marco-agnóstico.

> **Modo por defecto: LOCAL-ONLY (DC-15).** Nadie proyecta a GitHub salvo
> que el **usuario lo pida explícitamente**. El modo se **declara al
> inicio de sesión** (el orquestador lo confirma; default local-only). El
> `export` real rehúsa sin opt-in (`--habilitar-github` /
> `PROYECCION_GITHUB=1`); el `--dry-run` (preview, sin API) se permite
> siempre. Un tracker público mal proyectado causa líos: por eso el
> silencio es el estado seguro.

## Principio

```
LOCAL (markdown + marcas)      REMOTO (issues)
  fuente de verdad     ──export──▶  proyección desechable
  el orquestador escribe  ◀─import──  INBOX (cola de reconciliación)
```

Nunca dos maestros. El remoto **jamás** escribe el BACKLOG: lo que llega
de la web (comentarios, cierres a mano) entra por `plan/INBOX-GH.md`, que
el orquestador lee y reconcilia **a mano** en el markdown. La divergencia
no es un conflicto de merge — es una cola de decisiones, que es el modelo
de siempre (solo el orquestador escribe BACKLOG).

## Export (local → remoto)

Determinista e idempotente:

- Cada WP lleva su **ID estable** (`WP-XX`), parseado del BACKLOG.
- `plan/.sync-map.json` (`WP-XX → nº issue`) — git-tracked — permite
  crear/actualizar. Marcador oculto `<!-- proyeccion:WP-XX -->` en el
  body para resiliencia si se pierde el mapa.
- **Post-apply (regla 17):** el mapa **nunca** se commitea con números
  de issue antes de que existan en el tracker. Orden: export real
  (crear/actualizar) → mapa refleja IDs reales → commit mapa + acta.
  Mapa especulativo = devolución.
- **Mapeo (DC-14):** `✅` → issue **closed**; `⬜`/`🔶` → **open**. Sin
  labels.
- **Alcance configurable (DC-20):** `--alcance todos` (default; proyecta
  todo el backlog) o `--alcance abiertos` (solo `⬜`/`🔶`, el trabajo
  accionable; los `✅` no se proyectan). Se elige **al activar**.
- **Auto-cierre (DC-19):** todo issue del `sync-map` cuyo WP **no** esté en
  el conjunto proyectado (retirado del backlog, o `✅` bajo
  `--alcance abiertos`) se **cierra** con comentario y sale del map. Modelo:
  «proyectá el conjunto; cerrá lo que sobra».
- Re-correr no duplica; regenerable desde cero (si borras los issues, el
  export los reconstruye).

```bash
# preview seguro (sin API, sin opt-in):
CEGUERA_PATTERN='<patrón del mundo>' \
  node scripts/proyectar-backlog.mjs export --dry-run

# proyección real (SOLO si el usuario lo pidió — DC-15):
CEGUERA_PATTERN='<patrón del mundo>' PROYECCION_GITHUB=1 \
  node scripts/proyectar-backlog.mjs export [--repo owner/name]
```

## Gate de ceguera (DC-12) — obligatorio

Los issues son **cara pública**. Antes de tocar la API, el export valida
el contenido a proyectar contra `CEGUERA_PATTERN` (regex de los tokens de
marco del mundo, **por env** — nunca almacenado en el skill, para no
auto-contaminarse). **Sin patrón → se rehúsa** (fail-safe, exit 3). Con
hit → aborta sin crear nada (exit 1). Un backlog no-blindado no se
proyecta a un tracker público.

## Import (remoto → local)

`import` trae el estado y comentarios de los issues mapeados y escribe
`plan/INBOX-GH.md` (git-tracked). **No** escribe el BACKLOG. El
orquestador reconcilia y vacía el inbox.

```bash
node scripts/proyectar-backlog.mjs import [--dry-run]
```

Cuerpo de cada issue proyectado lleva la nota: *«proyección generada —
comentad, no editéis; los comentarios entran por inbox»*.

## Modos

| modo | qué es | activación |
| ---- | ------ | ---------- |
| a) solo local | no ejecutar el exportador; coste cero | **por defecto** |
| b) sesión | `import` al abrir (drenar inbox), `export` al cerrar | opt-in explícito del usuario |
| c) continuo | `export` en hook post-commit — **patrón**, no incluido en 0.3.2 | opt-in explícito del usuario |

El modo se fija al **inicio de sesión**: el orquestador confirma con el
usuario (ver `roles/ORQUESTADOR.md`). Sin declaración → modo a (local).

## Adaptador (remote-agnóstico)

El adaptador GitHub usa `gh issue create/edit/close/reopen`. Otro remoto
(GitLab, ninguno) = otro adaptador; el parser del backlog y el modelo
proyección/inbox no cambian.

## No git-bug (DC-11)

git-bug resuelve issues-en-git, pero su modelo no es el markdown con
marcas — se perdería el backlog-como-texto, que es el corazón del método.
Por eso: exportador propio, fino sobre `gh api`.
