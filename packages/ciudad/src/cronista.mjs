/**
 * Cronista — actor rol `dj` que lee el story-board canónico y re-emite
 * actos como intents `announce` en plaza. No duplica el schema del board;
 * no abre canal de transporte; no toca el reducer.
 *
 * Destino canónico del sustrato: instancia dramaturgo
 * `kits/carpeta-dramaturgo/instances/ciudad/readerapp/story-board.json`
 * (mismo fichero que el proyector ledger→board y el validador).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeIntent } from './contract.mjs';

export const CRONISTA_ACTOR_ID = 'cronista';
export const CRONISTA_ROLE = 'dj';
export const CRONISTA_FEATURE = 'cronista';

/** Acto semilla del kit — no se re-emite como lore de plaza. */
export const SKIP_ACT_IDS = Object.freeze(new Set(['act-0']));

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GL_ROOT = join(PKG_ROOT, '..', '..');

/** Ruta canónica del story-board de ciudad (única definición de destino). */
export const CANONICAL_STORY_BOARD = join(
  GL_ROOT,
  'kits',
  'carpeta-dramaturgo',
  'instances',
  'ciudad',
  'readerapp',
  'story-board.json'
);

/**
 * Carga el board desde disco. Schema = el del fichero; sin proyección local.
 * @param {string} [path]
 */
export function loadStoryBoard(path = CANONICAL_STORY_BOARD) {
  const raw = readFileSync(path, 'utf8');
  const board = JSON.parse(raw);
  if (!board || typeof board !== 'object') {
    throw new TypeError('loadStoryBoard: JSON raíz no es objeto');
  }
  if (!Array.isArray(board.acts)) {
    throw new TypeError('loadStoryBoard: falta acts[]');
  }
  return board;
}

/**
 * Vista de lectura multi-agente (campos estables; sin side-effects).
 * Segundo lector / cliente puede importar esto sin pasar por announce.
 * @param {{ slug?: string, title?: string, version?: unknown, acts?: object[] }} board
 */
export function inspectStoryBoard(board) {
  const acts = Array.isArray(board?.acts) ? board.acts : [];
  return {
    version: board?.version ?? null,
    slug: board?.slug ?? null,
    title: board?.title ?? null,
    actCount: acts.length,
    acts: acts.map((a) => ({
      id: a?.id ?? null,
      title: a?.title ?? null,
      status: a?.status ?? null,
      ledger_kind: a?.ledger_kind ?? null,
      blockchain: a?.blockchain ?? null
    }))
  };
}

/**
 * Actos listos para narrar en plaza (orden = orden del board).
 * @param {{ acts?: object[] }} board
 */
export function listAnnounceableActs(board) {
  const acts = Array.isArray(board?.acts) ? board.acts : [];
  return acts.filter((a) => {
    if (!a || typeof a.id !== 'string' || !a.id) return false;
    if (SKIP_ACT_IDS.has(a.id)) return false;
    if (a.status && a.status !== 'ready') return false;
    return true;
  });
}

/**
 * Mensaje de plaza (≤128 en dominio). Traza al id del acto.
 * @param {{ id?: string, title?: string, detail?: { message?: string }, ledger_kind?: string }} act
 */
export function actToAnnounceMessage(act) {
  const id = typeof act?.id === 'string' ? act.id : 'act-?';
  const title =
    typeof act?.title === 'string' && act.title.trim() ? act.title.trim() : 'acto';
  const detailMsg =
    typeof act?.detail?.message === 'string' && act.detail.message.trim()
      ? act.detail.message.trim()
      : null;
  const kind =
    typeof act?.ledger_kind === 'string' && act.ledger_kind
      ? act.ledger_kind
      : null;
  let body = detailMsg || (kind ? `${title} (${kind})` : title);
  let message = `[${id}] ${body}`;
  if (message.length > 128) {
    message = message.slice(0, 125) + '…';
  }
  return message;
}

/**
 * Cursor de idempotencia mínima: no re-anuncia el mismo act.id.
 * @param {Iterable<string>} [already]
 */
export function createCronistaCursor(already = []) {
  const done = new Set(already);
  return {
    /** @returns {ReadonlySet<string>} */
    announced() {
      return done;
    },
    /**
     * @param {{ acts?: object[] }} board
     * @returns {object[]}
     */
    pending(board) {
      return listAnnounceableActs(board).filter((a) => !done.has(a.id));
    },
    /** @param {string} actId */
    mark(actId) {
      if (typeof actId === 'string' && actId) done.add(actId);
    }
  };
}

/**
 * Proyecta actos pendientes → intents announce (rol dj).
 * @param {{ acts?: object[] }} board
 * @param {{
 *   actorId?: string,
 *   cursor?: ReturnType<typeof createCronistaCursor>,
 *   limit?: number
 * }} [opts]
 */
export function projectBoardToAnnounceIntents(board, opts = {}) {
  const actorId = opts.actorId || CRONISTA_ACTOR_ID;
  const cursor = opts.cursor || createCronistaCursor();
  const pending = cursor.pending(board);
  const limit =
    typeof opts.limit === 'number' && opts.limit >= 0 ? opts.limit : pending.length;
  const slice = pending.slice(0, limit);
  return slice.map((act) => {
    const message = actToAnnounceMessage(act);
    return {
      actId: act.id,
      message,
      intent: makeIntent(
        actorId,
        'announce',
        { message, actId: act.id },
        { from: actorId, role: CRONISTA_ROLE }
      )
    };
  });
}

/**
 * Intent join del cronista (plaza, rol dj).
 * @param {{ actorId?: string }} [opts]
 */
export function cronistaJoinIntent(opts = {}) {
  const actorId = opts.actorId || CRONISTA_ACTOR_ID;
  return makeIntent(
    actorId,
    'join',
    {
      playerType: 'visitante',
      features: [CRONISTA_FEATURE]
    },
    { from: actorId, role: CRONISTA_ROLE }
  );
}
