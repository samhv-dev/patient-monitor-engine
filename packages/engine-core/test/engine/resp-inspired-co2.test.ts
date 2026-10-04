// FU-6 R8 (audit H1; suite RS14): FiCO2 8 mmHg (exhausted absorber) for 20 min on a fixed VCV raises PaCO2 and EtCO2.
// RS14's proposed band +6–10 at 20 min is missed (measured +5.7 / +5.0: the body's slow CO2 store fills with τ ≈ 80 min,
// so 20 min is ≈ 70 % of the +8 steady state) → it.fails with the numbers (R45); the mechanism check (was +0) is an it.
import { describe, expect, it } from 'vitest';
import { rig6, runTo, send, st6, ventRig } from '../helpers/fu6.ts';

async function run(fico2: number) {
  const e = rig6();
  await ventRig(e);
  await runTo(e, 300);
  if (fico2 > 0) send(e, { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5, fico2 });
  await runTo(e, 1500);
  return { pa: st6(e).resp.co2.pf as number, et: st6(e).resp.etco2 as number };
}

describe('FU-6 R8: rebreathing acts on PaCO2 (was 46.6 = control)', { timeout: 600_000 }, () => {
  it('FiCO2 8 for 20 min: PaCO2 and EtCO2 rise over control (mechanism present: > 3; measured +6.66 / +5.98; plan +5.7 / +5.0)', async () => {
    const c = await run(0);
    const r = await run(8);
    console.log(`FU-6 R8: PaCO2 ${c.pa.toFixed(1)} → ${r.pa.toFixed(1)}, EtCO2 ${c.et.toFixed(1)} → ${r.et.toFixed(1)}`);
    expect(r.pa - c.pa).toBeGreaterThan(3);
    expect(r.et - c.et).toBeGreaterThan(3);
  });
  // FU-8 B4 (E-FU8B-7): flipped — the anaesthetised rig's output moves with the tonic sympathetic share; EtCO2 +5.98 → +6.1
  it('RS14: FiCO2 8 for 20 min: PaCO2 and EtCO2 +6–10 over control — measured PaCO2 +6.7 / EtCO2 +6.1 after FU-8 B4 (+6.66 / +5.98 before it; FU-6 R8; plan +5.7 / +5.0)', async () => {
    const c = await run(0);
    const r = await run(8);
    expect(r.pa - c.pa).toBeGreaterThanOrEqual(6);
    expect(r.pa - c.pa).toBeLessThanOrEqual(10);
    expect(r.et - c.et).toBeGreaterThanOrEqual(6);
    expect(r.et - c.et).toBeLessThanOrEqual(10);
  });
});
