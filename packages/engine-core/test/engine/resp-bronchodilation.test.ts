// FU-6 R2 (audit E1/E1b, suite RS7 treatment half): severe bronchospasm on VCV answers the bronchodilators through 7g's
// bus. Bands: RS7 (peak ≥ 40, auto-PEEP ≥ 8 untreated; salbutamol within 10 min peak −30 %, auto-PEEP −50 %; untreated
// no improvement) and Miller 10e bronchospasm management (adrenaline acts in minutes; deepening a volatile bronchodilates).
import { describe, expect, it } from 'vitest';
import { fineWindow, rig6, runTo, send, st6, ventRig } from '../helpers/fu6.ts';

// FU-6 F2 (Orchestrator ruling (FU-6 review), 2026-09-28): `vent` carries the ventilator overrides of the arm. Until
// Task 9 there is no Pmax, so these arms are unlimited (Ppeak 44.0, PEEPi 11.9); Task 9 sets the default to
// `{ pmax: 80 }` so the SEVERITY stays measured on an unlimited arm and adds the default-Pmax LIMIT row of its own.
// FU-6 F6: `spec` carries extra lungCondition fields (the non-responder row's `ageMin`).
async function arm(drug: Record<string, unknown> | null, cond = 'bronchospasm', at = 900, vent: Record<string, number> = {}, spec: Record<string, unknown> = {}) {
  const e = rig6();
  await ventRig(e, vent);
  await runTo(e, 600);
  send(e, { kind: 'lungCondition', id: cond, severity: 1, ...spec });
  await runTo(e, 840);
  const before = { peak: (await fineWindow(e, 900)).peak, autoPeep: st6(e).resp.lung.peepTot - 5 };
  if (drug) send(e, drug);
  await runTo(e, at + 120);
  const early = { peak: (await fineWindow(e, at + 180)).peak, autoPeep: st6(e).resp.lung.peepTot - 5 };
  await runTo(e, at + 540);
  const late = { peak: (await fineWindow(e, at + 600)).peak, autoPeep: st6(e).resp.lung.peepTot - 5, mac: st6(e).pk.bus.cns?.macBrain ?? 0 };
  console.log(`FU-6 R2 ${cond} ${drug ? JSON.stringify(drug) : 'untreated'}: peak ${before.peak.toFixed(1)} → ${early.peak.toFixed(1)} → ${late.peak.toFixed(1)}; auto-PEEP ${before.autoPeep.toFixed(1)} → ${early.autoPeep.toFixed(1)} → ${late.autoPeep.toFixed(1)}; MAC ${late.mac.toFixed(2)}`);
  return { before, early, late };
}

describe('FU-6 R2: bronchospasm answers treatment (prototype 44.0 → 23.3 with salbutamol)', { timeout: 900_000 }, () => {
  it('untreated severe bronchospasm on an unlimited arm: Ppeak ≥ 40, PEEPi ≥ 8, no improvement over 10 min (44.0 / 11.9 unlimited; the Pmax-40 arm reads its limit — Task 9)', async () => {
    const r = await arm(null);
    expect(r.before.peak).toBeGreaterThanOrEqual(40);
    expect(r.before.autoPeep).toBeGreaterThanOrEqual(8);
    expect(r.late.peak).toBeGreaterThanOrEqual(0.95 * r.before.peak);
  });
  it('salbutamol 250 µg: Ppeak −30 % and PEEPi −50 % within 10 min, measured unlimited (44.0 → 23.3, −47 %; 11.9 → 2.2, −82 %)', async () => {
    const r = await arm({ kind: 'drug', drugId: 'salbutamol', dose: 250, unit: 'mcg', route: 'iv' });
    expect(r.late.peak).toBeLessThanOrEqual(0.7 * r.before.peak);
    expect(r.late.autoPeep).toBeLessThanOrEqual(0.5 * r.before.autoPeep);
  });
  it('adrenaline 50 µg: Ppeak −30 % within 3 min (22.0), wearing off as the bolus clears', async () => {
    const r = await arm({ kind: 'drug', drugId: 'epinephrine', dose: 50, unit: 'mcg', route: 'iv' });
    expect(r.early.peak).toBeLessThanOrEqual(0.7 * r.before.peak);
    expect(r.late.peak).toBeGreaterThan(r.early.peak);
  });
  it('sevoflurane toward 1 MAC bronchodilates: Ppeak −30 % by 10 min (MAC 0.79, 40.0 → 25.0)', async () => {
    const r = await arm({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2.5, fgfLpm: 6, n2oFrac: 0 });
    expect(r.late.mac).toBeGreaterThanOrEqual(0.7); // the rig reached 0.79 MAC at 10 min (a rig check, not a band)
    expect(r.late.peak).toBeLessThanOrEqual(0.7 * r.before.peak);
  });
  it('ketamine 1 mg/kg and magnesium 2 g lower the Ppeak (31.6 at 3 min; 36.7 at 10 min)', async () => {
    const k = await arm({ kind: 'drug', drugId: 'ketamine', dose: 1, unit: 'mg/kg', route: 'iv' });
    expect(k.early.peak).toBeLessThan(0.85 * k.before.peak);
    const m = await arm({ kind: 'drug', drugId: 'magnesium', dose: 2000, unit: 'mg', route: 'iv' });
    expect(m.late.peak).toBeLessThan(0.95 * m.before.peak);
  });
  it('asthma reverses partly with salbutamol; COPD barely (37.0 → 21.3; 28.0 → 25.3)', async () => {
    const a = await arm({ kind: 'drug', drugId: 'salbutamol', dose: 250, unit: 'mcg', route: 'iv' }, 'asthma');
    expect(a.late.peak).toBeLessThanOrEqual(0.7 * a.before.peak);
    const c = await arm({ kind: 'drug', drugId: 'salbutamol', dose: 250, unit: 'mcg', route: 'iv' }, 'copd');
    expect(c.late.peak).toBeLessThan(c.before.peak);
    expect(c.late.peak).toBeGreaterThan(0.8 * c.before.peak);
  });
  it('F6 — status asthmaticus is reachable: a 12 h slow-onset severe asthma is a β2 NON-RESPONDER (Ppeak falls < 15 %; measured 37.0 → 31.9, −14 %)', async () => {
    const r = await arm({ kind: 'drug', drugId: 'salbutamol', dose: 250, unit: 'mcg', route: 'iv' }, 'asthma', 900, {}, { ageMin: 720 });
    expect(r.late.peak).toBeGreaterThan(0.85 * r.before.peak); // fresh asthma, same dose: −30 % or more (row above)
  });
});
