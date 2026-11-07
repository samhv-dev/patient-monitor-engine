import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import type { EngineEvent } from '../../src/types.ts';
import { cmd, numeric } from '../helpers/hemo.ts';

describe('MODELED mode', () => {
  it('the engine starts modeled when asked; state events say so; HR follows the reflex', () => {
    const e = createEngine({ seed: 3, mode: 'modeled', patient: { sensors: { abp: 'connected' } } });
    const ev: EngineEvent[] = [];
    e.on((x) => ev.push(x));
    e.advanceTo(30);
    const st = ev.filter((x): x is Extract<EngineEvent, { type: 'state' }> => x.type === 'state');
    expect(st[st.length - 1]!.mode).toBe('modeled');
    expect(st[st.length - 1]!.control.sbp).toBe('modeled');
    const hr = numeric(ev, 'hr', 20, 30);
    expect(hr[hr.length - 1]!).toBeGreaterThan(60);
    expect(hr[hr.length - 1]!).toBeLessThan(85);
  });
  it('switching MANUAL → MODELED moves ABP by no more than a few mmHg in the next 10 s (no step)', () => {
    const e = createEngine({ seed: 3, patient: { sensors: { abp: 'connected' } } });
    const ev: EngineEvent[] = [];
    e.on((x) => ev.push(x));
    e.advanceTo(30);
    e.dispatch(cmd({ type: 'setMode', mode: 'modeled' }));
    e.advanceTo(40);
    const before = numeric(ev, 'abpMean', 25, 30);
    const after = numeric(ev, 'abpMean', 30, 40);
    expect(Math.max(...after.map((x) => Math.abs(x - before[before.length - 1]!)))).toBeLessThan(8);
  });
  // FX-10 (classroom): a rate set in MANUAL is every MANUAL value, not an instructor's hold. It stayed held after the
  // switch to MODELED (the circulation's hrSet was left as MANUAL wrote it), so the reflex never owned the rate again.
  it('a setTarget hr sent in MANUAL is released by the switch to MODELED: the reflex owns the rate again', () => {
    const run = (setHr: boolean) => {
      const e = createEngine({ seed: 3, patient: { sensors: { abp: 'connected' } } });
      const ev: EngineEvent[] = [];
      e.on((x) => ev.push(x));
      e.advanceTo(5);
      if (setHr) e.dispatch(cmd({ type: 'setTarget', variable: 'hr', value: 110 }));
      e.advanceTo(30);
      e.dispatch(cmd({ type: 'setMode', mode: 'modeled' }));
      e.advanceTo(150);
      return { manual: numeric(ev, 'hr', 25, 30), modeled: numeric(ev, 'hr', 140, 150) };
    };
    const held = run(true);
    const free = run(false);
    expect(Math.min(...held.manual)).toBeGreaterThan(105); // MANUAL: the instructor's 110 stands
    const last = (a: number[]) => a[a.length - 1]!;
    // MODELED: the reflex's rate, not 110. Measured (seed 3): held 110 until the switch, then 77 at 20 s and 79–80 to
    // 400 s; the patient that never had 110 set settles at 69–70. The 10 bpm between them is the circulation MANUAL left
    // (the switch takes the MANUAL solution as the model's baseline: MAP 90 against 95, so the baroreflex asks for more
    // rate), not a hold: before the fix the rate stayed at 110 (39 bpm above).
    expect(last(held.modeled)).toBeLessThan(95);
    expect(Math.abs(last(held.modeled) - last(free.modeled))).toBeLessThan(15);
  });
  it('a rate held in MODELED stays held (only the MANUAL rate is released by the switch)', () => {
    const e = createEngine({ seed: 3, mode: 'modeled', patient: { sensors: { abp: 'connected' } } });
    const ev: EngineEvent[] = [];
    e.on((x) => ev.push(x));
    e.advanceTo(5);
    e.dispatch(cmd({ type: 'setTarget', variable: 'hr', value: 110 }));
    e.advanceTo(90);
    expect(Math.min(...numeric(ev, 'hr', 80, 90))).toBeGreaterThan(105);
  });
});
