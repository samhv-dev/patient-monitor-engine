// FU-6 R9 (audit E3, D3; suite RS9 kink row; D11). Bands: kinked tube on VCV → peak ≥ Pmax − 0.5 and delivered VT
// ≤ 20 % of the set VT (RS9), displayed EtCO2 flat (< 5) within 30 s; release → VT back within 5 %. Assist-control: an
// unparalysed, unsedated patient on VCV 6/min breathes at his own rate (≥ 10 delivered breaths/min). Bucking: a
// stimulated, unsedated, unparalysed patient drives the peak ≥ 15 cmH2O above his resting peak (McCool 2006).
import { describe, expect, it } from 'vitest';
import { numSeries } from '../helpers/resp.ts';
import { fineWindow, rig6, runTo, send, st6, ventRig } from '../helpers/fu6.ts';

describe('FU-6 R9: kink, triggering, bucking (was Paw = PEEP; set RR only)', { timeout: 600_000 }, () => {
  it('kinked tube: Ppeak at Pmax, VT ≤ 100 mL, EtCO2 flat; release restores VT 500 (measured 40.0 / 68 mL / EtCO2 max 1.0 at VDs ≈ 127 mL / 494)', async () => {
    const e = rig6();
    const ev: Array<Parameters<Parameters<typeof e.on>[0]>[0]> = [];
    e.on((x) => ev.push(x), ['measurement']);
    await ventRig(e);
    await runTo(e, 300);
    send(e, { kind: 'airway', state: 'obstructed' });
    await runTo(e, 330);
    const k = await fineWindow(e, 360);
    const vtK = st6(e).resp.driver.cycles.filter((c: { mech: boolean }) => c.mech).at(-2)?.vt as number;
    const et = numSeries(ev as never, 'etco2', 330, 360).map(([, v]) => v).filter(Number.isFinite);
    send(e, { kind: 'airway', state: 'patent' });
    await runTo(e, 420);
    const vtR = st6(e).resp.driver.cycles.filter((c: { mech: boolean }) => c.mech).at(-2)?.vt as number;
    console.log(`FU-6 R9 kink: peak ${k.peak.toFixed(1)}, VT ${vtK.toFixed(0)}, EtCO2 max ${Math.max(0, ...et).toFixed(1)}; release VT ${vtR.toFixed(0)}`);
    expect(k.peak).toBeGreaterThanOrEqual(39.5);
    expect(vtK).toBeLessThanOrEqual(100);
    expect(Math.max(0, ...et)).toBeLessThan(5);
    expect(Math.abs(vtR - 500)).toBeLessThanOrEqual(25);
  });
  it('assist-control: an unsedated, unparalysed patient on VCV 6/min breathes ≥ 10 times a minute (measured 11)', async () => {
    const e = rig6();
    const breaths: number[] = [];
    e.on((x) => { if (x.type === 'breath') breaths.push(x.t); }, ['breath']);
    await runTo(e, 1);
    send(e, { kind: 'airwayDevice', device: 'ett' });
    send(e, { kind: 'ventilation', source: 'ventilator', rr: 6, vtMl: 500, peep: 5, fio2: 0.5 });
    await runTo(e, 300);
    const n = breaths.filter((t) => t > 240 && t <= 300).length; // `driver.cycles` is pruned: count the breath events
    console.log(`FU-6 R9 triggering: ${n} breaths in the last minute at a set rate of 6`);
    expect(n).toBeGreaterThanOrEqual(10);
  });
  it('bucking: stimulated, unsedated, unparalysed on VCV 12 × 500 → Ppeak ≥ resting Ppeak + 15 (measured 16.9 → 39.6)', async () => {
    const e = rig6();
    await runTo(e, 1);
    send(e, { kind: 'airwayDevice', device: 'ett' });
    send(e, { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5 });
    await runTo(e, 240);
    const rest = await fineWindow(e, 300);
    send(e, { kind: 'stimulus', intensity: 2 });
    const b = await fineWindow(e, 360);
    console.log(`FU-6 R9 bucking: resting peak ${rest.peak.toFixed(1)}, stimulated peak ${b.peak.toFixed(1)}`);
    expect(b.peak).toBeGreaterThanOrEqual(rest.peak + 15);
  });
});
