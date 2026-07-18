/**
 * Cloaks HORSE de los grifos — catálogo mínimo con tool tap.set_aperture.
 * El responder Node (tap-horse) traduce tools/call → arg:intent tap:set.
 */

const TAP_TOOL = {
  name: 'tap.set_aperture',
  description: 'Ajusta la apertura del grifo (0..1)',
  parameters: {
    type: 'object',
    properties: {
      aperture: { type: 'number', minimum: 0, maximum: 1, description: 'Apertura normalizada' }
    },
    required: ['aperture']
  },
  type: 'tool'
};

const TAP_CATALOG_ENTRY = {
  serverName: 'arg-tap',
  serverInfo: { name: 'ARG Tap' },
  isConnected: true,
  tools: [TAP_TOOL],
  resources: [],
  resourceTemplates: [],
  prompts: []
};

/**
 * @param {'grifo-a'|'grifo-b'|string} tapId
 */
export function grifoCloakDef(tapId) {
  const preset = {
    id: `${tapId}-cloak`,
    name: `${tapId}-cloak`,
    description: `Cloak operativo del grifo ${tapId}`,
    category: 'arg-tap',
    prompt: `Opera el grifo ${tapId} con tap.set_aperture.`,
    items: [{ serverName: 'arg-tap', type: 'tool', name: 'tap.set_aperture' }]
  };
  return {
    tapId,
    preset,
    catalog: [TAP_CATALOG_ENTRY]
  };
}

export const GRIFO_IDS = ['grifo-a', 'grifo-b'];
