---
layout: home
hero:
  name: Juegos Z_SDK
  text: Ciudad
  tagline: |-
    Juego insignia del catálogo — barrios vivos, tres jugadores, agentes con peercard.
  actions:
    - theme: brand
      text: Ficha ciudad
      link: /games/ciudad
    - theme: alt
      text: Instalar startpack
      link: /startpacks
    - theme: alt
      text: Releases
      link: /releases
features:
  - title: La Ciudad · ciudad
    details: 'Juego insignia: estados vivos, loop decay/objetivo, misiones, cronista y campanas. MCP + peercard — ningún jugador privilegiado. Start pack publicado startpack-ciudad-v0.1.0.'
    link: /games/ciudad
  - title: El Común · delta
    details: 'Mini-juego de construcción de ventana de contexto colaborativa. Cachear, curar, marcar hitos, etiquetar... Demo npm run demo:arg · start pack publicado.'
    link: /games/delta
  - title: El Aljibe · pozo
    details: 'Mini-juego de análisis y curación de datos. Demo npm run demo:pozo · start pack publicado.'
    link: /games/pozo
  - title: SOLVE ET COAGULA
    details: 'Tablero ARG de correlación de fuerzas y diseño de líneas de demarcación. Demo npm run demo:solve-coagula · start pack publicado.'
    link: /games/solve-coagula
  - title: call4makers
    details: 'Catálogo abierto: start packs, specs y cauces de contribución esperan makers — dramaturgia, código, datos, traducción.'
    link: /games/futuros
---

## Cómo usar este catálogo

1. Empezá por **[ciudad](/games/ciudad)** (insignia) o elegí otro **card** →
   descripción, arranque y enlace a spec.
2. Mirá **[Releases](/releases)** → mecanismo + verdad viva en GitHub Releases
   (`@zeus/startpack-<game>`, acta, tarball).
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

`npm install` resuelve `@zeus/*` desde el registry propio (D-7). Para demos/e2e
que spawnean mesh no publicado, enlazá el monorepo hermano
(`npm run setup:zeus-sdk` / `ZEUS_SDK_ROOT` / sibling `../zeus-sdk`) — ver
[delta · mesh local](/games/delta#mesh-local-fallback-dev).
