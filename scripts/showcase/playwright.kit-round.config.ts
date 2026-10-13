// Kit round A (2026-10-12): the showcase-2 measurements through the BUILT kit's "Start Classroom" launcher (the relay
// serves the app; the phones follow over it), one case at a time, both engines. Documentation-grade evidence, not a CI
// test and not part of `pnpm test:e2e`. Results: docs/showcase/kit-round-a/ (JSON + one Markdown table per case).
//   SHOWCASE_KIT=/path/to/pme-showcase-kit-<sha> npx playwright test -c scripts/showcase/playwright.kit-round.config.ts [-g …] [--project …]
//   knobs: KITROUND_PHONES=3 (emulated phones following), KITROUND_REACT_S=2 (the presenter's reaction, wall seconds)
import { defineConfig, devices } from '@playwright/test';

const viewport = { width: 1440, height: 900 };
export default defineConfig({
  testDir: '.',
  testMatch: 'kit-round-a.kitround.ts',
  globalSetup: './kit-round-setup.ts',
  reporter: 'list',
  workers: 1, // one rehearsal at a time on a shared machine (load average recorded with every row)
  fullyParallel: false,
  timeout: 30 * 60_000,
  retries: 0,
  outputDir: '../../test-results/kit-round-a',
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport, deviceScaleFactor: 1 } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], viewport, deviceScaleFactor: 1 } },
  ],
});
