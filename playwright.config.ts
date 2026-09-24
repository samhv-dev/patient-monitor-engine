import { defineConfig, devices } from '@playwright/test';

// Browser smoke checks only (BUILD-PLAN "Toolchain"). Unit tests stay in Vitest.
// PW_SYSTEM_CHROME=1 runs one project against the installed Google Chrome, for machines where the
// Playwright browser CDN is unreachable; CI runs bundled Chromium + WebKit.
// Headless Chromium hides local ICE candidates behind mDNS, which breaks the loopback WebRTC
// tests (Stage 6a). The flag is Chromium-only; WebKit fails to launch if it receives it.
const chromiumLaunch = { args: ['--disable-features=WebRtcHideLocalIpsWithMdns'] };

export default defineConfig({
  testDir: 'apps/demo/e2e',
  testMatch: '*.e2e.ts',
  reporter: 'list',
  projects: process.env.PW_SYSTEM_CHROME
    ? [{ name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome', launchOptions: chromiumLaunch } }]
    : [
        { name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions: chromiumLaunch } },
        { name: 'webkit', use: { ...devices['Desktop Safari'] } }, // WebKit rejects Chromium flags
      ],
});
