// Brief 203: why the instructor's page "stopped answering" on CI WebKit, and the two rig settings that answer it.
// On CI's Linux WebKit (Playwright's WPE build) a web process sometimes died on a SIGILL in Skia's GPU backend (Ganesh,
// running on Mesa's software llvmpipe) while the monitor's OffscreenCanvas worker drew: GrDrawingManager::flush,
// PathStencilCoverOp. The runner's kernel then piped the core of the ≈ 700 MB process to systemd-coredump with no size
// limit, which kept the dying process alive: the page answered nothing for minutes and Playwright never said "Target
// crashed". Diagnostic PR 460 (never merged) measured it: the host as shipped 10 such stops in 108 runs of
// depth-window E12 (every one a SIGILL on a 'WebCore: Worker' thread in that code), the same host with its monitor on
// the main thread 0 in 36, and with WEBKIT_SKIA_ENABLE_CPU_RENDERING=1 (Skia's CPU rasteriser) see the PR body.
// Safari on macOS, iPadOS and iOS draws canvas with Core Graphics, not Skia: a classroom device does not run this code.
// These checks keep the two settings: the CPU rasteriser for CI's WebKit, and no core dumps in the e2e containers, so
// a browser crash, if one still happens, ends its page at once and Playwright reports it as a crash.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');

describe('CI WebKit rig (brief 203)', () => {
  it("draws the WebKit project's canvas with Skia's CPU rasteriser on Linux (Playwright's WPE build)", () => {
    const cfg = read('playwright.config.ts');
    const webkit = cfg.split('\n').find((l) => l.includes("name: 'webkit'")) ?? '';
    expect(webkit).toMatch(/launchOptions:\s*webkitLaunch/);
    expect(cfg).toMatch(/const webkitLaunch = process\.platform === 'linux'\s*\?\s*\{\s*env:\s*\{\s*\.\.\.process\.env,\s*WEBKIT_SKIA_ENABLE_CPU_RENDERING:\s*'1'\s*\}\s*\}/);
  });

  it('runs every e2e container without core dumps', () => {
    const ci = read('.github/workflows/ci.yml');
    const e2e = ci.slice(ci.indexOf('\n  e2e:'), ci.indexOf('\n  e2e-count:') > 0 ? ci.indexOf('\n  e2e-count:') : undefined);
    const options = /^\s+options:([^\n]*)$/m.exec(e2e.slice(e2e.indexOf('container:')))?.[1] ?? '';
    expect(options).toContain('--ulimit core=0');
  });
});
