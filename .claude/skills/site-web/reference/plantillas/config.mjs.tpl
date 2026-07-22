import { defineConfig } from 'vitepress';

/**
 * Plantilla skill site-web.
 * Sustituir {{TITLE}} {{DESC}} {{BASE_ENV}}.
 * Guard MSYS = frágil #2.
 */
function resolveDocsBase() {
  const raw = process.env.{{BASE_ENV}}?.trim();
  if (raw) {
    if (/^[A-Za-z]:[\\/]/.test(raw)) return '/';
    const cleaned = raw.replace(/^\/+|\/+$/g, '');
    return cleaned ? `/${cleaned}/` : '/';
  }
  return '/';
}

/** Fuente única de back-links (B11 / DC-24). Placeholders → mundo. */
const BACK = {
  repo: '{{REPO}}',
  registry: '{{REGISTRY}}',
  actions: '{{REPO}}/actions',
  pages: 'https://{{DOMINIO}}',
  changelog: '{{REPO}}/blob/{{RAMA}}/CHANGELOG.md',
  issues: '{{REPO}}/issues'
};

const backLinks = [
  { text: 'Repositorio', link: BACK.repo },
  { text: 'Registry', link: BACK.registry },
  { text: 'CI / Actions', link: BACK.actions },
  { text: 'Pages', link: BACK.pages },
  { text: 'CHANGELOG', link: BACK.changelog },
  { text: 'Issues', link: BACK.issues }
];

export default defineConfig({
  title: '{{TITLE}}',
  description: '{{DESC}}',
  lang: 'es',
  base: resolveDocsBase(),
  cleanUrls: true,
  ignoreDeadLinks: false,
  // BRAND_FAVICON — paths bajo docs/public/ (pack-marca.md)
  head: [
    ['link', { rel: 'icon', href: '{{BRAND_FAVICON_ICO}}', sizes: 'any' }],
    ['link', { rel: 'icon', type: 'image/png', href: '{{BRAND_FAVICON_PNG}}' }]
  ],
  themeConfig: {
    // B11: back-links = config de tema (footer/nav), no texto por página
    back: BACK,
    backLinks,
    nav: [
      { text: 'Portada', link: '/' },
      { text: 'Proyecto', link: '/proyecto' },
      { text: 'Repo', link: BACK.repo }
    ],
    sidebar: [
      {
        text: '{{TITLE}}',
        items: [{ text: 'Portada', link: '/' }]
      }
    ],
    socialLinks: [{ icon: 'github', link: BACK.repo }],
    outline: { level: [2, 3] },
    search: { provider: 'local' },
    footer: {
      // VPFooter hace v-html de message → enlaces desde la misma fuente
      message: backLinks
        .map(
          (l) =>
            `<a href="${l.link}" target="_blank" rel="noreferrer">${l.text}</a>`
        )
        .join('<span aria-hidden="true"> · </span>'),
      copyright: '{{TITLE}}'
    }
  }
});
