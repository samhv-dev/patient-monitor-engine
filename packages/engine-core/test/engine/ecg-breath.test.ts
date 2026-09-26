import { describe, expect, it } from 'vitest';
import { createEngine, type Command, type EngineEvent } from '../../src/index.ts';

// R-S3-3: with Stage 3 merged, RSA follows the breath driver's cycles (public events only).
describe('Stage 5.1: ECG RSA follows the breath driver', () => {
  it('beat-to-beat RR correlates with the phase of the emitted breaths (r ≥ 0.8; measured 0.83)', { timeout: 300_000 }, async () => {
    const e = createEngine({ seed: 5 });
    const ev: EngineEvent[] = [];
    e.on((x) => ev.push(x), ['beat', 'breath']);
    e.dispatch({ id: 'm', issuedBy: 't', type: 'setModifiers', modifiers: { rsa: 1 } } as Command);
    for (let t = 60; t <= 240; t += 60) {
      e.advanceTo(t);
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
    const br = ev.filter((x): x is Extract<EngineEvent, { type: 'breath' }> => x.type === 'breath');
    const bt = ev.filter((x) => x.type === 'beat').map((x) => (x as { t: number }).t);
    expect(br.length).toBeGreaterThan(20);
    const phase = (t: number) => {
      let c = br[0]!;
      for (const b of br) if (b.t <= t) c = b;
      return Math.sin(2 * Math.PI * (c.seq + Math.min(1, (t - c.t) / (c.tiS + c.teS))) + Math.PI / 2);
    };
    const rr = bt.slice(1).map((t, i) => t - bt[i]!).slice(20);
    const ph = bt.slice(1).map((t, i) => phase(bt[i]!)).slice(20);
    const m = (x: number[]) => x.reduce((a, b) => a + b, 0) / x.length;
    const ma = m(rr), mb = m(ph);
    let n = 0, da = 0, db = 0;
    rr.forEach((v, i) => { n += (v - ma) * (ph[i]! - mb); da += (v - ma) ** 2; db += (ph[i]! - mb) ** 2; });
    expect(n / Math.sqrt(da * db)).toBeGreaterThanOrEqual(0.8); // Stage 3.1 item 7: wired in the engine (R-S3-3)
  });
});
