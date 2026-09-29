// FU-6 R13 (audit F3; suite RS12 sevoflurane row; D15): during one-lung ventilation at FiO2 1, sevoflurane toward 1 MAC
// lowers PaO2 by 5–20 % against the paired no-volatile run (HPV inhibition ≈ 20 % at < 1 MAC: Miller 10e ch. 49).
import { describe, expect, it } from 'vitest';
import { rig6, runTo, send, st6, ventRig } from '../helpers/fu6.ts';

async function olv(sevo: boolean) {
  const e = rig6();
  await ventRig(e, { fio2: 1 });
  await runTo(e, 600);
  send(e, { kind: 'lungCondition', id: 'olv', severity: 1, side: 'R' });
  send(e, { kind: 'ventilation', source: 'ventilator', rr: 16, vtMl: 350, peep: 5, fio2: 1 });
  await runTo(e, 1800);
  if (sevo) send(e, { kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2.5, fgfLpm: 6, n2oFrac: 0 });
  await runTo(e, 2400);
  return { pao2: st6(e).resp.o2.pao2 as number, mac: st6(e).pk.bus.cns?.macBrain ?? 0 };
}

describe('FU-6 R13: volatile HPV inhibition (was no change)', { timeout: 600_000 }, () => {
  it('sevoflurane toward 1 MAC during OLV at FiO2 1: PaO2 −5 to −20 % vs the paired control (measured 78 → 68, −11.9 % at MAC 0.84)', async () => {
    const c = await olv(false);
    const s = await olv(true);
    const d = 1 - s.pao2 / c.pao2;
    console.log(`FU-6 R13 OLV: PaO2 ${c.pao2.toFixed(0)} → ${s.pao2.toFixed(0)} (−${(100 * d).toFixed(1)} %) at MAC ${s.mac.toFixed(2)}`);
    expect(d).toBeGreaterThanOrEqual(0.05);
    expect(d).toBeLessThanOrEqual(0.2);
  });
});
