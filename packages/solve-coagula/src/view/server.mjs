#!/usr/bin/env node
/**
 * Servidor de vista solve-coagula: express + dramaturgia + view-kit widgets.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { srcDir as viewKitSrcDir } from '@zeus/view-kit/node';
import { loadZeusEnv } from '@zeus/presets-sdk/env';
import { GAME_ID, SOLVE_SCENE } from '../contract.mjs';
import { resolveSolveEndpoints } from '../endpoints.mjs';
import { loadSolveMaterials } from '../materials.mjs';
import { tryLoadSolveStartPack, applyStartPackEnv } from '../startpack.mjs';
import { renderSolveView } from './render.mjs';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

loadZeusEnv();

/**
 * @param {object} [options]
 */
export async function createSolveViewServer(options = {}) {
  const pack = await tryLoadSolveStartPack();
  if (pack) applyStartPackEnv(pack);
  const materials = loadSolveMaterials({
    volumesRoot: pack?.volumesRoot || process.env.ZEUS_VOLUMES_ROOT || null,
    storyBoardPath: pack?.storyBoardPath || null
  });

  const endpoints = resolveSolveEndpoints();
  const port = options.port ?? endpoints.viewPort;
  const host = options.host ?? endpoints.host;
  const token = process.env.ZEUS_SCRIPTORIUM_SECRET || 'dev-secret';

  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use('/assets', express.static(path.join(packageDir, 'assets')));
  app.use('/dramaturgia', express.static(path.join(packageDir, 'dramaturgia')));
  app.use('/view-kit', express.static(viewKitSrcDir));

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'solve-view',
      game: GAME_ID,
      acts: materials.acts.length,
      linea: materials.linea?.registro_count ?? null,
      widgets: Object.keys(materials.widgetData || {}),
      timestamp: new Date().toISOString()
    });
  });

  app.get(['/', '/views/solve-coagula', '/views/solve'], (req, res) => {
    const actor = req.query.actor ? String(req.query.actor) : 'view-solve';
    const html = renderSolveView(
      {
        scriptoriumUrl: endpoints.scriptoriumBrowserUrl,
        room: endpoints.room,
        sessionId: 'solve-coagula',
        token,
        actor,
        game: GAME_ID
      },
      {
        title: SOLVE_SCENE.title,
        acts: materials.acts,
        linea: materials.linea,
        widgetData: materials.widgetData
      }
    );
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  });

  const server = await new Promise((resolve, reject) => {
    const s = app.listen(port, host, () => resolve(s));
    s.on('error', reject);
  });

  console.log(
    `[solve-view] http://${host}:${port}/views/solve-coagula · room=${endpoints.room}`
  );

  return {
    app,
    server,
    port,
    host,
    materials,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      })
  };
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  await createSolveViewServer();
}
