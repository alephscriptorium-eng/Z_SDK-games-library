#!/usr/bin/env bash
# Un pulso puntual del mundo (fase 4). Escribe OUT_DIR/pulso.txt.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

WORLD_ROOT="${WORLD_ROOT:-${1:-}}"
OUT_DIR="${OUT_DIR:-${2:-}}"

if [ -z "$WORLD_ROOT" ] || [ -z "$OUT_DIR" ]; then
  echo "uso: WORLD_ROOT=<repo> OUT_DIR=<salida> $0" >&2
  exit 2
fi

mkdir -p "$OUT_DIR"

ONCE=1 INTERVAL=1 WORLD_ROOT="$WORLD_ROOT" OUT_DIR="$OUT_DIR" \
  bash "$SCRIPT_DIR/watcher-sesion.sh"

skills_n=0
if [ -d "$WORLD_ROOT/.claude/skills" ]; then
  skills_n="$(find "$WORLD_ROOT/.claude/skills" -type f -name 'SKILL.md' 2>/dev/null | grep -c . || true)"
fi

wt_n=0
if [ -d "$WORLD_ROOT/.worktrees" ]; then
  wt_n="$(ls -1 "$WORLD_ROOT/.worktrees" 2>/dev/null | grep -c . || true)"
fi

{
  echo "pulso: ok"
  echo "world_root: $WORLD_ROOT"
  echo "skills_materializados: $skills_n"
  echo "worktrees_dir: $wt_n"
  echo "ts: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
} > "$OUT_DIR/pulso.txt"

echo "pulso escrito: $OUT_DIR/pulso.txt"
cat "$OUT_DIR/pulso.txt"
