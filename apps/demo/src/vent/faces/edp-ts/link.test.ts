// @vitest-environment happy-dom
// Plan vent-skin-edp-ts.md V1, test (2), and test (5) over the link: the EDP-TS face's cockpit linked to a real patient
// engine (the monitor side of the link, as the app's Ventilator view runs it), with the host's hand-over patch posted
// through the port exactly as views/vent.ts sends it (cockpitPatch). VCV at VT 0.500 L and Ti 1.40 s, set with the knob,
// delivers Ti 1.40 ± 0.005 s and VT within one step (0.01 L, research/57 T-02) at ×1 and ×4, the matched-flow coupling
// off (the face's spec: plan GM1); and every frame the engine receives carries the device's mode name.
import { createEngine, type Command, type DispatchResult, type EngineEvent } from '@pme/engine-core';
import { attachMonitorToLink, createLocalPortPair, createVentDriver, PROFILES } from '@pme/ventilator';
import { describe, expect, it } from 'vitest';
import { cockpitPatch } from '../../../app/views/vent.ts';
import { createCockpit } from '../../core/cockpit.ts';
import { createKnob } from './knob.ts';
import { EDP_SPEC } from './modes.ts';

async function linked(scale: number) {
  const [ventPort, monPort] = createLocalPortPair();
  const e = createEngine({ seed: 7, patient: PROFILES.normal!.patient });
  const modes = new Set<string>();
  const mon = {
    dispatch: (c: Command): DispatchResult => {
      if (c.type === 'externalDrive') {
        const m = (c as unknown as { frames?: Array<{ mode?: string }>; frame?: { mode?: string } });
        for (const f of m.frames ?? (m.frame ? [m.frame] : [])) if (f.mode) modes.add(f.mode);
      }
      return e.dispatch(c);
    },
    on: (fn: (x: EngineEvent) => void) => e.on(fn),
  };
  attachMonitorToLink(mon, monPort);
  const d = createVentDriver(ventPort, 'normal');
  const c = createCockpit(d, EDP_SPEC, { linked: true });
  // the host hands the patient over: the engine's own ventilator's settings as views/vent.ts posts them
  monPort.post({ v: 1, kind: 'control', patch: cockpitPatch({ rr: 12, vtMl: 450, peep: 5, fio2: 0.4, pmax: 40 }, c.cfg) });
  await Promise.resolve();
  d.scale = scale;
  let ms = 1000;
  let i = 0;
  const run = async (s: number) => {
    const n = Math.round(s / (0.02 * scale));
    for (let j = 0; j < n; j++, i++) {
      d.frame((ms += 20));
      e.advanceTo((i + 1) * 0.02 * scale);
      await Promise.resolve();
    }
  };
  d.frame(ms);
  return { c, d, e, run, modes };
}

describe('test (2): VCV at VT 0.500 L, Ti 1.40 s under the link', () => {
  for (const scale of [1, 4]) {
    it(`delivers Ti 1.40 ± 0.005 s and VT within 0.01 L at ×${scale}`, { timeout: 60_000 }, async () => {
      const { c, run, modes } = await linked(scale);
      await run(2);
      expect(c.cfg.vt).toBe(450); // the hand-over arrived
      expect(c.cfg.modeLabel).toBe('VCV'); // and the device's name was restored (it sends modeLabel null)
      const k = createKnob(c);
      k.press('key:vt'); k.turn(5); k.push(); // 0.45 → 0.50 L
      k.press('key:ti'); k.turn(40); k.push(); // 1.00 → 1.40 s
      expect(c.cfg.vt).toBe(500);
      expect(c.cfg.itime).toBe(1.4);
      expect(c.cfg.vcFlow).toBeCloseTo((60 * 0.5) / 1.4, 9);
      await run(24);
      const r = c.record()!;
      expect(Math.abs(r.ti - 1.4)).toBeLessThanOrEqual(0.005 + 1e-9);
      expect(Math.abs(c.measured().VTE - 500)).toBeLessThanOrEqual(10);
      expect(c.cfg.vcFlow).toBeCloseTo((60 * 0.5) / 1.4, 9); // no matched flow overwrote it
      expect(c.d.core.lung.last).not.toBeNull(); // the engine's lung is the ventilator's
      expect([...modes]).toEqual(['VCV']); // test (5) over the link: every frame named the device's mode
    });
  }
});
