// Defibrillator plan E1a (docs/plans/defibrillator-zoll-m2.md §2.4 S8, §3.2 item 1, §6 E1a; brief 197): the shock
// outcome's reference energy is the patient type's first-shock energy of the room's defibrillator model, not the adult
// one. On the ZOLL M2 that is 120 J adult and 50 J paediatric, Shock 1 [G 14-4] (REF 9650-000873-01 Rev. C, printed
// page 14-4). Before E1a the reference was always the adult energy, so a correct paediatric 50 J shock fell under
// LOW_ENERGY_FRACTION × 120 J = 60 J and lost half its termination. The patient type is the M2 state E0 declared
// (`m2.patientType`); its command acts from piece E1, so these tests set it through the snapshot, the path a follower
// joins by. A model with no patient type (generic, or no model) keeps the adult energy exactly as before.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import { createDevice, outcomeReferenceJ } from '../../src/l3/device-layer.ts';
import { createM2State } from '../../src/l3/defib-pacer/m2-vocabulary.ts';
import { LOW_ENERGY_FRACTION } from '../../src/l3/defib-pacer/outcome.ts';
import type { M2PatientType } from '../../src/types-device.ts';
import type { Command, EngineEvent, MonitorEngine, PatientSnapshot } from '../../src/types.ts';
import { cmd, devRig } from '../helpers/device.ts';

type Status = Extract<EngineEvent, { type: 'deviceStatus' }>;
const lastStatus = (ev: EngineEvent[]) => ev.filter((x): x is Status => x.type === 'deviceStatus').pop()!;
const model = (value: string): Command => cmd({ type: 'device', action: { device: 'defib', action: 'model', value } });
const defib = (action: string, extra: Record<string, unknown> = {}) => cmd({ type: 'applyEvent', event: { kind: 'defib', action, ...extra } as never });
const TERMINATED = new Set(['asystole', 'pea', 'rosc']);

/** A zoll-m2 room in VF at 1 s, its snapshot with the given patient type in the M2's state. */
function vfSnapshot(seed: number, type: M2PatientType): PatientSnapshot {
  const r = devRig('saadat-like', { seed });
  expect(r.e.dispatch(model('zoll-m2')).accepted).toBe(true);
  r.e.dispatch(cmd({ type: 'setRhythm', rhythm: 'vfCoarse' }));
  r.e.advanceTo(1);
  const s = structuredClone(r.e.snapshot());
  (s.state as { dev: { m2: { patientType: M2PatientType } } }).dev.m2.patientType = type;
  return s;
}

/** Restore the snapshot, select `energyJ`, charge, shock; the outcome and the full device status after it. */
function shockFrom(seed: number, s: PatientSnapshot, energyJ: number): { outcome: string; status: Status; e: MonitorEngine } {
  const e = createEngine({ seed, device: { skin: 'saadat-like' } });
  const ev: EngineEvent[] = [];
  e.on((x) => ev.push(x));
  e.restore(s);
  for (const c of [defib('selectEnergy', { energyJ }), defib('charge')]) expect(e.dispatch(c).accepted).toBe(true);
  e.advanceTo(9); // the 7 s / 200 J charge rule: 120 J ready by 1 + 4.2 s
  expect(e.dispatch(defib('shock')).accepted).toBe(true);
  e.advanceTo(10);
  const status = lastStatus(ev);
  expect(status.defib!.lastShock!.energyJ).toBe(energyJ);
  return { outcome: status.defib!.lastShock!.outcome, status, e };
}

describe('E1a: the outcome reference energy is the patient type\'s first-shock energy [G 14-4]', () => {
  it('on the M2: 120 J adult, 50 J paediatric; on generic and with no model, the adult energy whatever the monitor\'s age band', () => {
    const m2 = createDevice('saadat-like', 'adult');
    m2.defibModel = 'zoll-m2';
    m2.m2 = createM2State();
    expect(outcomeReferenceJ(m2)).toBe(120); // [G 14-4] adult Shock 1
    m2.m2.patientType = 'pediatric';
    expect(outcomeReferenceJ(m2)).toBe(50); // [G 14-4] pediatric Shock 1
    for (const band of ['adult', 'paediatric', 'neonatal'] as const) {
      const g = createDevice('saadat-like', band);
      g.defibModel = 'generic';
      expect(outcomeReferenceJ(g), `generic ${band}`).toBe(120);
      const none = createDevice('lifepak-like', band);
      expect(outcomeReferenceJ(none), `no model ${band}`).toBe(none.alarms.profile.defib!.energyAdultJ);
    }
  });

  it('a paediatric 50 J VF shock terminates exactly as an adult 120 J shock, seed for seed (40 trials, the same outcome draw)', () => {
    const N = 40;
    let adultTerm = 0;
    let paedTerm = 0;
    for (let seed = 1; seed <= N; seed++) {
      const adult = shockFrom(seed, vfSnapshot(seed, 'adult'), 120).outcome;
      const paed = shockFrom(seed, vfSnapshot(seed, 'pediatric'), 50).outcome;
      // one uniform per shock from the `outcome` stream (outcome.ts drawOutcome) and the same stream state in both
      // arms, so equal probabilities give the same outcome: the comparison is exact, not statistical
      expect(paed, `seed ${seed}`).toBe(adult);
      if (TERMINATED.has(adult)) adultTerm++;
      if (TERMINATED.has(paed)) paedTerm++;
    }
    expect(paedTerm).toBe(adultTerm);
    // the table's 90 % termination (VF_TABLE) is visible in the 40 draws; the low-energy penalty would halve it to 45 %
    expect(adultTerm).toBeGreaterThanOrEqual(30);
  });

  it('control: the adult path is unchanged, a 50 J shock on an adult M2 patient is still below half its 120 J reference', () => {
    expect(50).toBeLessThan(LOW_ENERGY_FRACTION * 120);
    let adult50 = 0;
    let paed50 = 0;
    for (let seed = 1; seed <= 40; seed++) {
      if (TERMINATED.has(shockFrom(seed, vfSnapshot(seed, 'adult'), 50).outcome)) adult50++;
      if (TERMINATED.has(shockFrom(seed, vfSnapshot(seed, 'pediatric'), 50).outcome)) paed50++;
    }
    // seed for seed the paediatric arm terminates whenever the adult arm does (its termination probability is higher
    // for the same draw), and the halved adult arm terminates in fewer of the 40
    expect(adult50).toBeLessThan(paed50);
  });

  it('a follower restored from the same snapshot and replaying the same commands holds the same state and outcome', () => {
    const s = vfSnapshot(7, 'pediatric');
    const host = shockFrom(7, s, 50);
    const follower = shockFrom(7, s, 50);
    expect(follower.outcome).toBe(host.outcome);
    expect(follower.e.snapshot().state).toEqual(host.e.snapshot().state);
    expect(follower.status).toEqual(host.status);
    // and the patient type survives the snapshot round trip
    expect(host.status.m2!.patientType).toBe('pediatric');
    expect((host.e.snapshot().state as { dev: { m2: { patientType: string } } }).dev.m2.patientType).toBe('pediatric');
  });
});
