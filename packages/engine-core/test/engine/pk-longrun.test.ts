// Stage 7g 24 h run: three drugs running all day — no drift of the sample clock, the TCI targets or the panel clock.
// CI rule: the horizon is test/helpers/longrun.ts (24 h locally, 6 h on the 2-vCPU CI runner), as every long run.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { EngineEvent } from '../../src/types.ts';
import { cmd } from '../helpers/hemo.ts';
import { yieldNow } from '../helpers/pk.ts';
import { expectedIndex, LONGRUN_HOURS, LONGRUN_S } from '../helpers/longrun.ts';

describe('Stage 7g long run', () => {
  // FU-9 Gate: the run is shared by the `it` and the `it.fails` below (memoised: one 6 h run, R50 F10)
  let memo: Promise<{ e: ReturnType<typeof createEngine>; last: Extract<EngineEvent, { type: 'drugs' }> | null }> | undefined;
  const longRun = () => (memo ??= (async () => {
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
    return { e, last };
  })());
  it(`${LONGRUN_HOURS} h: TCI propofol + remifentanil + sevoflurane — latestSampleIndex(abp) = 125 × t + 12, ecgII = 500 × t + 50, remifentanil target and sevoflurane held (24 h locally, 6 h on CI)`, { timeout: 1_800_000 }, async () => {
    const { e, last } = await longRun();
    expect(e.latestSampleIndex('abp')).toBe(expectedIndex(125, 12)); // 24 h: 10,800,000 + 12
    expect(e.latestSampleIndex('ecgII')).toBe(expectedIndex(500, 50)); // 24 h: 43,200,000 + 50
    const l = last as unknown as Extract<EngineEvent, { type: 'drugs' }>;
    expect(l.t).toBe(LONGRUN_S);
    expect(l.drugs.find((x) => x.id === 'remifentanil')!.ce).toBeCloseTo(2, 2);
    expect(l.volatile!.macFrac).toBeGreaterThan(0.4); // sevo 1 % FGF 2 at 40 y after a day: fixer prototype 0.51 MAC (fat still loading); the circuit did not drain
    for (const d of l.drugs) expect(Number.isFinite(d.cp) && Number.isFinite(d.ce)).toBe(true);
  });
  // R45 (FU-9 Gate, declared): with FU-9 H2/H4 (A9, +0.006) and H3 (A12, +0.004 — hepatic flow = CO/CO0 × 7d's factor,
  // sevoflurane × 0.8/MAC) propofol's flow-limited clearance falls under this rig, and the open-loop TCI (7g's own model)
  // leaves the effect site 0.4 % above its target after 6 h. Measured 2.5098 on CI (run 37135534941) and on the Mac;
  // main 2.5 (within ± 0.005). The TCI band is unchanged (orchestrator ruling at G-FU9): an open-loop TCI pump does not
  // know the patient's liver flow — real pumps do not either; whether the pump's model should see it is Ali's question.
  // FU-10 Gate (E-FU10-13): with FU-10 Part A (the endocrine/thermal integration) the same rig measures 2.4995 on the Mac
  // (base 5559533: 2.5097) — inside the unchanged band again, so the declared `it.fails` flips back to `it`.
  it(`${LONGRUN_HOURS} h: TCI propofol effect site held at 2.5 ± 0.005 — measured 2.4995 with FU-10 Part A (2.5098 with FU-9 alone)`, { timeout: 1_800_000 }, async () => {
    const { last } = await longRun();
    const l = last as unknown as Extract<EngineEvent, { type: 'drugs' }>;
    expect(l.drugs.find((x) => x.id === 'propofol')!.ce).toBeCloseTo(2.5, 2);
  });
});
