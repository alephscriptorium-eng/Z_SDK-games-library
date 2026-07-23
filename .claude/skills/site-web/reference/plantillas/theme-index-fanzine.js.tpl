// Procedencia: plantilla skill site-web · theme entry fanzine (OPT-IN)
// Fecha: {{FECHA}} · mundo={{MUNDO_ID}}
// Piel = fanzine.css + Layout.vue. Declarar piel: fanzine en frontmatter.
// DEFAULT del skill = familia-vp (theme-index-familia-vp.js.tpl).
import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'
import './fanzine.css'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout
}
