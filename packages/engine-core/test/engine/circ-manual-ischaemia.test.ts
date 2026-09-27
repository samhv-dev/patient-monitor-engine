// FU-3 item 4 (G7d follow-through 2, tables §7 check 18 rig): 7a's MANUAL tracker narrows pulse pressure by lowering LV
// Emax. In the 75 y HTN profile (stiff LV, resting LVEDP 20) under GA and IPPV it holds 140/80 with Emax ×0.74 and LVEDP
// 26; for 90/52 it cuts Emax to ×0.43, LVEDP 29 takes CPP (aortic DBP − LVEDP) under 7a's coronary balance and the
// ischaemic spiral parks the ventricle at the kIsch floor (0.200) with LVEDP 46 while the tracker raises Emax to ×2.06 to
// hold PP. `it.fails` (R45, band unchanged): every tracker guard that keeps this ventricle perfused also refuses
// instructor pairs that Stage 2 requires to be met — a guard on coronary reserve < 2 AND LVEDP > 18 (Forrester)
// passes this rig (kIsch 0.978, LVEDP 12.2) but breaks Stage 2 acceptance 9 (NIBP at SBP 45/30 must fail: 'done') and
// misses check 18's recovery premise (MAP 76.9, CBF 0.761); a reserve-only guard (CFR < 2) also breaks Stage 2
// acceptance 3 (90/50 met ±3: 3.79) and an LVEDP-only guard (> 18) breaks acceptance 1 at HR 60 (fp − fa 0.1008).
// Whether MANUAL may refuse an instructor pair that needs an ischaemic ventricle is a ruling (FU-3 draft, open question).
import { describe, expect, it } from 'vitest';
import type { CircEvent } from '../../src/index.ts';
import { organsRig } from '../helpers/organs.ts';

describe('MANUAL MAP target in a stiff elderly ventricle (FU-3 item 4)', () => {
  it.fails('90/52 in the 75 y HTN profile under GA: no ischaemic spiral (kIsch > 0.9) and LVEDP back under the congestion threshold (18) in the last 2 min — measured kIsch 0.200, LVEDP 46.1', async () => {
    const r = organsRig({ seed: 4, patient: { ageY: 75, weightKg: 70, conditions: [{ id: 'htn' }], baseline: { sbp: 140, dbp: 80 } } });
    const circ: CircEvent[] = [];
    r.e.on((x) => circ.push(x as CircEvent), ['circ']);
    r.send({ type: 'applyEvent', event: { kind: 'thermal', anaesthesia: 'general' } });
    r.send({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', vtMl: 500, fio2: 0.25, peep: 5, rr: 18 } });
    await r.run(300);
    const t0 = r.e.now().simT;
    r.send({ type: 'setTarget', variable: 'sbp', value: 90, ramp: { durationS: 30 } });
    r.send({ type: 'setTarget', variable: 'dbp', value: 52, ramp: { durationS: 30 } });
    await r.run(240);
    const after = circ.filter((c) => c.t > t0);
    const kIsch = Math.min(...after.map((c) => c.kIsch));
    const late = after.filter((c) => c.t > t0 + 120);
    const lvedp = late.reduce((a, c) => a + c.lvedp, 0) / late.length;
    console.log(`FU-3 item 4: after 90/52 kIsch min ${kIsch.toFixed(3)}, LVEDP (last 2 min) ${lvedp.toFixed(1)}, MAP ${r.last().brain.mapHead.toFixed(1)}`);
    expect(kIsch).toBeGreaterThan(0.9); // measured 0.200 (the floor)
    expect(lvedp).toBeLessThan(18); // PCWP 18: pulmonary congestion (Forrester et al., NEJM 1976); measured 46.1
  }, 120_000);
});
