import { describe, expect, it } from 'vitest';
import { fillGaps } from '../../src/datasets/signals.ts';
import { findWindows, inspirationsFromAwp, selectCandidates, type Candidate } from '../../src/datasets/vitaldb.ts';
import type { VitalFile, VitalTrack } from '../../src/datasets/vital.ts';

const HEAD = 'caseid,age,sex,ane_type,aline1,opstart,opend,preop_ecg,emop,department';
const row = (id: number, age: number, sex: string, line: string, ecg = 'Normal Sinus Rhythm', ane = 'General', dur = 7200) => `${id},${age},${sex},${ane},${line},100,${100 + dur},${ecg},0,General surgery`;

describe('VitalDB candidate selection (decision 2)', () => {
  const csv = [HEAD,
    row(1, 70, 'M', 'Left radial'), row(2, 71, 'M', 'Right radial'), row(3, 30, 'F', 'Right radial'), row(4, 50, 'F', 'Right femoral'),
    row(5, 66, 'M', 'Left radial', 'Atrial fibrillation'), row(6, 45, 'M', ''), row(7, 16, 'F', 'Right radial'), row(8, 60, 'M', 'Right radial', 'Normal Sinus Rhythm', 'Spinal'),
    row(9, 55, 'F', 'Right radial', 'Normal Sinus Rhythm', 'General', 1800)].join('\n');
  it('keeps adult GA cases with a radial/femoral line and ≥ 60 min of surgery', () => {
    expect(selectCandidates(csv, 99).map((c) => c.caseid).sort()).toEqual(['0001', '0002', '0003', '0004', '0005']);
  });
  it('round-robins over strata before taking a second case from any stratum', () => {
    const first4 = selectCandidates(csv, 4).map((c) => c.caseid);
    expect(first4).not.toContain('0002'); // 0002 shares 0001's stratum (radial, 65+, M, sinus)
    expect(first4).toHaveLength(4);
  });
});

function track(name: string, kind: 'wave' | 'number', srate: number, recs: Array<{ t: number; v: number[] }>): VitalTrack {
  return { tid: 0, name, unit: '', kind, fmt: 1, srate, gain: 1, offset: 0, recs: recs.map((r) => ({ t: r.t, v: Float32Array.from(r.v) })) };
}
function synthCase(): VitalFile {
  const T = 2000;
  const wave = (fs: number, f: (t: number) => number) => [{ t: 0, v: Array.from({ length: T * fs }, (_, i) => f(i / fs)) }];
  const num = (f: (t: number) => number) => Array.from({ length: T / 2 }, (_, i) => ({ t: 2 * i, v: [f(2 * i)] }));
  const map = (t: number) => (t >= 1300 && t < 1450 ? 60 : 85);
  const tracks = new Map<string, VitalTrack>([
    ['SNUADC/ECG_II', track('SNUADC/ECG_II', 'wave', 100, wave(100, () => 0))],
    ['SNUADC/ART', track('SNUADC/ART', 'wave', 100, wave(100, (t) => map(t) + 20 * Math.sin(2 * Math.PI * t)))],
    ['SNUADC/PLETH', track('SNUADC/PLETH', 'wave', 100, wave(100, () => 1))],
    ['Primus/CO2', track('Primus/CO2', 'wave', 62.5, wave(62.5, () => 30))],
    ['Solar8000/HR', track('Solar8000/HR', 'number', 0, num(() => 80))],
    ['Solar8000/ART_SBP', track('Solar8000/ART_SBP', 'number', 0, num((t) => map(t) + 25))],
    ['Solar8000/ART_DBP', track('Solar8000/ART_DBP', 'number', 0, num((t) => map(t) - 15))],
    ['Solar8000/ART_MBP', track('Solar8000/ART_MBP', 'number', 0, num(map))],
    ['Primus/ETCO2', track('Primus/ETCO2', 'number', 0, num(() => 34))],
    ['Primus/SET_RR_IPPV', track('Primus/SET_RR_IPPV', 'number', 0, num(() => 12))],
    ['Primus/SET_TV_L', track('Primus/SET_TV_L', 'number', 0, num(() => 0.5))],
    ['Primus/SET_INTER_PEEP', track('Primus/SET_INTER_PEEP', 'number', 0, num(() => 5))],
  ]);
  return { tracks, t0: 0 };
}
const C: Candidate = { caseid: '0042', ageY: 60, sex: 'F', site: 'radial', preopEcg: 'Normal Sinus Rhythm', emergency: false, department: 'x', opstartS: 0, opendS: 2000 };

describe('VitalDB analysis windows', () => {
  it('prefers one hypotensive window, then the earliest stable one, without overlap', () => {
    const w = findWindows(synthCase(), C);
    expect(w.map((x) => [x.fromS, x.tags[0]])).toEqual([[600, 'stable'], [1080, 'hypotension']]); // 1080–1380 holds 80 s of MAP 60
    expect(w[0]).toMatchObject({ hr: 80, sbp: 110, dbp: 70, etco2: 34, vent: { rr: 12, vtMl: 500, peep: 5 }, site: 'radial' });
  });
});

describe('helpers', () => {
  it('fillGaps interpolates NaN runs and reports the fraction', () => {
    const x = Float64Array.from([1, Number.NaN, Number.NaN, 4, Number.NaN]);
    expect(fillGaps(x)).toBeCloseTo(0.6);
    expect(Array.from(x)).toEqual([1, 2, 3, 4, 4]);
  });
  it('inspirationsFromAwp finds each positive-pressure breath once', () => {
    const fs = 62.5;
    const p = Float64Array.from({ length: 60 * fs }, (_, i) => ((i / fs) % 5 < 1.5 ? 20 : 5));
    expect(inspirationsFromAwp(p, fs).map((t) => Math.round(t))).toEqual([5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
  });
});

describe('newReadings', () => {
  it('drops the 2 s repeats of the last NIBP value', async () => {
    const { newReadings } = await import('../../src/datasets/vitaldb.ts');
    expect(newReadings([[0, 80], [2, 80], [4, 80], [300, 76], [302, 76]])).toEqual([[0, 80], [300, 76]]);
  });
});
