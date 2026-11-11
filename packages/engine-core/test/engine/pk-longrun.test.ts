// Stage 7g 24 h run: three drugs running all day — no drift of the sample clock, the TCI targets or the panel clock.
// CI rule: the horizon is test/helpers/longrun.ts (24 h locally, 6 h on the 2-vCPU CI runner), as every long run.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { EngineEvent } from '../../src/types.ts';
import { cmd } from '../helpers/hemo.ts';
import { yieldNow } from '../helpers/pk.ts';
import { expectedIndex, LONGRUN_HOURS, LONGRUN_S } from '../helpers/longrun.ts';
import { LONGRUN_TCI_EVENTS } from '../helpers/pk-longrun-rig.ts';

/** The patient's effect sites at the end of the run, per horizon (hours), measured by pump-rack E2 (see the row). */
const LONGRUN_PATIENT_CE: Record<'propofol' | 'remifentanil', Record<number, number>> = {
  propofol: { 6: 3.1619, 24: 3.3605 }, // measured on the Mac, brief 144 (the pumps 2.5000 at both)
  remifentanil: { 6: 2.2466, 24: 2.2727 }, // (the pump 2.0000 at both)
};

describe('drug long run', () => {
  // FU-9 Gate: the run is shared by the `it` and the `it.fails` below (memoised: one 6 h run, R50 F10)
  let memo: Promise<{ e: ReturnType<typeof createEngine>; last: Extract<EngineEvent, { type: 'drugs' }> | null }> | undefined;
  const longRun = () => (memo ??= (async () => {
    const e = createEngine({ seed: 4, mode: 'modeled', patient: { sensors: { abp: 'connected' } } });
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5 } }));
    for (const event of LONGRUN_TCI_EVENTS) e.dispatch(cmd({ type: 'applyEvent', event }));
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
    // The remifentanil PUMP holds its target in its own model (E2, D3); the patient's Ce is the regression row below
    expect(l.tciPumps!.find((x) => x.drugId === 'remifentanil')!.ce).toBeCloseTo(2, 2);
    expect(l.volatile!.macFrac).toBeGreaterThan(0.4); // sevo 1 % FGF 2 at 40 y after a day: fixer prototype 0.51 MAC (fat still loading); the circuit did not drain
    for (const d of l.drugs) expect(Number.isFinite(d.cp) && Number.isFinite(d.ce)).toBe(true);
  });
  // R45 (FU-9 Gate, declared) → pump-rack E2: this row held the PATIENT's propofol Ce at 2.5 ± 0.005 while the TCI
  // controller read the patient's own state and clearance (the oracle, docs/plans/pump-rack-tci.md §1.3); it measured
  // 2.5033 on main. The open question it carried ("an open-loop TCI pump does not know the patient's liver flow; whether
  // the pump's model should see it is the owner's question") was ruled PQ5 = A: the pump is blind to the patient. Since
  // E2 the band holds the PUMP's own prediction, and the patient's Ce is a declared self-referential regression row.
  it(`${LONGRUN_HOURS} h: the TCI pumps hold their OWN predicted effect sites on target — propofol 2.5 ± 0.005, remifentanil 2 ± 0.005`, { timeout: 1_800_000 }, async () => {
    const { last } = await longRun();
    const l = last as unknown as Extract<EngineEvent, { type: 'drugs' }>;
    const pump = (id: string) => l.tciPumps!.find((x) => x.drugId === id)!;
    console.log(`pk-longrun ${LONGRUN_HOURS} h pump Ce propofol ${pump('propofol').ce.toFixed(4)} remifentanil ${pump('remifentanil').ce.toFixed(4)}`);
    expect(pump('propofol')).toMatchObject({ setId: 'eleveld', mode: 'effect', target: 2.5 });
    expect(pump('propofol').ce).toBeCloseTo(2.5, 2);
    expect(pump('remifentanil').ce).toBeCloseTo(2, 2);
  });
  // Self-referential regression row (the 7 November rule), re-recorded by pump-rack E2 with its cause: the pump no
  // longer sees the patient's clearance and distribution. Under this rig the patient's propofol clearance factor is
  // 0.80–0.82 (liver flow under sevoflurane and ventilation, hypothermia's CYP share) and its cardiac-output ratio 0.95;
  // remifentanil's is 0.93–0.94 (the non-CYP hypothermic term). The patient therefore sits ABOVE what the pump shows,
  // as a real patient does under an unchanged target. The control (test/engine/pk-tci-pump-control.test.ts: the same
  // rig, the factors pinned at 1) returns the old 2.5 / 2 within this row's own tolerance, so the difference is that
  // cause and nothing else. Values per horizon (test/helpers/longrun.ts): 6 h on CI, 24 h locally.
  it(`${LONGRUN_HOURS} h: the PATIENT's effect sites under the blind pumps (regression) — propofol ${LONGRUN_PATIENT_CE.propofol[LONGRUN_HOURS]}, remifentanil ${LONGRUN_PATIENT_CE.remifentanil[LONGRUN_HOURS]}`, { timeout: 1_800_000 }, async () => {
    const { last } = await longRun();
    const l = last as unknown as Extract<EngineEvent, { type: 'drugs' }>;
    const ce = (id: string) => l.drugs.find((x) => x.id === id)!.ce;
    console.log(`pk-longrun ${LONGRUN_HOURS} h patient Ce propofol ${ce('propofol').toFixed(4)} remifentanil ${ce('remifentanil').toFixed(4)}`);
    expect(ce('propofol')).toBeCloseTo(LONGRUN_PATIENT_CE.propofol[LONGRUN_HOURS] as number, 2);
    expect(ce('remifentanil')).toBeCloseTo(LONGRUN_PATIENT_CE.remifentanil[LONGRUN_HOURS] as number, 2);
  });
});
