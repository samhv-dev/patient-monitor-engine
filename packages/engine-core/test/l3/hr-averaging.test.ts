// E-4a-2 (deferred in 4a/4b, FU-1 item 8): an optional time-window HR average, from the skin field
// `hr.averaging: { kind: 'beats' | 'seconds', n }`. Without the field the HR is computed exactly as before.
import { describe, expect, it } from 'vitest';
import { resolveSkin } from '@pme/skins';
import { validate } from '@pme/skins/validate';
import { createHrState, hrAveragingOf, hrMeasure, hrOnQrs, type HrAveraging } from '../../src/l3/hr.ts';

/** Feed R waves at RR 1.0 s until t0, then RR 0.5 s (60 → 120 bpm step); return the HR at each whole second. */
function stepRun(avg?: HrAveraging, method: 'dropMaxMin' | 'mean12' = 'dropMaxMin') {
  const st = createHrState(method);
  const out = new Map<number, number | null>();
  let t = 0;
  let nextSec = 1;
  while (t < 60) {
    t += t < 30 ? 1.0 : 0.5;
    hrOnQrs(st, t);
    while (nextSec <= t) {
      out.set(nextSec, hrMeasure(st, nextSec, avg).value);
      nextSec++;
    }
  }
  return out;
}

describe('HR averaging option (E-4a-2)', () => {
  it('default unchanged: no averaging field gives the same numbers as before (trimmed mean of 12, mean of 12)', () => {
    const a = stepRun();
    expect(a.get(29)).toBe(60);
    expect(a.get(33)).toBe(80); // 6 short RR of 12, max and min dropped: the trimmed mean lags (pre-FU-1 value)
    expect(a.get(40)).toBe(120);
    const m = stepRun(undefined, 'mean12');
    expect(m.get(29)).toBe(60);
    expect(m.get(40)).toBe(120);
  });

  it("'beats' n: the plain mean of the last n RR (n = 4 reaches the new rate within 2 s of the step)", () => {
    const b4 = stepRun({ kind: 'beats', n: 4 });
    expect(b4.get(29)).toBe(60);
    expect(b4.get(32)).toBe(120);
    const b16 = stepRun({ kind: 'beats', n: 16 });
    expect(b16.get(34)).toBeLessThan(120); // a longer window lags more
    expect(b16.get(40)).toBe(120);
  });

  it("'seconds' n: the mean RR of the beats in the last n s (8 s: mixed at +4 s, the new rate from +8 s)", () => {
    const s8 = stepRun({ kind: 'seconds', n: 8 });
    expect(s8.get(29)).toBe(60);
    const mid = s8.get(34) as number;
    expect(mid).toBeGreaterThan(60);
    expect(mid).toBeLessThan(120);
    expect(s8.get(38)).toBe(120);
    const s4 = stepRun({ kind: 'seconds', n: 4 });
    expect(s4.get(34)).toBe(120);
  });

  it("'seconds' at a slow rate still reads (at least the last 2 RR are used), and asystole still reads 0 after 4 s", () => {
    const st = createHrState();
    for (let t = 2; t <= 20; t += 2) hrOnQrs(st, t); // 30 bpm: one RR per 2 s
    expect(hrMeasure(st, 21, { kind: 'seconds', n: 2 }).value).toBe(30);
    expect(hrMeasure(st, 25, { kind: 'seconds', n: 8 }).value).toBe(0);
  });

  it('skin field: optional, validated, and absent from every shipped skin (defaults unchanged)', () => {
    for (const id of ['philips-like', 'saadat-like', 'zoll-like', 'ge-like', 'mindray-like', 'lifepak-like']) expect(hrAveragingOf(resolveSkin(id).skin)).toBeUndefined();
    const s = structuredClone(resolveSkin('philips-like').skin);
    (s.hr as { averaging?: HrAveraging }).averaging = { kind: 'seconds', n: 8 };
    expect(validate('skin', s).errors).toEqual([]);
    expect(hrAveragingOf(s)).toEqual({ kind: 'seconds', n: 8 });
    (s.hr as unknown as { averaging: unknown }).averaging = { kind: 'minutes', n: 8 };
    expect(validate('skin', s).errors.length).toBeGreaterThan(0);
  });
});
