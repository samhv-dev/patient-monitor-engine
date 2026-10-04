// DI group G — the research/12 §5.4 rows the first auditor's files did not carry (DI-06, DI-08, DI-09), added on resume.
import { A } from './runner.ts';
import { add, d, dMax, dMin, inf, m, pctMin, pctWin, T, V, XA } from './spec.ts';

add({ id: 'DI-06', tier: 'P2', ctx: 'chronic ACE inhibitor / ARB', state: 'renin–angiotensin blockade', intv: 'propofol induction; vasopressin rescue', sys: 'CIRC', arms: {}, expect: [],
  owner: 'FU-7 profile (and FU-4’s humoral arm, which will carry angiotensin)', ne: 'no ACEi/ARB profile or angiotensin state (research/12 §5.4 blockers); FU-4’s humoral arm is the natural home of the angiotensin term' });
add({ id: 'DI-08', tier: 'P1', ctx: 'X-A vent, propofol 2 mg/kg at 240 s', state: 'GA, laryngoscopy at 300 s (7e stimulus 1.5 = laryngoscopy, hormones.ts:35, for 60 s)', intv: 'labetalol 10 mg at 180 s vs none', sys: 'CIRC END',
  arms: { i: V([d(180, 'labetalol', 10, 'mg'), d(240, 'propofol', 2, 'mg/kg'), [T, A.stim(1.5), 'laryngoscopy'], [T + 60, A.stim(0), 'tube in']], T + 600),
    c: V([d(240, 'propofol', 2, 'mg/kg'), [T, A.stim(1.5), 'laryngoscopy'], [T + 60, A.stim(0), 'tube in']], T + 600),
    n: V([d(240, 'propofol', 2, 'mg/kg')], T + 600), ln: V([d(180, 'labetalol', 10, 'mg'), d(240, 'propofol', 2, 'mg/kg')], T + 600) },
  measure: (R) => { const pc = dMax(R.c!.rows, R.n!.rows, 'map', T, T + 300); const pl = dMax(R.i!.rows, R.ln!.rows, 'map', T, T + 300);
    return m({ pressorNoLab: pc, pressorLab: pl, ratio: Math.round((pl / pc) * 100) / 100, hrRiseNoLab: dMax(R.c!.rows, R.n!.rows, 'hr', T, T + 300), hrRiseLab: dMax(R.i!.rows, R.ln!.rows, 'hr', T, T + 300) }); },
  expect: [{ m: 'pressorNoLab', lo: 15, hi: 45, src: 'laryngoscopy after propofol alone: MAP +20–40 mmHg (Miller ch. 44 airway; tables §5.3 stress response)' },
    { m: 'ratio', lo: 0.2, hi: 0.8, src: 'labetalol before laryngoscopy blunts the pressor response (Miller; Inada 1989)' }],
  owner: '7e stimulus / 7a set point (SP run)', hand: { verdict: 'TW', why: 'the laryngoscopy pressor response itself is +6 mmHg after propofol (awake +12), so the labetalol ratio cannot be read: the stimulus multiplies SVR/HR against an unchanged baroreflex set point (endo/effects.ts:51–52), which buffers it away' } });
add({ id: 'DI-09', tier: 'P1', ctx: 'X-A vent', state: 'propofol infusion 100 µg/kg/min from 60 s', intv: 'phenylephrine 0.5 µg/kg/min from 900 s vs none (neuraxial arm NE: no neuraxial event)', sys: 'CIRC',
  arms: { i: V([inf(60, 'propofol', 100, 'mcg/kg/min'), inf(900, 'phenylephrine', 0.5, 'mcg/kg/min')], 2100), p: V([inf(60, 'propofol', 100, 'mcg/kg/min')], 2100), c: V([], 2100) },
  measure: (R) => m({ mapPctProp: pctWin(R.p!.rows, R.c!.rows, 'map', 840, 900), mapPctPropPhe: pctWin(R.i!.rows, R.c!.rows, 'map', 1500, 2100), mapRisePhe: dMax(R.i!.rows, R.p!.rows, 'map', 900, 2100), hrPhe: dMin(R.i!.rows, R.p!.rows, 'hr', 900, 2100), coPctPhe: pctMin(R.i!.rows, R.p!.rows, 'co', 900, 2100) }),
  expect: [{ m: 'mapRisePhe', lo: 8, hi: 40, src: 'phenylephrine infusion holds MAP during propofol (tables §6.2: 0.15–0.5 µg/kg/min)' },
    { m: 'hrPhe', dir: -1, tol: 2, src: 'with a reflex bradycardia (tables §6.2; Miller ch. 14)' }],
  owner: '7g / 7a baroreflex' });
