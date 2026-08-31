import { defineConfig } from 'vitest/config';
import path from 'path';

// Kept separate from vite.config.ts: the app config pulls in the PWA plugin and
// a service-worker build, none of which a unit test needs.
export default defineConfig({
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
