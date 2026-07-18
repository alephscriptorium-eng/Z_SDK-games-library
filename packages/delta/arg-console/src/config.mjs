/**
 * Configuración de @zeus/arg-console vía createAppConfig (@zeus/app-shell).
 * Puerto y host salen del mesh UI (ZEUS_PORT_ARG_CONSOLE / ZEUS_HOST);
 * scriptorium (host/port/path/secret) lo inyecta resolveRuntimeConfig.
 */

import { createAppConfig } from '@zeus/app-shell';
import { DEFAULT_ZEUS_UI_MESH } from '@zeus/presets-sdk/env';

export const {
  packageDir,
  getAppConfig,
  getConfig,
  setTheme,
  getDefaultTheme,
  getLocalNavEntries
} = createAppConfig({
  appId: 'argConsole',
  defaultPort: DEFAULT_ZEUS_UI_MESH.argConsole.port,
  importMetaUrl: import.meta.url,
  skipConfigFile: true
});
