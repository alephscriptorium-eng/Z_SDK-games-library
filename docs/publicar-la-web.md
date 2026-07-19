# Publicar la web (catálogo)

Pipeline documental de **este** repo (catálogo VitePress → GitHub Pages).
La doctrina completa del portal hermano (engine / editor / mesh) está en
el monorepo Zeus: guía **Publicar la web** (`docs/guide/publicar-la-web.md`
→ sitio `z-sdk.escrivivir.co/guide/publicar-la-web`).

---

## Ciclo en la library

| Paso | Qué |
| ---- | --- |
| Editar | `docs/` (portada, fichas `docs/games/*`, releases, start packs) |
| Preview | `npm run docs:dev` |
| Build | `npm run docs:build` → `docs/.vitepress/dist` |
| Publicar | push con cambios en `docs/**` (ramas `main` / `wp/**`) o `workflow_dispatch` |
| Workflow | `.github/workflows/docs.yml` — build; deploy Pages **solo en `main`** |

En `main`, tras build verde: artefacto `docs/.vitepress/dist` → environment
`github-pages`. En `wp/**` y en PRs: solo valida el build.

Dominio objetivo: `games.z-sdk.escrivivir.co` (`base` VitePress = `/`).
Ops: Pages → Source = GitHub Actions; Custom domain; Enforce HTTPS.
DNS: `CNAME games.z-sdk → alephscriptorium-eng.github.io`.

---

## Catálogo ← Releases (sin tocar el pipeline)

Añadir un juego al catálogo = **ficha** + **card** en la portada (y
entrada de sidebar si aplica). El workflow `docs.yml` no cambia.

La verdad viva de versiones / assets es **GitHub Releases** de este repo
(tags `startpack-<game>-v*`). Las páginas [Releases](/releases) y
[Start packs](/startpacks) describen el mecanismo y enlazan ese canal;
no hay que inventar tablas de versión en Markdown.
