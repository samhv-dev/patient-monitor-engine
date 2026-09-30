// FU-6 R3(b) (audit E2b; D7): an effort against a closed airway lowers the pleural pressure by the muscle pressure it
// spends there (Mueller manoeuvre). Bands: the obstructed pleural minimum is ≥ 10 cmH2O below the resting breath's
// (prototype −17.0 vs −6.9 mmHg); the resting spontaneous breath is unchanged (−6.9 mmHg = P_PL0 − 4 cmH2O).
import { describe, expect, it } from 'vitest';
import { CMH2O_TO_MMHG, P_PL0 } from '../../src/l2/circ/params.ts';
import { fineWindow, rig6, runTo, send } from '../helpers/fu6.ts';

describe('FU-6 R3(b): obstructed efforts reach the pleural space (was the resting value)', { timeout: 600_000 }, () => {
  it('3 min of complete obstruction after propofol 1 mg/kg: pleural minimum ≥ 10 cmH2O below a resting breath (measured −30.1 vs −6.9 mmHg; plan −17.0 R1-emulated)', async () => {
    const e = rig6();
    await runTo(e, 480);
    send(e, { kind: 'drug', drugId: 'propofol', dose: 1, unit: 'mg/kg', route: 'iv' });
    await runTo(e, 540);
    const rest = await fineWindow(e, 600);
    send(e, { kind: 'airway', state: 'obstructed' });
    await runTo(e, 740);
    const obs = await fineWindow(e, 780);
    console.log(`FU-6 R3(b): pleural minimum resting ${rest.pplMin.toFixed(1)} mmHg, obstructed ${obs.pplMin.toFixed(1)} mmHg`);
    expect(rest.pplMin).toBeGreaterThanOrEqual(P_PL0 - 4 * CMH2O_TO_MMHG - 0.5);
    expect(obs.pplMin).toBeLessThanOrEqual(rest.pplMin - 10 * CMH2O_TO_MMHG);
  });
});
