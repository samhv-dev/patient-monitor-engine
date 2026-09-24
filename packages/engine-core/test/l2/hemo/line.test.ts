import { describe, expect, it } from 'vitest';
import { applyLineEvent, createLineState, displaySample, lineInput, setLineSensor, stepTransducer } from '../../../src/l2/hemo/line.ts';
import { H_S, SUBSTEPS } from '../../../src/l2/hemo/params.ts';

/** Drive a line with input u(t) for `secs`; returns the displayed 125 Hz samples. */
function drive(ls: ReturnType<typeof createLineState>, u: (t: number) => number, secs: number): number[] {
  const out: number[] = [];
  for (let m = 1; m <= secs * 125; m++) {
    for (let j = 0; j < SUBSTEPS; j++) {
      const ta = (m - 1) / 125 + j * H_S;
      stepTransducer(ls, lineInput(ls, u(ta), ta), lineInput(ls, u(ta + H_S), ta + H_S), H_S);
    }
    out.push(displaySample(ls));
  }
  return out;
}

describe('l2/hemo/line (brief §4.2 transducer and line)', () => {
  it('flush: ≈300 mmHg square wave, then ringing at 1/fn ± 5%', () => {
    const ls = createLineState('connected');
    setLineSensor(ls, 'connected', 0, 12);
    applyLineEvent(ls, { kind: 'line', line: 'abp', action: 'damp', value: 0.2, fnHz: 10 }, 0);
    applyLineEvent(ls, { kind: 'line', line: 'abp', action: 'flush' }, 1);
    const y = drive(ls, () => 12, 4);
    expect(Math.max(...y)).toBeGreaterThan(290);
    const base = y[y.length - 1]!;
    const rel = Math.round(2.0 * 125); // flush ends at 2.0 s
    const zc: number[] = [];
    for (let i = rel + 3; i < y.length - 1; i++) {
      const a = y[i]! - base;
      const b = y[i + 1]! - base;
      if (a < 0 && b >= 0) zc.push(i + -a / (b - a));
    }
    const period = (zc[3]! - zc[0]!) / 3 / 125;
    expect(period).toBeGreaterThan(0.095);
    expect(period).toBeLessThan(0.105);
  });

  it('zero, disconnect and sampling present air (0 mmHg); levelling adds 0.74 mmHg/cm', () => {
    const ls = createLineState('connected');
    applyLineEvent(ls, { kind: 'line', line: 'abp', action: 'zero' }, 0);
    expect(lineInput(ls, 100, 1)).toBe(0);
    expect(lineInput(ls, 100, 4)).toBe(100);
    applyLineEvent(ls, { kind: 'line', line: 'abp', action: 'disconnect' }, 4);
    expect(lineInput(ls, 100, 5)).toBe(0);
    applyLineEvent(ls, { kind: 'line', line: 'abp', action: 'reconnect' }, 5);
    applyLineEvent(ls, { kind: 'line', line: 'abp', action: 'level', value: 10 }, 5);
    expect(lineInput(ls, 100, 6)).toBeCloseTo(107.4, 9);
    applyLineEvent(ls, { kind: 'line', line: 'abp', action: 'sample' }, 6);
    expect(lineInput(ls, 100, 10)).toBe(0);
    expect(lineInput(ls, 100, 16.5)).toBe(300);
  });

  it("'damped' sensor state and 'atmosphere' behave per brief §6.2", () => {
    const ls = createLineState('none');
    setLineSensor(ls, 'atmosphere', 0, 90);
    expect(lineInput(ls, 90, 1)).toBe(0);
    setLineSensor(ls, 'zeroing', 1, 90);
    expect(ls.sensor).toBe('connected');
    expect(lineInput(ls, 90, 2)).toBe(0);
    expect(lineInput(ls, 90, 4.5)).toBe(90);
  });
});
