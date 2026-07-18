/**
 * Seat volumes-ops empty_playable after a successful game `empty` intent.
 * Domain stays pure; this is the authority-edge twin (WP-U83 / U82).
 */

import { emptyVolume } from '@zeus/volumes-ops';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/**
 * @param {object} payload — intent envelope
 * @param {{ ledgerPath?: string, volumeId?: string, game?: string }} [opts]
 */
export function seatEmptyPlayableOps(payload, opts = {}) {
  const ledgerPath =
    opts.ledgerPath ||
    process.env.ZEUS_OPS_LEDGER_PATH ||
    join(tmpdir(), `zeus-ops-ledger-${opts.game || 'game'}.jsonl`);
  return emptyVolume({
    intent: 'empty_playable',
    role: payload.role || 'player',
    actorId: payload.actorId || 'player',
    volumeId: opts.volumeId || 'DISK_01',
    corpusId: opts.corpusId ?? null,
    ledger: { ledgerPath }
  });
}
