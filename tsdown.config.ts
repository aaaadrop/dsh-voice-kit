import { clientBundle } from './shared/tsdown.client.ts'

/**
 * One package, two halves:
 * - node half: lib/index.js + lib/invariant.js (host side, loaded by the
 *   profile loader through the cordis.patch.yml plugin row);
 * - browser half: lib/client.js (client side, fetched by the web plugin
 *   roster through the dsh.client.inject manifest).
 * The shared preset emits both in one `tsdown` run.
 */
export default clientBundle('dsh-voice-kit', [
  'src/index.ts',
  'src/invariant.ts',
], {
  libExternal: [
    '@deepseek-ai/dsh-client-locale',
    '@deepseek-ai/dsh-client-runtime',
    '@deepseek-ai/dsh-client-ui-conversation',
    '@deepseek-ai/dsh-client-ui-settings',
    '@deepseek-ai/dsh-client-ui-slots',
    '@deepseek-ai/dsh-host-webserver',
    '@deepseek-ai/dsh-settings',
    '@deepseek-ai/schemastery',
    'msedge-tts',
  ],
})
