/**
 * Construye el viewer-config que el shell inyecta en #viewer-config.
 *
 * Resolución de room (patrón 3d-monitor, adaptado al ARG):
 *   ?room= (explícito) → ZEUS_ARG_ROOM (env) → DEFAULT_ARG_ROOM ('ARG_DELTA').
 *
 * Además del wiring de room lleva `actor` (query `?actor=`) para la vista
 * jugador — la identidad encarnada viaja en el mismo JSON inyectado.
 * WP-U89: `webrtcViewerUrl` desde presets-sdk (botones llamar/compartir/colgar).
 */

import { DEFAULT_ARG_ROOM } from '@zeus/arg-domain';
import { resolveZeusUiPorts, DEFAULT_ZEUS_UI_MESH } from '@zeus/presets-sdk/env';
import { getConfig } from './config.mjs';

/**
 * @param {object} [opts]
 * @param {string} [opts.room]      override explícito (`?room=`) — siempre gana
 * @param {string} [opts.actor]     id de actor encarnado (`?actor=`)
 * @param {string} [opts.sessionId]
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{ scriptoriumUrl: string, room: string, sessionId: string, token: string, actor: string|null, startPack: string[], webrtcViewerUrl: string, browsers: { cache: string, firehose: string } }}
 */
export function resolveViewerConfig(opts = {}, env = process.env) {
  const scr = getConfig().scriptorium;
  const host = env.ZEUS_HOST || 'localhost';
  const ui = resolveZeusUiPorts();
  const startPackRaw = env.ZEUS_ARG_START_PACK || 'aleph-tronco-puro,aleph-firehose-browse';
  const startPack = startPackRaw.split(',').map((s) => s.trim()).filter(Boolean);
  const webrtc = ui.webrtcViewer || DEFAULT_ZEUS_UI_MESH.webrtcViewer;
  return {
    scriptoriumUrl: `http://${scr.host}:${scr.port}${scr.path}`,
    room: opts.room || env.ZEUS_ARG_ROOM || DEFAULT_ARG_ROOM,
    sessionId: opts.sessionId || 'arg',
    token: scr.secret,
    actor: opts.actor ?? null,
    startPack,
    webrtcViewerUrl: `http://${webrtc.host || host}:${webrtc.port}`,
    browsers: {
      cache: `http://${host}:${ui.view.port}`,
      firehose: `http://${host}:${ui.firehose.port}`
    }
  };
}
