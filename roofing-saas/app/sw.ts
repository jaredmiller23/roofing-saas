import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist, NetworkOnly } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // API routes must NEVER be cached — they contain authenticated, tenant-specific data
    {
      matcher: /\/api\/.*/i,
      handler: new NetworkOnly(),
    },
    // Default caching for everything else (static assets, pages, etc.)
    ...defaultCache,
  ],
});

serwist.addEventListeners();
