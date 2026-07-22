// Procedencia: plantilla skill site-web · theme entry fanzine
// Fecha: {{FECHA}} · mundo={{MUNDO_ID}}
// Piel = fanzine.css + Layout.vue. custom.css = tokens opcionales (≠ piel).
import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'
import './fanzine.css'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout
}
