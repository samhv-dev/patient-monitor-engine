// The cockpit core's contract (plan vent-skin-edp-ts.md §4.3, V0), headless: the driver runs on `d.frame(ms)` with no
// animation frame and no DOM. The faces here are synthetic, so the contract is the core's and not only the Hamilton
// face's: a mode table with a settings patch, matched flow on and off, ranges a face sets.
import { createLocalPortPair, createVentDriver, DT, monitorMatchedFlow, type VentDriver } from '@pme/ventilator';
import { describe, expect, it } from 'vitest';
import { HAMILTON_SPEC } from '../faces/hamilton/face.ts';
import { createCockpit } from './cockpit.ts';
import type { Change, FaceSpec } from './types.ts';

const FACE: FaceSpec = {
  id: 'test', label: 'Test',
  ranges: { peep: [0, 20, 1], itime: [0.3, 2.5, 0.05], vt: [150, 800, 10] },
  modes: { 'PCV': { mode: 'PC', label: 'PCV', patch: { itime: 1.65 } }, 'VCV': { mode: 'VC', label: 'VCV' } },
  matchMonitorFlow: false,
};
/** Run the driver for `s` seconds of wall time in 50 ms frames (the unlinked driver steps up to 100 ms a frame). */
const run = (d: VentDriver, s: number, from = { ms: 0 }) => { for (let i = 0; i < s * 20; i++) d.frame((from.ms += 50)); return from; };

describe('the cockpit core', () => {
  it('fills the sample buffers on every 5 ms step and trims them to the sweep', () => {
    const d = createVentDriver(null);
    const c = createCockpit(d, FACE, { linked: false });
    const clock = run(d, 1);
    expect(c.buf.t.length).toBeGreaterThan(0.9 / DT);
    expect(c.buf.p.length).toBe(c.buf.t.length);
    expect(c.buf.f.length).toBe(c.buf.t.length);
    expect(c.buf.v.length).toBe(c.buf.t.length);
    run(d, 20, clock); // past the 12 s sweep
    const keep = Math.ceil((c.cfg.sweepSec * 1.15) / DT) + 40;
    expect(c.buf.t.length).toBe(keep);
    expect((c.buf.t.at(-1) as number) - (c.buf.t[0] as number)).toBeGreaterThanOrEqual(c.cfg.sweepSec);
    expect(c.buf.t.at(-1)).toBeCloseTo(c.p.t, 9);
  });

  it('freeze stops the buffers, not the physics', () => {
    const d = createVentDriver(null);
    const c = createCockpit(d, FACE, { linked: false });
    const clock = run(d, 2);
    c.toggleFreeze();
    expect(c.frozen).toBe(true);
    const n = c.buf.t.length, last = c.buf.t.at(-1), t0 = c.p.t, breaths = c.p.breathCount;
    run(d, 8, clock);
    expect(c.buf.t.length).toBe(n);
    expect(c.buf.t.at(-1)).toBe(last);
    expect(c.p.t - t0).toBeGreaterThan(7.9);
    expect(c.p.breathCount).toBeGreaterThan(breaths);
    c.toggleFreeze();
    run(d, 0.5, clock);
    expect(c.buf.t.at(-1)).toBeCloseTo(c.p.t, 9);
  });

  it('a hold toggles: armed, held at the next cycle point, released by the second press', () => {
    const d = createVentDriver(null);
    const c = createCockpit(d, FACE, { linked: false });
    const clock = run(d, 1);
    c.hold('insp');
    expect(c.vs.pendingHold).toBe('insp');
    for (let i = 0; i < 200 && c.vs.hold !== 'insp'; i++) run(d, 0.05, clock);
    expect(c.vs.hold).toBe('insp');
    c.hold('insp');
    expect(c.vs.hold).toBeNull();
  });

  it('set clamps to the face range and rounds to its step; a key the face has no range for is written as given', () => {
    const c = createCockpit(createVentDriver(null), FACE, { linked: false });
    expect(c.set('peep', 37)).toBe(20);
    expect(c.set('peep', -3)).toBe(0);
    expect(c.set('peep', 7.4)).toBe(7);
    expect(c.set('itime', 1.62)).toBeCloseTo(1.6, 9);
    expect(c.set('vt', 432)).toBe(430);
    expect(c.set('rate', 57)).toBe(57);
    expect(c.cfg.peep).toBe(7);
  });

  it('the Hamilton face clamps its dials to the v1.9 ranges', () => {
    const c = createCockpit(createVentDriver(null), HAMILTON_SPEC, { linked: false });
    expect(c.set('rate', 99)).toBe(40);
    expect(c.set('fio2', 5)).toBe(21);
  });

  it('chooseMode goes through the face table: the mode, its settings patch and the device name in the frame', () => {
    const c = createCockpit(createVentDriver(null), FACE, { linked: false });
    const seen: Change[] = [];
    c.onChange((x) => seen.push(x));
    expect(c.chooseMode('PCV')).toBe(true);
    expect(c.cfg.mode).toBe('PC');
    expect(c.cfg.itime).toBe(1.65);
    expect(c.modeName()).toBe('PCV');
    expect(seen.at(-1)?.source).toBe('mode');
    expect(c.chooseMode('APRV')).toBe(false);
    expect(c.cfg.mode).toBe('PC');
  });

  it('tells every change with who made it', () => {
    const [ventSide, monitorSide] = createLocalPortPair();
    const d = createVentDriver(ventSide);
    const c = createCockpit(d, FACE, { linked: true });
    const seen: Change[] = [];
    c.onChange((x) => seen.push(x));
    c.set('peep', 8);
    c.write({ compliance: 30 }, 'tool');
    c.toggleFreeze();
    c.silence();
    monitorSide.post({ v: 1, kind: 'control', patch: { rate: 18 } });
    expect(seen.map((x) => x.source)).toEqual(['face', 'tool', 'action', 'action', 'remote']);
    expect(seen[0]?.keys).toEqual(['peep']);
    expect(c.cfg.rate).toBe(18);
    expect(d.core.lung.base.compliance).toBe(30); // a tool write is the stand-alone lung's base
  });

  it('matched flow: a face that asks for it runs VC at the monitor flow until the user writes Flow; one that does not, never', () => {
    const matched = (spec: FaceSpec, linked: boolean) => {
      const d = createVentDriver(createLocalPortPair()[0]);
      const c = createCockpit(d, spec, { linked });
      c.write({ vcFlow: 77 }, 'remote');
      d.frame(0);
      return { c, d };
    };
    const want = monitorMatchedFlow({ vt: 500, rate: 14 });
    const on = matched(HAMILTON_SPEC, true);
    expect(on.c.cfg.vcFlow).toBe(monitorMatchedFlow(on.c.cfg).vcFlow);
    expect(want.pause).toBe(0);
    on.c.write({ vcFlow: 45 });
    on.d.frame(50);
    expect(on.c.cfg.vcFlow).toBe(45);
    expect(matched(HAMILTON_SPEC, false).c.cfg.vcFlow).toBe(77);
    expect(matched(FACE, true).c.cfg.vcFlow).toBe(77);
  });

  it('stop gives the driver its hooks and its frame back', () => {
    const d = createVentDriver(createLocalPortPair()[0]);
    const frame = d.frame;
    const c = createCockpit(d, HAMILTON_SPEC, { linked: true });
    expect(d.frame).not.toBe(frame);
    expect(d.onStep).toBeTypeOf('function');
    c.stop();
    expect(d.frame).toBe(frame);
    expect(d.onStep).toBeUndefined();
    expect(d.onControl).toBeUndefined();
  });
});
