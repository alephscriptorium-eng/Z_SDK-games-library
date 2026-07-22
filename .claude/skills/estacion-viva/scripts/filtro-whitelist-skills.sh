#!/usr/bin/env bash
# Filtro whitelist: excluye paths bajo .claude/skills/ (materialización
# legítima). Clase I71 — sin este filtro, barridos de residuo IDE generan
# ~3.110 falsos positivos al materializar el paquete de skills.
#
# Uso:
#   printf '%s\n' path1 path2 | ./filtro-whitelist-skills.sh
#   ./filtro-whitelist-skills.sh path1 path2 …
# Emite por stdout solo los paths que NO caen bajo .claude/skills/.
set -euo pipefail

is_whitelisted() {
  local p="$1"
  # Normaliza separadores
  p="${p//\\//}"
  case "$p" in
    */.claude/skills/*|.claude/skills/*|*/.claude/skills|.claude/skills)
      return 0
      ;;
  esac
  # También si el path relativo empieza por .claude/skills/
  case "$p" in
    .claude/skills/*) return 0 ;;
  esac
  return 1
}

emit_if_residual() {
  local p="$1"
  [ -z "$p" ] && return 0
  if is_whitelisted "$p"; then
    return 0
  fi
  printf '%s\n' "$p"
}

if [[ $# -gt 0 ]]; then
  for arg in "$@"; do
    emit_if_residual "$arg"
  done
else
  while IFS= read -r line || [[ -n "$line" ]]; do
    emit_if_residual "$line"
  done
fi
