import { describe, expect, it } from 'vitest';
import { deviceProfile } from '../../../src/l3/alarms/profile.ts';
import { fixedText, limitText } from '../../../src/l3/alarms/text.ts';

describe('alarm texts', () => {
  const ph = deviceProfile('philips-like');
  const sa = deviceProfile('saadat-like');
  it('IEC-style: asterisks by level and value>limit (brief §6.4)', () => {
    expect(limitText(ph, ph.limits.HR!, 'HIGH', 131)).toBe('**HR 131>120');
    expect(limitText(ph, ph.limits.SpO2!, 'LOW', 88)).toBe('**SpO2 88<90');
    expect(fixedText(ph, 'ASYSTOLE', 1, false)).toBe('***ASYSTOLE');
    expect(fixedText(ph, 'ecgLeadsOff', 3, true)).toBe('ECG LEADS OFF');
  });
  it('Saadat-like: uppercase, no asterisks (brief §6.4.1)', () => {
    expect(limitText(sa, sa.limits.HR!, 'LOW', 40)).toBe('HR TOO LOW');
    expect(limitText(sa, sa.limits.SpO2!, 'LOW', 85)).toBe('%SPO2 LOW');
    expect(fixedText(sa, 'ASYSTOLE', 1, false)).toBe('ECG ASYSTOLE');
    expect(fixedText(sa, 'ecgLeadsOff', 3, true)).toBe('ECG CHECK LA/RA/LL');
  });
});
