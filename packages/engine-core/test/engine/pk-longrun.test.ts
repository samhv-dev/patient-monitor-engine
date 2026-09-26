// Stage 7g 24 h run: three drugs running all day — no drift of the sample clock, the TCI targets or the panel clock.
// CI rule: the horizon is test/helpers/longrun.ts (24 h locally, 6 h on the 2-vCPU CI runner), as every long run.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { EngineEvent } from '../../src/types.ts';
import { cmd } from '../helpers/hemo.ts';
import { yieldNow } from '../helpers/pk.ts';
import { expectedIndex, LONGRUN_HOURS, LONGRUN_S } from '../helpers/longrun.ts';

describe('Stage 7g long run', () => {
  it(`${LONGRUN_HOURS} h: TCI propofol + remifentanil + sevoflurane — latestSampleIndex(abp) = 125 × t + 12, ecgII = 500 × t + 50, targets held (24 h locally, 6 h on CI)`, { timeout: 1_800_000 }, async () => {
    const e = createEngine({ seed: 4, mode: 'modeled', patient: { sensors: { abp: 'connected' } } });
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5 } }));
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'tci', drugId: 'propofol', mode: 'effect', target: 2.5 } }));
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'tci', drugId: 'remifentanil', mode: 'effect', target: 2 } }));
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'vaporiser', agent: 'sevoflurane', dialPct: 1, fgfLpm: 2 } }));
    let last: Extract<EngineEvent, { type: 'drugs' }> | null = null;
    e.on((x) => {
      if (x.type === 'drugs') last = x;
    });
    // minute by minute with a yield (Global Constraints: the drug layer adds work to every tick on the 2-vCPU runner)
    for (let t = 60; t <= LONGRUN_S; t += 60) {
      e.advanceTo(t);
      await yieldNow();
    }
    expect(e.latestSampleIndex('abp')).toBe(expectedIndex(125, 12)); // 24 h: 10,800,000 + 12
    expect(e.latestSampleIndex('ecgII')).toBe(expectedIndex(500, 50)); // 24 h: 43,200,000 + 50
    const l = last as unknown as Extract<EngineEvent, { type: 'drugs' }>;
    expect(l.t).toBe(LONGRUN_S);
    expect(l.drugs.find((x) => x.id === 'propofol')!.ce).toBeCloseTo(2.5, 2);
    expect(l.drugs.find((x) => x.id === 'remifentanil')!.ce).toBeCloseTo(2, 2);
    expect(l.volatile!.macFrac).toBeGreaterThan(0.4); // sevo 1 % FGF 2 at 40 y after a day: fixer prototype 0.51 MAC (fat still loading); the circuit did not drain
    for (const d of l.drugs) expect(Number.isFinite(d.cp) && Number.isFinite(d.ce)).toBe(true);
  });
});
