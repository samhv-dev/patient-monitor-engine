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

// Brief 203: on Linux, Playwright's WebKit is the WPE port, whose 2D canvas draws through Skia's GPU backend (Ganesh) on
// Mesa's software llvmpipe in CI. There it intermittently died on a SIGILL inside Skia (GrDrawingManager::flush,
// PathStencilCoverOp) on the thread of the monitor's OffscreenCanvas worker, killing the instructor's page; the
// followers then froze, which the e2e tests saw as a host that "stopped answering" (diagnostic PR 460: 10 such deaths
// in 144 runs of depth-window E12 with the monitor in its worker, none with it on the main thread). Skia's CPU
// rasteriser draws the same canvas without that backend; on llvmpipe the "GPU" is the CPU anyway. Safari on macOS,
// iPadOS and iOS draws canvas with Core Graphics, not Skia, so this is the rig's browser, not a classroom's.
// macOS WebKit ignores the variable. packages/validation/test/webkit-ci-canvas.test.ts keeps it.
const webkitLaunch = process.platform === 'linux' ? { env: { ...process.env, WEBKIT_SKIA_ENABLE_CPU_RENDERING: '1' } } : {};

export default defineConfig({
  testDir: 'apps/demo/e2e',
  testMatch: '*.e2e.ts',
  reporter: 'list',
  retries: ci ? 2 : 0,
  projects: process.env.PW_SYSTEM_CHROME
    ? [{ name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome', launchOptions: chromiumLaunch } }]
    : [
        { name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions: chromiumLaunch } },
        { name: 'webkit', use: { ...devices['Desktop Safari'], launchOptions: webkitLaunch }, workers: 1 }, // WebKit rejects Chromium flags
      ],
});
