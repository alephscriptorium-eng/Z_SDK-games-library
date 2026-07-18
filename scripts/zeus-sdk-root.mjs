/** Reexport ESM de zeus-sdk-root.cjs para scripts ESM. */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
export const { libraryRoot, resolveZeusSdkRoot } = require('./zeus-sdk-root.cjs');
