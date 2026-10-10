// FU-11 Task I4 (external review F08): a refused first frame (the offset probe) must not stall the link for good — the
// next frame probes, an offset is learnt and the ventilator gets its clock.
import { createEngine, type Command, type DispatchResult, type EngineEvent } from '@pme/engine-core';
import { describe, expect, it } from 'vitest';
import { attachMonitorToLink, createLocalPortPair, type LinkMsg } from '../src/index.ts';

describe('FU-11 I4: the link recovers from a refused probe', () => {
  for (const how of ['refused', 'rejected promise', 'throw'] as const) {
    it(`first dispatch ${how}, second accepted → a clock message`, async () => {
      const [vent, mon] = createLocalPortPair();
      const e = createEngine({ seed: 7 });
      let first = true;
      const refusals: string[] = [];
      const monitor = {
        dispatch: (c: Command): DispatchResult | Promise<DispatchResult> => {
          if (first) {
            first = false;
            if (how === 'refused') return { accepted: false, tick: 0, reason: 'test refusal' };
            if (how === 'rejected promise') return Promise.reject(new Error('test rejection'));
            throw new Error('test throw');
          }
          return e.dispatch(c);
        },
        on: (fn: (x: EngineEvent) => void) => e.on(fn),
      };
      attachMonitorToLink(monitor, mon, (_c, r) => refusals.push(r ?? ''));
      const clocks: LinkMsg[] = [];
      vent.onMessage((m) => m.kind === 'clock' && clocks.push(m));
      const frame = { type: 'externalDrive', source: 'ventilator', frame: { pawCmH2O: 5, flowLps: 0, volumeMl: 0, fio2: 0.4, peepCmH2O: 5 } } as unknown as Command;
      vent.post({ v: 1, kind: 'cmds', tick: 1, cmds: [{ ...frame, id: 'f1', issuedBy: 'vent' } as Command] });
      await Promise.resolve();
      await Promise.resolve();
      vent.post({ v: 1, kind: 'cmds', tick: 2, cmds: [{ ...frame, id: 'f2', issuedBy: 'vent' } as Command] });
      for (let i = 0; i < 5; i++) await Promise.resolve();
      e.advanceTo(0.5);
      for (let i = 0; i < 5; i++) await Promise.resolve();
      expect(refusals).toHaveLength(1);
      expect(clocks.length).toBeGreaterThan(0);
    });
  }
});
