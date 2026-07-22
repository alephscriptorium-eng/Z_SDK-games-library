# Pack marca parametrizado (BRAND-*)

Marca = **parámetro** del mundo. El skill aporta hooks y plantillas; los
bytes de banner/favicon viven en la cantera / `docs/public/` del
consumidor (copia-release DE-8 con cabecera de procedencia).

## Parámetros

| clave | rol | cableado típico |
| ----- | --- | --------------- |
| `BRAND_BANNER` | imagen de cabecera (derivado web) | path bajo `docs/public/` · Layout |
| `BRAND_FOOTER` | marca / colofón del pie | frontmatter `footer` o default calibrado |
| `BRAND_LICENSE` | ruta de la página de licencia del zine | p. ej. `/licencia` |
| `BRAND_FAVICON` | iconos del head | `favicon.ico` + `favicon.png` + `<link rel="icon">` |

Calibración mínima del mundo (ejemplo de forma):

```text
mundo.brand.banner   = /banner-<slug>-web.png
mundo.brand.footer   = <marca> · <mundo>
mundo.brand.license  = /licencia
mundo.brand.favicon  = /favicon.ico (+ /favicon.png)
```

Plantillas:

- `plantillas/Layout.vue.tpl` — hooks banner / footer / license
- `plantillas/config.mjs.tpl` — `head` con `<link rel="icon">`
- `plantillas/fanzine.css` — estilos `.brand-banner` / `.brand-footer` (DE-8)

## Copia-release DE-8

Todo asset de marca que entre al árbol del consumidor lleva **cabecera
de procedencia** (comentario HTML/CSS o `PROCEDENCIA.md`): origen
(cantera tip / skill), fecha, mundo. No se inventan assets ni hashes.

## Optimización web (CA medible)

Derivados `*-web.png` (y favicon) deben pesar **< 150KB** cada uno.
Verificar por comando — nunca a ojo:

```bash
node skills/site-web/scripts/verificar-pesos-web.mjs --dir docs/public --max-kb 150
```

## ADVERTENCIA · licencia canónica ≠ lore

| pieza | rol | NUNCA |
| ----- | --- | ----- |
| `LICENSE.md` (raíz) | puntero canónico (p. ej. GPL-3.0-or-later + capa AI / composite) | lore / broma editorial |
| página `/licencia` del zine | puede citar lore AIPL como **pieza narrativa** | sustituir el puntero canónico |
| lore AIPL en cantera | solo narrativa del zine | copiarse a `LICENSE.md` |

Regla: **licencia canónica (puntero/composite) ≠ lore AIPL**.
