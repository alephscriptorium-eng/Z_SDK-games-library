#!/usr/bin/env bash
# Prueba de ceguera sobre la cara pública de este skill.
# Este skill POSÉE el vocabulario de método (holón / juntura / holarquía).
# Aquí solo se vetan marcas de marco; se arman por fragmentos para que
# un grep sobre este directorio (incluido este script) siga siendo 0.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

P1="ze"
P1+="us"
P4="SCRI"
P4+="PT_"
P4+="SDK"
P5="S_"
P5+="SDK"
PATTERN="${P1}|${P4}|${P5}"

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
