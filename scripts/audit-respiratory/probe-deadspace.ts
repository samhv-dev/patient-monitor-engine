// Probe: FU-4's ONE physical series dead space by patient and airway (FU-6 Task 1; reconstruction).
import { dirname, join } from 'node:path';
const { physicalDeadSpace, gasPatient } = (await import(join(dirname(process.env.PME_ENGINE as string), 'l2/gas/params.ts'))) as any;
const P: [string, Record<string, unknown>][] = [['adult 70 kg M', { ageY: 40, weightKg: 70, heightCm: 175, sex: 'M' }], ['adult 60 kg F', { ageY: 40, weightKg: 60, heightCm: 165, sex: 'F' }], ['obese 127 kg', { ageY: 40, weightKg: 127, heightCm: 175 }], ['child 16 kg', { ageY: 4, weightKg: 16, heightCm: 102 }], ['infant 7 kg', { ageY: 0.5, weightKg: 7, heightCm: 67 }]];
console.log(['patient', 'natural', 'ETT/SGA'].join('\t'));
for (const [lab, p] of P) { const g = gasPatient(p); console.log([lab, physicalDeadSpace(g, false).toFixed(0), physicalDeadSpace(g, true).toFixed(0)].join('\t')); }
