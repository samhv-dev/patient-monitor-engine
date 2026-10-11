// Stage 11 S1 (showcase-mh): malignant hyperthermia from the instructor's condition at induction (types-resp.ts
// `{ kind: 'condition', id: 'mh', severity }`, research/24 §P2), run through the card's buttons on the engine —
// treated early (2 min into the early signs), treated late (1 min into the established crisis: the run-sheet path) and
// untreated (VF from hyperthermia). Bands: docs/plans/stage-11-scenarios.md (R45).
import { describe, expect, it } from 'vitest';
import { ConsoleModel } from '../../physiology-console/model.ts';
import { labelOf } from '../glossary.ts';
import { bands, entered, first, near, range, runCard, type Act, type Sample } from './harness.ts';

/** R45 bands: the measured prototype ± the plan's tolerances (docs/plans/stage-11-scenarios.md, "Bands"). Never widened. */
const BANDS = {
  'S1 untreated': { refused: [0, 0], earlyMin: [6.16, 7.54], establishedMin: [16.89, 20.65], etco2AtEstablished: [78, 84], hrAtEstablished: [137, 147], phAtEstablished: [7.06, 7.12], kAtEstablished: [5.4, 6], lactateAtEstablished: [4.1, 5.1], mapAtEstablished: [93, 103], hrMax: [185, 195], kMax: [6.1, 6.7], lossMin: [39.91, 48.79], tcAtLoss: [42.14, 42.54], kAtLoss: [6.1, 6.7], vf: [1, 1], arrestStateMin: [40.23, 49.17] },
  'S1 early': { refused: [0, 0], crisisMin: [7.96, 9.73], pulseLost: [0, 0], recoveringMin: [15.27, 18.67], established: [0, 0], tcMax: [37.81, 38.21], hrMax: [88, 98], kMax: [4.5, 5.1], etco2Plus5: [44, 50], hrPlus15: [80, 90] },
  'S1 late': { refused: [0, 0], crisisMin: [17.79, 21.75], dantroleneMin: [18.69, 22.85], pulseLost: [0, 0], etco2AtCall: [57, 63], tcAtCall: [38.51, 38.91], kAtCall: [5.5, 6.1], phAtCall: [7.16, 7.22], etco2Plus2: [51, 57], tcMax: [39.3, 39.7], tcPeakMin: [28.05, 34.29], kMax: [5.6, 6.2], lactateMax: [6.9, 7.9], recoveringMin: [27.72, 33.88], normoMin: [35.04, 42.82], hrAt60: [86, 96], mapAt60: [107, 117], tcAt60: [38.5, 38.9], etco2At60: [35, 41], phAt60: [7.35, 7.41], kAt60: [3.5, 4.1], sysMaxAfterCall: [153, 163] },
} as const;

const ID = 'showcase-mh';
const CRISIS = 'MH crisis: stop sevoflurane, O₂ 100 % at 10 L/min, hyperventilate';
/** Explore's "Changed only" is read where the presenter opens it: just before the crisis call (19:40). */
const CALL_S = 1180;
/** The rows the run sheet points at in Explore with "Changed only" on (group:label:direction, baseline at 1:00). */
const EXPLORE_AT_CALL = [
  'monitor:HR:up', 'monitor:ART M:up', 'monitor:EtCO₂:up', 'monitor:T1:up', 'monitor:awRR:up',
  'circulation:CO:up', 'circulation:SV:down', 'circulation:SVR:up', 'circulation:LVEF:down', 'circulation:Myocardial O2 supply/demand:down',
  'blood:pH:down', 'blood:PCO₂:up', 'blood:BE:down', 'blood:Lactate:up', 'blood:K⁺:up', 'blood:Tcore:up', 'blood:VO₂:up', 'blood:SvO₂:down',
  'endocrine:MH activity:up', 'endocrine:Epinephrine:up', 'endocrine:Norepinephrine:up', 'brain:CMRO₂:up',
];
const SURGERY = { press: 'Start surgery: rocuronium 0.6 mg/kg', t: 240 };
const inCrisis = (s: Sample) => ['triggerOff', 'treating', 'recovering'].includes(s.state);
const checklist = (from: (s: Sample) => boolean, delayS: number): Act[] => [
  { press: CRISIS, when: from, delayS },
  { press: 'Dantrolene 2.5 mg/kg', when: (s) => s.state === 'triggerOff', delayS: 60 },
  { press: 'Cool: 2 L saline at room temperature', when: inCrisis, delayS: 90 },
  { press: 'Potassium: calcium chloride 10 mg/kg, insulin 10 U with dextrose', when: inCrisis, delayS: 120 },
  { press: 'Sodium bicarbonate 1 mmol/kg', when: inCrisis, delayS: 150 },
  { press: 'Dantrolene 2.5 mg/kg', when: inCrisis, delayS: 600 },
  { press: 'EtCO₂ normal: ventilation back to 12 × 500', when: (s) => s.state === 'recovering' && (s.etco2 ?? 99) < 38 },
];
/** Explore's "Changed only" rows (baseline at 1 min, as the app sets it) at `atS`, by organ group. */
function explore(atS: number): { listen: (e: Parameters<ConsoleModel['ingest']>[0]) => void; rows: () => string[] } {
  const m = new ConsoleModel();
  let snap: string[] = [];
  return {
    listen: (e) => {
      m.ingest(e);
      if (m.baseT === null && m.t >= 60) m.setBaseline();
      if (snap.length === 0 && m.t >= atS) snap = m.rows().filter((r) => r.dir && !r.internal && labelOf(r.path) !== null && typeof r.value !== 'object').map((r) => `${r.group}:${labelOf(r.path) ?? ''}:${r.dir}`);
    },
    rows: () => snap,
  };
}

describe('S1 malignant hyperthermia (showcase-mh)', { timeout: 1_800_000 }, () => {
  it('untreated: early signs, established crisis, VF from hyperthermia', async () => {
    const r = await runCard(ID, [SURGERY], 3000);
    const loss = first(r.rows, (s) => !s.pulse);
    const est = entered(r, 'established');
    bands('S1 untreated', {
      refused: r.refused.length,
      earlyMin: entered(r, 'earlySigns') / 60, establishedMin: est / 60,
      etco2AtEstablished: near(r.rows, est).etco2 ?? Number.NaN, hrAtEstablished: near(r.rows, est).hr ?? Number.NaN,
      phAtEstablished: near(r.rows, est).ph, kAtEstablished: near(r.rows, est).k, lactateAtEstablished: near(r.rows, est).lactate,
      mapAtEstablished: near(r.rows, est).map ?? Number.NaN,
      hrMax: range(r.rows, 'hr', 0, (loss?.t ?? 3000) - 5).max, kMax: range(r.rows, 'k', 0, (loss?.t ?? 3000) - 5).max,
      lossMin: (loss?.t ?? Number.NaN) / 60, tcAtLoss: loss?.tc ?? Number.NaN, kAtLoss: loss?.k ?? Number.NaN,
      vf: loss && /^vf/.test(near(r.rows, loss.t + 5).rhythm) ? 1 : 0,
      arrestStateMin: entered(r, 'arrest') / 60,
    }, BANDS['S1 untreated']);
  });

  it('treated early: crisis 2 min into the early signs', async () => {
    const r = await runCard(ID, [SURGERY, ...checklist((s) => s.state === 'earlySigns', 120)], 2400);
    const c = r.pressed[1] as number;
    bands('S1 early', {
      refused: r.refused.length, crisisMin: c / 60, pulseLost: r.rows.some((s) => !s.pulse) ? 1 : 0,
      recoveringMin: entered(r, 'recovering') / 60, established: Number.isNaN(entered(r, 'established')) ? 0 : 1,
      tcMax: range(r.rows, 'tc', 0, 2400).max, hrMax: range(r.rows, 'hr', 0, 2400).max, kMax: range(r.rows, 'k', 0, 2400).max,
      etco2Plus5: near(r.rows, c + 300).etco2 ?? Number.NaN, hrPlus15: near(r.rows, c + 900).hr ?? Number.NaN,
    }, BANDS['S1 early']);
  });

  it('treated late (the run-sheet path): crisis 1 min into the established crisis; Explore "Changed only" at the call', async () => {
    const x = explore(CALL_S);
    const r = await runCard(ID, [SURGERY, ...checklist((s) => s.state === 'established', 60)], 3600, x.listen);
    const c = r.pressed[1] as number;
    const d1 = r.pressed[2] as number;
    bands('S1 late', {
      refused: r.refused.length, crisisMin: c / 60, dantroleneMin: d1 / 60, pulseLost: r.rows.some((s) => !s.pulse) ? 1 : 0,
      etco2AtCall: near(r.rows, c).etco2 ?? Number.NaN, tcAtCall: near(r.rows, c).tc, kAtCall: near(r.rows, c).k, phAtCall: near(r.rows, c).ph,
      etco2Plus2: near(r.rows, c + 120).etco2 ?? Number.NaN,
      tcMax: range(r.rows, 'tc', c, 3600).max,
      tcPeakMin: (r.rows.filter((s) => s.t >= c).reduce((b, s) => (s.tc > b.tc ? s : b)).t) / 60,
      kMax: range(r.rows, 'k', c, 3600).max, lactateMax: range(r.rows, 'lactate', c, 3600).max,
      recoveringMin: entered(r, 'recovering') / 60, normoMin: entered(r, 'normoventilated') / 60,
      hrAt60: near(r.rows, 3599).hr ?? Number.NaN, mapAt60: near(r.rows, 3599).map ?? Number.NaN, tcAt60: near(r.rows, 3599).tc,
      etco2At60: near(r.rows, 3599).etco2 ?? Number.NaN, phAt60: near(r.rows, 3599).ph, kAt60: near(r.rows, 3599).k,
      sysMaxAfterCall: range(r.rows, 'sys', c, 3600).max,
    }, BANDS['S1 late']);
    if (process.env.PME_SHOWCASE_PRINT) console.log(`S1 explore at ${CALL_S} s: ${x.rows().join(' | ')}`);
    for (const row of EXPLORE_AT_CALL) expect(x.rows(), row).toContain(row);
  });
});
