// Probe: command acceptance for the ET timelines (read-only).
import { A, VENTED, runArm, at } from './runner.ts';
const tries: [string, any][] = [
  ['insulin inf u/kg/h', A.infusion('insulin', 0.1, 'units/kg/h')], ['insulin inf u/h', A.infusion('insulin', 7, 'units/h')],
  ['insulin bolus', A.drug('insulin', 10, 'units')], ['dextrose 25 g', A.drug('dextrose', 25000, 'mg')], ['dextrose g', A.drug('dextrose', 25, 'g')],
  ['hydrocortisone', A.drug('hydrocortisone', 100, 'mg')], ['dexa', A.drug('dexamethasone', 8, 'mg')], ['vasopressin 1 u', A.drug('vasopressin', 1, 'units')],
  ['dka', A.cond('dka', 1)], ['mh', A.cond('mh', 1)], ['storm', A.cond('thyroidStorm', 1)], ['target temp', A.target('tempCore', 33, 600)],
  ['neuroProfile mh', A.neuroProfile({ mhSusceptible: true })], ['thermal neuraxial', A.thermal({ anaesthesia: 'neuraxial' })],
  ['thermal7e prep', A.thermal7e({ exposure: 'prep' })], ['sugammadex', A.drug('sugammadex', 2, 'mg/kg')], ['esmolol inf', A.infusion('esmolol', 100, 'mcg/kg/min')],
  ['nor inf', A.infusion('norepinephrine', 0.1, 'mcg/kg/min')], ['vaso inf', A.infusion('vasopressin', 0.04, 'units/min')], ['insulinDextrose', A.drug('insulinDextrose', 10, 'units')],
  ['meal', A.meal(75)], ['epinephrine 50 mcg', A.drug('epinephrine', 50, 'mcg')], ['phenylephrine', A.drug('phenylephrine', 100, 'mcg')],
];
const R = await runArm({ steps: tries.map(([l, b], i) => [10 + i, b, l]), tEnd: 60, patient: { endo: { diabetes: 'type1' } } });
for (const l of R.log) console.log(l);
console.log(R.rows.at(-1));
