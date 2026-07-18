/**
 * Vista HTML mínima de pozo (sin app-shell; import-map + view-kit).
 */

/**
 * @param {{ room: string, scriptoriumUrl: string, token: string, actor: string, game: string }} viewerConfig
 */
export function renderPozoView(viewerConfig) {
  const importMap = {
    imports: {
      three: '/vendor/three/build/three.module.js',
      'three/addons/': '/vendor/three/examples/jsm/',
      'socket.io-client': '/vendor/socket.io/socket.io.esm.min.js',
      '@zeus/ui-3d-kit': '/kit/index.mjs',
      '@zeus/ui-3d-kit/': '/kit/',
      '@zeus/view-kit': '/view-kit/index.mjs',
      '@zeus/view-kit/': '/view-kit/'
    }
  };

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>pozo · vista</title>
  <link rel="stylesheet" href="/assets/css/pozo.css" />
</head>
<body>
  <main class="pozo-page">
    <div id="viewer-stage" class="viewer-stage">
      <canvas id="viewer-canvas"></canvas>
      <aside id="viewer-hud" class="viewer-hud">
        <h1 class="hud-title">🫧 pozo</h1>
        <ul class="hud-list">
          <li><span class="hud-key">conn</span> <span id="hud-conn" class="hud-val">…</span></li>
          <li><span class="hud-key">room</span> <span id="hud-room" class="hud-val">${escapeHtml(viewerConfig.room)}</span></li>
          <li><span class="hud-key">well</span> <span id="hud-well" class="hud-val">—</span></li>
          <li><span class="hud-key">drop</span> <span id="hud-drop" class="hud-val">—</span></li>
          <li><span class="hud-key">actors</span> <span id="hud-actors" class="hud-val">0</span></li>
          <li><span class="hud-key">feed</span> <span id="hud-feed" class="hud-val">—</span></li>
        </ul>
        <p class="hud-note">Sacar gota vía MCP <code>player_draw_drop</code></p>
      </aside>
    </div>
  </main>
  <script type="importmap">${JSON.stringify(importMap)}</script>
  <script type="application/json" id="viewer-config">${JSON.stringify(viewerConfig)}</script>
  <script type="module" src="/assets/js/pozo-main.mjs"></script>
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
