#!/usr/bin/env bash
# Scaffold de sitio publicable desde el ejemplo mundo-limpio o plantillas.
# Uso: generar-sitio.sh <dir-destino>
# No consulta mundos reales: solo copia el fixture inventado del skill.
set -euo pipefail
DEST="${1:-}"
if [[ -z "$DEST" ]]; then
  echo "uso: $0 <dir-destino>" >&2
  exit 2
fi
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/examples/mundo-limpio"
mkdir -p "$DEST"
# Copia fixture (rsync si hay; si no, cp -R)
if command -v rsync >/dev/null 2>&1; then
  rsync -a --exclude '.git' "$SRC/" "$DEST/"
else
  cp -R "$SRC/." "$DEST/"
fi
# package.json mínimo si no existe
if [[ ! -f "$DEST/package.json" ]]; then
  cat > "$DEST/package.json" <<'EOF'
{
  "name": "nexo-atlas-ejemplo",
  "private": true,
  "type": "module",
  "scripts": {
    "docs:dev": "vitepress dev docs",
    "docs:build": "vitepress build docs",
    "docs:verificar": "node node_modules/@alephscript/skills-scriptorium/skills/site-web/scripts/verificar-sitio.mjs --dist docs/.vitepress/dist --base / && node node_modules/@alephscript/skills-scriptorium/skills/site-web/scripts/verificar-piel-fanzine.mjs --dist docs/.vitepress/dist"
  },
  "devDependencies": {
    "vitepress": "^1.6.4"
  }
}
EOF
fi
# gitignore dist (frágil #5)
if [[ ! -f "$DEST/.gitignore" ]]; then
  printf '%s\n' 'node_modules/' 'docs/.vitepress/dist/' '*.tgz' > "$DEST/.gitignore"
fi
echo "SITIO_OK destino=$DEST"
echo "siguiente: cd \"$DEST\" && npm install && npm run docs:build"
ls -la "$DEST/docs" "$DEST/docs/public/CNAME" "$DEST/.github/workflows/docs.yml" \
  "$DEST/BASE-1-ARGUMENTO.md" "$DEST/entrega/01-PAQUETE.md"
