// Select-turn-press (plan vent-skin-edp-ts.md §2.4, §4.3) on a fake clock: the turned value is not in `cfg` until the
// press, the press goes through the face's range and step, and the 15 s rule drops a selection or a change.
import { createVentDriver } from '@pme/ventilator';
import { describe, expect, it } from 'vitest';
import { createCockpit } from './cockpit.ts';
import { createPending, REVERT_MS } from './pending.ts';
import type { FaceSpec } from './types.ts';

const FACE: FaceSpec = { id: 'test', label: 'Test', ranges: { peep: [0, 20, 1], itime: [0.3, 2.5, 0.05] }, modes: {}, matchMonitorFlow: false };
const setup = () => {
  const c = createCockpit(createVentDriver(null), FACE, { linked: false });
  c.set('peep', 5);
  const clock = { ms: 0 };
  return { c, clock, pd: createPending(c, () => clock.ms) };
};

describe('the pending value', () => {
  it('is not in cfg until the knob press, which stores it through the face range', () => {
    const { c, pd } = setup();
    pd.select('peep');
    expect(pd.value).toBe(5);
    pd.turn(3);
    expect(pd.value).toBe(8);
    expect(pd.changed).toBe(true);
    expect(c.cfg.peep).toBe(5);
    pd.turn(40);
    expect(pd.value).toBe(20);
    expect(pd.confirm()).toBe(20);
    expect(c.cfg.peep).toBe(20);
    expect(pd.key).toBeNull();
  });

  it('a change not confirmed within 15 s returns to the old value', () => {
    const { c, clock, pd } = setup();
    pd.select('peep');
    pd.turn(2);
    clock.ms = REVERT_MS - 1;
    expect(pd.value).toBe(7);
    clock.ms = REVERT_MS;
    expect(pd.key).toBeNull();
    expect(pd.value).toBeNull();
    expect(pd.confirm()).toBeNull();
    expect(c.cfg.peep).toBe(5);
  });

  it('a selection with no change is dropped at 15 s; each turn is a change, and the 15 s count again from it', () => {
    const { clock, pd } = setup();
    pd.select('peep');
    clock.ms = REVERT_MS;
    expect(pd.key).toBeNull();
    pd.select('itime');
    clock.ms += 10_000;
    pd.turn(-1);
    clock.ms += 10_000;
    expect(pd.key).toBe('itime');
    clock.ms += 5_000;
    expect(pd.key).toBeNull();
  });

  it('Esc drops the selection and its value', () => {
    const { c, pd } = setup();
    pd.select('peep');
    pd.turn(1);
    pd.cancel();
    expect(pd.key).toBeNull();
    expect(c.cfg.peep).toBe(5);
  });
});
