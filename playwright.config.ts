import { defineConfig, devices } from '@playwright/test';

// Browser smoke checks only. Unit tests stay in Vitest.
// PW_SYSTEM_CHROME=1 runs one project against the installed Google Chrome, for machines where the
// Playwright browser CDN is unreachable; CI runs bundled Chromium + WebKit.
// Headless Chromium hides local ICE candidates behind mDNS, which breaks the controller's loopback WebRTC
// tests. The flag is Chromium-only; WebKit fails to launch if it receives it.
const chromiumLaunch = { args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] };

// CI resilience: headless WebKit on the 2-vCPU runner crashed once under load, so CI retries a failed test twice and
// WebKit runs one worker at a time. Local runs (and the PW_SYSTEM_CHROME path) are unchanged.
const ci = !!process.env.CI;

// Brief 194: the evidence of a failed first attempt, from every page and context the test had open (on in CI;
// PME_E2E_EVIDENCE=1 locally, =0 off). The trace records the FIRST attempt of every test and is kept only when that attempt
// fails (Playwright merges every context of the test into one trace.zip); no screencast frames (`screenshots: false`) on
// the 2-vCPU runner. A screenshot of every open page only on a failure. The counters and the console of each page come
// from the fixture in apps/demo/e2e/evidence.ts. `*.proof.ts` (apps/demo/e2e/proof/) never runs in a normal suite:
// PME_E2E_PROOF=1 lets a path name one.
const evidence = process.env.PME_E2E_EVIDENCE ? process.env.PME_E2E_EVIDENCE === '1' : ci;

export default defineConfig({
  testDir: 'apps/demo/e2e',
  testMatch: process.env.PME_E2E_PROOF === '1' ? ['*.e2e.ts', '**/proof/*.proof.ts'] : '*.e2e.ts',
  reporter: 'list',
  retries: ci ? 2 : 0,
  use: evidence ? { trace: { mode: 'retain-on-first-failure', screenshots: false, snapshots: true, sources: false, attachments: false }, screenshot: 'only-on-failure' } : {},
  projects: process.env.PW_SYSTEM_CHROME
    ? [{ name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome', launchOptions: chromiumLaunch } }]
    : [
        { name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions: chromiumLaunch } },
        { name: 'webkit', use: { ...devices['Desktop Safari'] }, workers: 1 }, // WebKit rejects Chromium flags
      ],
});
