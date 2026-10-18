// Stage 8b: the IIFE size budget script (BUILD-PLAN Stage 8 acceptance 4), tested here like check-notices, and its
// guard that no `.wasm` (the local Pulse build, NOTICES N-062/N-084) is committed or lands in a distribution.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkSize, findWasm, GZIP_BUDGET_BYTES, measure } from '../../../scripts/check-size.ts';

describe('scripts/check-size', () => {
  it('measures raw, gzip -9 and brotli sizes', () => {
    const r = measure(new TextEncoder().encode('x'.repeat(10_000)));
    expect(r.raw).toBe(10_000);
    expect(r.gzip).toBeLessThan(200);
    expect(r.brotli).toBeLessThan(200);
  });
  it('enforces 400 KB gzipped', () => {
    expect(GZIP_BUDGET_BYTES).toBe(400 * 1024);
    expect(checkSize({ raw: 1, gzip: GZIP_BUDGET_BYTES, brotli: 1 })).toEqual([]);
    expect(checkSize({ raw: 1, gzip: GZIP_BUDGET_BYTES + 1, brotli: 1 })).toEqual(['patient-monitor.iife.js is 400.0 KB gzipped, over the 400 KB budget']);
  });
  it('finds .wasm files that are tracked or inside a distribution folder, and nothing else', () => {
    const root = mkdtempSync(join(tmpdir(), 'pme-wasm-'));
    try {
      for (const d of ['packages/renderer/dist/assets', 'packages/engine-core/src', 'apps/demo/dist/embed']) mkdirSync(join(root, d), { recursive: true });
      writeFileSync(join(root, 'packages/renderer/dist/assets/a.wasm'), '');
      writeFileSync(join(root, 'apps/demo/dist/embed/b.wasm'), '');
      writeFileSync(join(root, 'packages/engine-core/src/local.wasm'), ''); // untracked, not distributed: not reported
      expect(findWasm(root, ['research/pulse.wasm', 'README.md'])).toEqual([
        'apps/demo/dist/embed/b.wasm',
        'packages/renderer/dist/assets/a.wasm',
        'research/pulse.wasm',
      ]);
      expect(findWasm(root, [])).toHaveLength(2);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
