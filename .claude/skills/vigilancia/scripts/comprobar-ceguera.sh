#!/usr/bin/env bash
# Prueba de ceguera sobre la cara pública de este skill.
# Los términos prohibidos se arman por fragmentos para que un grep sobre
# este directorio (incluido este script) siga siendo 0.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

P1="ze"
P1+="us"
P2="ho"
P2+="l"
P2+=$'\u00f3'
P2+="n"
P3="ho"
P3+="larqu"
P3+=$'\u00ed'
P3+="a"
P4="SCRI"
P4+="PT_"
P4+="SDK"
P5="S_"
P5+="SDK"
P6="jun"
P6+="tura"
PATTERN="${P1}|${P2}|${P3}|${P4}|${P5}|${P6}"

if command -v rg >/dev/null 2>&1; then
  HITS=$(rg -n -i -e "$PATTERN" "$SKILL_ROOT" || true)
else
  HITS=$(grep -RInE "$PATTERN" "$SKILL_ROOT" || true)
fi

if [[ -n "$HITS" ]]; then
  echo "ceguera: FAIL"
  echo "$HITS"
  exit 1
fi

echo "ceguera: 0"
echo "raiz: $SKILL_ROOT"
exit 0
