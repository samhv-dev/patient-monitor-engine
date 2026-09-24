import { describe, expect, it } from 'vitest';
import { createHrState, hrMeasure, hrOnQrs } from '../../src/l3/hr.ts';

function feed(rrs: number[], method: 'dropMaxMin' | 'mean12' = 'dropMaxMin') {
  const st = createHrState(method);
  let t = 10;
  hrOnQrs(st, t);
  for (const rr of rrs) hrOnQrs(st, (t += rr));
  return { st, t };
}

describe('l3/hr', () => {
  it('is invalid until two RR intervals exist', () => {
    const st = createHrState();
    expect(hrMeasure(st, 1).flag).toBe('invalid');
    hrOnQrs(st, 1);
    hrOnQrs(st, 2);
    expect(hrMeasure(st, 2.1).value).toBeNull();
    hrOnQrs(st, 3);
    expect(hrMeasure(st, 3.1)).toEqual({ value: 60, flag: 'valid', at: 3.1 });
  });

  it('drops one max and one min from the last 12 RR (IEC-style)', () => {
    const { st, t } = feed([...Array(10).fill(0.75), 0.3, 1.5]);
    expect(hrMeasure(st, t).value).toBe(80); // 0.3 and 1.5 dropped
    const m = feed([...Array(10).fill(0.75), 0.3, 1.5], 'mean12');
    expect(m.st.rrs).toHaveLength(12);
    expect(hrMeasure(m.st, m.t).value).toBe(Math.round(60 / ((10 * 0.75 + 0.3 + 1.5) / 12)));
  });

  it('keeps only the last 12 RR', () => {
    const { st } = feed([...Array(20).fill(1), ...Array(12).fill(0.5)]);
    expect(st.rrs).toEqual(Array(12).fill(0.5));
  });

  it('uses the last 4 RR when the last 3 are all > 1.2 s', () => {
    const { st, t } = feed([...Array(9).fill(0.75), 1.3, 1.4, 1.5]);
    expect(hrMeasure(st, t).value).toBe(Math.round(60 / ((0.75 + 1.3 + 1.4 + 1.5) / 4)));
  });

  it('reads 0 after 4 s without a QRS; ignores RR < 200 ms', () => {
    const { st, t } = feed(Array(12).fill(1));
    expect(hrMeasure(st, t + 3.9).value).toBe(60);
    expect(hrMeasure(st, t + 4.0).value).toBe(0);
    hrOnQrs(st, t + 0.1);
    expect(st.rrs).toHaveLength(12);
  });
});
