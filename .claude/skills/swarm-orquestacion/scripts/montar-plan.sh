#!/usr/bin/env bash
# Monta un plan/ mínimo en un mundo nuevo usando solo este skill.
# Uso: bash montar-plan.sh <MUNDO_RAIZ>
set -euo pipefail

DEST="${1:-}"
if [[ -z "$DEST" ]]; then
  echo "uso: $0 <MUNDO_RAIZ>" >&2
  exit 2
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PLAN="$DEST/plan"

mkdir -p "$PLAN/roles" "$PLAN/REPORTES"

# Roles canónicos del skill → plan/roles del mundo
cp -r "$SKILL_ROOT/reference/roles/." "$PLAN/roles/"

# Plantilla de reporte
cp "$SKILL_ROOT/reference/plantilla-reporte.md" "$PLAN/REPORTES/PLANTILLA.md"

# Ejes como referencia local (enlace conceptual: copia)
cp "$SKILL_ROOT/reference/ejes-ca.md" "$PLAN/roles/ejes-ca.md"
cp "$SKILL_ROOT/reference/ciclo.md" "$PLAN/roles/ciclo.md"

# Esqueleto de documentos de gobierno (stubs editables)
if [[ ! -f "$PLAN/VISION.md" ]]; then
  cat > "$PLAN/VISION.md" <<'EOF'
# VISION — el mundo

_(Rellenar: idea, entregable, candados. Parametriza rutas locales.)_
EOF
fi

if [[ ! -f "$PLAN/PRACTICAS.md" ]]; then
  cat > "$PLAN/PRACTICAS.md" <<'EOF'
# PRACTICAS — reglas de devolución

## Alcance

- Diff del worker solo dentro de `ALCANCE_DIFF` (declarado en cada BRIEF).
- Citar, no copiar árboles ajenos. Ningún sello sin fuente.

## Ejes de CA (obligatorios por tipo de WP)

Ver `plan/roles/ejes-ca.md` (copiado del skill swarm-orquestacion):

| Tipo | Eje |
| ---- | --- |
| extracción / kit | I |
| demolición / extracción con lógica viva | II |
| auditoría / layout | III |
| contrato / capa | IV |
| swarms ajenos | V |

## Auto-revisión

Antes de reportar: releer el diff contra este fichero y los ejes aplicables.
EOF
fi

if [[ ! -f "$PLAN/BACKLOG.md" ]]; then
  cat > "$PLAN/BACKLOG.md" <<'EOF'
# BACKLOG

Estados: ⬜ pendiente · 🔶 en curso · ✅ aceptado.

## Ola 0

- ⬜ **WP-00 · Gates del mundo** — validadores mínimos del alcance.
  **CA:** gates rojos sintéticos + verde sobre el alcance declarado.
EOF
fi

if [[ ! -f "$PLAN/DECISIONES.md" ]]; then
  cat > "$PLAN/DECISIONES.md" <<'EOF'
# DECISIONES

## Cerradas

_(ninguna aún)_

## Abiertas

_(las resuelve el custodio)_
EOF
fi

echo "plan montado en: $PLAN"
echo "roles:" && ls "$PLAN/roles"
echo "siguiente: rellenar VISION/PRACTICAS/BACKLOG; chat orquestador + ORQUESTADOR.md"
