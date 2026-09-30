// FU-3 item 16 (E-FU3-10, orchestrator ruling 2026-09-27 17:55): brainstem anoxia stops the MODELED spontaneous drive.
// After the circulation stops, agonal gasping persists for seconds to ≈ 2 min, then apnoea (Clark JJ et al., Ann Emerg
// Med 1992;21:1464–1467; Bobrow BJ et al., Circulation 2008;118:2550–2554) [P]; the drive returns over minutes after
// the circulation does. Gate: CBF < 20 % (7d) or no flow, for > 30 s.
import { describe, expect, it } from 'vitest';
import {
  BRAINSTEM_CBF_MIN, createSpontDrive, GASP_END_S, GASP_ONSET_S, GASP_RR, GASP_VT_FRAC, GATE_REOPEN_S, stepSpontDrive,
  type SpontDrive, type SpontInputs,
} from '../../../src/l2/neuro/spont.ts';

/** Hypercapnic enough that the ungated chemoreflex breathes fast (the post-arrest patient of the review). */
const X: SpontInputs = { t: 0, paco2: 80, pao2: 60, hco3: 24, rr0: 12, vt0: 500, co2SlopeMult: 1, pMaxMult: 1, evlwi: 7, complianceMl: 55, resistance: 3 };
/** Normocapnic resting inputs: the drive returns the resting pattern (RR 12, VT 500) and fatigue stays 1. */
const REST: Partial<SpontInputs> = { paco2: 40, pao2: 95 };
/** Steps 1 s at a time from t0 to t1 (exclusive) with the given extra inputs; returns the (t, rr, vt) series. */
function run(s: SpontDrive, t0: number, t1: number, extra: Partial<SpontInputs>): Array<[number, number, number]> {
  const out: Array<[number, number, number]> = [];
  for (let t = t0; t < t1; t++) {
    stepSpontDrive(s, { ...X, ...extra, t });
    out.push([t - t0, s.rr, s.vt]);
  }
  return out;
}
const fresh = () => {
  const s = createSpontDrive();
  s.paco2Rest = 40;
  return s;
};

describe('FU-3 item 16: brainstem-perfusion gate on the MODELED drive (E-FU3-10)', () => {
  it('perfused (cbfRel ≥ 0.2, flow present): bit-identical to the ungated drive, no gate fields written', () => {
    const a = fresh();
    const b = fresh();
    run(a, 0, 120, {});
    run(b, 0, 120, { cbfRel: BRAINSTEM_CBF_MIN, noFlow: false });
    expect(b).toEqual(a);
    expect('anoxS' in b || 'gate' in b).toBe(false);
  });
  it('no flow: unchanged for 30 s, then gasps (RR ≤ 6, VT ≤ 0.3 × resting) fading to apnoea by 2 min', () => {
    const ref = run(fresh(), 0, 300, {});
    const g = run(fresh(), 0, 300, { noFlow: true });
    for (const [dt, rr, vt] of g) {
      const [, rr0, vt0] = ref[dt] as [number, number, number];
      if (dt < GASP_ONSET_S) {
        expect(rr).toBe(rr0);
        expect(vt).toBe(vt0);
      } else if (dt < GASP_END_S) {
        expect(rr).toBeLessThanOrEqual(GASP_RR);
        expect(vt).toBeLessThanOrEqual(GASP_VT_FRAC * X.vt0);
      } else {
        expect(rr).toBe(0);
        expect(vt).toBe(0);
      }
    }
    expect(ref[200]?.[1] ?? 0).toBeGreaterThan(GASP_RR); // the ungated hypercapnic drive breathes fast
  });
  it('7d CBF below 20 % closes the gate exactly as no flow does; 25 % does not', () => {
    const noFlow = run(fresh(), 0, 200, { noFlow: true });
    expect(run(fresh(), 0, 200, { cbfRel: 0.1 })).toEqual(noFlow);
    expect(run(fresh(), 0, 200, { cbfRel: 0.25 })).toEqual(run(fresh(), 0, 200, {}));
  });
  it('after perfusion returns the drive reopens linearly over GATE_REOPEN_S (resting drive: RR ≈ half at half-time, full at the end)', () => {
    const s = fresh();
    run(s, 0, 300, { ...REST, noFlow: true });
    const back = run(s, 300, 300 + GATE_REOPEN_S + 10, REST);
    const ref = run(fresh(), 0, GATE_REOPEN_S + 10, REST); // resting pattern RR 12, VT 500, no fatigue
    const half = GATE_REOPEN_S / 2;
    expect((back[half]?.[1] ?? 0) / (ref[half]?.[1] ?? 1)).toBeGreaterThan(0.45);
    expect((back[half]?.[1] ?? 1) / (ref[half]?.[1] ?? 1)).toBeLessThan(0.55);
    expect(back.at(-1)?.[1]).toBeCloseTo(ref.at(-1)?.[1] ?? Number.NaN, 9);
    expect('gate' in s || 'anoxS' in s).toBe(false); // fully reopened: no trace left
  });
  it('an interruption of ≤ 30 s leaves no trace (no gasping phase, no reopening ramp)', () => {
    const s = fresh();
    run(s, 0, GASP_ONSET_S, { ...REST, noFlow: true });
    const after = run(s, GASP_ONSET_S, GASP_ONSET_S + 60, REST);
    expect(after).toEqual(run(fresh(), GASP_ONSET_S, GASP_ONSET_S + 60, REST));
    expect('gate' in s || 'anoxS' in s).toBe(false);
  });
});
