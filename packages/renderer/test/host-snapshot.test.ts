// Renderer request R-1 (ruling R25): the host behind mountMonitor can snapshot and restore its engine, so a
// viewer or a bookmark can use the renderer's own path. Main-thread host here; the worker path is checked in
// apps/demo/e2e/stage6a-worker.e2e.ts (Node has no OffscreenCanvas worker).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHost } from '../src/worker-host.ts';
import { FakeCtx } from './fake-ctx.ts';

let frames: Array<(t: number) => void> = [];
beforeEach(() => {
  frames = [];
  vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => frames.push(cb));
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal('document', { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} });
});
afterEach(() => vi.unstubAllGlobals());

/** Run `n` animation frames of 1/60 s each, starting at `t0` ms. */
function pump(n: number, t0: number): number {
  let t = t0;
  for (let i = 0; i < n; i++) {
    const due = frames;
    frames = [];
    t += 1000 / 60;
    for (const cb of due) cb(t);
  }
  return t;
}

describe('host snapshot/restore (main-thread path)', () => {
  it('returns a pme-snapshot/1 and restores the engine and the clock to it', async () => {
    const ctx = new FakeCtx();
    const canvas = { getContext: () => ctx, width: 0, height: 0 } as unknown as HTMLCanvasElement;
    const host = await createHost(canvas, { cssW: 800, cssH: 300, dpr: 1 }, { engine: { seed: 3 } }, 'off', () => {});
    expect(await host.path).toBe('main');
    let t = pump(60, 0); // ≈ 1 s
    const a = await host.snapshot();
    expect(a.schema).toBe('pme-snapshot/1');
    expect(a.tick).toBeGreaterThan(40);
    t = pump(120, t); // ≈ 2 s more
    const b = await host.snapshot();
    expect(b.tick).toBeGreaterThan(a.tick + 80);
    await host.restore(a);
    const c = await host.snapshot();
    expect(c.tick).toBe(a.tick);
    expect(JSON.stringify(c)).toBe(JSON.stringify(a)); // the engine state is exactly the restored one
    pump(60, t);
    expect((await host.snapshot()).tick).toBeGreaterThan(a.tick); // and the clock runs on from there
    host.destroy();
  });

  it('rejects a snapshot of an unknown schema', async () => {
    const ctx = new FakeCtx();
    const canvas = { getContext: () => ctx, width: 0, height: 0 } as unknown as HTMLCanvasElement;
    const host = await createHost(canvas, { cssW: 800, cssH: 300, dpr: 1 }, {}, 'off', () => {});
    await expect(host.restore({ schema: 'nope' } as never)).rejects.toThrow(/schema/);
    host.destroy();
  });
});
