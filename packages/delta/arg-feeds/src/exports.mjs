/**
 * Re-exports so index stays a thin barrel (grep-gates / docs).
 */

export {
  probeFeedMcpHealth as probeMcpHealth,
  createFeedMcpClients as createArgMcpClients,
  parseToolJson,
  callToolJson
} from '@zeus/feed-kit';

export {
  CURATION_STATUSES,
  normalizeCurationStatus,
  curationStatusFromCorpus,
  readCurationStatus
} from '@zeus/linea-kit/curation';
