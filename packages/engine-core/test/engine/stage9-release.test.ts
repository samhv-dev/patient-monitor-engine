// Stage 9 (E-S9-5): "Return to model" in MODELED mode. An instructor holds HR (or SpO₂), the body runs with the held
// value for 30 s, the instructor releases it: the value goes back to what the model itself computes (± 5) within 30 s.
// The model's own value is measured on an identical engine that was never pinned.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { EngineEvent } from '../../src/types.ts';
import { cmd } from '../helpers/hemo.ts';

type State = Extract<EngineEvent, { type: 'state' }>;

function run(variable: 'hr' | 'spo2', value: number | null): { held: number; after: number; flag: string | undefined } {
  const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70 } });
  let last: State | null = null;
  e.on((x) => {
    if (x.type === 'state') last = x as State;
  });
  e.advanceTo(20);
  if (value !== null) e.dispatch(cmd({ type: 'pin', variable, value }));
  e.advanceTo(50);
  const held = (last as State | null)?.values[variable] ?? NaN;
  if (value !== null) e.dispatch(cmd({ type: 'release', variable }));
  e.advanceTo(80);
  const s = last as State | null;
  return { held, after: s?.values[variable] ?? NaN, flag: s?.control?.[variable] };
}

describe('Stage 9 E-S9-5: a released value returns to the model in MODELED mode', () => {
  it('HR held at 120 for 30 s, released: back within the model ± 5 bpm within 30 s', () => {
    const model = run('hr', null).after;
    const r = run('hr', 120);
    expect(r.held).toBeGreaterThan(115);
    expect(r.flag).not.toBe('pinned');
    expect(Math.abs(r.after - model), `HR after release ${r.after.toFixed(1)} vs model ${model.toFixed(1)}`).toBeLessThanOrEqual(5);
  });
  it('SpO₂ held at 85 % for 30 s, released: back within the model ± 5 % within 30 s', () => {
    const model = run('spo2', null).after;
    const r = run('spo2', 85);
    expect(r.held).toBeLessThan(87);
    expect(r.flag).not.toBe('pinned');
    expect(Math.abs(r.after - model), `SpO₂ after release ${r.after.toFixed(1)} vs model ${model.toFixed(1)}`).toBeLessThanOrEqual(5);
  });
  it('the other values a MODELED hold moves (RR, PI, core temperature) return to their pre-hold values; release all too', () => {
    const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70 } });
    let last: State | null = null;
    e.on((x) => {
      if (x.type === 'state') last = x as State;
    });
    e.advanceTo(15);
    const before = { ...(last as State | null)?.values };
    e.dispatch(cmd({ type: 'pin', variable: 'rr', value: 25 }));
    e.dispatch(cmd({ type: 'pin', variable: 'pi', value: 0.5 }));
    e.dispatch(cmd({ type: 'pin', variable: 'tempCore', value: 38.5 }));
    e.advanceTo(45);
    e.dispatch(cmd({ type: 'release', variable: 'all' }));
    e.advanceTo(75);
    const v = (last as State | null)?.values ?? {};
    expect(v.rr).toBeCloseTo(before.rr ?? NaN, 0);
    expect(v.pi).toBeCloseTo(before.pi ?? NaN, 1);
    expect(v.tempCore).toBeCloseTo(before.tempCore ?? NaN, 0);
  });
});
