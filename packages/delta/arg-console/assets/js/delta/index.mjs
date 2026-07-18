/**
 * Piezas de vista específicas de delta — viven junto a tablero/jugador.
 * El kit genérico está en @zeus/view-kit (import-map).
 */

export { createDeltaStage } from './delta-stage.mjs';
export { createRiverDroplets } from './river-droplets.mjs';
export { createSeaDroplets } from './sea-droplets.mjs';
export { createIntentClient } from './intent-client.mjs';
export { createInspector } from './inspector.mjs';
export {
  renderInspector,
  inspectorTitle,
  renderDropletLine,
  dropletDeepLink,
  isSyntheticUri
} from './inspector-render.mjs';
export {
  renderSeaActionPanel,
  bindSeaActionPanel
} from './sea-action-panel.mjs';
