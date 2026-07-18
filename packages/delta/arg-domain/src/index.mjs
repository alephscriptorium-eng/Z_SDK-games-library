/**
 * @zeus/arg-domain — delta, dominio puro del ARG.
 * Sin three, sin red. Ver packages/delta/spec/CONTRATO.md.
 */

export * from './contract.mjs';
export { deltaV0, buildCanteraTopology, buildNavGraph, chamberId, corridorId } from './scenes/delta-v0.mjs';
export { createFlowEngine, LABEL_WINDOW, validateEmptySea } from './flow-engine.mjs';
export { createMazeEngine } from './maze-engine.mjs';
export {
  createLineBoard,
  DEFAULT_LINE_SEED,
  DELTA_STATUSES,
  decodeLineStatus,
  validateCurate
} from './line-board.mjs';
export { reduceArgIntent } from './reducer.mjs';
export { createArgDomainState, DEFAULT_GAMEMAP } from './domain-state.mjs';
export {
  resolveFeeds,
  createSyntheticFirehoseFeed,
  createSyntheticMazeSource,
  createRng
} from './feeds/synthetic.mjs';
export { resolveTrackRef, buildTrackBrowserUrl } from './track.mjs';
export { seaLayout } from './sea-layout.mjs';
export { CLOAK_MODS, cloakModFor, cloakModsFor, effectiveLinkSpeed } from './cloak-mods.mjs';
