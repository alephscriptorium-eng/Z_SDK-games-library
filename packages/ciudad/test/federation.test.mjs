/**
 * Federación Z04: mock CP + caso C-03 en playbook + smoke in-process (eje IV).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMockControlPlane } from '../fixtures/federation/mock-control-plane.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CASOS = path.join(ROOT, 'spec', 'CASOS.md');
const SMOKE = path.join(ROOT, 'fixtures', 'federation-smoke.mjs');

describe('ciudad federación r/s/h (Z04)', () => {
  it('CASOS.md declara C-03 federación', () => {
    const md = fs.readFileSync(CASOS, 'utf8');
    assert.match(md, /## C-03 — federación/);
    assert.match(md, /rnfp_inactive_distrito_bloqueado/);
    assert.match(md, /horseMode:"horse"/);
    assert.match(md, /GET \/actor-registry/);
  });

  it('mock control-plane: bots + RNFP active + registry', async () => {
    const plane = createMockControlPlane({ port: 0 });
    const { url } = await plane.listen();
    const cp = plane.client(url);

    const rabbit = await cp.startBot('rabbit', 'R1', 'ext-rabbit');
    assert.equal(rabbit.status, 200);
    assert.equal(rabbit.data.bot.rnfp, 'idle');

    const spider = await cp.startBot('spider', 'R1');
    assert.equal(spider.data.bot.role, 'spider');

    const before = await cp.getActor(spider.data.bot.peerId);
    assert.equal(before.data.rnfp, 'idle');

    const act = await cp.activateRnfp(spider.data.bot.peerId, 'rnfp.distrito');
    assert.equal(act.data.ok, true);
    assert.equal(act.data.rnfp, 'active');

    const reg = await cp.actorRegistry();
    assert.ok(reg.data.peers.some((p) => p.rnfp === 'active'));
    const peers = await cp.listPeers();
    assert.ok(peers.data.peers.length >= 2);

    await plane.close();
    assert.ok(url.startsWith('http://'));
  });

  it('federation-smoke in-process (eje IV, sin aleph)', async () => {
    const result = await new Promise((resolve) => {
      const child = spawn(process.execPath, [SMOKE], {
        cwd: ROOT,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      let out = '';
      let err = '';
      child.stdout.on('data', (c) => {
        out += c;
      });
      child.stderr.on('data', (c) => {
        err += c;
      });
      child.on('close', (code) => resolve({ code, out, err }));
    });
    assert.equal(result.code, 0, result.err || result.out);
    assert.match(result.out, /FEDERATION_SMOKE_OK/);
    assert.match(result.out, /horseMode: 'horse'|horseMode":"horse"/);
  });
});
