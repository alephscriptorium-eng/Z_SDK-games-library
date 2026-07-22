#!/usr/bin/env bash
# Watcher de estación — clase sesión (muere con el padre) + whitelist
# .claude/skills/ (clase I71).
#
# Uso:
#   WORLD_ROOT=… OUT_DIR=… [INTERVAL=45] ./watcher-sesion.sh
#   ONCE=1 → un ciclo y sale (útil en fixture / pulso)
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FILTRO="$SCRIPT_DIR/filtro-whitelist-skills.sh"

WORLD_ROOT="${WORLD_ROOT:-${1:-}}"
OUT_DIR="${OUT_DIR:-${2:-}}"
INTERVAL="${INTERVAL:-${3:-45}}"
ONCE="${ONCE:-0}"

if [ -z "$WORLD_ROOT" ] || [ -z "$OUT_DIR" ]; then
  echo "uso: WORLD_ROOT=<repo> OUT_DIR=<salida> [INTERVAL=45] $0" >&2
  exit 2
fi

mkdir -p "$OUT_DIR"
LOG="$OUT_DIR/watch.log"
ANOM="$OUT_DIR/anomalias.log"
PIDFILE="$OUT_DIR/watcher.pid"

echo $$ > "$PIDFILE"

cleanup() {
  rm -f "$PIDFILE"
}
trap cleanup EXIT

cycle() {
  local ts resid_raw resid filtered
  ts="$(date '+%F %T')"

  # Residuo IDE: markdowns bajo carpetas de herramienta, EXCEPTO
  # materialización .claude/skills/ (whitelist I71).
  resid_raw=""
  for ide in .claude .cursor .windsurf .aider; do
    idedir="$WORLD_ROOT/$ide"
    [ -d "$idedir" ] || continue
    while IFS= read -r rf; do
      [ -z "$rf" ] && continue
      resid_raw+="${rf}"$'\n'
    done < <(find "$idedir" -type f -name '*.md' \
      -not -path '*/worktrees/*' -not -path '*/node_modules/*' \
      -not -path '*/.git/*' 2>/dev/null || true)
  done

  filtered="$(printf '%s' "$resid_raw" | bash "$FILTRO" || true)"
  local resid_n=0
  if [ -n "$filtered" ]; then
    resid_n="$(printf '%s\n' "$filtered" | grep -c . || true)"
    while IFS= read -r rf; do
      [ -z "$rf" ] && continue
      echo "[$ts] !!RESIDUO markdown de info (fuera de whitelist skills): ${rf#$WORLD_ROOT/}" \
        | tee -a "$ANOM" >> "$LOG"
    done <<< "$filtered"
  fi

  # Conteo de skills materializados (informativo; no es anomalía)
  local skills_n=0
  if [ -d "$WORLD_ROOT/.claude/skills" ]; then
    skills_n="$(find "$WORLD_ROOT/.claude/skills" -type f -name 'SKILL.md' 2>/dev/null | grep -c . || true)"
  fi

  # Locks (sin git status)
  local locks=""
  if [ -d "$WORLD_ROOT/.git" ] || [ -f "$WORLD_ROOT/.git" ]; then
    locks="$(find "$WORLD_ROOT/.git" -maxdepth 3 \( -name 'index.lock' -o -name 'HEAD.lock' \) 2>/dev/null | tr '\n' ' ')"
  fi

  echo "[$ts] sesion=1 skills_mat=$skills_n residuo_filtrado=$resid_n locks='${locks}'" >> "$LOG"

  if [ -n "${locks// /}" ]; then
    echo "[$ts] !!LOCK ${locks}" | tee -a "$ANOM" >> "$LOG"
  fi
}

if [ "$ONCE" = "1" ]; then
  cycle
  exit 0
fi

while true; do
  cycle
  sleep "$INTERVAL"
done
