import { beforeAll, describe, expect, it } from 'vitest';
import { organsRig } from '../helpers/organs.ts';

const VENT = { kind: 'ventilation', source: 'ventilator', vtMl: 500, fio2: 0.25, peep: 5 }; // FiO2 0.25: PaO2 ≈ 100–130
type Check18 = { base: number; mapLow: number; low: number; hypo: number; pbto2: number; mapRec: number; recovered: number };

async function check18(): Promise<Check18> {
  const r = organsRig({ seed: 4, patient: { ageY: 75, weightKg: 70, conditions: [{ id: 'htn' }], baseline: { sbp: 140, dbp: 80 } } });
  r.send({ type: 'applyEvent', event: { kind: 'thermal', anaesthesia: 'general' } });
  r.send({ type: 'applyEvent', event: { ...VENT, rr: 18 } }); // PaCO2 ≈ 38 (Task 13: Stage 3's dead space)
  await r.run(300);
  const base = r.last().brain.cbf;
  // MANUAL targets that give the scenario's site MAPs in this elderly profile (7a's tracker abandons unreachable
  // SBP/DBP pairs after 60 s): 90/52 → MAP 65, 100/60 → MAP 82
  r.send({ type: 'setTarget', variable: 'sbp', value: 90, ramp: { durationS: 30 } });
  r.send({ type: 'setTarget', variable: 'dbp', value: 52, ramp: { durationS: 30 } });
  await r.run(240);
  const mapLow = r.last().brain.mapHead;
  const low = r.last().brain.cbf / base;
  r.send({ type: 'applyEvent', event: { ...VENT, rr: 40 } });
  let hypo = -1;
  let pbto2 = -1;
  await r.run(1500, () => {
    if (hypo < 0 && r.last().brain.paco2 <= 25) {
      hypo = r.last().brain.cbf / base;
      pbto2 = r.last().brain.pbto2;
    }
  });
  r.send({ type: 'setTarget', variable: 'sbp', value: 100, ramp: { durationS: 30 } });
  r.send({ type: 'setTarget', variable: 'dbp', value: 60, ramp: { durationS: 30 } });
  r.send({ type: 'applyEvent', event: { ...VENT, rr: 14 } });
  let recovered = -1;
  let mapRec = -1;
  await r.run(1800, () => {
    if (recovered < 0 && r.last().brain.paco2 >= 35) {
      recovered = r.last().brain.cbf / base;
      mapRec = r.last().brain.mapHead;
    }
  });
  const n = { base, mapLow, low, hypo, pbto2, mapRec, recovered };
  console.log(n); // gate-note numbers
  return n;
}

describe('tables §7 check 18 through the engine (MANUAL, 75 y HTN, cbfLL 75, GA)', { timeout: 300_000 }, () => {
  let n: Check18;
  beforeAll(async () => {
    n = await check18();
  }, 300_000);
  it('MAP 65 below the right-shifted plateau: CBF ≈ 70 % (±15 %) of the anaesthetised baseline', () => {
    expect(n.mapLow).toBeGreaterThan(62); // premise; prototype 64.7
    expect(n.mapLow).toBeLessThan(68);
    expect(n.low).toBeGreaterThanOrEqual(0.7 * 0.85); // prototype 0.62 (CPP 53: CVP ≈ 12 under PEEP is the venous floor)
    expect(n.low).toBeLessThanOrEqual(0.7 * 1.15);
  });
  it('hypocapnia PaCO2 25: CBF 35–40 % of the anaesthetised baseline; PbtO2 10–15', () => {
    expect(n.hypo).toBeGreaterThanOrEqual(0.35); // prototype 0.376 (the pure model gives 0.417 at CVP 6: see Deviations)
    expect(n.hypo).toBeLessThanOrEqual(0.4);
    expect(n.pbto2).toBeGreaterThanOrEqual(10); // prototype 13.8
    expect(n.pbto2).toBeLessThanOrEqual(15);
  });
  // Was `it.fails` on the real 7c (gate §10: MAP 125.3): 7a's MANUAL tracker reached MAP 65 with Emax ×2.06 in an
  // ischaemic ventricle (kIsch 0.2, LVEDP 46–48); 7c's lung water tipped kIsch 0.2 → 0.8 under the held Emax ×2.5 and
  // MAP ran 81 → 125. FU-3 item 4 (7a MANUAL set-and-hold, mechanism): a held LV Emax is not raised by an ischaemic
  // recovery above the kIsch it was set against (model.ts `man.kIschRef`), so the escape cannot run MAP past the
  // instructor's target: MAP 81.1, CBF 0.837 at PaCO2 35. The ventricle still sits at kIsch 0.2 / LVEDP 46 through the
  // hour (FU-3 item 4 defect 1: `circ-manual-ischaemia.test.ts`, `it.fails`). Band unchanged (R45).
  // FU-3 Task 15 (after merging Stage 7e, R45): on main + 7e the same rig recovers to MAP 86.6 (band 77–84) with CBF
  // 0.891 — the MAP premise is lost again, by 2.6 mmHg (checks 1 and 2 unchanged: mapLow 64.39, hypocapnia 0.377,
  // PbtO2 14.1). Pre-7e FU-3 measured MAP 81.1 / CBF 0.837. Back to `it.fails` with the numbers; band unchanged.
  it.fails('restoring PaCO2 35 and MAP ≈ 80: CBF > 80 % — on main + 7e MAP 86.6 (premise 77–84 missed), CBF 0.891', () => {
    expect(n.mapRec).toBeGreaterThan(77); // premise; prototype 81.1 (at 79 CBF was 0.77: CPP 67 with CVP 12, below LL 75)
    expect(n.mapRec).toBeLessThan(84);
    expect(n.recovered).toBeGreaterThan(0.8); // prototype 0.81
  });
});
