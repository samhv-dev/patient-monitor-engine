// The scenario's patient body → the engine's creation options (brief §7.4; R22; FU-3 item 9). A pme-scenario/1
// setup batch only sends rhythm, targets and sensors (runner.start): the body — age, size, sex, baseline, the R22
// profile (7a/7d conditions, 7b lung conditions incl. pregnancy), 7c blood and 7f neuro — is fixed when the host
// creates its engine, so every host (the validation segment runner, a demo host) builds it from this one mapping.
import type { EngineOptions, PatientProfile } from '@pme/engine-core';
import type { ScenarioDoc } from './types.ts';

/** EngineOptions for `doc` (engine seed `seed`); keys the document does not set are left out, so defaults apply. */
export function engineOptionsOf(doc: ScenarioDoc, seed = 1): EngineOptions {
  const p = doc.patient ?? {};
  const pr = p.profile ?? {};
  const patient: PatientProfile = {
    ...(p.ageY !== undefined ? { ageY: p.ageY } : {}),
    ...(p.weightKg !== undefined ? { weightKg: p.weightKg } : {}),
    ...(p.heightCm !== undefined ? { heightCm: p.heightCm } : {}),
    ...(p.sex ? { sex: p.sex } : {}),
    ...(p.baseline ? { baseline: p.baseline } : {}),
    ...(p.blood ? { blood: p.blood } : {}),
    ...(p.neuro ? { neuro: p.neuro } : {}),
    ...(p.endo ? { endo: p.endo } : {}), // FU-8 (research/19 §5): 7e's endocrine profile
    ...(pr.conditions ? { conditions: pr.conditions } : {}),
    ...(pr.lungConditions ? { lungConditions: pr.lungConditions } : {}),
  };
  return { seed, patient, device: { ...(p.ageBand ? { ageBand: p.ageBand } : {}), ...(doc.device?.skin ? { skin: doc.device.skin } : {}) } };
}
