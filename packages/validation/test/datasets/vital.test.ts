import { describe, expect, it } from 'vitest';
import { numbers, parseVital, waveSlice } from '../../src/datasets/vital.ts';
import { writeVital, type WTrack } from '../helpers/vital-writer.ts';

const ECG: WTrack = { tid: 1, name: 'ECG_II', unit: 'mV', kind: 'wave', fmt: 5, srate: 100, gain: 0.01, offset: 0, did: 7 };
const HR: WTrack = { tid: 2, name: 'HR', unit: '/min', kind: 'number', fmt: 1, srate: 0, gain: 1, offset: 0, did: 8 };

describe('.vital reader', () => {
  const file = writeVital({
    devices: [{ did: 7, name: 'SNUADC' }, { did: 8, name: 'Solar8000' }],
    tracks: [ECG, HR],
    recs: [
      { tid: 1, t: 1000, values: [0.1, 0.2, 0.3, 0.4] },
      { tid: 1, t: 1000.04, values: [0.5, 0.6] },
      { tid: 2, t: 1001, values: [72] },
      { tid: 2, t: 1003, values: [75] },
    ],
  });

  it('names tracks "<device>/<track>" and scales integer samples by gain/offset', () => {
    const f = parseVital(file);
    expect([...f.tracks.keys()].sort()).toEqual(['SNUADC/ECG_II', 'Solar8000/HR']);
    const w = waveSlice(f, 'SNUADC/ECG_II', 0, 0.08);
    expect(w.fs).toBe(100);
    expect(Array.from(w.x, (v) => +v.toFixed(3))).toEqual([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, Number.NaN, Number.NaN]);
  });

  it('returns numeric tracks as [t after the first record, value] pairs', () => {
    const f = parseVital(file);
    expect(numbers(f, 'Solar8000/HR')).toEqual([[1, 72], [3, 75]]);
    expect(numbers(f, 'Solar8000/HR', 2)).toEqual([[3, 75]]);
  });

  it('skips unwanted tracks when a filter is given', () => {
    const f = parseVital(file, new Set(['Solar8000/HR']));
    expect(f.tracks.get('SNUADC/ECG_II')?.recs.length).toBe(0);
    expect(f.tracks.get('Solar8000/HR')?.recs.length).toBe(2);
  });
});
