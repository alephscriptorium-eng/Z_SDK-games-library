// Procedencia: plantilla skill site-web · theme entry fanzine
// Fecha: 2026-07-22 · mundo=nexo-atlas
// Piel = fanzine.css + Layout.vue. custom.css = tokens opcionales (≠ piel).
import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'
import './fanzine.css'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout
}
