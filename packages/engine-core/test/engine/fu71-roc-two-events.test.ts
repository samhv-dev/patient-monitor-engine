// FU-7.1 A4 (owner ruling 2026-10-07; research/24 P5b, research/26 T1): an apnoeic patient after propofol 2 mg/kg +
// rocuronium 0.6 mg/kg with no airway support is NOT rescued by the first diaphragmatic effort. Rig: probe P5's —
// 40 y 70 kg man, preoxygenated FiO2 1 for 180 s, then both drugs at once; no airway device, no ventilation. On main
// breathing returned at +946 s with a VT of 329 mL, EtCO2 36 and SaO2 75 % within 10 s, 6 s before the arrest the
// probe recorded (P5c: a lung that ventilated while pulseless). SLOW (≈ 20 s wall); one yield per sim-minute.
import { describe, expect, it } from 'vitest';
import { rig6, runTo, send, st6 } from '../helpers/fu6.ts';

describe('FU-7.1 A4: the first diaphragmatic effort after rocuronium does not rescue the apnoeic patient', { timeout: 600_000 }, () => {
  it('efforts return at 12–24 min with a VT ≤ 50 mL, no EtCO2 and no awRR, and the hypoxic course runs to the arrest (main: VT 329 mL, EtCO2 36 at +956 s)', async () => {
    const e = rig6();
    let etco2 = 0;
    let awrr = 0;
    e.on((x) => {
      if (x.type !== 'measurement') return;
      const v = (x as unknown as { values: Record<string, { value: number | null } | undefined> }).values;
      if (v.etco2) etco2 = v.etco2.value ?? 0;
      if (v.awrr) awrr = v.awrr.value ?? 0;
    });
    await runTo(e, 1);
    send(e, { kind: 'preoxygenate', fio2: 1, durationS: 180 });
    await runTo(e, 180);
    send(e, { kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg', route: 'iv' });
    send(e, { kind: 'drug', drugId: 'rocuronium', dose: 0.6, unit: 'mg/kg', route: 'iv' });
    let first = -1;
    let tArrest = -1;
    let vtMax = 0;
    let etMax = 0;
    let awMax = 0;
    await runTo(e, 180 + 1200, (u) => {
      const sp = st6(e).resp.spont as { rr: number; vt: number } | undefined;
      if (first < 0 && u > 600 && (sp?.rr ?? 0) > 0) first = u;
      if (first > 0 && tArrest < 0) { vtMax = Math.max(vtMax, sp?.vt ?? 0); etMax = Math.max(etMax, etco2); awMax = Math.max(awMax, awrr); }
      if (tArrest < 0 && st6(e).hemo.circ.arrest) tArrest = u;
    }, 2);
    // eslint-disable-next-line no-console -- the gate note's numbers
    console.log(`FU-7.1 A4 P5 rig: first effort +${first - 180} s, VT max ${vtMax.toFixed(0)} mL, EtCO2 max ${etMax}, awRR max ${awMax} until the arrest at +${tArrest - 180} s`);
    expect(first - 180).toBeGreaterThanOrEqual(12 * 60);
    expect(first - 180).toBeLessThanOrEqual(24 * 60);
    expect(vtMax).toBeLessThanOrEqual(50);
    expect(etMax).toBe(0);
    expect(awMax).toBe(0);
    expect(tArrest).toBeGreaterThan(0); // not rescued: the hypoxic course runs to the arrest
  });
});
