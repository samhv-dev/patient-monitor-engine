// The control of the drug long run's re-recorded patient row (pk-longrun.test.ts; pump-rack E2, decision D3; the
// 7 November rule: a re-recorded self-referential row is proven by a control in the SAME rig). The same engine run —
// the same seed, ventilation, TCI events (test/helpers/pk-longrun-rig.ts) and sevoflurane — with the pumps' typed data
// the patient's (the case patient, Eleveld "with opioids") and the patient's clearance and distribution factors pinned
// at 1 through the TEST-ONLY seams `pinClFactor` and `pinDistQ`. Then the patient IS what the pumps predict, and its
// effect sites return the old numbers (propofol 2.5, remifentanil 2) within the row's own tolerance: the long run's
// difference is the patient's clearance and distribution, which the pump does not see, and nothing else.
// Its own file, in SLOW and so in slow-b (vite.config.ts), so it costs CI one run.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { EngineEvent } from '../../src/types.ts';
import { cmd } from '../helpers/hemo.ts';
import { yieldNow } from '../helpers/pk.ts';
import { LONGRUN_HOURS, LONGRUN_S } from '../helpers/longrun.ts';
import { LONGRUN_TCI_EVENTS } from '../helpers/pk-longrun-rig.ts';

describe('drug long run, control', () => {
  it(`${LONGRUN_HOURS} h, the clearance and distribution factors pinned at 1: the patient's effect sites return the old 2.5 (propofol) and 2 (remifentanil) ± 0.005`, { timeout: 1_800_000 }, async () => {
    const e = createEngine({ seed: 4, mode: 'modeled', patient: { sensors: { abp: 'connected' } } });
    const pk = (e as unknown as { st: { pk: { pinClFactor?: number; pinDistQ?: number } } }).st.pk;
    pk.pinClFactor = 1; // [ENG: test] the patient's clearance as the set's
    pk.pinDistQ = 1; // [ENG: test] the patient's distribution as the set's
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5 } }));
    for (const event of LONGRUN_TCI_EVENTS) e.dispatch(cmd({ type: 'applyEvent', event }));
    e.dispatch(cmd({ type: 'applyEvent', event: { kind: 'vaporiser', agent: 'sevoflurane', dialPct: 1, fgfLpm: 2 } }));
    let last: Extract<EngineEvent, { type: 'drugs' }> | null = null;
    e.on((x) => {
      if (x.type === 'drugs') last = x;
    });
    for (let t = 60; t <= LONGRUN_S; t += 60) {
      e.advanceTo(t);
      await yieldNow();
    }
    const l = last as unknown as Extract<EngineEvent, { type: 'drugs' }>;
    const ce = (id: string) => l.drugs.find((x) => x.id === id)!.ce;
    const pump = (id: string) => l.tciPumps!.find((x) => x.drugId === id)!.ce;
    console.log(`pk-tci-pump-control ${LONGRUN_HOURS} h patient Ce propofol ${ce('propofol').toFixed(4)} remifentanil ${ce('remifentanil').toFixed(4)}; pump ${pump('propofol').toFixed(4)} / ${pump('remifentanil').toFixed(4)}`);
    expect(ce('propofol')).toBeCloseTo(2.5, 2);
    expect(ce('remifentanil')).toBeCloseTo(2, 2);
    expect(Math.abs(ce('propofol') - pump('propofol'))).toBeLessThan(0.005);
    expect(Math.abs(ce('remifentanil') - pump('remifentanil'))).toBeLessThan(0.005);
  });
});
