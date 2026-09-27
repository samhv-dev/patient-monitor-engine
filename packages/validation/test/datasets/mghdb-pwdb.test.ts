import { describe, expect, it } from 'vitest';
import { mghMeta } from '../../src/datasets/mghdb.ts';
import { pwdbStats } from '../../src/datasets/pwdb.ts';

const HEA = `mgh021 8 360/0.476 1166400 16:47:00 31/05/1991
mgh021.dat 212 288(-287)/mV 12 0 -340 53095 0 ECG lead I
mgh021.dat 212 240(-80)/mV 12 0 -25 17726 0 ECG lead II
mgh021.dat 212 224(-14)/mV 12 0 -61 47853 0 ECG lead V
mgh021.dat 212 16.7(-1431)/mmHg 12 0 -25 23760 0 ART
mgh021.dat 212 34.34(-1643)/mmHg 12 0 -1063 46565 0 PAP
mgh021.dat 212 19.8(-1181)/mmHg 12 0 -1052 43543 0 OFF
mgh021.dat 212 1000 12 0 -65 4256 0 Resp. Imp.
mgh021.dat 212 1000 12 0 908 3418 0 CO2
#<age>: 75 <sex>: M <diagnoses>: Upper GI bleeding
# UNDERLYING RHYTHM:
#   Normal sinus rhythm @ 92 bpm
# MODE OF VENTILATION:
#   Controlled
`;

describe('MGH/MF header metadata', () => {
  it('reads age, sex, diagnosis, rhythm, ventilation and maps channels (OFF is skipped)', () => {
    const m = mghMeta(HEA);
    expect(m).toMatchObject({ record: 'mgh021', ageY: 75, sex: 'M', diagnosis: 'Upper GI bleeding', rhythm: 'Normal sinus rhythm @ 92 bpm', ventilation: 'Controlled' });
    expect(m.channels).toEqual({ ecgI: 0, ecgII: 1, ecgV: 2, abp: 3, pap: 4, resp: 6, co2: 7 });
  });
});

describe('PWDB per-site/age statistics', () => {
  it('gives p10/p50/p90 in ms and drops failed (non-positive) onsets', () => {
    const csv = ['Subject Number, Age, Radial_PTT, Radial_SBP_T', '1,25,0.080,0.110', '2,25,0.090,0.120', '3,25,-0.6,0.100', '4,35,0.070,0.100'].join('\n');
    const s = pwdbStats(csv, ['Radial']);
    expect(s).toEqual([
      { site: 'Radial', ageY: 25, n: 3, pttMs: [80, 90, 90], sysAfterFootMs: [100, 110, 120] },
      { site: 'Radial', ageY: 35, n: 1, pttMs: [70, 70, 70], sysAfterFootMs: [100, 100, 100] },
    ]);
  });
});
