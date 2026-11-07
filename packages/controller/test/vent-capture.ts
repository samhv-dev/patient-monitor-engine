// Plan room-and-instruments.md R8a: the ventilator link's messages as a real cockpit and a real engine exchange them.
// The ventilator side is what vent-hamilton.html runs (apps/demo/src/vent/hamilton-page.ts: `createVentDriver(port,
// profile)` and its matched VC flow), driven by a fake wall clock instead of requestAnimationFrame (no browser); the
// monitor side is the app's `attachMonitorToLink` on a real engine. Every message either side posts is recorded.
import { createEngine } from '@pme/engine-core';
import {
  attachMonitorToLink, createLocalPortPair, createVentDriver, monitorMatchedFlow, PROFILES, type LinkMsg, type LinkPort, type ProfileId,
} from '../../ventilator/src/index.ts';

const recording = (port: LinkPort, into: LinkMsg[]): LinkPort => ({ ...port, post: (m) => (into.push(structuredClone(m)), port.post(m)) });

/** `seconds` of a linked cockpit on `profile`, its circuit opened and closed again half-way, one time scale and one run. */
export async function captureLink(profile: ProfileId = 'normal', seconds = 3): Promise<{ fromVent: LinkMsg[]; toVent: LinkMsg[]; cfg: Record<string, unknown> }> {
  const fromVent: LinkMsg[] = [];
  const toVent: LinkMsg[] = [];
  const [ventSide, monSide] = createLocalPortPair();
  const e = createEngine({ seed: 7, patient: PROFILES[profile]!.patient });
  const mon = recording(monSide, toVent);
  const link = attachMonitorToLink({ dispatch: (c) => e.dispatch(c), on: (fn) => e.on(fn) }, mon);
  const d = createVentDriver(recording(ventSide, fromVent), profile);
  const frame = d.frame; // hamilton-page.ts: linked, VC runs at the monitor ventilator's flow
  d.frame = (ms) => {
    if (d.vs.cfg.mode === 'VC') Object.assign(d.vs.cfg, monitorMatchedFlow(d.vs.cfg));
    frame(ms);
  };
  const steps = Math.round(seconds / 0.02);
  for (let i = 0; i <= steps; i++) {
    if (i === Math.round(steps / 2)) d.vs.circuit = 'disconnected';
    if (i === Math.round(steps / 2) + 10) d.vs.circuit = 'connected';
    d.frame(i * 20);
    e.advanceTo(i * 0.02);
    await Promise.resolve();
  }
  mon.post({ v: 1, kind: 'time', action: 'scale', value: 2 }); // what the app's Ventilator view sends on a speed change
  await link.runTo(e.now().tick + 50); // a fast-forward's lockstep: the `run` message
  link();
  d.dispose();
  // the cockpit's settings, as R8c's `settings` message will carry them (no cockpit sends one yet)
  return { fromVent, toVent, cfg: structuredClone(d.vs.cfg) as unknown as Record<string, unknown> };
}
