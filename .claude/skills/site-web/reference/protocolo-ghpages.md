# Protocolo ghpages (VitePress → Pages)

Pipeline de portal de docs. Parametrizá dominio, `base`, rutas `docs/` y
registry según calibración del mundo. Fuente de patrón: variante library
ya estabilizada (workflow + config con guard); aquí solo el método.

## Piezas

| Pieza | Dónde (parametrizable) |
| ----- | ---------------------- |
| Markdown / VitePress | `{{DOCS}}/` (default `docs/`) |
| Config | `{{DOCS}}/.vitepress/config.mjs` |
| Theme / piel | `{{DOCS}}/.vitepress/theme/` |
| CNAME | `{{DOCS}}/public/CNAME` = `{{DOMINIO}}` |
| Workflow | `.github/workflows/docs.yml` |
| Dev / build | `npm run docs:dev` / `docs:build` |
| Artifact | `{{DOCS}}/.vitepress/dist` |

## Config: `base` parametrizado (frágil #2)

```js
function resolveDocsBase() {
  const raw = process.env.{{BASE_ENV}}?.trim(); // ej. DOCS_BASE
  if (raw) {
    // Guard MSYS: path Windows colado por conversión de env → no es base
    if (/^[A-Za-z]:[\\/]/.test(raw)) return '/';
    const cleaned = raw.replace(/^\/+|\/+$/g, '');
    return cleaned ? `/${cleaned}/` : '/';
  }
  return '/'; // custom domain → `/`; project pages → `/<repo>/`
}
```

Plantilla lista: `plantillas/config.mjs.tpl`.

## Workflow (frágiles #4, #6, #7)

Plantilla: `plantillas/docs.yml.tpl`.

Requisitos:

- Triggers: `push` `main` + `wp/**` con `paths: {{DOCS}}/**`;
  `pull_request` mismo paths; `workflow_dispatch`.
- `concurrency` por ref; `cancel-in-progress: true`.
- Install: **`npm ci`** (no `npm install`).
- Build: `npm run docs:build` — **sin** acoplar generadores de spec al
  script de docs.
- Upload artifact + deploy **solo** si `main` y no es PR.
- Node 22.

### Gap paths (#7)

Si solo cambian `package.json`, lock o el YAML del workflow, el filtro
`paths: docs/**` **no** dispara el job. Mitigación: Actions → Run
workflow, o un push que toque `docs/**`.

## CNAME + DNS + HTTPS (#1, #3)

1. Commitear `{{DOCS}}/public/CNAME` con una línea: `{{DOMINIO}}`.
2. DNS: CNAME del dominio → `<org>.github.io` (ops del mundo).
3. Settings → Pages → Source = GitHub Actions; Enforce HTTPS.

No hardcodear el dominio de otro mundo en plantillas del skill: usá
`{{DOMINIO}}`.

## Piel fanzine (variables ≠ piel)

- **Piel real** = asset `plantillas/fanzine.css` + `Layout.vue.tpl` +
  `theme-index.js.tpl`. La home publicada lleva clases `stamp` /
  `washi` / `callout` y **no** el shell DefaultTheme
  (`Layout` / `VPNav*`). Ver regla 13 en `SKILL.md`.
- `custom.css.tpl` = **solo tokens opcionales**. Aplicarlo solo sobre
  `DefaultTheme` **no** cumple la piel (defecto recurrente issue #15).
- Tipografía local del sistema (p. ej. Courier); monocromo; sin CDN ni
  `@import` de fuentes web.
- Copia-release con cabecera:

```css
/* Procedencia: copia-release desde {{RUTA_FUENTE_RELATIVA_O_CITA}}
   Fecha: {{FECHA}} · mundo={{MUNDO_ID}} */
```

- CA estructural tras build:
  `node …/verificar-piel-fanzine.mjs --dist {{DOCS}}/.vitepress/dist`
- No meter rutas absolutas de árboles ajenos en la cara pública del skill;
  la cita vive en el CSS del **mundo** consumidor.

## Los 7 frágiles — mitigación de serie

| # | Fallo | Mitigación |
| - | ----- | ---------- |
| 1 | CNAME no commiteado | `docs/public/CNAME` en repo |
| 2 | `base:'/'` sin guard (rompe project-pages / MSYS) | `resolveDocsBase()` + env |
| 3 | DNS hardcodeado en prosa | checklist + `{{DOMINIO}}` |
| 4 | `npm install` en CI | `npm ci` |
| 5 | `dist/` versionado | gitignore `docs/.vitepress/dist/` |
| 6 | spec-gen acoplado a `docs:build` | build = solo VitePress |
| 7 | gap `paths: docs/**` | documentar + `workflow_dispatch` |

## Enlaces al back (DevOps) — B11

El portal vive **en la forja** (GitHub Pages): aprovechar la cercanía para
que el visitante FOSS salte de lo que ve a su back en un clic. Método
(DC-24): **fuente única en config de tema**, no texto por página.

- Declarar **una vez** en `themeConfig` (p. ej. `back` + `backLinks`) con
  placeholders; renderizar vía **footer** y/o **nav** (y `socialLinks` si
  aplica). Nunca un bloque markdown/HTML repetido por página.
- Placeholders canónicos:

  | enlace | destino (parametrizable) |
  | ------ | ------------------------ |
  | Repositorio | `{{REPO}}` |
  | Registry (paquete) | `{{REGISTRY}}` |
  | CI / Actions | `{{REPO}}/actions` |
  | Pages (dominio vivo) | `https://{{DOMINIO}}` |
  | CHANGELOG | `{{REPO}}/blob/{{RAMA}}/CHANGELOG.md` |
  | Contribuir / issues | `{{REPO}}/issues` |

- Enlaces contextuales a **parte tec** (p. ej.
  `{{REPO}}/tree/{{RAMA}}/<ruta>`) se **derivan** de `{{REPO}}` del tema;
  no reintroducen la tabla de infra.
- Página dedicada «Proyecto / DevOps»: prosa del flujo (código → registry
  → CI → Pages); las URLs viven en footer/nav, no duplicadas en el cuerpo.
- No hardcodear estas URLs en el **skill**: placeholders en plantilla; el
  **mundo** las materializa en su `config` de tema.
- Generador que emitía bloques por página: **regenerar** desde la fuente
  única del tema; no parchear página a página.

## Gate de verificación (enlaces + verdad de contenido)

El `ignoreDeadLinks: false` de VitePress solo valida enlaces del
**markdown** fuente — **no** los hrefs que emiten componentes `.vue`
(catálogos, tarjetas, rutas dinámicas), ni externos, ni anclas. Ahí es
donde reaparecen enlaces rotos tras el deploy. Mitigación de serie:
`scripts/verificar-sitio.mjs`, que corre sobre el `dist/` ya construido.

```bash
npm run docs:build
# Preferible si el package.json del mundo define el script:
npm run docs:verificar
# Equivalente directo:
node <skill>/scripts/verificar-sitio.mjs --dist docs/.vitepress/dist --base /
```

- **Falla** (exit ≠ 0) ante enlace **interno** o **ancla** roto.
- **Externos** http(s) → *warning* listado (un 404 transitorio no bloquea
  el deploy).
- **Verdad de contenido** (opcional): si existe
  `docs/verdad-checks.json` (aserciones `{descripcion, patron,
  noDebeAparecer?}`), valida que el HTML generado dice lo que debe (p. ej.
  que la versión mostrada casa con `package.json`). Refuerza C8.

Engancharlo en CI tras `docs:build` (mismo job, antes del upload del
artifact / deploy) — plantilla `docs.yml.tpl` incluye el paso
`npm run docs:verificar` — y tenerlo disponible en local pre-deploy.

## Credenciales de publish por repo

Antes del primer `publish` (tag `v*` → workflow de paquete), el repo
debe tener sembrados los secrets que el workflow declara. Nombres
**EXACTOS** (case-sensitive):

| secret | rol |
| ------ | --- |
| `NPM_USERNAME` | usuario del registry (basic-auth) |
| `NPM_PASSWORD` | `_password` ya en base64 (sin comillas); **no** JWT/`_authToken` |
| `NPM_TOKEN` | **alternativa** solo si el workflow del repo lo espera en lugar del par username/password |

El script generador de la credencial lo declara la calibración del mundo
(placeholder: no vive hardcodeado en este skill).

### Siembra (mini-guía)

**Web:** Settings → Secrets and variables → Actions → New repository
secret → crear `NPM_USERNAME` y `NPM_PASSWORD` (o `NPM_TOKEN` si aplica).

**CLI:**

```bash
gh secret set NPM_USERNAME -R <org>/<repo>
gh secret set NPM_PASSWORD -R <org>/<repo>
# si el workflow espera token:
# gh secret set NPM_TOKEN -R <org>/<repo>
```

Verificación previa al primer tag: `gh secret list -R <org>/<repo>` debe
listar los nombres exigidos (sin revelar valores).

## Checklist de publicación

- [ ] Secrets de publish sembrados (`NPM_USERNAME` + `NPM_PASSWORD`, o
  `NPM_TOKEN` si el workflow lo espera) — ver sección anterior
- [ ] `npm ci` + `docs:build` verdes en local
- [ ] `verificar-sitio.mjs` verde: enlaces internos + anclas resuelven
  (externos = warning); verdad de contenido consistente
- [ ] `verificar-piel-fanzine.mjs` verde: home con stamp/washi/callout
  y sin shell DefaultTheme
- [ ] CNAME presente y equal a dominio vivo
- [ ] Workflow parsea; deploy solo en `main`
- [ ] Ceguera del mundo = 0 en copy pública
- [ ] C8: cada comando de la página ejecutado en su canal
- [ ] DNS + HTTPS (ops) — marcar `<pendiente>` si no verificados
