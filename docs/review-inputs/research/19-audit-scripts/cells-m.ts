// CM MANUAL twins (research/12 §2.2: every P1 haemodynamic cell also runs in MANUAL). Ali's Q9 (what MANUAL physiology
// should be) is open, so these are graded direction-only and read beside their MODELED twins.
import { add, ASx, d, HF, hemo, m, T, V, XE } from './spec.ts';

const pro = (t: number, mgkg = 2) => d(t, 'propofol', mgkg, 'mg/kg');
const MAN = { mode: 'manual' as const };
const twin = (id: string, ctx: string, patient: Record<string, unknown>, mgkg: number, of: string) => add({
  id, tier: 'P1', ctx: `${ctx}, ventilated, MANUAL (MODELED twin ${of})`, state: 'GA', intv: `propofol ${mgkg} mg/kg`, sys: 'CIRC',
  arms: { i: V([pro(T, mgkg)], T + 900, patient, MAN), c: V([], T + 900, patient, MAN) },
  measure: (R) => m(hemo(R.i!.rows, R.c!.rows, T)),
  expect: [{ m: 'mapPct', dir: -1, tol: 5, src: 'Q9 open: in MANUAL the non-reflex physiology still acts (audit 08 Q9); direction only' }],
  owner: 'Q9 (MANUAL physiology)',
});
twin('CM-M1', 'X-E 80 y', XE, 1.5, 'CM-01b');
twin('CM-M2', 'AS severe + CAD + HTN 75 y', ASx, 1.5, 'CM-05a');
twin('CM-M3', 'hfref 60 y', HF, 2, 'CM-06b');
