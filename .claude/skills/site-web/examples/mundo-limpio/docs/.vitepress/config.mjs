import { defineConfig } from 'vitepress';

function resolveDocsBase() {
  const raw = process.env.DOCS_BASE?.trim();
  if (raw) {
    if (/^[A-Za-z]:[\\/]/.test(raw)) return '/';
    const cleaned = raw.replace(/^\/+|\/+$/g, '');
    return cleaned ? `/${cleaned}/` : '/';
  }
  return '/';
}

export default defineConfig({
  title: 'Nexo Atlas',
  description: 'Catálogo FOSS de mapas de ruta verificable (ejemplo)',
  lang: 'es',
  base: resolveDocsBase(),
  cleanUrls: true,
  // BRAND_FAVICON — fixture: paths declarados (sin inventar bytes de icono)
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico', sizes: 'any' }],
    ['link', { rel: 'icon', type: 'image/png', href: '/favicon.png' }]
  ],
  themeConfig: {
    nav: [{ text: 'Portada', link: '/' }],
    sidebar: [{ text: 'Nexo Atlas', items: [{ text: 'Portada', link: '/' }] }]
  }
});
