// Stage 9 (E-S9-4, FU-5 R-FU5-6): mindray-, ge-, zoll- and lifepak-like print their own words for the arterial line
// and the temperature probe ("ART", "T1", "EtCO2"); philips-like keeps the IEC table's Philips aliases and saadat-like
// its own texts. Wording only: the level and the prefix stay the skin's.
import { describe, expect, it } from 'vitest';
import { deviceProfile } from '../../../src/l3/alarms/profile.ts';
import { fixedText, limitText } from '../../../src/l3/alarms/text.ts';

describe('per-skin alarm wording (Stage 9 E-S9-4)', () => {
  it.each(['mindray-like', 'ge-like', 'zoll-like', 'lifepak-like'])('%s: ART and T1 in fixed and limit texts', (skin) => {
    const p = deviceProfile(skin);
    expect(fixedText(p, 'abpNonPulsatile', 3, true)).toBe('ART NON-PULSATILE');
    expect(fixedText(p, 'abpDisconnect', 1, false)).toBe('***ART DISCONNECT');
    expect(fixedText(p, 'abpZero', 3, true)).toBe('ART ZEROING');
    expect(fixedText(p, 'tempProbeOff', 3, true)).toBe('T1 NO TRANSDUCER');
    expect(fixedText(p, 'VFIB', 1, false)).toBe('***VFIB/VTACH'); // ids without a skin word keep the IEC table
    const art = p.limits.ART_S;
    if (art) expect(limitText(p, art, 'LOW', 21)).toBe(`**ART S 21<${(art.low as number).toFixed(0)}`);
  });
  it('philips-like keeps the Philips aliases; saadat-like keeps its own texts', () => {
    const ph = deviceProfile('philips-like');
    expect(fixedText(ph, 'abpNonPulsatile', 3, true)).toBe('ABP NON-PULSATILE');
    expect(fixedText(ph, 'tempProbeOff', 3, true)).toBe('TEMP NO TRANSDUCER');
    expect(ph.limits.ART_S?.label).toBe('ABPs');
    expect(fixedText(deviceProfile('saadat-like'), 'abpNonPulsatile', 3, true)).toBe('IBP1 STATIC PRESSURE');
  });
});
