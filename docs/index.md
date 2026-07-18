---
layout: home
hero:
  name: Zeus Games
  text: Catálogo de la library
  tagline: |-
    Juegos FOSS que consumen el Zeus SDK — mismo contrato, cero dialectos en el engine.
    delta y pozo son el mínimo de la regla de los dos juegos.
    Start packs + actas Notario + specs viven aquí.
  actions:
    - theme: brand
      text: Releases
      link: /releases
    - theme: alt
      text: Start packs
      link: /startpacks
    - theme: alt
      text: Repo
      link: https://github.com/alephscriptorium-eng/Z_SDK-games-library
features:
  - title: delta
    details: ARG multijugador (Riada / Cantera). Demo npm run demo:arg · startpack publicado.
    link: /games/delta
  - title: pozo
    details: Segundo juego mínimo. Demo npm run demo:pozo · startpack publicado.
    link: /games/pozo
  - title: Futuros
    details: SOLVE ET COAGULA y otros títulos del mundo A — sin inventar releases.
    link: /games/futuros
---

## Cómo usar este catálogo

1. Elegí un **card** (delta / pozo / futuros) → descripción, arranque y enlace a spec.
2. Mirá **[Releases](/releases)** → mecanismo + verdad viva en GitHub Releases (`@zeus/startpack-<game>`, acta, tarball).
3. Engine / mesh / editor viven en el monorepo hermano
   [`Z_SDK`](https://github.com/alephscriptorium-eng/Z_SDK)
   (portal docs: `z-sdk.escrivivir.co`).

Clone limpio:

```bash
git clone https://github.com/alephscriptorium-eng/Z_SDK-games-library.git
cd Z_SDK-games-library
npm install
npm test
```

Hasta publish real de `@zeus/*`, `npm install` usa el **modo provisional**
`file:` → `.deps/zeus-sdk` (ver [delta · modo provisional](/games/delta#modo-provisional-file-deps)).
