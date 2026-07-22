#!/usr/bin/env bash
# Prueba de ceguera sobre skills/site-web/.
# Uso: ceguera.sh '<patron-regex>'
# El patrón lo declara quien publica (PRACTICAS delta 5 del paquete);
# no vive hardcodeado aquí para no auto-contaminar el árbol del skill.
set -euo pipefail
PATTERN="${1:?uso: ceguera.sh '<patron-regex>'}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "ceguera: buscar patron en $ROOT"
if command -v rg >/dev/null 2>&1; then
  if rg -n -e "$PATTERN" "$ROOT"; then
    echo "CEGUERA_FAIL matches>0" >&2
    exit 1
  fi
else
  if grep -RInE "$PATTERN" "$ROOT"; then
    echo "CEGUERA_FAIL matches>0" >&2
    exit 1
  fi
fi
echo "CEGUERA_OK matches=0"
