/**
 * Vista HTML lectora de SOLVE ET COAGULA (story-board + linea; sin 3D).
 */

/**
 * @param {{ room: string, scriptoriumUrl: string, token: string, actor: string, game: string }} viewerConfig
 * @param {{ acts?: object[], linea?: object|null, title?: string }} materials
 */
export function renderSolveView(viewerConfig, materials = {}) {
  const acts = Array.isArray(materials.acts) ? materials.acts : [];
  const linea = materials.linea || null;
  const title = materials.title || 'SOLVE ET COAGULA';

  const actList = acts
    .map(
      (a) =>
        `<li><strong>${escapeHtml(a.id)}</strong> — ${escapeHtml(a.title || '')}` +
        (a.widgets?.length
          ? ` <span class="widgets">${escapeHtml(a.widgets.join(', '))}</span>`
          : '') +
        `</li>`
    )
    .join('\n');

  const lineaBlock = linea
    ? `<p class="linea"><span class="k">linea</span> ${escapeHtml(linea.title || '')}` +
      ` · registros=${escapeHtml(String(linea.registro_count ?? '—'))}` +
      (linea.fixture ? ' · <em>fixture</em>' : '') +
      `</p>`
    : `<p class="linea miss">linea ausente</p>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} · vista</title>
  <link rel="stylesheet" href="/assets/css/solve.css" />
</head>
<body>
  <main class="solve-page">
    <header>
      <h1>🜃 ${escapeHtml(title)}</h1>
      <p class="sub">tercer juego · mundo A · dramaturgia + linea-aleph</p>
    </header>
    <section class="hud">
      <ul>
        <li><span class="k">room</span> <span id="hud-room">${escapeHtml(viewerConfig.room)}</span></li>
        <li><span class="k">actor</span> <span id="hud-actor">${escapeHtml(viewerConfig.actor)}</span></li>
        <li><span class="k">act</span> <span id="hud-act">—</span></li>
        <li><span class="k">actors</span> <span id="hud-actors">0</span></li>
      </ul>
      ${lineaBlock}
      <p class="note">Abrir acto / consultar línea vía MCP (<code>player_open_act</code>, <code>player_consult_linea</code>)</p>
    </section>
    <section class="acts">
      <h2>Story-board</h2>
      <ol>${actList}</ol>
    </section>
  </main>
  <script type="application/json" id="viewer-config">${JSON.stringify(viewerConfig)}</script>
  <script type="module" src="/assets/js/solve-main.mjs"></script>
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
