// Patient profiles for the Start screen and the Patient tab (brief §4.9 "one Patient card"). A profile is fixed when the
// engine is created, so changing it restarts the patient (a confirm dialog says what resets). Comorbidities map 1:1
// onto the engine's R22 profile (`conditions`) and 7b's lung catalogue (`lungConditions`).
import type { PatientProfile, SensorId } from '@pme/engine-core';

export interface PatientSpec {
  ageY: number;
  sex: 'M' | 'F';
  weightKg: number;
  heightCm: number;
  /** Comorbidity ids from COMORBIDITIES. */
  comorbid: string[];
  /** Start with the monitoring sensors attached (else learners attach them: traces appear only after, Laerdal). */
  attached: boolean;
}

export interface Comorbidity {
  id: string;
  label: string;
  profile: Pick<PatientProfile, 'conditions' | 'lungConditions'>;
  /** Shown but not selectable yet (v1.1: 7j obstetric, R60). */
  later?: string;
}

export const COMORBIDITIES: readonly Comorbidity[] = [
  { id: 'htn', label: 'Hypertension', profile: { conditions: [{ id: 'htn' }] } },
  { id: 'cad', label: 'Coronary artery disease (stable)', profile: { conditions: [{ id: 'cad', grade: 'stable' }] } },
  { id: 'as', label: 'Aortic stenosis (severe)', profile: { conditions: [{ id: 'as', grade: 'severe' }] } },
  { id: 'hfref', label: 'Heart failure (reduced EF)', profile: { conditions: [{ id: 'hfref' }] } },
  { id: 'betaBlocked', label: 'β-blocked', profile: { conditions: [{ id: 'betaBlocked' }] } },
  { id: 'copd', label: 'COPD', profile: { lungConditions: [{ id: 'copd', severity: 0.5 }] } },
  { id: 'asthma', label: 'Asthma', profile: { lungConditions: [{ id: 'asthma', severity: 0.4 }] } },
  { id: 'obesity', label: 'Obesity', profile: { lungConditions: [{ id: 'obesity', severity: 0.6 }] } },
  { id: 'aki', label: 'Acute kidney injury', profile: { conditions: [{ id: 'aki' }] } },
  { id: 'pregnancy', label: 'Pregnancy (term)', profile: {}, later: 'v1.1' },
];

export interface PatientPreset {
  id: string;
  label: string;
  spec: PatientSpec;
}

const base = { heightCm: 175, comorbid: [] as string[], attached: true };
export const PATIENT_PRESETS: readonly PatientPreset[] = [
  { id: 'adult', label: 'Healthy adult', spec: { ...base, ageY: 40, sex: 'M', weightKg: 70 } },
  { id: 'elderly', label: 'Older, hypertensive', spec: { ...base, ageY: 75, sex: 'M', weightKg: 75, comorbid: ['htn', 'cad'] } },
  { id: 'cardiac', label: 'Aortic stenosis and CAD', spec: { ...base, ageY: 72, sex: 'F', weightKg: 64, heightCm: 160, comorbid: ['htn', 'as', 'cad'] } },
  { id: 'hfref', label: 'Heart failure', spec: { ...base, ageY: 60, sex: 'M', weightKg: 80, comorbid: ['hfref', 'betaBlocked'] } },
  { id: 'copd', label: 'COPD smoker', spec: { ...base, ageY: 66, sex: 'M', weightKg: 68, comorbid: ['copd'] } },
  { id: 'child', label: 'Child, 6 years', spec: { ...base, ageY: 6, sex: 'F', weightKg: 20, heightCm: 115 } },
];

const MONITORING: Partial<Record<SensorId, string>> = { ecg: 'on', spo2: 'on', nibp: 'on', co2: 'on', temp: 'on' };
const DETACHED: Partial<Record<SensorId, string>> = { ecg: 'off', spo2: 'off', nibp: 'off', co2: 'off', temp: 'off' };

export function profileOf(s: PatientSpec): PatientProfile {
  const picked = COMORBIDITIES.filter((c) => s.comorbid.includes(c.id) && !c.later);
  const conditions = picked.flatMap((c) => c.profile.conditions ?? []);
  const lungConditions = picked.flatMap((c) => c.profile.lungConditions ?? []);
  return {
    ageY: s.ageY, sex: s.sex, weightKg: s.weightKg, heightCm: s.heightCm,
    sensors: s.attached ? MONITORING : DETACHED,
    ...(conditions.length ? { conditions } : {}),
    ...(lungConditions.length ? { lungConditions } : {}),
  };
}

/** The session bar's one-liner: "M 60 y 80 kg, heart failure (reduced EF), β-blocked". */
export function oneLiner(s: PatientSpec): string {
  const lc = (t: string) => (/^[A-Z]{2}/.test(t) ? t : `${t.charAt(0).toLowerCase()}${t.slice(1)}`);
  const c = COMORBIDITIES.filter((x) => s.comorbid.includes(x.id)).map((x) => lc(x.label));
  return [`${s.sex} ${s.ageY} y ${s.weightKg} kg`, ...c].join(', ');
}

/** Age band of the monitor (alarm defaults): the skin's paediatric table under 12 years. */
export const ageBandOf = (s: PatientSpec): 'adult' | 'paediatric' => (s.ageY < 12 ? 'paediatric' : 'adult');
