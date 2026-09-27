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
});
