// showcase-tamponade: a stab wound filling the pericardium (250 mL + 15 mL/min) → PEA → CPR → pericardio-
// centesis → ROSC, run through the card's buttons on the engine (drainage during good CPR restores the
// circulation by itself; undrained, never).
import { describe, expect, it } from 'vitest';
import type { EngineEvent } from '@pme/engine-core';
import { bands, entered, first, near, range, runCard, type Act } from './harness.ts';

/** Bands: the measured prototype ± a stated tolerance. Never widened. E117 (rc.4) re-centred ONE band on the new
 *  measurement, same ± 5: sysMaxAtRosc 155 → 199 (the highest 1-Hz systolic in the minute after ROSC — a single-beat
 *  transient; 60 s later the systolic is 122, inside its unchanged band). Every timing (pulse loss, PEA, drainage, ROSC)
 *  and every other number stayed in its band.
 *  E133 (2026-10-27) re-centred sysMaxAtRosc 196.5 → 208.5, same ± 5. No PVC comes at or after the ROSC (the drive there
 *  is the ischaemia term alone, D 0.1–0.24 with kIsch 0.70–0.78, and draws none); the ischaemic PVCs come before the
 *  arrest — singles at 439.7 and 467.2 s and a run of 4 at 469.9–471.1 s as the tamponade takes the pulse — and the
 *  run moves the pulse loss 471 → 470 s and with it the phase of every later beat against the compressions. The peak is
 *  one beat summing with a compression in the 10 s of CPR left before "Pulse back"; drainage and ROSC are at the same
 *  second (602.1, 698 s). With the PVC placement made a no-op the course is byte-identical to main (196.5). Every other
 *  S2 number stayed in its band. */
/** 2026-10-28 (hypercapnia dilates and depresses instead of pressing: audit §2.5): measured on this build at the
 *  ROSC, the patient's PaCO₂ is 55–56 mmHg with a pH of 7.26 (48 by +120 s, once ventilation has washed it out), so
 *  CO₂'s own vasodilation and myocardial depression now take ≈ 6 % each off resistance and Emax exactly where the
 *  removed multiplier had been adding ≈ 5 % to the rate and the resistance. The single-beat systolic PEAK in the 30 s
 *  after the ROSC is the number that feels it: re-centred with the SAME ± 5 (old centre → new), sysMaxAtRosc
 *  208.5 → 134.0 — the same number the two hypercapnic pressor terms had raised from 155 to 199 when E117 added the
 *  first of them. A minute later the pressure is back in its old band (sysPlus60 119.3 of [113, 123]), as are the ROSC
 *  itself (95.9 s after the drainage), the deterioration, the pulse loss, the PEA, the pulsus and the CVP. On the
 *  early-drain path the drained patient's peak systolic is 1.8 mmHg higher (sysMax 155 → 161.8, same ± 5): his PaCO₂
 *  is only mildly raised, so both new terms are small there and what is left is the baroreflex's own answer to a
 *  slightly lower pre-drain pressure. Not tuned. */
const BANDS = {
  'S2 happy': { refused: [0, 0], hrAt60: [94, 104], sysAt60: [101, 111], diaAt60: [82, 92], cvpAt60: [15, 19], etco2At60: [29, 35], pulsusMean: [0, 1.9], pulsusMax: [0, 2.6], deterioratingS: [336, 410], hrAtDeteriorating: [130, 140], cvpAtDeteriorating: [18, 22], pulseLossS: [424, 518], peaStateS: [425, 519], pea: [1, 1], drainS: [542, 662], roscAfterDrainS: [81, 111], sysPlus60: [113, 123], hrPlus60: [58, 68], cvpPlus60: [8, 12], etco2Plus60: [32, 38], sysMaxAtRosc: [129, 139], pulseHeld: [1, 1] },
  'S2 epinephrine': { refused: [0, 0], roscAfterDrainS: [79, 109] },
  'S2 undrained': { refused: [0, 0], pulseBack: [0, 0], cvpMax: [30, 34], etco2Plus3: [6, 12] },
  'S2 at ×8 poll': { refused: [0, 0], pulseLossS: [424, 518], peaStateS: [426, 520], roscAfterDrainS: [80, 110] },
  'S2 early drain': { refused: [0, 0], pulseLost: [0, 0], sysAtDrain: [55, 65], sysPlus60: [117, 127], hrPlus60: [64, 74], cvpPlus60: [5, 9], sysMax: [156.8, 166.8] },
} as const;

const ID = 'showcase-tamponade';
const CPR: Act = { press: 'Start CPR, intubate, FiO₂ 1.0', when: (s) => s.state === 'pea', delayS: 10 };
const DRAIN: Act = { press: 'Pericardiocentesis during CPR', when: (s) => s.state === 'cpr' || s.state === 'cprEpi', delayS: 120 };
const STOP: Act = { press: 'Pulse back: stop CPR', when: (s) => s.pulse && s.cpr, delayS: 10 };

/** SBP swing within each spontaneous breath (the pulsus-paradoxus measure, research/24 §P3), 60–180 s. */
function pulsus(): { listen: (e: EngineEvent) => void; mean: () => number; max: () => number } {
  const sw: number[] = [];
  let lo = Infinity;
  let hi = -Infinity;
  let started = false;
  return {
    listen: (e) => {
      if (!('t' in e) || e.t < 60 || e.t > 180) return;
      if (e.type === 'breath') {
        if (started && hi > lo) sw.push(hi - lo);
        started = true;
        lo = Infinity;
        hi = -Infinity;
      } else if (e.type === 'measurement') {
        const v = e.values.abpSys?.value;
        if (typeof v === 'number') (lo = Math.min(lo, v)), (hi = Math.max(hi, v));
      }
    },
    mean: () => sw.reduce((a, b) => a + b, 0) / sw.length,
    max: () => Math.max(...sw),
  };
}

describe('S2 stab wound: tamponade, PEA and pericardiocentesis (showcase-tamponade)', { timeout: 900_000 }, () => {
  it('happy path: CPR 10 s after the PEA, drainage 2 min into CPR, ROSC, post-ROSC', async () => {
    const p = pulsus();
    const r = await runCard(ID, [CPR, DRAIN, STOP], 1080, p.listen);
    const loss = first(r.rows, (s) => !s.pulse);
    const drain = r.pressed[1] as number;
    const rosc = first(r.rows, (s) => s.pulse, drain);
    bands('S2 happy', {
      refused: r.refused.length,
      hrAt60: near(r.rows, 60).hr ?? Number.NaN, sysAt60: near(r.rows, 60).sys ?? Number.NaN, diaAt60: near(r.rows, 60).dia ?? Number.NaN,
      cvpAt60: near(r.rows, 60).cvp ?? Number.NaN, etco2At60: near(r.rows, 60).etco2 ?? Number.NaN,
      pulsusMean: p.mean(), pulsusMax: p.max(),
      deterioratingS: entered(r, 'deteriorating'), hrAtDeteriorating: near(r.rows, entered(r, 'deteriorating')).hr ?? Number.NaN,
      cvpAtDeteriorating: near(r.rows, entered(r, 'deteriorating')).cvp ?? Number.NaN,
      pulseLossS: loss?.t ?? Number.NaN, peaStateS: entered(r, 'pea'), pea: loss && !/^vf|asystole/.test(near(r.rows, loss.t + 3).rhythm) ? 1 : 0,
      drainS: drain, roscAfterDrainS: (rosc?.t ?? Number.NaN) - drain,
      sysPlus60: near(r.rows, (rosc?.t ?? 0) + 60).sys ?? Number.NaN, hrPlus60: near(r.rows, (rosc?.t ?? 0) + 60).hr ?? Number.NaN,
      cvpPlus60: near(r.rows, (rosc?.t ?? 0) + 60).cvp ?? Number.NaN, etco2Plus60: near(r.rows, (rosc?.t ?? 0) + 60).etco2 ?? Number.NaN,
      sysMaxAtRosc: range(r.rows, 'sys', rosc?.t ?? 0, (rosc?.t ?? 0) + 30).max,
      pulseHeld: r.rows.some((s) => s.t > (rosc?.t ?? 1e9) && !s.pulse) ? 0 : 1,
    }, BANDS['S2 happy']);
  });

  it('with epinephrine 1 mg 5 s after the drainage', async () => {
    const r = await runCard(ID, [CPR, DRAIN, { press: 'Epinephrine 1 mg', when: (s) => s.state === 'cprDrained', delayS: 5 }, STOP], 900);
    const drain = r.pressed[1] as number;
    bands('S2 epinephrine', { refused: r.refused.length, roscAfterDrainS: (first(r.rows, (s) => s.pulse, drain)?.t ?? Number.NaN) - drain }, BANDS['S2 epinephrine']);
  });

  it('undrained: 10 min of CPR with epinephrine × 2 never brings the pulse back', async () => {
    const r = await runCard(ID, [CPR, { press: 'Epinephrine 1 mg', when: (s) => s.state === 'cpr', delayS: 120 },
      { press: 'Epinephrine 1 mg', when: (s) => s.state === 'cprEpi', delayS: 240 }], 1100);
    const cpr = r.pressed[0] as number;
    bands('S2 undrained', {
      refused: r.refused.length, pulseBack: r.rows.some((s) => s.t > cpr && s.pulse) ? 1 : 0,
      cvpMax: range(r.rows, 'cvp', cpr, 1100).max, etco2Plus3: near(r.rows, cpr + 180).etco2 ?? Number.NaN,
    }, BANDS['S2 undrained']);
  });

  it('at ×8 (the driver polled every 0.8 s of sim, as the app at ×8): the same states in the same order, ROSC in the same band', async () => {
    const r = await runCard(ID, [CPR, DRAIN, STOP], 1080, undefined, 0.8);
    const drain = r.pressed[1] as number;
    bands('S2 at ×8 poll', {
      refused: r.refused.length, pulseLossS: first(r.rows, (s) => !s.pulse)?.t ?? Number.NaN, peaStateS: entered(r, 'pea'),
      roscAfterDrainS: (first(r.rows, (s) => s.pulse, drain)?.t ?? Number.NaN) - drain,
    }, BANDS['S2 at ×8 poll']);
    expect(r.states.map(([, s]) => s)).toEqual(['arrival', 'deteriorating', 'pea', 'cpr', 'cprDrained', 'rosc']);
  });

  it('drained before the arrest (60 s into the deterioration): no PEA', async () => {
    const r = await runCard(ID, [{ press: 'Pericardiocentesis', when: (s) => s.state === 'deteriorating', delayS: 60 }], 900);
    const d = r.pressed[0] as number;
    bands('S2 early drain', {
      refused: r.refused.length, pulseLost: r.rows.some((s) => !s.pulse) ? 1 : 0, sysAtDrain: near(r.rows, d).sys ?? Number.NaN,
      sysPlus60: near(r.rows, d + 60).sys ?? Number.NaN, hrPlus60: near(r.rows, d + 60).hr ?? Number.NaN, cvpPlus60: near(r.rows, d + 60).cvp ?? Number.NaN,
      sysMax: range(r.rows, 'sys', d, d + 30).max,
    }, BANDS['S2 early drain']);
  });
});
