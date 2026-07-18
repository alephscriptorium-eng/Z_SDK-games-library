import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveFeeds } from '@zeus/arg-domain';
import { probeMcpHealth } from '../src/index.mjs';
import { resolveRuntimeFeeds } from '../src/resolve.mjs';

test('probeMcpHealth: false when ports unreachable', async () => {
  const ok = await probeMcpHealth(
    { firehose: { disk: 59998 }, lineas: { espana: 59999, wpHistoria: 59997 } },
    { timeoutMs: 300 }
  );
  assert.equal(ok, false);
});

test('resolveRuntimeFeeds synthetic passthrough', async () => {
  const feeds = await resolveRuntimeFeeds({ mode: 'synthetic', seed: 3 });
  assert.equal(feeds.mode, 'synthetic');
  assert.equal(feeds.firehose.kind, 'synthetic');
  const [drop] = feeds.firehose.nextDroplets(1);
  assert.match(drop.uri, /firehose:\/\/synthetic\//);
});

test('resolveRuntimeFeeds auto degrades without MCP', async () => {
  const warnings = [];
  const feeds = await resolveRuntimeFeeds({
    mode: 'auto',
    seed: 2,
    mcpPorts: { firehose: { disk: 59996 }, lineas: { espana: 59995, wpHistoria: 59994 } },
    logger: { warn: (msg) => warnings.push(msg) }
  });
  assert.equal(feeds.mode, 'synthetic');
  assert.ok(warnings.some((w) => /sintético/i.test(w)));
});

test('resolveFeeds real still throws (use arg-feeds)', () => {
  assert.throws(() => resolveFeeds({ mode: 'real' }), /arg-feeds/);
});
