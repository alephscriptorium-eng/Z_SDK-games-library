/**
 * Vista HTML lectora de SOLVE ET COAGULA (story-board + widgets view-kit).
 */

/**
 * @param {{ room: string, scriptoriumUrl: string, token: string, actor: string, game: string }} viewerConfig
 * @param {{ acts?: object[], linea?: object|null, title?: string, widgetData?: Record<string, object> }} materials
 */
export function renderSolveView(viewerConfig, materials = {}) {
  const acts = Array.isArray(materials.acts) ? materials.acts : [];
  const linea = materials.linea || null;
  const title = materials.title || 'SOLVE ET COAGULA';
  const widgetData = materials.widgetData || {};

  const actList = acts
    .map((a) => {
      const runtimeIds = (a.widgets || []).filter((id) => widgetData[id]);
      const pending = (a.widgets || []).filter((id) => !widgetData[id]);
      const runtimeNote = runtimeIds.length
        ? ` <span class="widgets runtime">${escapeHtml(runtimeIds.join(', '))}</span>`
        : '';
      const pendingNote = pending.length
        ? ` <span class="widgets pending">${escapeHtml(pending.join(', '))}</span>`
        : '';
      return (
        `<li data-act-id="${escapeHtml(a.id)}"><strong>${escapeHtml(a.id)}</strong> — ${escapeHtml(a.title || '')}` +
        runtimeNote +
        pendingNote +
        `</li>`
      );
    })
    .join('\n');

  const lineaBlock = linea
    ? `<p class="linea"><span class="k">linea</span> ${escapeHtml(linea.title || '')}` +
      ` · registros=${escapeHtml(String(linea.registro_count ?? '—'))}` +
      (linea.fixture ? ' · <em>fixture</em>' : '') +
      `</p>`
    : `<p class="linea miss">linea ausente</p>`;

  // Widgets del primer acto que tenga al menos uno con payload (demo CA).
  const focusAct =
    acts.find((a) => (a.widgets || []).some((id) => widgetData[id])) ||
    acts[0] ||
    null;
  const focusWidgets = focusAct?.widgets || [];

  const importMap = {
    imports: {
      '@zeus/view-kit': '/view-kit/index.mjs',
      '@zeus/view-kit/': '/view-kit/'
    }
  };

  const materialsPayload = {
    acts,
    widgetData,
    focusActId: focusAct?.id || null,
    focusWidgets
  };

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} · vista</title>
  <link rel="stylesheet" href="/assets/css/solve.css" />
  <script type="importmap">${JSON.stringify(importMap)}</script>
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
        <li><span class="k">act</span> <span id="hud-act">${escapeHtml(focusAct?.id || '—')}</span></li>
        <li><span class="k">actors</span> <span id="hud-actors">0</span></li>
      </ul>
      ${lineaBlock}
      <p class="note">Abrir acto / consultar línea vía MCP (<code>player_open_act</code>, <code>player_consult_linea</code>)</p>
    </section>
    <section class="acts">
      <h2>Story-board</h2>
      <ol>${actList}</ol>
    </section>
    <section class="widgets-host" id="widgets-host" aria-live="polite">
      <h2>Widgets</h2>
      <div id="widgets-mount"></div>
    </section>
  </main>
  <script type="application/json" id="viewer-config">${JSON.stringify(viewerConfig)}</script>
  <script type="application/json" id="solve-materials">${JSON.stringify(materialsPayload)}</script>
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
