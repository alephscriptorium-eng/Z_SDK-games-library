/**
 * WP-U113 — materials + vista HTML montan panel-elenco (no solo prompt).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadSolveMaterials } from '../src/materials.mjs';
import { renderSolveView } from '../src/view/render.mjs';

describe('solve-coagula widgets (U113)', () => {
  it('loadSolveMaterials carga fixture panel-elenco', () => {
    const m = loadSolveMaterials();
    assert.ok(m.widgetData['panel-elenco'], 'falta widgetData.panel-elenco');
    assert.ok(Array.isArray(m.widgetData['panel-elenco'].rows));
    assert.ok(m.widgetData['panel-elenco'].rows.length >= 1);
    const act0 = m.acts.find((a) => a.id === 'act-0');
    assert.ok(act0?.widgets?.includes('panel-elenco'));
  });

  it('renderSolveView embebe mount + data-widget-id panel-elenco en payload', () => {
    const m = loadSolveMaterials();
    const html = renderSolveView(
      {
        room: 'test-room',
        scriptoriumUrl: 'http://127.0.0.1:9',
        token: 't',
        actor: 'view-test',
        game: 'solve-coagula'
      },
      {
        title: 'SOLVE test',
        acts: m.acts,
        linea: m.linea,
        widgetData: m.widgetData
      }
    );

    assert.match(html, /id="widgets-mount"/);
    assert.match(html, /@zeus\/view-kit/);
    assert.match(html, /id="solve-materials"/);
    assert.match(html, /panel-elenco/);
    assert.match(html, /SolveCoagula/);
    assert.match(html, /class="widgets runtime"/);
    // ya no solo lista el nombre como único rastro del widget con runtime
    assert.ok(html.includes('"focusWidgets"'));
  });
});
