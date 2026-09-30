// ET MANUAL twins (research/12 §2.2: every P1 haemodynamic cell and every arrest cell also runs in MANUAL). Q9 is open,
// so they are graded direction-only against the non-reflex physiology of their MODELED twins.
import { A, GA, T, V, XA, a2, add, anyR, at, first, m, mx, w, r2, d } from './spec.ts';
import { anaArmsManual, TA } from './cells-b.ts';
import type { Row } from './runner.ts';

add({ id: 'ET-M1', tier: 'P1', ctx: 'X-A ventilated, sevoflurane GA, MANUAL', state: 'anaphylaxis grade III (severity 0.75)', intv: 'adrenaline 50 µg ×4 q3 min vs untreated (MODELED twin ET-27b)', sys: 'CIRC LUNG',
  arms: anaArmsManual,
  measure: (R) => { const i = R.iii!.rows, u = R.iiiU!.rows; const D = TA + 180; return m({ mapBase: w(u, 'map', TA - 60, TA), mapNadirU: r2(Math.min(...u.filter((x) => (x.t as number) > TA).map((x) => x.map as number))), dMap10: r2((at(i, 'map', D + 600) as number) - (at(u, 'map', D + 600) as number)),
    dLungSev: r2((at(i, 'lungSev', D + 600) as number) - (at(u, 'lungSev', D + 600) as number)), hrU: a2(u, 'hr', D + 300), hrBase: a2(u, 'hr', TA - 10) }); },
  expect: [{ m: 'dMap10', dir: 1, tol: 5, src: 'Q9 (MANUAL: the insult and the drug still act on the non-reflex physiology); AAGBI 2020' }, { m: 'dLungSev', dir: -1, tol: 0.05, src: 'AAGBI 2020 (β2 bronchodilation)' }],
  dirOnly: true, owner: 'Q9 (MANUAL physiology) / 7e conditions' });

const MHT = T + 60;
const mhM = (mh: boolean) => V([...GA(T, { nmb: 'sux' }), ...(mh ? [[MHT, A.cond('mh', 1), 'mh 1'] as [number, any, string]] : [])], MHT + 90 * 60, XA, { dt: 20, mode: 'manual' });
add({ id: 'ET-M2', tier: 'P1', ctx: 'X-A ventilated, MANUAL', state: 'MH (instructor), untreated 90 min', intv: 'EtCO2, core, K⁺ and arrest (MODELED twins ET-10b…g)', sys: 'LUNG END BLD RHY',
  arms: { i: mhM(true), c: mhM(false) },
  measure: (R) => { const i = R.i!.rows, c = R.c!.rows; const b = w(i, 'etco2', MHT - 50, MHT); const t2 = first(i, MHT, (x) => (x.etco2 as number) >= 2 * b);
    return m({ tDoubleS: Number.isFinite(t2) ? t2 - MHT : NaN, tc60: a2(i, 'tc', MHT + 3600), k20: a2(i, 'k', MHT + 1200), dHr15: r2((at(i, 'hr', MHT + 900) as number) - (at(c, 'hr', MHT + 900) as number)), map15: a2(i, 'map', MHT + 900),
      arrested: anyR(i, MHT, MHT + 5400, (x: Row) => x.arrest !== ''), arrestS: first(i, MHT, (x: Row) => x.arrest !== '') - MHT, tcMax: mx(i, 'tc', MHT, MHT + 5400) }); },
  expect: [{ m: 'tDoubleS', lo: 300, hi: 1500, invert: true, src: 'MHAUS; the gas/thermal physiology is mode-independent' }, { m: 'arrested', event: true, src: 'MHAUS; research/12 §2.2 (every arrest cell runs in MANUAL)' }],
  dirOnly: true, owner: 'Q9 / FU-4 arrest machine (MANUAL no-flow route)' });

const TI = T + 600;
const stM = (stim: boolean) => V([...GA(), ...(stim ? [[TI, A.stim(1.0), 'incision'] as [number, any, string]] : [])], TI + 2 * 3600, XA, { dt: 30, mode: 'manual' });
add({ id: 'ET-M3', tier: 'P1', ctx: 'X-A ventilated, sevoflurane GA, MANUAL', state: 'incision (stimulus 1.0, held), no opioid', intv: 'stress hormones, glucose and the pressures (MODELED twin ET-16a/c)', sys: 'END CIRC',
  arms: { i: stM(true), c: stM(false) },
  measure: (R) => { const i = R.i!.rows, c = R.c!.rows; return m({ dEpi: r2(w(i, 'epi', TI + 300, TI + 1800) - w(c, 'epi', TI + 300, TI + 1800)), dGlu2h: r2(((at(i, 'glu', TI + 7200) as number) - (at(c, 'glu', TI + 7200) as number)) / 18.016),
    dMap: r2(mx(i, 'map', TI, TI + 300) - (at(c, 'map', TI) as number)), dHr: r2(mx(i, 'hr', TI, TI + 300) - (at(c, 'hr', TI) as number)), dCort2h: r2((at(i, 'cort', TI + 7200) as number) - (at(c, 'cort', TI + 7200) as number)) }); },
  expect: [{ m: 'dGlu2h', dir: 1, tol: 0.5, src: 'Desborough 2000 (the metabolic stress response is mode-independent)' }, { m: 'dEpi', dir: 1, tol: 10, src: 'Desborough 2000' }],
  dirOnly: true, owner: 'Q9 (MANUAL: the instructor owns the pressures; the metabolic arm still runs)' });
void d;
