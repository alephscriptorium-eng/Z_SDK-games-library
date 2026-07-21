/**
 * CA: rabbit→horse tools/call crear_linea (Z04 cadena) — wire + approve evidence.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { runLineaEditorSliceSmoke } from '../fixtures/linea-editor-slice-smoke.mjs';

test('linea-editor slice smoke: rabbit→horse tools/call gated refs', async () => {
  const result = await runLineaEditorSliceSmoke();
  assert.equal(result.ok, true);
  assert.equal(result.tool, 'crear_linea');
  assert.equal(result.approve_evidenced, 'APROBAR');
  assert.equal(result.refs.preset, 'preset://linea-editor');
  assert.match(result.refs.linea, /^linea:\/\//);
  assert.equal(result.horseMode, 'horse');
});
