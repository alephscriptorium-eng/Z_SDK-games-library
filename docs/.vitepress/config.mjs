import { defineConfig } from 'vitepress';

/**
 * Catálogo público Z_SDK-games-library (WP-U107 / D-23).
 * base Pages (custom domain games.z-sdk.escrivivir.co): `/` también en Actions.
 * Local / docs:dev: `/`. Override opcional ZEUS_DOCS_BASE (sin slash
 * inicial: Git Bash/MSYS reescribe rutas tipo `/foo/`).
 */
function resolveDocsBase() {
  const raw = process.env.ZEUS_DOCS_BASE?.trim();
  if (raw) {
    // MSYS path conversion → `C:/Program Files/Git/...` — no es un base válido
    if (/^[A-Za-z]:[\\/]/.test(raw)) return '/';
    const cleaned = raw.replace(/^\/+|\/+$/g, '');
    return cleaned ? `/${cleaned}/` : '/';
  }
  return '/';
}

export default defineConfig({
  title: 'Zeus Games Library',
  description:
    'Catálogo FOSS de juegos Zeus (delta, pozo) — start packs, specs y cómo jugar',
  lang: 'es',
  base: resolveDocsBase(),
  cleanUrls: true,
  ignoreDeadLinks: false,
  themeConfig: {
    nav: [
      { text: 'Catálogo', link: '/' },
      { text: 'Releases', link: '/releases' },
      { text: 'Start packs', link: '/startpacks' },
      {
        text: 'Juegos',
        items: [
          { text: 'ciudad', link: '/games/ciudad' },
          { text: 'delta', link: '/games/delta' },
          { text: 'pozo', link: '/games/pozo' },
          { text: 'SOLVE ET COAGULA', link: '/games/solve-coagula' },
          { text: 'Futuros', link: '/games/futuros' }
        ]
      }
    ],
    sidebar: [
      {
        text: 'Catálogo',
        items: [
          { text: 'Portada', link: '/' },
          { text: 'Releases', link: '/releases' },
          { text: 'Start packs', link: '/startpacks' },
          { text: 'Publicar la web', link: '/publicar-la-web' }
        ]
      },
      {
        text: 'Juegos',
        items: [
          { text: 'ciudad', link: '/games/ciudad' },
          { text: 'delta (ARG)', link: '/games/delta' },
          { text: 'pozo', link: '/games/pozo' },
          { text: 'SOLVE ET COAGULA', link: '/games/solve-coagula' },
          { text: 'Futuros', link: '/games/futuros' }
        ]
      }
    ],
    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/alephscriptorium-eng/Z_SDK-games-library'
      }
    ],
    outline: { level: [2, 3] },
    search: { provider: 'local' },
    footer: {
      message: 'Animus Iocandi AIPLv1 · hermano de Zeus SDK',
      copyright: 'Scriptorium · Z_SDK-games-library'
    }
  }
});
