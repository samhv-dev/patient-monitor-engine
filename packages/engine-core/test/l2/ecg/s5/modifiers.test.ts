import { describe, expect, it } from 'vitest';
import { defaultModifiers, mergeModifiers, validateModifiers } from '../../../../src/modifiers.ts';

describe('Stage 5 modifiers: defaults, merge, validation', () => {
  it('defaults keep Stage 1 behaviour (only white noise on, textbook morphology)', () => {
    const d = defaultModifiers();
    expect(d).toMatchObject({ pvc: null, rsa: 0.67, hrvScale: 1, qtc: 400, bbb: 'none', k: 4.2, tempC: 37, morphologyVariation: 0 });
    expect(d.artefact).toEqual({ noise: 1, wander: 0, mains: 0, emg: 0, shiver: 0, motion: 0, leadOff: false, electrosurgery: null, cpr: null, shock: null });
  });

  it('merge: top-level keys replace; artefact merges key by key; overrides replace as a whole', () => {
    const a = mergeModifiers(defaultModifiers(), { k: 6.5, artefact: { mains: 0.4 }, overrides: { qtMs: 450 } });
    const b = mergeModifiers(a, { artefact: { emg: 0.2 }, overrides: { prMs: 220 } });
    expect(b.k).toBe(6.5);
    expect(b.artefact).toMatchObject({ noise: 1, mains: 0.4, emg: 0.2 });
    expect(b.overrides).toEqual({ prMs: 220 });
  });

  it('validation: accepts in-range patches and names the first bad field', () => {
    expect(validateModifiers({ st: { territory: 'inferior', mm: 2 }, bbb: 'lbbb', k: 7, artefact: { cpr: { rateCpm: 110, depth: 0.5 } } })).toBeUndefined();
    expect(validateModifiers({ pvc: { pattern: 'couplet', probability: 0.2 } })).toBeUndefined();
    expect(validateModifiers({ bogus: 1 } as never)).toMatch(/unknown modifiers: bogus/);
    expect(validateModifiers({ pvc: { pattern: 'quad' as never, probability: 0.1 } })).toMatch(/pvc.pattern/);
    expect(validateModifiers({ st: { territory: 'anterior', mm: 9 } })).toMatch(/st.mm/);
    expect(validateModifiers({ k: 12 })).toMatch(/k must be/);
    expect(validateModifiers({ artefact: { mains: 2 } })).toMatch(/artefact.mains/);
    expect(validateModifiers({ artefact: { nope: 1 } as never })).toMatch(/unknown artefact keys/);
    expect(validateModifiers({ tcp: { mode: 'demand', ratePpm: 70, mA: 250, thresholdMa: 70 } })).toMatch(/tcp.mA/);
  });
});
