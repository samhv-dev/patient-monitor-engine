// Exploration probe (not a cell): prints a few rows of an arm. Usage: ./run.sh probe.ts <name>
import { A, VENTED, runArm, type Step } from './runner.ts';
const name = process.argv[2] ?? 'vf';
const P: Record<string, { steps: Step[]; tEnd: number; patient?: any; mode?: any; dt?: number; skin?: string }> = {
  vf8sinus: { steps: [...VENTED, [60, A.rhythm('vfCoarse')], [540, A.defib('preselect', { outcome: 'sinus' })], [541, A.defib('charge', { energyJ: 200 })], [550, A.defib('shock')]], tEnd: 1200 },
  vf1sinus: { steps: [...VENTED, [60, A.rhythm('vfCoarse')], [110, A.defib('preselect', { outcome: 'sinus' })], [111, A.defib('charge', { energyJ: 200 })], [120, A.defib('shock')]], tEnd: 700 },
  vf8cpr: { steps: [...VENTED, [60, A.rhythm('vfCoarse')], [360, A.cpr(true, 1)], [480, A.drug('epinephrine', 1, 'mg')], [540, A.defib('preselect', { outcome: 'sinus' })], [541, A.defib('charge', { energyJ: 200 })], [549, A.cpr(false)], [550, A.defib('shock')]], tEnd: 1200 },
  hyperk: { steps: [...VENTED], tEnd: 400, patient: { blood: { k: 9.5 } } },
  chb: { steps: [...VENTED, [60, A.rhythm('avb3Wide', { rateBpm: 30 })], [300, A.pacer('fixed', { ratePpm: 70, mA: 40 })], [360, A.pacer('fixed', { ratePpm: 70, mA: 60 })], [420, A.pacer('fixed', { ratePpm: 70, mA: 80 })]], tEnd: 600 },
  iabp: { steps: [...VENTED, [300, A.iabp('start', { ratio: 1 })]], tEnd: 600, patient: { ageY: 60, weightKg: 80, conditions: [{ id: 'hfref' }] } },
  lvad: { steps: [...VENTED, [300, A.lvad('start', 5400)]], tEnd: 700, patient: { ageY: 60, weightKg: 80, conditions: [{ id: 'hfref' }] } },
  af: { steps: [...VENTED, [60, A.rhythm('afib', { rateBpm: 110 })], [120, A.defib('syncOn')], [121, A.defib('charge', { energyJ: 150 })], [130, A.defib('shock')]], tEnd: 240 },
  vt: { steps: [...VENTED, [60, A.rhythm('vtMono', { rateBpm: 150 })], [120, A.defib('syncOn')], [121, A.defib('charge', { energyJ: 100 })], [130, A.defib('shock')]], tEnd: 240 },
  cs: { mode: 'manual', steps: [...VENTED, [30, A.target('contractility', 0.4)], [30, A.target('sbp', 85)], [30, A.target('dbp', 55)], [400, A.iabp('start', { ratio: 1 })]], tEnd: 700, patient: { ageY: 60, weightKg: 80, conditions: [{ id: 'hfref' }] } },
  csm: { steps: [...VENTED, [60, A.infusion('esmolol', 300, 'mcg/kg/min')], [400, A.iabp('start', { ratio: 1 })]], tEnd: 700, patient: { ageY: 65, weightKg: 80, conditions: [{ id: 'hfref' }, { id: 'cad', grade: 'recentMI' }] } },
  csm0: { steps: [...VENTED, [60, A.infusion('esmolol', 300, 'mcg/kg/min')]], tEnd: 700, patient: { ageY: 65, weightKg: 80, conditions: [{ id: 'hfref' }, { id: 'cad', grade: 'recentMI' }] } },
  hfI: { steps: [...VENTED, [400, A.iabp('start', { ratio: 1 })]], tEnd: 1500, patient: { ageY: 65, weightKg: 80, conditions: [{ id: 'hfref' }, { id: 'cad', grade: 'recentMI' }] } },
  vf: { steps: [...VENTED, [120, A.rhythm('vfCoarse')], [240, A.cpr(true, 1)], [600, A.drug('adrenaline', 1, 'mg')], [720, A.defib('charge', { energyJ: 200 })], [730, A.defib('shock')]], tEnd: 900 },
};
const a = P[name]!;
const R = await runArm({ ...a, dt: a.dt ?? 10, mode: a.mode });
console.log(R.log.join('\n'));
console.log(R.rejected);
for (const r of R.rows) console.log(['t','rhythm','sbp','dbp','sv','iabpAug','lvadFlow','lvadPi','lvadW','lvadSuction','pawp','dAbpS','dAbpD','dAbpF','dSpo2','dSpo2F','dPi','pulseless','map','hr','dHr','cpp','kIsch','hyp','myo','arrest','etco2','dEtco2','cbf','co','dSpo2','dSpo2F','dPr','epi','alarms'].map(k=>`${k}=${typeof r[k]==='number'?Math.round((r[k] as number)*100)/100:r[k]}`).join(' '));
console.log(R.marks.filter(m=>m.kind!=='syncR').slice(0,20));
console.log(R.rhythms);
