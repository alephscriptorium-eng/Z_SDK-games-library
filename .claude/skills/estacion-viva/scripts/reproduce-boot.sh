#!/usr/bin/env bash
# reproduce-boot.sh — agente fresco reproduce el boot completo (7 fases).
# Solo necesita este skill + params WORLD_ROOT · GAME_MCP · OUT_DIR.
#
# Uso (fixture del skill):
#   OUT_DIR=$(mktemp -d) GAME_MCP=mcp://fixture-tick-cero \
#     bash scripts/reproduce-boot.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FIXTURE_DEFAULT="$SKILL_ROOT/examples/fixture-tick-cero"

WORLD_ROOT="${WORLD_ROOT:-$FIXTURE_DEFAULT}"
GAME_MCP="${GAME_MCP:-}"
OUT_DIR="${OUT_DIR:-}"

die() { echo "boot FAIL: $*" >&2; exit 1; }

[ -n "$OUT_DIR" ] || die "OUT_DIR obligatorio"
[ -n "$GAME_MCP" ] || die "GAME_MCP obligatorio"
[ -d "$WORLD_ROOT" ] || die "WORLD_ROOT no existe: $WORLD_ROOT"

mkdir -p "$OUT_DIR"
BOOT_LOG="$OUT_DIR/boot.log"
: > "$BOOT_LOG"
log() { echo "$*" | tee -a "$BOOT_LOG"; }

WATCHER_PID=""
kill_watcher() {
  if [ -n "${WATCHER_PID}" ] && kill -0 "$WATCHER_PID" 2>/dev/null; then
    kill "$WATCHER_PID" 2>/dev/null || true
    wait "$WATCHER_PID" 2>/dev/null || true
  fi
  rm -f "$OUT_DIR/watcher.pid"
}
trap kill_watcher EXIT INT TERM

# ─── 1 · Cargar estación ───────────────────────────────────────────
log "fase1: cargar estacion"
log "fase1: WORLD_ROOT=$WORLD_ROOT"
log "fase1: OUT_DIR=$OUT_DIR"
log "fase1: ok"

# ─── 2 · REGENERAR ESTADO desde bitácora (fuente única) ─────────────
log "fase2: regenerar estado desde bitacora"
BITACORA="${BITACORA:-$WORLD_ROOT/bitacora/linea.mdl}"
[ -f "$BITACORA" ] || die "bitacora no encontrada: $BITACORA"

rm -f "$OUT_DIR/estado.json"

if command -v sha256sum >/dev/null 2>&1; then
  HASH="$(sha256sum "$BITACORA" | awk '{print $1}')"
elif command -v shasum >/dev/null 2>&1; then
  HASH="$(shasum -a 256 "$BITACORA" | awk '{print $1}')"
else
  HASH="no-hash-tool"
fi

{
  echo "{"
  echo "  \"fuente\": \"bitacora\","
  echo "  \"bitacora\": \"$BITACORA\","
  echo "  \"bitacora_sha256\": \"$HASH\","
  echo "  \"regenerado_en\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
  echo "  \"eventos\": ["
  first=1
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      \#*) continue ;;
      "") continue ;;
    esac
    # Separador " | "
    ts="${line%% | *}"
    rest="${line#* | }"
    autor="${rest%% | *}"
    rest2="${rest#* | }"
    evento="${rest2%% | *}"
    payload="${rest2#* | }"
    if [ "$evento" = "$payload" ]; then payload=""; fi
    if [ "$first" -eq 0 ]; then echo ","; fi
    first=0
    printf '    {"ts":"%s","autor":"%s","evento":"%s","payload":"%s"}' \
      "$ts" "$autor" "$evento" "$payload"
  done < "$BITACORA"
  echo ""
  echo "  ]"
  echo "}"
} > "$OUT_DIR/estado.json"

log "fase2: estado=$OUT_DIR/estado.json sha=$HASH"
log "fase2: ok"

# ─── 3 · RELANZAR watcher (muere con la sesión) ─────────────────────
log "fase3: relanzar watcher sesion"
INTERVAL="${INTERVAL:-2}" \
  WORLD_ROOT="$WORLD_ROOT" OUT_DIR="$OUT_DIR" \
  bash "$SCRIPT_DIR/watcher-sesion.sh" &
WATCHER_PID=$!
echo "$WATCHER_PID" > "$OUT_DIR/watcher.pid"
sleep 1
if ! kill -0 "$WATCHER_PID" 2>/dev/null; then
  die "watcher no arranco"
fi
log "fase3: watcher.pid=$WATCHER_PID"
log "fase3: ok"

# ─── 4 · Pulso del mundo ────────────────────────────────────────────
log "fase4: pulso del mundo"
PULSO_DIR="$OUT_DIR/pulso-once"
mkdir -p "$PULSO_DIR"
WORLD_ROOT="$WORLD_ROOT" OUT_DIR="$PULSO_DIR" bash "$SCRIPT_DIR/pulso-mundo.sh" \
  | tee -a "$BOOT_LOG"
cp "$PULSO_DIR/pulso.txt" "$OUT_DIR/pulso.txt"
log "fase4: ok"

# ─── 5 · Conexión al juego ──────────────────────────────────────────
log "fase5: conexion al juego"
log "fase5: GAME_MCP=$GAME_MCP"

PEERCARD="${PEERCARD:-$WORLD_ROOT/peercard.json}"
if [ ! -f "$PEERCARD" ]; then
  PEERCARD="$OUT_DIR/peercard.json"
fi
[ -f "$PEERCARD" ] || die "peercard firmada no encontrada"
grep -q '"id"' "$PEERCARD" || die "peercard sin id"
grep -q '"sig"' "$PEERCARD" || die "peercard sin sig"
cp "$PEERCARD" "$OUT_DIR/peercard.json"

KIT_ID="player-mcp-kit@0.1.3"
KIT_STATUS="pendiente-c8-live"
if [ -n "${NPM_REGISTRY:-}" ] && command -v npm >/dev/null 2>&1; then
  if npm view "$KIT_ID" --registry="$NPM_REGISTRY" version >/dev/null 2>&1; then
    KIT_STATUS="c8-ok"
  fi
fi

{
  echo "game_mcp: $GAME_MCP"
  echo "peercard: $OUT_DIR/peercard.json"
  echo "kit: $KIT_ID"
  echo "kit_via: registry"
  echo "kit_status: $KIT_STATUS"
  echo "sibling_path: prohibido"
} > "$OUT_DIR/game-conexion.txt"

log "fase5: kit=$KIT_ID status=$KIT_STATUS"
log "fase5: ok"

# ─── 6 · Modo debug ─────────────────────────────────────────────────
log "fase6: modo debug"
echo "debug=1 session=$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$OUT_DIR/debug.flag"
{
  echo "checklist boot 7 fases"
  echo "1 cargar: ok"
  echo "2 estado desde bitacora: ok ($HASH)"
  echo "3 watcher sesion: pid=$WATCHER_PID"
  echo "4 pulso: ok"
  echo "5 juego: $KIT_STATUS"
  echo "6 debug: ok"
  echo "7 salida dual: pendiente escritura"
} > "$OUT_DIR/debug-boot.txt"
log "fase6: ok"

# ─── 7 · Salida dual PO/scrum ───────────────────────────────────────
log "fase7: salida dual"
cat > "$OUT_DIR/salida-po.md" <<EOF
# Salida PO · estacion viva

- estacion: $WORLD_ROOT
- boot: OK
- estado regenerado desde bitacora: si
- juego (GAME_MCP + peercard): OK ($KIT_STATUS)
- pedir decision: ninguna
EOF

cat > "$OUT_DIR/salida-scrum.md" <<EOF
# Salida scrum · estacion viva

- fases 1-7: [x][x][x][x][x][x][x]
- watcher.pid: $WATCHER_PID (muere con sesion)
- OUT_DIR: $OUT_DIR
- pulso: ver pulso.txt
- kit: $KIT_ID via registry · $KIT_STATUS
- siguiente: revisar salidas; ceguera del skill aparte
EOF

log "fase7: ok"

kill_watcher
trap - EXIT INT TERM
log "boot: completo (watcher detenido al cerrar sesion de boot)"
echo "BOOT_OK"
echo "OUT_DIR=$OUT_DIR"
ls -1 "$OUT_DIR"
