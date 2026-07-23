#!/usr/bin/env bash
# verificar-territorio-mapa.sh — pulso territorio == mapa (#19).
# Cuando existen plan/MAPA-*.md, comprueba que entradas FS / trackeadas
# tienen fila. Sin mapas → SKIP (no FAIL).
#
# Uso:
#   bash verificar-territorio-mapa.sh [--root <WORLD_ROOT>] [--plan <plan/>]
# Env: WORLD_ROOT (default=.)
set -euo pipefail

ROOT="${WORLD_ROOT:-.}"
PLAN=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --root) ROOT="$2"; shift 2 ;;
    --plan) PLAN="$2"; shift 2 ;;
    *) echo "uso: $0 [--root DIR] [--plan DIR]" >&2; exit 2 ;;
  esac
done
PLAN="${PLAN:-$ROOT/plan}"

fail=0
checked=0

extract_paths() {
  # Filas de tabla markdown: | `path` | ... |
  grep -E '^\| `' "$1" 2>/dev/null \
    | sed -E 's/^\| `([^`]+)`.*/\1/' \
    || true
}

check_raiz() {
  local mapa="$PLAN/MAPA-RAIZ.md"
  [[ -f "$mapa" ]] || return 0
  checked=$((checked + 1))
  echo "[territorio==mapa] MAPA-RAIZ · ls raíz vs filas"
  local rows
  rows="$(extract_paths "$mapa")"
  # Entradas de la raíz del WORLD_ROOT (no ocultas salvo .worktrees si listadas)
  local entry
  for entry in "$ROOT"/*; do
    [[ -e "$entry" ]] || continue
    local base
    base="$(basename "$entry")/"
    local base_nop
    base_nop="$(basename "$entry")"
    if ! grep -qF "$base_nop" <<<"$rows"; then
      echo "  ✗ sin fila: $base_nop"
      fail=1
    else
      echo "  · ok: $base_nop"
    fi
  done
}

check_repo() {
  local mapa="$PLAN/MAPA-REPO.md"
  [[ -f "$mapa" ]] || return 0
  checked=$((checked + 1))
  echo "[territorio==mapa] MAPA-REPO · git ls-files ≤2 niveles vs filas"
  if ! git -C "$ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "  (skip: no es repo git)"
    return 0
  fi
  local rows
  rows="$(extract_paths "$mapa")"
  # Nivel 1 y 2 trackeados
  local f top
  while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    # normalizar a top-level o nivel-2
    top="$f"
    case "$f" in
      */*/*) top="$(echo "$f" | cut -d/ -f1-2)" ;;
    esac
    # directorios: aceptar prefijo
    local hit=0
    while IFS= read -r row; do
      [[ -z "$row" ]] && continue
      row="${row%/}"
      if [[ "$f" == "$row" || "$f" == "$row"/* || "$top" == "$row" || "$top" == "$row"/* ]]; then
        hit=1
        break
      fi
      # fila tipo plan/VISION.md
      if [[ "$row" == "$f" ]]; then hit=1; break; fi
    done <<<"$rows"
    if [[ "$hit" -eq 0 ]]; then
      # solo fallar nivel-1 únicos para no inundar en semillas
      if [[ "$f" != */* ]]; then
        echo "  ✗ trackeado sin fila (nivel-1): $f"
        fail=1
      fi
    fi
  done < <(git -C "$ROOT" ls-files | awk -F/ 'NF<=2 {print}' | sort -u)
}

check_taller() {
  local mapa="$PLAN/MAPA-TALLER.md"
  [[ -f "$mapa" ]] || return 0
  # Si el mapa dice «no aplica» en cuerpo, skip estricto
  if grep -qi 'no aplica' "$mapa"; then
    echo "[territorio==mapa] MAPA-TALLER · declarado no aplica (skip)"
    return 0
  fi
  checked=$((checked + 1))
  echo "[territorio==mapa] MAPA-TALLER presente — filas deben cubrir taller (manual/semilla)"
  local rows
  rows="$(extract_paths "$mapa")"
  if [[ -z "$rows" ]]; then
    echo "  ✗ MAPA-TALLER sin filas de path"
    fail=1
  else
    echo "  · filas presentes ($(echo "$rows" | grep -c . || true))"
  fi
}

check_raiz
check_repo
check_taller

if [[ "$checked" -eq 0 ]]; then
  echo "[territorio==mapa] SKIP: no hay plan/MAPA-*.md"
  exit 0
fi

if [[ "$fail" -ne 0 ]]; then
  echo "[territorio==mapa] FALLO"
  exit 1
fi
echo "[territorio==mapa] OK ($checked mapa(s))"
exit 0
