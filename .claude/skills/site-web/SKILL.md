---
name: site-web
description: >-
  Método de copy + protocolo de publicación web (VitePress, Pages, piel
  declarada). Parametriza «el mundo»; separa método (aquí) de datos (cantera /
  entrega del consumidor). Sin nombres de mundo real ni del marco.
---

# Skill `site-web`

Generá y publicá la capa de contenido de un portal FOSS: argumento,
inventario del sistema, mecanismo de generación (backtracking + filtros) y
pipeline Pages. El skill lleva el **método**. Los datos concretos viven en
la calibración local del mundo (o en `instancias/` del paquete, fuera de
esta carpeta).

## Cuándo aplicar

Cuando el agente deba:

1. Redactar / regenerar superficies de un portal a partir de bases
   fundacionales.
2. Empaquetar reemplazos verbatim para un swarm consumidor (§E).
3. Montar o auditar el pipeline de docs → GitHub Pages (CNAME, base,
   workflow, piel declarada).

## Parámetros del mundo (calibración)

Leé primero la calibración local (si existe). Mínimo:

| clave | ejemplo de forma | para qué |
| ----- | ---------------- | -------- |
| `mundo.id` | slug corto | nombre lógico |
| `mundo.docs` | `docs/` | raíz VitePress |
| `mundo.dominio` | `portal.ejemplo.co` | CNAME + checklist DNS |
| `mundo.base_env` | `DOCS_BASE` | env del guard de `base` |
| `mundo.registry` | URL del registry | anuncios de canal real (C8) |
| `mundo.ceguera` | regex | prueba delta 5 del mundo |
| `mundo.lexico_no` | regex | filtro C1 |
| `mundo.piel` | `familia-vp` \| `fanzine` | piel canónica (#18) |
| `mundo.brand.banner` | path bajo `public/` | `BRAND_BANNER` |
| `mundo.brand.footer` | texto de colofón | `BRAND_FOOTER` |
| `mundo.brand.license` | ruta zine `/licencia` | `BRAND_LICENSE` |
| `mundo.brand.favicon` | `favicon.ico` + `.png` | `BRAND_FAVICON` |

Nunca hardcodees rutas absolutas de otro árbol ni nombres de mundos ajenos
en la copy pública ni en plantillas del skill. Pack marca completo:
`reference/pack-marca.md`.

## Separación método / datos

```
skill (método)          mundo (datos / instancia)
─────────────────        ──────────────────────────
BASE-1/2/3 plantilla  →  cantera/  (inventarios, snapshots)
protocolo ghpages     →  entrega/  (paquete §E vigente)
filtros C1–C9         →  decisiones vivas del marketing local
piel declarada        →  theme/ copia-release del mundo
```

`CANTERA` y `ENTREGA-*` de un mundo concreto **no** entran en este skill.
Son instancia: el consumidor las mantiene fuera.

## Regla 13 · piel declarada (agente fresco)

**Dos pieles canónicas.** El mundo **declara** `piel:` en calibración y/o
frontmatter. Sin declaración = **`familia-vp`** (pro / look familia
codebase).

| piel | rol | assets |
| ---- | --- | ------ |
| `familia-vp` | **DEFAULT** — shell VitePress + `socialLinks` GitHub + footer + tokens zine | `familia-vp.css` + `theme-index-familia-vp.js.tpl` |
| `fanzine` | **OPT-IN** — standalone stamp/washi/callout (zines pub) | `fanzine.css` + `Layout.vue.tpl` + `theme-index-fanzine.js.tpl` |

| qué | es piel | no es piel |
| --- | ------- | ---------- |
| asset + theme entry de la piel declarada | sí | |
| solo variables CSS sueltas sin declarar piel | | **no** (insuficiente) |

**Defecto histórico (0.6.1):** absolutismo «una sola piel fanzine + shell
ausente». Corregido en 0.8.0 (#18): CA = «piel **DECLARADA** renderiza».

**Contraste / composición (#18 triage):** montar fanzine sobre markdown
VitePress + tokens monocromo colapsa pares VP (`--vp-c-brand` = tinta →
enlace resaltado ilegible). La piel debe **remapear** pares (hover
tinta↔papel; `brand-soft` ≠ tinta). CA:
`scripts/verificar-contraste-piel.mjs`.

CA estructural (anti-regresión): tras `docs:build`,

```bash
node skills/site-web/scripts/verificar-piel.mjs --piel familia-vp --dist <dist>
# o, si el mundo optó fanzine:
node skills/site-web/scripts/verificar-piel.mjs --piel fanzine --dist <dist>
node skills/site-web/scripts/verificar-contraste-piel.mjs --piel <piel>
```

Alias legacy: `verificar-piel-fanzine.mjs` → `--piel fanzine`.

## Pasos

### A · Capa de contenido (método de bases)

1. Completar / actualizar las tres bases del mundo desde
   `reference/plantillas/` (argumento, sistema, mecanismo).
2. Consultar cantera local **solo** para datos; no deja dirigir.
3. Generar superficies con `reference/metodo-mecanismo.md` §B–§D.
4. Pasar filtros §C (incl. C8 canal real, C9 listas vivas, ceguera del
   mundo).
5. Si el destino es un swarm: empaquetar en formato §E (reemplazos
   verbatim + CA).

### B · Iteración de backtracking

Si marketing pide «otra iteración de backtracking»:

1. Marketing edita a mano el paquete de entrega (bloques canónicos =
   verbatim).
2. El agente extrae el patrón → escribe regla en BASE-2 y/o BASE-3.
3. Re-ejecuta la pipeline sobre el **resto**; no toca bloques canónicos.

### C · Protocolo ghpages

1. Config VitePress con `base` parametrizado + guard MSYS
   (`reference/protocolo-ghpages.md`).
2. Workflow `docs.yml` (npm ci, paths `docs/**`, concurrency, deploy solo
   `main`).
3. `docs/public/CNAME` = dominio del mundo (frágil #1).
4. **Piel declarada**:
   - DEFAULT `familia-vp`: copia-release `familia-vp.css` +
     `theme-index-familia-vp.js.tpl` (o `theme-index.js.tpl`). Config con
     `socialLinks` GitHub + footer.
   - OPT-IN `fanzine`: `fanzine.css` + `Layout.vue` +
     `theme-index-fanzine.js.tpl` + frontmatter `piel: fanzine`.
   Tipografía local; cero CDN / fuentes web.
5. **Pack marca (BRAND-\*)**: cablear banner / footer / license / favicon
   como parámetros (`reference/pack-marca.md`). Derivados `*-web.png`
   **<150KB** — CA:
   `node skills/site-web/scripts/verificar-pesos-web.mjs --dir docs/public`.
   ADVERTENCIA: licencia canónica (puntero) ≠ lore AIPL.
6. Checklist DNS → Pages + Enforce HTTPS.
7. Mitigar los 7 frágiles documentados en el protocolo.
8. **Gate de verificación**: `scripts/verificar-sitio.mjs` **y**
   `scripts/verificar-piel.mjs --piel <declarada>` **y**
   `scripts/verificar-contraste-piel.mjs --piel <declarada>` antes del
   deploy. Preferible vía `npm run docs:verificar` si el mundo lo define.

### D · Credenciales de publish por repo

Antes del primer publish de paquete (tag → workflow): sembrar secrets
con nombres **EXACTOS** `NPM_USERNAME` + `NPM_PASSWORD` (alternativa
`NPM_TOKEN` si el workflow del repo lo espera). Siembra web
(Settings → Secrets and variables → Actions → New repository secret) o
CLI (`gh secret set NPM_USERNAME -R <org>/<repo>`; ídem `NPM_PASSWORD`).
El script generador de la credencial lo declara la calibración del mundo.
Detalle: `reference/protocolo-ghpages.md` § «Credenciales de publish por
repo».

## Recursos

- `reference/metodo-argumento.md` — BASE-1 abstraída
- `reference/metodo-sistema.md` — BASE-2 abstraída
- `reference/metodo-mecanismo.md` — BASE-3 (backtracking, C8/C9, §E)
- `reference/protocolo-ghpages.md` — Pages + 7 frágiles + credenciales publish
- `reference/pack-marca.md` — BRAND_* · DE-8 · pesos · licencia ≠ lore
- `reference/plantillas/` — ficheros listos para copiar al mundo
  (incl. `familia-vp.css`, `fanzine.css`, `Layout.vue.tpl`, theme-index*)
- `examples/mundo-limpio/` — fixture **fanzine** OPT-IN (declarada)
- `scripts/ceguera.sh` — grep de ceguera sobre `skills/site-web/`
- `scripts/generar-sitio.sh` — scaffold parametrizado a un dir destino
- `scripts/verificar-sitio.mjs` — gate de enlaces (dist) + anclas +
  externos (warning) + verdad de contenido
- `scripts/verificar-piel.mjs` — CA «piel DECLARADA renderiza»
- `scripts/verificar-piel-fanzine.mjs` — alias `--piel fanzine`
- `scripts/verificar-contraste-piel.mjs` — CA contraste / composición VP
- `scripts/verificar-pesos-web.mjs` — CA medible: assets web < umbral KB

Cantera custodiada (datos en backstage privado, tip pineado): ver
skill `vigilancia` · `reference/BACKSTAGE-GIT.md`.

## Prueba de ceguera (antes de publicar el skill)

```bash
skills/site-web/scripts/ceguera.sh '<patron-del-paquete-publico>'
```

El patrón lo fija la doctrina del paquete (delta 5); no se hardcodea en
el skill para no auto-contaminar. Debe salir 0 matches. El mundo aplica
además **su** `mundo.ceguera` sobre su propia entrega.
