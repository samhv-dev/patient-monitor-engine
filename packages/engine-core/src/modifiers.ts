import type { ArtefactSpec, Modifiers, ModifiersPatch } from './types.ts';

/** Default artefact levels: only Stage 1's white noise is on. */
export function defaultArtefact(): ArtefactSpec {
  return { noise: 1, wander: 0, mains: 0, emg: 0, shiver: 0, motion: 0, leadOff: false, electrosurgery: null, cpr: null, shock: null };
}

/** Default modifiers (brief §5 defaults; awake-adult HRV per §4.1; K 4.2 mmol/L and 37 °C are textbook normals [ENG]). */
export function defaultModifiers(): Modifiers {
  return {
    pvc: null, pac: null, pjc: null,
    rsa: 0.67, hrvScale: 1, qtc: 400,
    bbb: 'none', axisDeg: null, transitionLead: null, lowVoltage: 1, lvh: false,
    st: null, ischaemicDepressionMv: 0, tInversion: 0,
    longQT: false, brugada1: false, digoxin: false, alternans: 0,
    k: 4.2, tempC: 37, overrides: {},
    patientSeed: 0, morphologyVariation: 0,
    epinephrineAtS: null, tcp: null,
    artefact: defaultArtefact(),
  };
}

/** Apply a setModifiers patch: top-level keys replace, `artefact` and `overrides` merge key by key. */
export function mergeModifiers(base: Modifiers, patch: ModifiersPatch): Modifiers {
  const { artefact, overrides, ...rest } = patch;
  return {
    ...base,
    ...rest,
    artefact: { ...base.artefact, ...(artefact ?? {}) },
    overrides: overrides === undefined ? base.overrides : { ...overrides },
  };
}

export { validateModifiers } from './l2/ecg/modifier-schema.ts';
