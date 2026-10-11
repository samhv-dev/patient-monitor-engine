// Stage 11 S4 (showcase-induction-premed): fentanyl 2 µg/kg + midazolam 0.03 mg/kg at 0:10 (the card's own timer), the
// same propofol and rocuronium at 3:00 ("Induce now", as the run sheet presses it), intubated at +90 s — with no vasopressor (the nadir the story compares with S3) and with ephedrine
// 20 s after the mean pressure falls below 60. Bands: docs/plans/stage-11-scenarios.md (R45).
import { describe, it } from 'vitest';
import { alarmAt, bands, entered, first, near, range, runCard } from './harness.ts';

/** R45 bands: the measured prototype ± the plan's tolerances (docs/plans/stage-11-scenarios.md, "Bands"). Never widened. */
const BANDS = {
  'S4 no pressor': { refused: [0, 0], premedS: [0, 25], inducedS: [162, 198], mapAt10: [91, 101], hrAt10: [66, 76], mapBefore: [85, 95], hrBefore: [57, 67], awrrBefore: [3, 7], etco2Before: [45, 51], apnoeaAlarmS: [28, 58], mapNadir: [47, 57], mapNadirS: [101, 131], hrAtNadir: [51, 61], hrMin5: [50, 60], spo2Min: [97, 100], mapAt4min: [53, 63] },
  'S4 ephedrine': { refused: [0, 0], ephedrineS: [100, 130], mapAtDose: [47, 57], hrAtDose: [51, 61], mapPlus60: [54, 64], mapPlus120: [62, 72], hrPlus120: [54, 64], mapOver65S: [81, 111], state: [1, 1] },
  'S4 phenylephrine': { refused: [0, 0], mapPlus60: [68, 78], hrPlus60: [48, 58], hrMin: [47, 57] },
} as const;

const ID = 'showcase-induction-premed';
const I = 180;
const BASE = [{ press: 'Induce now', t: I }, { press: 'Intubate and ventilate', t: I + 90 }]; // premedication at 0:10 is the card's own timer

describe('S4 induction after premedication (showcase-induction-premed)', { timeout: 900_000 }, () => {
  it('no vasopressor: the premedication, the earlier apnoea, the deeper fall', async () => {
    const r = await runCard(ID, BASE, I + 420);
    const nadir = r.rows.filter((s) => s.t >= I && s.t <= I + 300).reduce((b, s) => ((s.map ?? 999) < (b.map ?? 999) ? s : b));
    bands('S4 no pressor', {
      refused: r.refused.length,
      premedS: entered(r, 'premedicated'), inducedS: entered(r, 'induced'), mapAt10: near(r.rows, 10).map ?? Number.NaN, hrAt10: near(r.rows, 10).hr ?? Number.NaN,
      mapBefore: near(r.rows, I - 1).map ?? Number.NaN, hrBefore: near(r.rows, I - 1).hr ?? Number.NaN,
      awrrBefore: near(r.rows, I - 1).awrr ?? Number.NaN, etco2Before: near(r.rows, I - 1).etco2 ?? Number.NaN,
      apnoeaAlarmS: alarmAt(r, /APNEA/, I) - I,
      mapNadir: nadir.map ?? Number.NaN, mapNadirS: nadir.t - I, hrAtNadir: nadir.hr ?? Number.NaN,
      hrMin5: range(r.rows, 'hr', I, I + 300).min, spo2Min: range(r.rows, 'spo2', I, I + 420).min,
      mapAt4min: near(r.rows, I + 240).map ?? Number.NaN,
    }, BANDS['S4 no pressor']);
  });

  it('ephedrine 10 mg 20 s after the mean falls below 60', async () => {
    const r = await runCard(ID, [...BASE, { press: 'Ephedrine 10 mg', when: (s) => s.t > I && (s.map ?? 99) < 60, delayS: 20 }], I + 600);
    const e = r.pressed[2] as number;
    bands('S4 ephedrine', {
      refused: r.refused.length, ephedrineS: e - I,
      mapAtDose: near(r.rows, e).map ?? Number.NaN, hrAtDose: near(r.rows, e).hr ?? Number.NaN,
      mapPlus60: near(r.rows, e + 60).map ?? Number.NaN, mapPlus120: near(r.rows, e + 120).map ?? Number.NaN,
      hrPlus120: near(r.rows, e + 120).hr ?? Number.NaN,
      mapOver65S: (first(r.rows, (s) => (s.map ?? 0) >= 65, e)?.t ?? Number.NaN) - e,
      state: r.states.at(-1)?.[1] === 'maintained' ? 1 : 0,
    }, BANDS['S4 ephedrine']);
  });

  it('phenylephrine 100 µg at the same moment (the alternative button)', async () => {
    const r = await runCard(ID, [...BASE, { press: 'Phenylephrine 100 µg', when: (s) => s.t > I && (s.map ?? 99) < 60, delayS: 20 }], I + 600);
    const e = r.pressed[2] as number;
    bands('S4 phenylephrine', {
      refused: r.refused.length, mapPlus60: near(r.rows, e + 60).map ?? Number.NaN, hrPlus60: near(r.rows, e + 60).hr ?? Number.NaN,
      hrMin: range(r.rows, 'hr', e, e + 180).min,
    }, BANDS['S4 phenylephrine']);
  });
});
