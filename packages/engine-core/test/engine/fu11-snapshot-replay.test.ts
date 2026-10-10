// FU-11 Task D1 (external review F03, F14; browser audit BA02, BA03): a snapshot fully determines what follows —
// through JSON, and with pending stage groups.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/index.ts';
import type { EngineEvent, MonitorEngine } from '../../src/types.ts';

let n = 0;
const cmd = (x: Record<string, unknown>) => ({ id: `r${n++}`, issuedBy: 'test', ...x }) as never;
const record = (e: MonitorEngine) => {
  const ev: EngineEvent[] = [];
  e.on((x) => ev.push(x));
  return ev;
};

describe('FU-11 D1: JSON round trip is exact (F14, BA03)', () => {
  for (const rig of ['default', 'lvad', 'iabp'] as const) {
    it(`${rig}: direct and JSON-restored engines emit the same events, truth included, for 10 s`, () => {
      const a = createEngine({ seed: 781, truthHz: 1, mode: 'modeled' });
      if (rig === 'lvad') a.dispatch(cmd({ type: 'device', action: { device: 'lvad', action: 'start' } }));
      if (rig === 'iabp') a.dispatch(cmd({ type: 'device', action: { device: 'iabp', action: 'start', ratio: 1 } }));
      a.advanceTo(30);
      const s = a.snapshot();
      const b = createEngine({ seed: 781, truthHz: 1, mode: 'modeled' });
      b.restore(JSON.parse(JSON.stringify(s)));
      const ea = record(a);
      const eb = record(b);
      a.advanceTo(40);
      b.advanceTo(40);
      expect(eb.length).toBe(ea.length);
      expect(eb).toEqual(ea);
    });
  }
});

describe('FU-11 D1: pending stage groups are part of the snapshot (F03, BA02)', () => {
  it('a fresh engine restored from a snapshot with a pending group lands the next member on the group tick', () => {
    const a = createEngine({ seed: 781 });
    a.advanceTo(3);
    a.dispatch(cmd({ type: 'setTarget', variable: 'hr', value: 100, stageGroup: 'g', atTick: 250 }));
    const b = createEngine({ seed: 781 });
    b.restore(JSON.parse(JSON.stringify(a.snapshot())));
    const next = { type: 'setTarget', variable: 'hr', value: 120, stageGroup: 'g', atTick: 350 };
    expect(b.dispatch(cmd(next))).toEqual(a.dispatch(cmd(next)));
    expect(a.dispatch(cmd({ type: 'setTarget', variable: 'hr', value: 90, stageGroup: 'g', atTick: 400 })).tick).toBe(250);
  });
  it('restoring an earlier snapshot forgets the discarded future group (two engines agree)', () => {
    const a = createEngine({ seed: 7 });
    const s0 = a.snapshot();
    a.dispatch(cmd({ type: 'setTarget', variable: 'hr', value: 90, stageGroup: 'g', atTick: 100 }));
    a.restore(s0);
    const b = createEngine({ seed: 7 });
    b.restore(s0);
    const c = { type: 'setTarget', variable: 'hr', value: 95, stageGroup: 'g', atTick: 2 };
    expect(a.dispatch(cmd(c)).tick).toBe(2);
    expect(b.dispatch(cmd(c)).tick).toBe(2);
  });
});
