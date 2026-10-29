// showcase-induction: the healthy induction, run through its buttons on the engine — the prompt path
// (induce at 3:00, intubate 90 s later), the airway-not-secured path left alone to the arrest, the same path induced a
// minute late (the oxygen is held until "Induce now": waiting costs nothing), an early bag-mask rescue, a late tube
// rescue, and CPR after the hypoxic arrest.
import { describe, it } from 'vitest';
import { alarmAt, bands, entered, first, near, range, runCard } from './harness.ts';

/** Bands: the measured prototype ± a stated tolerance. Never widened.
 *  fix-cerebral-dilator-reserve (2026-10-29): ONE measure left its band and is recorded as the `it.fails` below, its band
 *  unchanged — S3 untreated sao260ToLossS 615 → 567 s (band 571–697): the pulse is lost 48 s sooner (1181 → 1133 s from
 *  the induction). On main the asphyxiated brain's flow was CO2 × hypoxia × the pressure limb with no shared ceiling,
 *  3.2–3.7 × normal at CPP 47–54 (PaCO2 at the clamp, SaO2 ≈ 0), so the vasomotor centre's perfusion gate
 *  (`brainstemOutF`, full at 0.6) never closed before the circulation stopped; with the reserve the flow is the
 *  maximally dilated flow, 1.16 at CPP 67 and falling with the pressure, the gate starts closing at 1006 s from the
 *  induction (main: never), and the sympathetic support goes earlier. Every other S3 measure is unchanged. */
const BANDS = {
  'S3 prompt': { refused: [0, 0], mapBefore: [90, 100], hrBefore: [66, 76], apnoeaAlarmS: [41, 71], mapNadir: [60, 70], mapNadirS: [90, 120], hrMax5: [74, 84], hrMin5: [65, 75], capnoS: [0, 21], etco2At2min: [34, 40], spo2Min: [97, 100], mapAt4min: [67, 77] },
  'S3 untreated': { refused: [0, 0], apnoeaAlarmS: [41, 71], lastBreathS: [33, 63], desatStateS: [445, 543], bradyStateS: [509, 623], hrAtBrady: [39, 49], spo2ZeroS: [652, 796], mapAtSpo2Zero: [72, 82], pulseLossS: [1080, 1320], sao260ToLossS: [571, 697], pulselessStateS: [1084, 1324], asystole: [1, 1], firstSpontS: [831, 1015], firstSpontMl: [31, 41], spontMaxMl: [36, 46], effortStateS: [831, 1015], effortLabelLagS: [-15, 15], etco2DuringEfforts: [0, 3], awrrDuringEfforts: [0, 2] },
  'S3 induced late': { refused: [0, 0], inducedS: [225, 255], desatStateS: [445, 543], bradyStateS: [509, 623] },
  'S3 rescue bag-mask': { refused: [0, 0], pulseLost: [0, 0], spo2Over90S: [17, 47], hrOver60S: [0, 19], mapAt5min: [78, 88], etco2At5min: [45, 51] },
  'S3 rescue at 18 min': { refused: [0, 0], pulseLost: [0, 0], mapAtTube: [40, 50], spo2Over90S: [31, 61], mapMax5: [94, 104], triggeredS: [1026, 1254] },
  'S3 CPR': { refused: [0, 0], cprS: [1093, 1335], pulseBack: [0, 0], spo2DuringCpr: [97, 100], etco2DuringCpr: [31, 37], mapDuringCpr: [45, 55] },
} as const;

const ID = 'showcase-induction';
const I = 180; // the run sheet's "Induce now" at 3:00, after 3 minutes of preoxygenation (the card holds FiO2 1.0 until then)
const INDUCE = { press: 'Induce now', t: I };

describe('S3 healthy induction (showcase-induction)', { timeout: 900_000 }, () => {
  it('prompt path: apnoea alarm, the induction fall, the capnogram after intubation', async () => {
    const r = await runCard(ID, [INDUCE, { press: 'Intubate and ventilate', t: I + 90 }], I + 420);
    const nadir = r.rows.filter((s) => s.t >= I && s.t <= I + 300).reduce((b, s) => ((s.map ?? 999) < (b.map ?? 999) ? s : b));
    bands('S3 prompt', {
      refused: r.refused.length,
      mapBefore: near(r.rows, I - 1).map ?? Number.NaN, hrBefore: near(r.rows, I - 1).hr ?? Number.NaN,
      apnoeaAlarmS: alarmAt(r, /APNEA/, I) - I,
      mapNadir: nadir.map ?? Number.NaN, mapNadirS: nadir.t - I,
      hrMax5: range(r.rows, 'hr', I, I + 300).max, hrMin5: range(r.rows, 'hr', I, I + 300).min,
      capnoS: (first(r.rows, (s) => (s.etco2 ?? 0) >= 25, I + 90)?.t ?? Number.NaN) - (I + 90),
      etco2At2min: near(r.rows, I + 90 + 120).etco2 ?? Number.NaN,
      spo2Min: range(r.rows, 'spo2', I, I + 420).min,
      mapAt4min: near(r.rows, I + 240).map ?? Number.NaN,
    }, BANDS['S3 prompt']);
  });

  /** The airway-not-secured path induced at `at` (s), nothing else pressed; times are from the induction. */
  async function unsecured(at: number, untilS: number) {
    const r = await runCard(ID, [{ press: 'Induce now', t: at }], untilS);
    const loss = first(r.rows, (s) => !s.pulse);
    const sao260 = first(r.rows, (s) => s.sao2 < 0.6, at);
    const zero = first(r.rows, (s) => (s.spo2 ?? 100) <= 1, at);
    return { r, loss, sao260, zero };
  }

  // One run shared by the course test and its recorded miss (fix-cerebral-dilator-reserve).
  let untreatedRun: Promise<Record<string, number>> | undefined;
  const untreated = () => (untreatedRun ??= (async () => {
    const { r, loss, sao260, zero } = await unsecured(I, I + 1300);
    return {
      refused: r.refused.length,
      apnoeaAlarmS: alarmAt(r, /APNEA/, I) - I, lastBreathS: (r.spont.filter(([t]) => t > I && t < I + 120).at(-1)?.[0] ?? Number.NaN) - I,
      desatStateS: entered(r, 'desaturating') - I, bradyStateS: entered(r, 'bradycardic') - I,
      hrAtBrady: near(r.rows, entered(r, 'bradycardic') + 10).hr ?? Number.NaN,
      spo2ZeroS: (zero?.t ?? Number.NaN) - I, mapAtSpo2Zero: zero?.map ?? Number.NaN,
      pulseLossS: (loss?.t ?? Number.NaN) - I, sao260ToLossS: (loss?.t ?? Number.NaN) - (sao260?.t ?? Number.NaN),
      pulselessStateS: entered(r, 'pulseless') - I,
      asystole: loss && near(r.rows, loss.t + 5).rhythm === 'asystole' ? 1 : 0,
      firstSpontS: (r.spont.find(([t]) => t > I + 120)?.[0] ?? Number.NaN) - I,
      firstSpontMl: r.spont.find(([t]) => t > I + 120)?.[1] ?? Number.NaN,
      spontMaxMl: Math.max(...r.spont.filter(([t]) => t > I + 120 && t < (loss?.t ?? 0)).map(([, v]) => v)),
      effortStateS: entered(r, 'firstEffort') - I,
      effortLabelLagS: entered(r, 'firstEffort') - (r.spont.find(([t]) => t > I + 120)?.[0] ?? Number.NaN), // D-3: the label and the first effort together
      etco2DuringEfforts: range(r.rows, 'etco2', entered(r, 'firstEffort'), (loss?.t ?? 0) - 1).max,
      awrrDuringEfforts: range(r.rows, 'awrr', entered(r, 'firstEffort'), (loss?.t ?? 0) - 1).max,
    };
  })());
  const { sao260ToLossS: s3uMissBand, ...s3uKept } = BANDS['S3 untreated'];
  it('airway not secured, nothing done: desaturation, hypoxic bradycardia, the first ineffective efforts, asystole at ≈ 20 min', async () => {
    bands('S3 untreated', await untreated(), s3uKept);
  });
  it.fails('S3 untreated: SaO2 below 60 % to the pulse loss 571–697 s — measured 567 s (fix-cerebral-dilator-reserve: the brainstem perfusion gate closes once the dilator reserve is spent)', async () => {
    const got = await untreated();
    bands('S3 untreated', { sao260ToLossS: got.sao260ToLossS as number }, { sao260ToLossS: s3uMissBand });
  });

  it('induced a minute late (4:00): the oxygen was held, so the desaturation keeps its time from the induction', async () => {
    const L = I + 60;
    const { r } = await unsecured(L, L + 620);
    bands('S3 induced late', {
      refused: r.refused.length, inducedS: entered(r, 'induced'),
      desatStateS: entered(r, 'desaturating') - L, bradyStateS: entered(r, 'bradycardic') - L,
    }, BANDS['S3 induced late']);
  });

  it('early rescue: bag-mask 10 s into the bradycardia, tube 60 s later — no arrest, SpO2 back', async () => {
    const r = await runCard(ID, [INDUCE,
      { press: 'Bag-mask ventilate, FiO₂ 1.0', when: (s) => s.state === 'bradycardic', delayS: 10 },
      { press: 'Intubate and ventilate, FiO₂ 1.0', when: (s) => s.state === 'rescuedBvm', delayS: 60 }], I + 1000);
    const bvm = r.pressed[1] as number;
    bands('S3 rescue bag-mask', {
      refused: r.refused.length, pulseLost: r.rows.some((s) => !s.pulse) ? 1 : 0,
      spo2Over90S: (first(r.rows, (s) => (s.spo2 ?? 0) >= 90, bvm)?.t ?? Number.NaN) - bvm,
      hrOver60S: (first(r.rows, (s) => (s.hr ?? 0) >= 60, bvm)?.t ?? Number.NaN) - bvm,
      mapAt5min: near(r.rows, bvm + 300).map ?? Number.NaN, etco2At5min: near(r.rows, bvm + 300).etco2 ?? Number.NaN,
    }, BANDS['S3 rescue bag-mask']);
  });

  it('late rescue: tube at +18 min (SpO2 0 for 6 min) — the pulse holds; the diaphragm comes back as triggered breaths', async () => {
    const t = I + 1080;
    const r = await runCard(ID, [INDUCE, { press: 'Intubate and ventilate, FiO₂ 1.0', t }], t + 420);
    bands('S3 rescue at 18 min', {
      refused: r.refused.length, pulseLost: r.rows.some((s) => !s.pulse) ? 1 : 0,
      mapAtTube: near(r.rows, t).map ?? Number.NaN,
      spo2Over90S: (first(r.rows, (s) => (s.spo2 ?? 0) >= 90, t)?.t ?? Number.NaN) - t,
      mapMax5: range(r.rows, 'map', t, t + 300).max,
      triggeredS: (first(r.rows, (s) => (s.awrr ?? 0) >= 16, t + 60)?.t ?? Number.NaN) - I,
    }, BANDS['S3 rescue at 18 min']);
  });

  it('CPR after the hypoxic arrest: asystole does not come back — 10 min of CPR, FiO2 1.0, epinephrine × 2', async () => {
    const r = await runCard(ID, [INDUCE,
      { press: 'Start CPR, intubate, FiO₂ 1.0', when: (s) => s.state === 'pulseless', delayS: 10 },
      { press: 'Epinephrine 1 mg', when: (s) => s.state === 'cpr', delayS: 120 },
      { press: 'Epinephrine 1 mg', when: (s) => s.state === 'cprEpi', delayS: 240 }], I + 1900);
    const cpr = r.pressed[1] as number;
    bands('S3 CPR', {
      refused: r.refused.length, cprS: cpr - I,
      pulseBack: r.rows.some((s) => s.t > cpr && s.pulse) ? 1 : 0,
      spo2DuringCpr: near(r.rows, cpr + 180).spo2 ?? Number.NaN, etco2DuringCpr: near(r.rows, cpr + 180).etco2 ?? Number.NaN,
      mapDuringCpr: near(r.rows, cpr + 180).map ?? Number.NaN,
    }, BANDS['S3 CPR']);
  });
});
