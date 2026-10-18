// The two kept cards, unchanged, re-measured on the current physiology — haemorrhage → PEA → CPR and
// anaphylaxis (treated 2 min into the reaction, and untreated). A number that left its old run-sheet band is
// reported, not tuned.
import { describe, it } from 'vitest';
import { bands, first, near, range, runCard } from './harness.ts';

/** Bands: the measured prototype ± a stated tolerance. Never widened. */
const BANDS = {
  'S5 haemorrhage': { refused: [0, 0], hrAt2: [76, 86], sysAt2: [109, 119], hrAt4: [91, 101], sysAt4: [103, 113], hrAt6: [116, 126], sysAt6: [94, 104], hrAt8: [137, 147], sysAt8: [70, 80], mapAt8: [61, 71], pulseLossS: [566, 692], roscIntoCprS: [158, 194], sysOver90IntoCprS: [160, 196], sysStop60: [130, 140], diaStop60: [86, 96], hrStop60: [70, 80], etco2Stop60: [32, 38] },
  'S5 anaphylaxis': { refused: [0, 0], hrAt2: [134, 144], sysAt2: [91, 101], mapAt2: [73, 83], sysOver110S: [0, 26], hrPeak: [173, 183], sysPlus2: [113, 123], mapPlus2: [92, 102], hrPlus2: [105, 115] },
  'S5 anaphylaxis untreated': { refused: [0, 0], mapAt3: [48, 58], pulseLossS: [284, 346] },
} as const;

describe('S5 kept cards on the new physiology', { timeout: 900_000 }, () => {
  it('haemorrhage: pulse loss, CPR 15 s later, ROSC, 1 min after stopping CPR', async () => {
    const r = await runCard('showcase-haemorrhage', [
      { press: 'Start CPR, 2 L and epinephrine', when: (s) => !s.pulse, delayS: 15 },
      { press: 'Pulse back: stop CPR', when: (s) => s.state === 'resuscitation' && s.pulse && s.cpr, delayS: 10 },
    ], 1100);
    const loss = first(r.rows, (s) => !s.pulse);
    const cpr = r.pressed[0] as number;
    const stop = r.pressed[1] as number;
    bands('S5 haemorrhage', {
      refused: r.refused.length,
      hrAt2: near(r.rows, 120).hr ?? Number.NaN, sysAt2: near(r.rows, 120).sys ?? Number.NaN,
      hrAt4: near(r.rows, 240).hr ?? Number.NaN, sysAt4: near(r.rows, 240).sys ?? Number.NaN,
      hrAt6: near(r.rows, 360).hr ?? Number.NaN, sysAt6: near(r.rows, 360).sys ?? Number.NaN,
      hrAt8: near(r.rows, 480).hr ?? Number.NaN, sysAt8: near(r.rows, 480).sys ?? Number.NaN, mapAt8: near(r.rows, 480).map ?? Number.NaN,
      pulseLossS: loss?.t ?? Number.NaN,
      roscIntoCprS: (first(r.rows, (s) => s.pulse, cpr)?.t ?? Number.NaN) - cpr,
      sysOver90IntoCprS: (first(r.rows, (s) => (s.sys ?? 0) > 90, cpr)?.t ?? Number.NaN) - cpr,
      sysStop60: near(r.rows, stop + 60).sys ?? Number.NaN, diaStop60: near(r.rows, stop + 60).dia ?? Number.NaN,
      hrStop60: near(r.rows, stop + 60).hr ?? Number.NaN, etco2Stop60: near(r.rows, stop + 60).etco2 ?? Number.NaN,
    }, BANDS['S5 haemorrhage']);
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
