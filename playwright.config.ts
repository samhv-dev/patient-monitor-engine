import { defineConfig, devices } from '@playwright/test';

// Browser smoke checks only (BUILD-PLAN "Toolchain"). Unit tests stay in Vitest.
// PW_SYSTEM_CHROME=1 runs one project against the installed Google Chrome, for machines where the
// Playwright browser CDN is unreachable; CI runs bundled Chromium + WebKit.
// Headless Chromium hides local ICE candidates behind mDNS, which breaks the loopback WebRTC
// tests (Stage 6a). The flag is Chromium-only; WebKit fails to launch if it receives it.
const chromiumLaunch = { args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] };

// CI resilience (G5.1 follow-up, FU-1): headless WebKit on the 2-vCPU runner crashed once under load, so CI retries a
// failed test twice and WebKit runs one worker at a time. Local runs (and the PW_SYSTEM_CHROME path) are unchanged.
const ci = !!process.env.CI;

export default defineConfig({
  testDir: 'apps/demo/e2e',
  testMatch: '*.e2e.ts',
  reporter: 'list',
  retries: ci ? 2 : 0,
  projects: process.env.PW_SYSTEM_CHROME
    ? [{ name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome', launchOptions: chromiumLaunch } }]
    : [
        { name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions: chromiumLaunch } },
        { name: 'webkit', use: { ...devices['Desktop Safari'] }, workers: 1 }, // WebKit rejects Chromium flags
      ],
});
