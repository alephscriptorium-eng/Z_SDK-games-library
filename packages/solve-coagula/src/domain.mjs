/**
 * solve-coagula — dominio puro (sin red, sin fs, sin Date.now escondido).
 * Intents: join · open_act · consult_linea.
 */

import { INTENTS, SOLVE_SCENE, validateIntent } from './contract.mjs';

/**
 * @param {{
 *   now?: () => number,
 *   acts?: Array<{ id: string, title?: string, blockchain?: number, widgets?: string[], status?: string }>,
 *   linea?: { title?: string, corpus?: string, registro_count?: number, fixture?: boolean } | null
 * }} [opts]
 */
export function createSolveDomainState(opts = {}) {
  const clock = typeof opts.now === 'function' ? opts.now : () => Date.now();
  const acts = Array.isArray(opts.acts) && opts.acts.length > 0
    ? opts.acts.map((a) => ({
        id: String(a.id),
        title: a.title || String(a.id),
        blockchain: a.blockchain ?? null,
        widgets: Array.isArray(a.widgets) ? [...a.widgets] : [],
        status: a.status || 'ready'
      }))
    : defaultActs();
  const actById = Object.fromEntries(acts.map((a) => [a.id, a]));
  const lineaMeta = opts.linea
    ? {
        title: opts.linea.title || 'linea-aleph',
        corpus: opts.linea.corpus || 'linea-aleph',
        registro_count: Number(opts.linea.registro_count || 0),
        fixture: Boolean(opts.linea.fixture)
      }
    : null;

  /** @type {Record<string, { id: string, kind: string, nodeId: string, joinedAt: number }>} */
  const actors = {};
  let currentActId = null;
  let lastConsult = null;
  let ledgerSeq = 0;
  let contentRev = 0;
  /** @type {object[]} */
  const ledgerOut = [];
  /** @type {object[]} */
  const trackOut = [];

  function bump() {
    contentRev += 1;
  }

  function pushLedger(kind, detail) {
    ledgerSeq += 1;
    const entry = { kind, seq: ledgerSeq, ts: clock(), ...detail };
    ledgerOut.push(entry);
    return entry;
  }

  const handlers = {
    join(payload) {
      const { actorId } = payload;
      if (!actorId || typeof actorId !== 'string') {
        return { ok: false, error: 'actor_requerido' };
      }
      if (!actors[actorId]) {
        actors[actorId] = {
          id: actorId,
          kind: payload.kind === 'operator' ? 'operator' : 'player',
          nodeId: 'vestibulo',
          joinedAt: clock()
        };
        bump();
        trackOut.push({ kind: 'join', actorId, ts: clock() });
      }
      return { ok: true, evidencia: { actor: actors[actorId] } };
    },

    open_act(payload) {
      const { actorId, actId } = payload;
      if (!actors[actorId]) return { ok: false, error: 'actor_desconocido' };
      if (!actId || typeof actId !== 'string') {
        return { ok: false, error: 'act_requerido' };
      }
      const act = actById[actId];
      if (!act) return { ok: false, error: 'act_desconocido' };
      currentActId = act.id;
      actors[actorId].nodeId = `act:${act.id}`;
      bump();
      const ledger = pushLedger('open_act', {
        actorId,
        actId: act.id,
        title: act.title
      });
      trackOut.push({ kind: 'open_act', actorId, actId: act.id, ts: clock() });
      return {
        ok: true,
        evidencia: { act, ledger: { kind: ledger.kind, seq: ledger.seq } }
      };
    },

    consult_linea(payload) {
      const { actorId } = payload;
      if (!actors[actorId]) return { ok: false, error: 'actor_desconocido' };
      if (!lineaMeta) return { ok: false, error: 'linea_ausente' };
      lastConsult = {
        actorId,
        at: clock(),
        title: lineaMeta.title,
        registro_count: lineaMeta.registro_count,
        fixture: lineaMeta.fixture
      };
      bump();
      const ledger = pushLedger('consult_linea', {
        actorId,
        registro_count: lineaMeta.registro_count,
        corpus: lineaMeta.corpus
      });
      trackOut.push({ kind: 'consult_linea', actorId, ts: clock() });
      return {
        ok: true,
        evidencia: {
          linea: { ...lineaMeta },
          ledger: { kind: ledger.kind, seq: ledger.seq }
        }
      };
    }
  };

  return {
    applyIntent(payload) {
      const gate = validateIntent(payload, INTENTS);
      if (!gate.ok) return gate;
      const handler = handlers[payload.intent];
      if (!handler) return { ok: false, error: 'intent_desconocido' };
      return handler(payload);
    },
    tick() {
      /* sin drip — dominio narrativo */
    },
    drainOutbox() {
      const ledger = ledgerOut.splice(0, ledgerOut.length);
      const tracks = trackOut.splice(0, trackOut.length);
      return { ledger, tracks };
    },
    contentRev: () => contentRev,
    snapshot(reason = 'tick', _opts = {}) {
      return {
        reason,
        sceneId: SOLVE_SCENE.id,
        title: SOLVE_SCENE.title,
        contentRev,
        actors: { ...actors },
        acts: acts.map((a) => ({ ...a })),
        currentActId,
        currentAct: currentActId ? { ...actById[currentActId] } : null,
        linea: lineaMeta ? { ...lineaMeta } : null,
        lastConsult
      };
    }
  };
}

function defaultActs() {
  return Array.from({ length: 8 }, (_, i) => ({
    id: `act-${i}`,
    title: `Acto ${i}`,
    blockchain: i,
    widgets: [],
    status: 'ready'
  }));
}
