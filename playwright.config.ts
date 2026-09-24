import { defineConfig, devices } from '@playwright/test';

// Browser smoke checks only (BUILD-PLAN "Toolchain"). Unit tests stay in Vitest.
// PW_SYSTEM_CHROME=1 runs one project against the installed Google Chrome, for machines where the
// Playwright browser CDN is unreachable; CI runs bundled Chromium + WebKit.
export default defineConfig({
  testDir: 'apps/demo/e2e',
  testMatch: '*.e2e.ts',
  reporter: 'list',
  projects: process.env.PW_SYSTEM_CHROME
    ? [{ name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } }]
    : [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'webkit', use: { ...devices['Desktop Safari'] } },
      ],
});
