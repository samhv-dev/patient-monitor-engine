// FU-9 Part C (R50 ruling R3): 7c sizes the blood on FU-8's ONE continuous body-size rule (l2/body-size.ts), so the
// blood and the circulation hold one volume.
import { describe, expect, it } from 'vitest';
import { bloodPatient } from '../../../src/l2/blood/params.ts';
import { resolveProfile } from '../../../src/l2/circ/profile.ts';

describe('FU-9 Part C: one blood volume for 7c and the circulation (FU-8 A13, Lemmens-indexed size weight)', () => {
  it('adults 50–160 kg, M and F, with and without a stated height: 7c bvMl = the circulation\'s blood volume', () => {
    for (const sex of ['M', 'F'] as const) {
      for (let w = 50; w <= 160; w += 10) {
        for (const heightCm of [undefined, 160, 185]) {
          const p = { ageY: 40, sex, weightKg: w, ...(heightCm !== undefined ? { heightCm } : {}) };
          expect(bloodPatient(p).bvMl).toBeCloseTo(resolveProfile({ ...p, conditions: [] }).bloodVolumeMl, 6);
        }
      }
    }
  });
  it('the default adult (70 kg, 175 cm) holds 4 900 mL (was 4 807 with 7c\'s capped Lemmens branch); 127 kg / 175 cm 6 600 mL', () => {
    expect(bloodPatient({ ageY: 40, sex: 'M', weightKg: 70, heightCm: 175 }).bvMl).toBeCloseTo(4900, 6);
    expect(bloodPatient({ ageY: 40, sex: 'M', weightKg: 127, heightCm: 175 }).bvMl).toBeCloseTo(6600, -1);
  });
});
