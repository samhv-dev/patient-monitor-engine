// The two kept cards re-measured on the current physiology — haemorrhage (since E120/E121, 2026-10-24: room air, the
// owner's PEA → asystole → VF → shock → ROSC course; new bands, measured on this build ± the old tolerances) and
// anaphylaxis (unchanged: treated 2 min into the reaction, and untreated). A number that left its band is reported,
// not tuned.
import { describe, expect, it } from 'vitest';
import { bands, entered, first, near, pvcEvents, range, runCard, type Act } from './harness.ts';

/** Bands: the measured prototype ± a stated tolerance. Never widened. */
const BANDS = {
  'S5 haemorrhage E120': { refused: [0, 0], notPressed: [0, 0], hrAt4: [91, 101], sysAt4: [102, 112], hrAt8: [138, 148], sysAt8: [71, 81], mapAt8: [61, 71], junctionalS: [502, 614], peaStateS: [563, 689], pulseLossS: [594, 726], peaOnJunctional: [1, 1], agonalS: [695, 849], asystoleS: [838, 1024], asystoleAfterLossS: [244, 298], cprS: [851, 1041], cppAt60: [15, 23], cppAtCheck1: [23.6, 31.6], myoAtCheck1: [0.5, 0.74], check1IntoCprS: [119, 122], shock1S: [970, 1186], shock1Outcome: [2, 2], myoAtShock2: [0.85, 1], cppAtCheck2: [23, 31], cppAtShock2: [3.8, 11.8], shock2S: [1089, 1331], shock2Outcome: [3, 3], roscAfterShock2S: [60, 75], roscAfterLossS: [552, 674], sysStop60: [129.5, 139.5], mapStop60: [94, 104], hrStop60: [67, 77], etco2Stop60: [44, 52], spo2Stop60: [97, 100], pulseLostAfterStop: [0, 0] },
  // E133 (ventricular ectopy from the physiology), measured on this build: ischaemic PVCs in the junctional minute
  // before the pulse loss (kIsch 0.94 → 0.55), none while pulseless, and PVCs after the return of circulation (pH
  // 7.13–7.15 with the epinephrine reaching the beating heart); the course above is unchanged second by second.
  'S5 haemorrhage E133 ectopy': { eventsBeforeLoss: [3, 12], eventsPulseless: [0, 0], eventsAfterRosc: [1, 8] },
  'S5 haemorrhage E120 timing': { lossEarlyVentS: [595, 727], lossLateVentS: [594, 726], asystoleEarlyVentS: [833, 1018], asystoleLateVentS: [842, 1029], noVentPulseLost: [0, 0], noVentSysAt10: [71.6, 81.6], noVentMinSys: [68, 78] },
  'S5 anaphylaxis': { refused: [0, 0], hrAt2: [134, 144], sysAt2: [91, 101], mapAt2: [73, 83], sysOver110S: [0, 26], hrPeak: [173, 183], sysPlus2: [113, 123], mapPlus2: [92, 102], hrPlus2: [105, 115] },
  'S5 anaphylaxis untreated': { refused: [0, 0], mapAt3: [48, 58], pulseLossS: [284, 346] },
} as const;

const CPR = 'Start CPR: compressions, bag via the tube 10/min, FiO₂ 1.0';
const PULSE_CHECK = 'Pulse check';
/** The E120 kit-round path: oxygen at `o2`, the ventilator at `vent`; the PEA left to turn to asystole; CPR 15 s into
 *  asystole, volume +10 s, epinephrine +10 s, the first pulse check 2 min into CPR; Charge 200 J 3 s into VF and Shock
 *  at +12 s (the Defib tab's events); the second pulse check 2 min after the first shock; "Pulse back" 10 s after the
 *  model's pulse returns. */
const HAEM_PATH = (o2: number, vent: number): Act[] => [
  { press: 'Oxygen by face mask, FiO₂ 1.0', t: o2 },
  { press: 'Intubate and ventilate, FiO₂ 1.0', t: vent },
  { press: CPR, when: (s) => s.state === 'asystole', delayS: 15 },
  { press: '2 L warmed crystalloid and 2 units of red cells', when: (s) => s.state === 'cpr', delayS: 10 },
  { press: 'Epinephrine 1 mg', when: (s) => s.state === 'cprRunning', delayS: 10 },
  { press: PULSE_CHECK, when: (s) => s.state === 'cprRunning', delayS: 108 },
  { press: 'charge', send: { kind: 'defib', action: 'charge', energyJ: 200 }, when: (s) => s.state === 'vf', delayS: 3 },
  { press: 'shock', send: { kind: 'defib', action: 'shock', energyJ: 200 }, when: (s) => s.state === 'vf', delayS: 12 },
  { press: PULSE_CHECK, when: (s) => s.state === 'postShock1', delayS: 120 },
  { press: 'charge', send: { kind: 'defib', action: 'charge', energyJ: 200 }, when: (s) => s.state === 'vf2', delayS: 3 },
  { press: 'shock', send: { kind: 'defib', action: 'shock', energyJ: 200 }, when: (s) => s.state === 'vf2', delayS: 12 },
  { press: 'Pulse back: stop CPR', when: (s) => s.state === 'postShock2' && s.pulse, delayS: 10 },
];

describe('S5 kept cards on the new physiology', { timeout: 900_000 }, () => {
  // E120 (owner, 2026-10-24): class IV bleeding → PEA on a junctional rhythm → asystole untreated → CPR with fluids and
  // blood → VF at the first pulse check → shock → ROSC. Room air until the card's oxygen and ventilator steps (E121).
  // The card scripts the junctional rhythm and VF (twice: the engine seed's first shock ends VF in asystole, see the
  // card's notes); the arrest, the PEA decay to asystole, the CPP, each shock's outcome and the ROSC are the model's.
  // E126 (2026-10-26): compressions pause at each pulse check until the shock, so the CPP CPR built (band 23–31, read
  // 1 s before shock 2 with compressions on until E126) is read 1 s before the second pulse check (cppAtCheck2), and
  // the CPP 1 s before shock 2 is now the pause's (cppAtShock2: measured 7.8, new band ± 4). Nothing else moved.
  it('haemorrhage (E120): the owner\'s course on the kit-round path, two shocks, ROSC', async () => {
    const shocks: string[] = [];
    const r = await runCard('showcase-haemorrhage', HAEM_PATH(30, 60), 1500, (e) => {
      const x = e as { type: string; defib?: { lastShock: { t: number; outcome: string } | null } | null };
      const ls = x.type === 'deviceStatus' ? x.defib?.lastShock : null;
      if (ls && !shocks.includes(`${ls.t}`)) shocks.push(`${ls.t}`, ls.outcome);
    });
    const loss = first(r.rows, (s) => !s.pulse);
    const asy = entered(r, 'asystole');
    const cpr = entered(r, 'cpr');
    const pc1 = entered(r, 'vf');
    const sh1 = entered(r, 'postShock1');
    const sh2 = entered(r, 'postShock2');
    const back = first(r.rows, (s) => s.pulse, sh2);
    const stop = entered(r, 'rosc');
    const onset = loss ? near(r.rows, loss.t + 5) : undefined;
    const out = (n: number) => ['unchanged', 'vf', 'asystole', 'pea', 'rosc', 'sinus'].indexOf(shocks[2 * n + 1] ?? '');
    bands('S5 haemorrhage E120', {
      refused: r.refused.length, notPressed: r.pressed.filter((x) => Number.isNaN(x)).length,
      hrAt4: near(r.rows, 240).hr ?? Number.NaN, sysAt4: near(r.rows, 240).sys ?? Number.NaN,
      hrAt8: near(r.rows, 480).hr ?? Number.NaN, sysAt8: near(r.rows, 480).sys ?? Number.NaN, mapAt8: near(r.rows, 480).map ?? Number.NaN,
      junctionalS: entered(r, 'junctional'), peaStateS: entered(r, 'pea'), pulseLossS: loss?.t ?? Number.NaN,
      peaOnJunctional: onset?.rhythm === 'junctionalEscape' ? 1 : 0,
      agonalS: first(r.rows, (s) => s.rhythm === 'agonal')?.t ?? Number.NaN, asystoleS: asy, asystoleAfterLossS: asy - (loss?.t ?? Number.NaN),
      cprS: cpr, cppAt60: near(r.rows, cpr + 60).cpp, cppAtCheck1: near(r.rows, pc1 - 1).cpp, myoAtCheck1: near(r.rows, pc1 - 1).myo,
      check1IntoCprS: pc1 - cpr, shock1S: sh1, shock1Outcome: out(0), myoAtShock2: near(r.rows, sh2 - 1).myo, cppAtCheck2: near(r.rows, entered(r, 'vf2') - 1).cpp, cppAtShock2: near(r.rows, sh2 - 1).cpp,
      shock2S: sh2, shock2Outcome: out(1), roscAfterShock2S: (back?.t ?? Number.NaN) - sh2, roscAfterLossS: (back?.t ?? Number.NaN) - (loss?.t ?? Number.NaN),
      sysStop60: near(r.rows, stop + 60).sys ?? Number.NaN, mapStop60: near(r.rows, stop + 60).map ?? Number.NaN,
      hrStop60: near(r.rows, stop + 60).hr ?? Number.NaN, etco2Stop60: near(r.rows, stop + 60).etco2 ?? Number.NaN, spo2Stop60: near(r.rows, stop + 60).spo2 ?? Number.NaN,
      pulseLostAfterStop: r.rows.some((s) => s.t > stop && !s.pulse) ? 1 : 0,
    }, BANDS['S5 haemorrhage E120']);
    bands('S5 haemorrhage E133 ectopy', {
      eventsBeforeLoss: pvcEvents(r, 0, loss?.t ?? Number.NaN).length,
      eventsPulseless: pvcEvents(r, (loss?.t ?? Number.NaN) + 2, back?.t ?? Number.NaN).length,
      eventsAfterRosc: pvcEvents(r, back?.t ?? Number.NaN).length,
    }, BANDS['S5 haemorrhage E133 ectopy']);
  });

  it('haemorrhage (E120): the same course whenever the ventilator comes (0:30 or 3:00), and none without it', async () => {
    const shocksOf = async (o2: number, vent: number) => {
      const shocks: string[] = [];
      const r = await runCard('showcase-haemorrhage', HAEM_PATH(o2, vent), 1500, (e) => {
        const x = e as { type: string; defib?: { lastShock: { t: number; outcome: string } | null } | null };
        const ls = x.type === 'deviceStatus' ? x.defib?.lastShock : null;
        if (ls && !shocks.includes(`${ls.t}`)) shocks.push(`${ls.t}`, ls.outcome);
      });
      return { r, outcomes: `${shocks[1]}/${shocks[3]}` };
    };
    const early = await shocksOf(10, 30);
    const late = await shocksOf(30, 180);
    expect(early.outcomes).toBe('asystole/pea');
    expect(late.outcomes).toBe('asystole/pea');
    const none = await runCard('showcase-haemorrhage', [{ press: 'Oxygen by face mask, FiO₂ 1.0', t: 30 }], 900);
    bands('S5 haemorrhage E120 timing', {
      lossEarlyVentS: first(early.r.rows, (s) => !s.pulse)?.t ?? Number.NaN, lossLateVentS: first(late.r.rows, (s) => !s.pulse)?.t ?? Number.NaN,
      asystoleEarlyVentS: entered(early.r, 'asystole'), asystoleLateVentS: entered(late.r, 'asystole'),
      noVentPulseLost: none.rows.some((s) => !s.pulse) ? 1 : 0, noVentSysAt10: near(none.rows, 600).sys ?? Number.NaN, noVentMinSys: range(none.rows, 'sys', 60, 900).min,
    }, BANDS['S5 haemorrhage E120 timing']);
  });

  it('anaphylaxis: epinephrine 100 µg 2 min into the reaction', async () => {
    const r = await runCard('showcase-anaphylaxis', [{ press: 'Give epinephrine 100 µg', t: 180 }], 480);
    bands('S5 anaphylaxis', {
      refused: r.refused.length,
      hrAt2: near(r.rows, 180).hr ?? Number.NaN, sysAt2: near(r.rows, 180).sys ?? Number.NaN, mapAt2: near(r.rows, 180).map ?? Number.NaN,
      sysOver110S: (first(r.rows, (s) => (s.sys ?? 0) > 110, 180)?.t ?? Number.NaN) - 180,
      hrPeak: range(r.rows, 'hr', 180, 300).max,
      sysPlus2: near(r.rows, 300).sys ?? Number.NaN, mapPlus2: near(r.rows, 300).map ?? Number.NaN, hrPlus2: near(r.rows, 300).hr ?? Number.NaN,
    }, BANDS['S5 anaphylaxis']);
  });

  it('anaphylaxis untreated: the pulse is lost', async () => {
    const r = await runCard('showcase-anaphylaxis', [], 600);
    bands('S5 anaphylaxis untreated', {
      refused: r.refused.length, mapAt3: near(r.rows, 240).map ?? Number.NaN, pulseLossS: first(r.rows, (s) => !s.pulse)?.t ?? Number.NaN,
    }, BANDS['S5 anaphylaxis untreated']);
  });
});
