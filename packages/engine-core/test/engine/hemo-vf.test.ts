// Stage 2 acceptance 6 with Stage 5's VF rhythms (deferred until vfCoarse/vfFine existed): VF is pulseless, so
// the arterial pressure decays to the mean systemic filling pressure and stays flat, the pleth is flat, PR is
// invalid and an NIBP cycle fails with the technical INOP.
import { describe, expect, it } from 'vitest';
import { pmsf } from '../../src/l2/hemo/params.ts';
import type { EngineEvent } from '../../src/types.ts';
import { cmd, read, rig } from '../helpers/hemo.ts';

type Nibp = Extract<EngineEvent, { type: 'nibp' }>;

describe('Stage 2 acceptance 6: VF (Stage 5 rhythms)', () => {
  for (const rhythm of ['vfCoarse', 'vfFine'] as const) {
    it(`${rhythm}: ABP flat at Pmsf within 20 s, pleth flat, PR invalid, NIBP fails with the INOP`, () => {
      const { e, ev } = rig({ seed: 7 });
      e.advanceTo(20);
      e.dispatch(cmd({ type: 'setRhythm', rhythm }));
      e.advanceTo(40.02);
      const w = read(e, 'abp', 39, 40);
      expect(Math.max(...w) - Math.min(...w)).toBeLessThan(1);
      expect(Math.abs(Math.max(...w) - pmsf(1))).toBeLessThan(1.5); // Pmsf 12 mmHg at volumeStatus 1
      expect(Math.max(...read(e, 'pleth', 36, 40))).toBeLessThan(0.01);
      const m = ev.filter((x) => x.type === 'measurement' && x.t === 40 && 'pr' in x.values)[0] as Extract<EngineEvent, { type: 'measurement' }>;
      expect(m.values.pr!.flag).toBe('invalid');
      const st = ev.filter((x) => x.type === 'state').pop() as Extract<EngineEvent, { type: 'state' }>;
      expect(st.control.sbp).toBe('override');

      e.dispatch(cmd({ type: 'device', action: { device: 'nibp', action: 'start' } }));
      let end: Nibp | undefined;
      for (let k = 0; k < 240 && !end; k++) {
        e.advanceTo(e.now().simT + 0.5);
        end = ev.find((x): x is Nibp => x.type === 'nibp' && x.t > 40 && (x.phase === 'done' || x.phase === 'failed'));
      }
      expect(end?.phase).toBe('failed');
      expect(end?.result).toBeUndefined();
      expect(ev.some((x) => x.type === 'alarm' && x.id === 'nibp-failed' && x.category === 'technical')).toBe(true);
    });
  }
});
