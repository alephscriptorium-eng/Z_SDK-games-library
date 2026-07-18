/**
 * Cliente de intents — la ÚNICA manera en que una vista toca el juego:
 * construye arg:intent bien formados con makeIntent (@zeus/arg-domain) y
 * los emite por la room. La vista jamás muta estado local (P2: el reducer
 * de la autoridad valida; inválido = no-op).
 */

import { makeIntent, EVENTS } from '@zeus/arg-domain';

/**
 * @param {{emit: (event: string, data: object) => void}} room cliente de room
 * @param {string} actorId identidad encarnada
 */
export function createIntentClient(room, actorId) {
  function send(intent, args = {}) {
    room.emit(EVENTS.INTENT, makeIntent(actorId, intent, args));
  }

  return {
    join: (extra = {}) => send('join', { kind: 'player', tier: 'stick', ...extra }),
    /** move hacia un nodo vecino (nodeId) o por enlace ({linkId, direction}). */
    move: (to) => send('move', typeof to === 'object' ? to : { nodeId: to }),
    ride: (riverId) => send('ride', { riverId }),
    dismount: () => send('dismount'),
    tapSet: (tapId, aperture) => send('tap:set', { tapId, aperture }),
    labelCast: (label, dropletId) => send('label:cast', dropletId ? { label, dropletId } : { label }),
    excavate: (corridorId) => send('excavate', { corridorId }),
    contactRequest: (targetId) => send('contact:request', { targetId }),
    contactClose: (contactId) => send('contact:close', { contactId }),
    cloakEquip: (presetId, label) => send('cloak:equip', label ? { presetId, label } : { presetId }),
    emote: (name) => send('emote', { name }),
    salvage: (dropletId, label) => send('salvage', { dropletId, label }),
    trackCast: (dropletId) => send('track:cast', { dropletId })
  };
}
