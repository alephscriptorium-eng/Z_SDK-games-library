# Docs portal → GitHub Pages
# Plantilla skill site-web. Sustituir {{DOCS}} {{DOMINIO}} {{NODE}}.
# Mitigaciones: #1 CNAME · #4 npm ci · #6 sin spec-gen · #7 gap paths.
name: Docs

on:
  push:
    branches:
      - main
      - 'wp/**'
    paths:
      - '{{DOCS}}/**'
  pull_request:
    paths:
      - '{{DOCS}}/**'
  workflow_dispatch:

concurrency:
  group: docs-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  build:
    name: docs:build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '{{NODE}}'
          cache: npm
      - name: Install (npm ci)
        run: npm ci
      - name: Build VitePress portal
        run: npm run docs:build
      - name: Verificar sitio (enlaces + verdad)
        run: npm run docs:verificar
      - name: Upload Pages artifact
        if: github.ref == 'refs/heads/main' && github.event_name != 'pull_request'
        uses: actions/upload-pages-artifact@v3
        with:
          path: {{DOCS}}/.vitepress/dist

  deploy:
    name: deploy Pages
    if: github.ref == 'refs/heads/main' && github.event_name != 'pull_request'
    needs: build
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
