// Defibrillator plan E4a: the recorded-ECG rig's rules, checked on constructed recordings (the recordings themselves are
// loaded by packages/validation, test/ecg-analysis/rig-sets.test.ts, where the cache holds them).
import { describe, expect, it } from 'vitest';
import { CUDB_HELD_OUT, cudbSegments, ptbxlClass, ptbxlSegments, runRig, type RigRecording } from '../../../src/l3/ecg-analysis/rig.ts';
import { SEGMENT_S } from '../../../src/l3/ecg-analysis/features.ts';

const A = { VFON: 32, VFOFF: 33, RHYTHM: 28, NOISE: 14, ARTEFACT: 16, NORMAL: 1 };

describe('the CUDB set', () => {
  it('holds out exactly the records the engine’s VF templates were taken from (packages/validation/src/templates/extract-vf.ts)', () => {
    expect([...CUDB_HELD_OUT].sort()).toEqual(['cu07', 'cu10', 'cu11', 'cu16', 'cu21', 'cu33']);
  });

  it('cuts non-overlapping 3-s segments wholly inside a VF episode ([ … ]) and a VT rhythm interval ((VT … next rhythm)', () => {
    const fs = 250;
    const ann = [
      { sample: 10 * fs, code: A.VFON, aux: '' },
      { sample: 20 * fs, code: A.VFOFF, aux: '' },
      { sample: 30 * fs, code: A.RHYTHM, aux: '(VT' },
      { sample: 37 * fs, code: A.RHYTHM, aux: '(N' },
    ];
    const s = cudbSegments('cu99', fs, 60 * fs, ann, () => false);
    expect(s.filter((x) => x.cls === 'vf').map((x) => x.startS)).toEqual([10, 13, 16]);
    expect(s.filter((x) => x.cls === 'vt').map((x) => x.startS)).toEqual([30, 33]);
    expect(s.every((x) => x.record === 'cu99')).toBe(true);
  });

  it('a VF episode left open runs to the end of the record', () => {
    const s = cudbSegments('cu99', 250, 20 * 250, [{ sample: 12 * 250, code: A.VFON, aux: '' }], () => false);
    expect(s.map((x) => x.startS)).toEqual([12, 15]);
  });

  it('drops a segment with a noise or artefact mark from 1 s before it to its end, and a segment that touches the ADC limit (the rules of extract-vf.ts)', () => {
    const fs = 250;
    const ann = [
      { sample: 0, code: A.VFON, aux: '' },
      { sample: 3.5 * fs, code: A.NOISE, aux: '' },
      { sample: 9.5 * fs, code: A.ARTEFACT, aux: '' },
      { sample: 15 * fs, code: A.VFOFF, aux: '' },
    ];
    const sat = (a: number, b: number) => a <= 13 * fs && b > 13 * fs;
    expect(cudbSegments('cu99', fs, 20 * fs, ann, sat).map((x) => x.startS)).toEqual([0, 6]);
  });
});

describe('the PTB-XL set', () => {
  it('classes a record by its single rhythm statement; a record with none, or with two, is left out', () => {
    expect(ptbxlClass({ NORM: 100, SR: 0 })).toBe('nsr');
    expect(ptbxlClass({ SR: 0, IMI: 50 })).toBeNull(); // sinus rhythm but not a normal ECG: not the NSR class
    expect(ptbxlClass({ AFIB: 0 })).toBe('afib');
    expect(ptbxlClass({ SBRAD: 0, '1AVB': 100 })).toBe('sbrad');
    expect(ptbxlClass({ SR: 0, '3AVB': 100 })).toBe('avBlock');
    expect(ptbxlClass({ STACH: 0, AFIB: 0 })).toBeNull();
    expect(ptbxlClass({ NORM: 100 })).toBeNull();
  });
  it('a 10-s record gives three 3-s segments, from 0, 3 and 6 s', () => {
    expect(ptbxlSegments('00001_hr', 'nsr', 500, 5000).map((s) => s.startS)).toEqual([0, 3, 6]);
  });
});

describe('runRig', () => {
  it('measures every segment on its own samples and counts each class, record by record', () => {
    const fs = 250;
    const mv = Float64Array.from({ length: 12 * fs }, (_, i) => Math.sin(2 * Math.PI * 5 * (i / fs)));
    const rec: RigRecording = { set: 'cudb', id: 'cu99', fs, mv, segments: [{ record: 'cu99', startS: 0, cls: 'vf' }, { record: 'cu99', startS: 6, cls: 'vf' }] };
    const r = runRig([rec]);
    expect(r.classes.vf?.segments).toBe(2);
    expect(r.classes.vf?.records).toEqual(['cu99']);
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0]?.features.peakHz).toBeCloseTo(5, 0);
    expect(r.rows[0]?.n).toBe(SEGMENT_S * fs);
  });
  it('refuses a held-out record', () => {
    const rec: RigRecording = { set: 'cudb', id: 'cu07', fs: 250, mv: new Float64Array(750), segments: [{ record: 'cu07', startS: 0, cls: 'vf' }] };
    expect(() => runRig([rec])).toThrow(/held out/);
  });
});
