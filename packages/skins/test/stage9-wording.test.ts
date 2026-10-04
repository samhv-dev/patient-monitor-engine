// Stage 9 (E-S9-4, FU-5 R-FU5-6): the per-skin alarm wording is skin data, validated by the closed schema and sourced
// like every other skin field; philips-like and saadat-like carry none (their texts are the ones FU-5 tested).
import { describe, expect, it } from 'vitest';
import { resolveSkin } from '../src/index.ts';

describe('alarm wording (Stage 9 E-S9-4)', () => {
  it.each(['mindray-like', 'ge-like', 'zoll-like', 'lifepak-like'])('%s: ART / T1 / EtCO2 words, sourced', (id) => {
    const r = resolveSkin(id);
    expect(r.skin.alarms.wording?.texts).toMatchObject({ abpNonPulsatile: 'ART NON-PULSATILE', tempProbeOff: 'T1 NO TRANSDUCER' });
    expect(r.skin.alarms.wording?.limitLabels).toMatchObject({ ART_S: 'ART S', TEMP: 'T1', EtCO2: 'EtCO2' });
    expect(r.provenance['alarms.wording']?.source).toMatch(/research\/11 §5\.16/);
  });
  it('philips-like and saadat-like keep their own texts (no wording table)', () => {
    expect(resolveSkin('philips-like').skin.alarms.wording).toBeUndefined();
    expect(resolveSkin('saadat-like').skin.alarms.wording).toBeUndefined();
  });
});
