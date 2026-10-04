// Showcase kit proofs (not part of `pnpm test:e2e`): the five-case rehearsal, the multi-window check, sound and the
// last-resort videos, against the BUILT kit served by its perl server.
//   SHOWCASE_KIT=/path/to/pme-showcase npx playwright test -c scripts/showcase/playwright.showcase.config.ts [file]
import { defineConfig, devices } from '@playwright/test';

const viewport = { width: 1440, height: 900 };
export default defineConfig({
  testDir: '.',
  testMatch: '*.showcase.ts',
  globalSetup: './global-setup.ts',
  reporter: 'list',
  workers: Number(process.env.SHOWCASE_WORKERS ?? 2),
  timeout: 15 * 60_000,
  retries: 0,
  outputDir: '../../test-results/showcase',
  // SHOWCASE_VIDEO=1 (make-videos.mjs): only the 'video' project — Chromium at 1280×800 recording every test
  projects: process.env.SHOWCASE_VIDEO
    ? [{
        name: 'video', testMatch: 'rehearsal.showcase.ts', outputDir: '../../test-results/showcase-video',
        use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, video: { mode: 'on', size: { width: 1280, height: 800 } } },
      }]
    : [
        { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport, deviceScaleFactor: 1 } },
        { name: 'webkit', use: { ...devices['Desktop Safari'], viewport, deviceScaleFactor: 1 } },
      ],
});
