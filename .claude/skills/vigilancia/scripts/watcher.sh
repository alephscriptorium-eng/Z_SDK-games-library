#!/usr/bin/env bash
# Vigía read-only parametrizado por «el mundo».
# NO usa `git status` (evita tocar index.lock).
# Muestrea cada INTERVAL s: worktrees registrados vs carpetas reales, locks.
# Escribe watch.log (todo) y anomalias.log (solo rarezas). No toca el index.
#
# Uso:
#   WORLD_ROOT=/ruta/al/repo OUT_DIR=/ruta/salida [INTERVAL=45] ./watcher.sh
#   SIBLING_ROOT=/ruta/hermano  # opcional: pulso locks/worktrees del hermano
#   ./watcher.sh /ruta/al/repo /ruta/salida [INTERVAL]
#
# Multi-carril: un proceso = un WORLD_ROOT. Territorio hermano = otra
# instancia o SIBLING_ROOT (solo lectura; líneas con prefijo sibling:).
# Ver reference/ESTACION.md «Pulso multi-carril».
set -u

WORLD_ROOT="${WORLD_ROOT:-${1:-}}"
OUT_DIR="${OUT_DIR:-${2:-}}"
INTERVAL="${INTERVAL:-${3:-45}}"
SIBLING_ROOT="${SIBLING_ROOT:-}"

if [ -z "$WORLD_ROOT" ] || [ -z "$OUT_DIR" ]; then
  echo "uso: WORLD_ROOT=<repo> OUT_DIR=<salida> [INTERVAL=45] [SIBLING_ROOT=<hermano>] $0" >&2
  echo "  o: $0 <WORLD_ROOT> <OUT_DIR> [INTERVAL]" >&2
  exit 2
fi

if [ ! -d "$WORLD_ROOT/.git" ] && [ ! -f "$WORLD_ROOT/.git" ]; then
  echo "WORLD_ROOT no parece un repo git: $WORLD_ROOT" >&2
  exit 2
fi

if [ -n "$SIBLING_ROOT" ]; then
  if [ ! -d "$SIBLING_ROOT/.git" ] && [ ! -f "$SIBLING_ROOT/.git" ]; then
    echo "SIBLING_ROOT no parece un repo git: $SIBLING_ROOT" >&2
    exit 2
  fi
fi

mkdir -p "$OUT_DIR"
LOG="$OUT_DIR/watch.log"
ANOM="$OUT_DIR/anomalias.log"

# Pulso mínimo de un root hermano (locks + conteo worktrees). Solo lectura.
pulse_sibling() {
  local root="$1"
  local ts="$2"
  local reg real locks wtlocks reg_n real_n
  reg="$(git -C "$root" worktree list --porcelain 2>/dev/null | awk '/^worktree /{print $2}')"
  reg_n="$(printf '%s\n' "$reg" | grep -c . )"
  real=""
  if [ -d "$root/.worktrees" ]; then
    real="$(ls -1 "$root/.worktrees" 2>/dev/null)"
  fi
  real_n="$(printf '%s\n' "$real" | grep -c . )"
  locks="$(find "$root/.git" -maxdepth 3 \( -name 'index.lock' -o -name 'HEAD.lock' \) 2>/dev/null | tr '\n' ' ')"
  wtlocks=""
  if [ -d "$root/.git/worktrees" ]; then
    wtlocks="$(find "$root/.git/worktrees" -maxdepth 2 -name 'locked' 2>/dev/null | tr '\n' ' ')"
  fi
  echo "[$ts] sibling: wt_reg=$reg_n wt_dir=$real_n locks='${locks}${wtlocks}'" >> "$LOG"
  if [ -n "${locks// /}" ] || [ -n "${wtlocks// /}" ]; then
    echo "[$ts] !!LOCK sibling: ${locks}${wtlocks}" | tee -a "$ANOM" >> "$LOG"
  fi
}

prev_wt=""
while true; do
  ts="$(date '+%F %T')"
  # Worktrees registrados (paths)
  reg="$(git -C "$WORLD_ROOT" worktree list --porcelain 2>/dev/null | awk '/^worktree /{print $2}')"
  reg_n="$(printf '%s\n' "$reg" | grep -c . )"
  # Carpetas reales bajo .worktrees/
  real=""
  if [ -d "$WORLD_ROOT/.worktrees" ]; then
    real="$(ls -1 "$WORLD_ROOT/.worktrees" 2>/dev/null)"
  fi
  real_n="$(printf '%s\n' "$real" | grep -c . )"
  # Locks (sin git status)
  locks="$(find "$WORLD_ROOT/.git" -maxdepth 3 \( -name 'index.lock' -o -name 'HEAD.lock' \) 2>/dev/null | tr '\n' ' ')"
  wtlocks=""
  if [ -d "$WORLD_ROOT/.git/worktrees" ]; then
    wtlocks="$(find "$WORLD_ROOT/.git/worktrees" -maxdepth 2 -name 'locked' 2>/dev/null | tr '\n' ' ')"
  fi
  # Firma de worktrees para detectar cambios
  wtsig="$(printf '%s|%s' "$reg" "$real")"

  # mtime por worktree real (señal de vida; excluye node_modules/.git)
  mts=""
  if [ -n "$real" ]; then
    while IFS= read -r d; do
      [ -z "$d" ] && continue
      wp="$WORLD_ROOT/.worktrees/$d"
      newest="$(find "$wp" -type f -not -path '*/node_modules/*' -not -path '*/.git/*' -printf '%T@\n' 2>/dev/null | sort -nr | head -1)"
      if [ -n "$newest" ]; then
        now="$(date +%s)"
        age=$(( now - ${newest%.*} ))
        mts="$mts $d:${age}s"
      else
        mts="$mts $d:vacio"
      fi
    done <<< "$real"
  fi

  # Worktrees bajo .claude/worktrees — ajenos al swarm; avisar si activos
  foreign=""
  if [ -d "$WORLD_ROOT/.claude/worktrees" ]; then
    for fd in "$WORLD_ROOT/.claude/worktrees"/*/; do
      [ -d "$fd" ] || continue
      fn="$(basename "$fd")"
      fnewest="$(find "$fd" -type f -not -path '*/node_modules/*' -not -path '*/.git/*' -printf '%T@\n' 2>/dev/null | sort -nr | head -1)"
      if [ -n "$fnewest" ]; then
        fage=$(( $(date +%s) - ${fnewest%.*} ))
        foreign="$foreign $fn:${fage}s"
        if [ "$fage" -lt 120 ]; then
          echo "[$ts] !!AJENO worktree ajeno ACTIVO (mtime ${fage}s): .claude/worktrees/$fn" | tee -a "$ANOM" >> "$LOG"
        fi
      fi
    done
  fi

  # Residuo de info en carpetas de IDE (regla 15): markdowns/notas de
  # sesión = fuente de verdad paralela y efímera. La config funcional
  # (json/toml/tasks/mcp) NO es residuo. Excluye worktrees (checkouts
  # legítimos con sus propios .md) y node_modules/.git.
  for ide in .claude .cursor .windsurf .aider; do
    idedir="$WORLD_ROOT/$ide"
    [ -d "$idedir" ] || continue
    resid="$(find "$idedir" -type f -name '*.md' \
      -not -path '*/worktrees/*' -not -path '*/node_modules/*' \
      -not -path '*/.git/*' 2>/dev/null)"
    [ -z "$resid" ] && continue
    while IFS= read -r rf; do
      [ -z "$rf" ] && continue
      echo "[$ts] !!RESIDUO markdown de info en carpeta de IDE (regla 15; solo config funcional): ${rf#$WORLD_ROOT/}" | tee -a "$ANOM" >> "$LOG"
    done <<< "$resid"
  done

  line="[$ts] wt_reg=$reg_n wt_dir=$real_n mtime[$mts ] ajenos[$foreign ] locks='${locks}${wtlocks}'"
  echo "$line" >> "$LOG"

  # Territorio hermano (opcional): solo locks + conteos
  if [ -n "$SIBLING_ROOT" ]; then
    pulse_sibling "$SIBLING_ROOT" "$ts"
  fi

  # --- Anomalías ---
  # a) carpeta en .worktrees sin registro (huérfano)
  if [ -n "$real" ]; then
    while IFS= read -r d; do
      [ -z "$d" ] && continue
      if ! printf '%s\n' "$reg" | grep -q "/.worktrees/$d\$"; then
        echo "[$ts] !!HUERFANO carpeta .worktrees/$d sin registro en git worktree list" | tee -a "$ANOM" >> "$LOG"
      fi
    done <<< "$real"
  fi
  # b) registro cuyo path no existe en disco (stale)
  if [ -n "$reg" ]; then
    while IFS= read -r p; do
      [ -z "$p" ] && continue
      if [ ! -d "$p" ]; then
        echo "[$ts] !!STALE worktree registrado sin carpeta: $p" | tee -a "$ANOM" >> "$LOG"
      fi
    done <<< "$reg"
  fi
  # c) locks presentes
  if [ -n "${locks// /}" ] || [ -n "${wtlocks// /}" ]; then
    echo "[$ts] !!LOCK ${locks}${wtlocks}" | tee -a "$ANOM" >> "$LOG"
  fi
  # d) cambio en el conjunto de worktrees
  if [ "$wtsig" != "$prev_wt" ] && [ -n "$prev_wt" ]; then
    echo "[$ts] ~cambio-worktrees reg=[$(echo $reg|tr '\n' ' ')] dir=[$(echo $real|tr '\n' ' ')]" >> "$LOG"
  fi
  prev_wt="$wtsig"

  sleep "$INTERVAL"
done
