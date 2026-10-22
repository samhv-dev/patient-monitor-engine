// FX-24: a follower (second screen, phone) restores the host's snapshot when it joins and at the end of a fast-forward.
// A restore clears the engine's sample buffers, so the restored engine holds nothing before the snapshot's tick. The
// lanes' backfill and the ECG auto-gain read back from there: the reads returned the post-snapshot samples as if they
// began a lane-width earlier, so the lanes raced (≈ ×12–24 the sweep speed for up to 0.75 s, the first beats drawn over
// and over: "compressed waveforms"), and the auto-gain judged 0.1 s of signal and showed X4 until its next turn (2 s).
import { describe, expect, it } from 'vitest';
import { resolveSkin } from '@pme/skins';
import { MonitorCore } from '../src/monitor-core.ts';
import { renderPlan } from '../src/skin-plan.ts';
import type { SweepLane } from '../src/sweep-lane.ts';
import { FakeCtx } from './fake-ctx.ts';

// the rc.3 chrome (one label string) at 96 dpi: the gain logic under test, without the pass-2 lane text and screen scale
const plan = () => ({ ...renderPlan(resolveSkin('saadat-like'), undefined, undefined, true), pxPerMm: null });
const make = (ctx = new FakeCtx()) =>
  new MonitorCore({ width: 0, height: 0 }, ctx, { cssW: 1056, cssH: 444, dpr: 1 }, { engine: { seed: 1, device: { skin: 'saadat-like' } }, plan: plan() }, () => {});
const lanes = (c: MonitorCore) => (c as unknown as { lanes: SweepLane[] }).lanes;
const FRAME_MS = 1000 / 60;
const gainOf = (texts: string[]) => texts.filter((t) => /^II\s+X/.test(t)).at(-1);

describe('FX-24: the lanes and the ECG gain after a restore (a follower joining, or after a fast-forward)', () => {
  // the host: 40 s of a normal patient, past the first auto-gain window; its snapshot is what a follower restores
  const hostCtx = new FakeCtx();
  const host = make(hostCtx);
  for (let ms = 0; ms <= 40_000; ms += FRAME_MS) host.frame(1_000_000 + ms);
  const s = host.engine.snapshot();
  const hostGain = gainOf(hostCtx.texts);

  it('every lane draws only from the snapshot on, at the normal sweep speed, from the first frame', () => {
    const f = make();
    for (let ms = 0; ms <= 500; ms += FRAME_MS) f.frame(2_000_000 + ms); // the follower's own start, then the snapshot
    f.restore(s);
    const t0 = s.tick * 0.02;
    let prev = lanes(f).map(() => Number.NaN);
    for (let k = 0; k < 120; k++) {
      f.frame(3_000_000 + k * FRAME_MS);
      const t = f.clock.renderT;
      lanes(f).forEach((l, i) => {
        if (l.lastDrawnIndex < 0) return; // a wave lane with no samples yet
        // nothing is drawn as if it came before the snapshot …
        expect(l.lastDrawnIndex, `lane ${i} frame ${k}`).toBeGreaterThanOrEqual(Math.ceil(t0 * l.cfg.rate) - 1);
        // … and each frame draws what the clock advanced (a 60 Hz frame: 8.3 samples at 500 Hz), not a lane's worth
        if (!Number.isNaN(prev[i] as number)) expect(l.lastDrawnIndex - (prev[i] as number), `lane ${i} frame ${k}`).toBeLessThanOrEqual(Math.ceil(l.cfg.rate * (FRAME_MS / 1000)) + 1);
        // the newest sample drawn is the clock's (the trace sits at the sweep cursor)
        expect(Math.floor(t * l.cfg.rate) - l.lastDrawnIndex, `lane ${i} frame ${k}`).toBeLessThanOrEqual(1);
      });
      prev = lanes(f).map((l) => l.lastDrawnIndex);
    }
  });

  it('after a fast-forward the ECG gain stays the one the follower showed (the auto-gain waits for 4 s of new signal)', () => {
    expect(hostGain).toBe('II  X0.5  NORMAL'); // this test's short ECG lane (444 px at the photo's lane weights: 115 / 614 × 444 ≈ 83 px, as 500 / 6 before PR-G): the auto-gain halves the skin's X1
    const ctx = new FakeCtx();
    const f = make(ctx);
    for (let ms = 0; ms <= 10_000; ms += FRAME_MS) f.frame(2_000_000 + ms); // a follower that has been following
    expect(gainOf(ctx.texts)).toBe(hostGain);
    ctx.texts = [];
    f.restore(s); // the snapshot at the end of the fast-forward
    for (let ms = 0; ms <= 8000; ms += FRAME_MS) {
      f.frame(3_000_000 + ms);
      expect(gainOf(ctx.texts), `${ms.toFixed(0)} ms after the restore`).toBe(hostGain);
    }
  });

  it("on joining, the skin's own gain until 4 s of restored signal (the auto-gain window), then the auto-gain's choice", () => {
    const ctx = new FakeCtx();
    const f = make(ctx);
    for (let ms = 0; ms <= 500; ms += FRAME_MS) f.frame(2_000_000 + ms);
    ctx.texts = [];
    f.restore(s);
    for (let ms = 0; ms <= 8000; ms += FRAME_MS) {
      f.frame(3_000_000 + ms);
      const since = f.clock.renderT - s.tick * 0.02;
      if (Math.abs(since - 4) < 0.02) continue; // the frame on the 4-s boundary may fall either side
      const want = since < 4 ? 'II  X1  NORMAL' : hostGain;
      expect(gainOf(ctx.texts), `${ms.toFixed(0)} ms after the restore`).toBe(want);
    }
  });
});
