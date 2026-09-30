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
  // G-FU6-2 (orchestrator gate ruling on PR #28): a PULSELESS patient does not trigger the ventilator — the inspiratory
  // effort follows the brainstem and goes to zero with FU-4's brainstem-ischaemia withdrawal (brainstemOutF, the factor
  // that withdraws the reflex). Rig: arrest-etco2's (undrugged, unparalysed, VCV 12 × 600), VF at 60 s, CPR q 0.8 from
  // 90 s with the ventilator at 10/min. Was 14–19 triggered breaths/min during CPR (arrest-etco2 mean EtCO2 17.5 → 15.9).
  // R45 (executor, G-FU6-2 fix round): the ruled mechanism (the effort × FU-4's brainstemOutF) removes most of the
  // triggering (141 → 108 breaths in 9 min; none in the first 5 min of CPR) but not all: under CPR q 0.8 the cerebral
  // flow climbs 0.28 → 0.48 while PaCO2 rises 40 → 53, so the factor is 0.2–0.7 and the drive out-paces the set 10/min
  // from ≈ +6 min (11–15/min). Zero would need the arrest-state index (FU-4 G-FU4-1's humF) or lower thresholds — a
  // ruling, gate note §8.
  it.fails('pulseless (VF, then CPR q 0.8): no triggered breath — the ventilator delivers its set rate — measured 108 breaths in 9 min at a set 10/min (141 before the brainstem factor) (G-FU6-2)', async () => {
    const e = rig6();
    const breaths: number[] = [];
    e.on((x) => { if (x.type === 'breath') breaths.push(x.t); }, ['breath']);
    await runTo(e, 1);
    send(e, { kind: 'airwayDevice', device: 'ett' });
    send(e, { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 600, peep: 5, fio2: 0.5 });
    await runTo(e, 60);
    (e as unknown as { dispatch(c: unknown): unknown }).dispatch({ id: 'vf', issuedBy: 'test', type: 'setRhythm', rhythm: 'vfCoarse', when: 'now' });
    await runTo(e, 90);
    send(e, { kind: 'cpr', active: true, rate: 110, quality: 0.8 });
    send(e, { kind: 'ventilation', source: 'ventilator', rr: 10, vtMl: 500, peep: 5, fio2: 1 });
    await runTo(e, 690);
    const n = breaths.filter((t) => t > 150 && t <= 690).length; // 9 min of CPR at the set 10/min
    const pre = breaths.filter((t) => t > 60 && t <= 90).length; // VF before CPR at the set 12/min
    console.log(`G-FU6-2: ${n} breaths in 9 min of CPR (set 10/min), ${pre} in the 30 s of VF (set 12/min)`);
    expect(n).toBeLessThanOrEqual(91);
    expect(pre).toBeLessThanOrEqual(7);
  });
});
