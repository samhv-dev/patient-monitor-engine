import { describe, expect, it } from 'vitest';
import { csvCells, engineBeat, medianBeat } from '../../src/templates/compare-ptbxl.ts';

describe('PTB-XL comparison helpers', () => {
  it('CSV cells honour quotes; median beat is the per-sample median', () => {
    expect(csvCells('1,"{\'NORM\': 100.0, \'SR\': 0.0}",records500/00000/00001_hr')).toEqual(['1', "{'NORM': 100.0, 'SR': 0.0}", 'records500/00000/00001_hr']);
    const x = Float64Array.from({ length: 2000 }, (_, i) => (i % 500 === 200 ? 1 : 0));
    const m = medianBeat(x, [200, 700, 1200]);
    expect(m[125]).toBe(1);
    expect(m[124]).toBe(0);
  });

  it('the engine beat puts its R peak at the alignment point in lead II', () => {
    const ii = engineBeat(400)[1]!;
    let best = 0;
    for (let i = 1; i < ii.length; i++) if (ii[i]! > ii[best]!) best = i;
    expect(best).toBe(125);
  });
});
