/**
 * Tools MCP de solve-coagula: join, open_act, consult_linea, state.
 */

import fs from 'node:fs';
import { z } from 'zod';
import { jsonContent } from '@zeus/presets-sdk/mcp';
import {
  confirmIntent,
  buildStandardPlayerResources,
  fail
} from '@zeus/player-mcp-kit';
import { listCasoIds } from '@zeus/playbook-kit';
import { GAME_ID, SOLVE_SCENE } from '../contract.mjs';
import { CASOS_PATH } from './config.mjs';

function compactActor(state, actorId) {
  const a = state?.actors?.[actorId];
  if (!a) return null;
  return { id: a.id, nodeId: a.nodeId, kind: a.kind };
}

function summarizeState(state, actorId) {
  if (!state) return { ok: false, error: 'sin_estado' };
  return {
    ok: true,
    evidencia: {
      actor: compactActor(state, actorId),
      currentActId: state.currentActId,
      currentAct: state.currentAct,
      linea: state.linea,
      lastConsult: state.lastConsult,
      sceneId: state.sceneId,
      actors: Object.keys(state.actors || {})
    }
  };
}

function readCasosMarkdown() {
  return fs.readFileSync(CASOS_PATH, 'utf8');
}

function explainOpenAct(state, actorId, actId) {
  if (!state?.actors?.[actorId]) return { ok: false, error: 'actor_desconocido' };
  if (!actId) return { ok: false, error: 'act_requerido' };
  const found = (state.acts || []).some((a) => a.id === actId);
  if (!found) return { ok: false, error: 'act_desconocido' };
  return { ok: true, error: null };
}

function explainConsult(state, actorId) {
  if (!state?.actors?.[actorId]) return { ok: false, error: 'actor_desconocido' };
  if (!state.linea) return { ok: false, error: 'linea_ausente' };
  return { ok: true, error: null };
}

/**
 * @param {object} server
 * @param {object} bridge
 * @param {object} cfg
 */
export function buildMcp(server, bridge, cfg) {
  const actor = bridge.actor;

  server.registerTool(
    'player_join',
    {
      title: `Unir al actor "${actor}" a SOLVE ET COAGULA`,
      description: `Emite intent join como "${actor}". Idempotente.`,
      inputSchema: { timeoutMs: z.number().optional() }
    },
    async ({ timeoutMs }) =>
      jsonContent(
        await confirmIntent(bridge, cfg, {
          intent: 'join',
          args: { kind: 'player' },
          timeoutMs,
          done: (state) => state.actors?.[actor] ?? null,
          evidence: (state) => ({ actor: compactActor(state, actor) })
        })
      )
  );

  server.registerTool(
    'player_state',
    {
      title: `Snapshot de "${actor}"`,
      description: 'Acto actual, linea y actores. Solo lectura.',
      inputSchema: {}
    },
    async () => jsonContent(summarizeState(bridge.lastState(), actor))
  );

  server.registerTool(
    'player_open_act',
    {
      title: 'Abrir acto del story-board',
      description: 'Abre act-0…act-7; asiento ledger open_act.',
      inputSchema: {
        actId: z.string().min(1).describe('p.ej. act-0'),
        timeoutMs: z.number().optional()
      }
    },
    async ({ actId, timeoutMs }) => {
      if (!bridge.myActor()) {
        return jsonContent(fail('actor_desconocido', { nota: 'llama antes a player_join' }));
      }
      const before = bridge.lastState()?.currentActId;
      return jsonContent(
        await confirmIntent(bridge, cfg, {
          intent: 'open_act',
          args: { actId },
          timeoutMs,
          done: (state) =>
            state.currentActId === actId && state.actors?.[actor]?.nodeId === `act:${actId}`
              ? state.currentAct
              : null,
          unchanged: (state) => state.currentActId === before,
          evidence: (state, act) => ({
            act: act ?? state.currentAct,
            actor: compactActor(state, actor)
          }),
          explain: (state) => explainOpenAct(state, actor, actId),
          timeoutHint: '¿actId válido (act-0…act-7)?'
        })
      );
    }
  );

  server.registerTool(
    'player_consult_linea',
    {
      title: 'Consultar linea-aleph',
      description: 'Lee meta del corpus (fixture o montaje). Ledger consult_linea.',
      inputSchema: { timeoutMs: z.number().optional() }
    },
    async ({ timeoutMs }) => {
      if (!bridge.myActor()) {
        return jsonContent(fail('actor_desconocido', { nota: 'llama antes a player_join' }));
      }
      const beforeTs = bridge.lastState()?.lastConsult?.at ?? 0;
      return jsonContent(
        await confirmIntent(bridge, cfg, {
          intent: 'consult_linea',
          args: {},
          timeoutMs,
          done: (state) => {
            const c = state.lastConsult;
            if (!c || c.actorId !== actor) return null;
            if ((c.at ?? 0) <= beforeTs) return null;
            return c;
          },
          unchanged: (state) => (state.lastConsult?.at ?? 0) <= beforeTs,
          evidence: (state, consult) => ({
            consult: consult ?? state.lastConsult,
            linea: state.linea,
            actor: compactActor(state, actor)
          }),
          explain: (state) => explainConsult(state, actor),
          timeoutHint: '¿start pack / fixture linea montado?'
        })
      );
    }
  );
}

export function getResourceRegistry(bridge) {
  return buildStandardPlayerResources({
    game: GAME_ID,
    bridge,
    readPlayerState: () => summarizeState(bridge.lastState(), bridge.actor),
    readScene: () => ({
      scene: SOLVE_SCENE,
      live: bridge.lastState()
        ? {
            currentActId: bridge.lastState().currentActId,
            linea: bridge.lastState().linea,
            actors: bridge.lastState().actors
          }
        : null
    }),
    readCasos: () => {
      const markdown = readCasosMarkdown();
      return { markdown, ids: listCasoIds(markdown) };
    }
  });
}

export function getPromptRegistry() {
  return [];
}

export function buildCardExamples(bridge) {
  return {
    actor: bridge.actor,
    tools: ['player_join', 'player_open_act', 'player_consult_linea', 'player_state']
  };
}
