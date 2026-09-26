import { defineConfig, devices } from '@playwright/test';

// Stage 8a long runs (soak, frame-time histograms): only `*.soak.ts`, only from the validation workflow or by hand.
// PME_SOAK_MIN sets the soak length (default 60). PW_SYSTEM_CHROME=1 uses the installed Chrome.
export default defineConfig({
  testDir: 'apps/demo/e2e',
  testMatch: '*.soak.ts',
  reporter: 'list',
  timeout: 0,
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], ...(process.env.PW_SYSTEM_CHROME ? { channel: 'chrome' } : {}), launchOptions: { args: ['--js-flags=--expose-gc', '--enable-precise-memory-info'] } } }],
});
