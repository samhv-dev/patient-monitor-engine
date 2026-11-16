// A return to a bookmark brings the ventilator back through its snapshot (VentDriver.snapshot / load): both faces keep
// nothing outside it that changes what the ventilator does or signals, and they show the bookmark's settings at once.
import { createLocalPortPair, createVentDriver, type LinkMsg } from '@pme/ventilator';
import { describe, expect, it } from 'vitest';
import { EDP_SPEC } from '../faces/edp-ts/modes.ts';
import { createKnob } from '../faces/edp-ts/knob.ts';
import { HAMILTON_SPEC } from '../faces/hamilton/face.ts';
import { createCockpit } from './cockpit.ts';
import type { Change, FaceSpec } from './types.ts';

/** A linked cockpit of `face` on a fake 20 ms frame clock, with no clock limit, and every frame it sends. */
function linked(face: FaceSpec) {
  const [ventPort, monPort] = createLocalPortPair();
  const frames: string[] = [];
  monPort.onMessage((m: LinkMsg) => void (m.kind === 'cmds' && frames.push(`${m.tick} ${JSON.stringify(m.cmds.map((c) => ('frame' in c ? c.frame : c.type)))}`)));
  const d = createVentDriver(ventPort, 'normal');
  const c = createCockpit(d, face, { linked: true });
  monPort.post({ v: 1, kind: 'clock', ventTick: 1e9 });
  const clock = { ms: 0 };
  const run = (s: number) => { for (let i = 0; i < s * 50; i++) d.frame((clock.ms += 20)); };
  d.frame(0);
  return { d, c, frames, run };
}

describe.each([HAMILTON_SPEC, EDP_SPEC])('the $label face after a restore', (face) => {
  it('the ventilator makes the same frames again, with the bookmark settings, breath record and alarms', () => {
    const r = linked(face);
    r.run(20);
    r.c.set('peep', 12);
    r.run(5);
    const snap = r.d.snapshot();
    const at = { cfg: { ...r.c.cfg }, record: r.c.record(), alarms: r.c.alarms() };
    r.frames.length = 0;
    r.run(15);
    const first = [...r.frames];
    r.c.set('peep', 3); // after the bookmark: another breath, other alarms
    r.c.manualBreath();
    r.run(10);
    const changes: Change[] = [];
    r.c.onChange((ch) => void changes.push(ch));
    expect(r.d.load(snap)).toBe(true);
    expect(changes.map((ch) => ch.source)).toEqual(['restore']);
    expect({ ...r.c.cfg }).toEqual(at.cfg);
    expect(r.c.record()).toEqual(at.record);
    expect(r.c.alarms()).toEqual(at.alarms);
    expect(r.c.buf.t.length).toBe(0); // the discarded run's traces
    r.frames.length = 0;
    r.run(15);
    expect(r.frames).toEqual(first);
  });

  it('a snapshot of another face is not loaded', () => {
    const r = linked(face);
    r.run(2);
    const other = { ...r.d.snapshot(), face: face.id === HAMILTON_SPEC.id ? EDP_SPEC.id : HAMILTON_SPEC.id };
    const cfg = { ...r.c.cfg };
    r.c.set('peep', 9);
    expect(r.d.load(other)).toBe(false);
    expect(r.c.cfg.peep).not.toBe(cfg.peep);
  });
});

describe('the EDP-TS knob after a restore', () => {
  it('a turned value and a mode draft belonged to the discarded run: dropped, the bookmark settings shown', () => {
    const r = linked(EDP_SPEC);
    const k = createKnob(r.c, () => 0);
    r.run(2);
    const snap = r.d.snapshot();
    k.press('key:peep');
    k.turn(3);
    expect(k.pending.key).not.toBeNull();
    r.d.load(snap);
    expect(k.pending.key).toBeNull();
    expect(k.shown().peep).toBe(5);
  });
});
