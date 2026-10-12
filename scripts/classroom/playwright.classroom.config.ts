// Stage 12 classroom proofs (not part of `pnpm test:e2e`, not in CI): the relay under a room of phones.
//   npx playwright test -c scripts/classroom/playwright.classroom.config.ts
//   knobs: CLASSROOM_APP=<built app dir> (default: built now into a temp dir), CLASSROOM_N=30 (simulated followers),
//          CLASSROOM_THROTTLE=4 (the real phone page's CPU slowdown, Chromium), CLASSROOM_PHASE_S=60, CLASSROOM_VENT=1
//          (the bronchospasm case with the Ventilator view driving the patient: the phones hold)
//          CLASSROOM_CASE=<scenario id> (default showcase-anaphylaxis; the gate runs each showcase card)
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '*.classroom.ts',
  reporter: 'list',
  workers: 1,
  timeout: 30 * 60_000,
  retries: 0,
  outputDir: '../../test-results/classroom',
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } }],
});
