// The ventilator goes back with the patient: the link keeps its state in the engine (`deviceState`), a restore loads it.
import { createEngine, type Command, type DispatchResult, type EngineEvent } from '@pme/engine-core';
import { describe, expect, it } from 'vitest';
import { attachMonitorToLink, createLocalPortPair, createVentDriver, PROFILES, type LinkMsg, type LinkPort } from '../src/index.ts';

/** An engine ventilated by a cockpit over a local port pair, on a fake 20 ms frame clock. `vent` wraps the cockpit's port. */
function rig(vent: (p: LinkPort) => LinkPort = (p) => p) {
  const [ventPort, monPort] = createLocalPortPair();
  const e = createEngine({ seed: 7, patient: PROFILES.normal!.patient });
  const taken: Array<Map<number, string>> = [new Map(), new Map()];
  const rig = { e, pass: 0, taken, d: createVentDriver(vent(ventPort), 'normal'), link: null as unknown as ReturnType<typeof attachMonitorToLink> };
  const mon = {
    dispatch: (c: Command): DispatchResult => {
      const r = e.dispatch(c);
      if (c.type === 'externalDrive' && r.accepted) taken[rig.pass]!.set(r.tick, JSON.stringify(c.frame));
      return r;
    },
    on: (fn: (x: EngineEvent) => void) => e.on(fn),
  };
  rig.link = attachMonitorToLink(mon, monPort);
  let ms = 0;
  const runTo = async (t: number) => {
    while (e.now().simT < t - 1e-9) {
      ms += 20;
      rig.d.frame(ms);
      e.advanceTo(e.now().simT + 0.02);
      await Promise.resolve();
    }
  };
  rig.d.frame(0);
  return Object.assign(rig, { runTo, ventPort, monPort });
}

const differing = (taken: Array<Map<number, string>>) => [...taken[1]!.keys()].filter((tk) => taken[0]!.has(tk) && taken[1]!.get(tk) !== taken[0]!.get(tk));

describe('the ventilator in the bookmark', () => {
  it('replays the same frames when its last state is older than the frames the engine holds', { timeout: 60_000 }, async () => {
    // Only every 25th state report reaches the monitor (a relay sends one a second): the restored ventilator makes the
    // ticks after that state again, unsent, and the engine's own frames for them stand
    let n = 0;
    const r = rig((p) => ({ ...p, post: (m: LinkMsg) => (m.kind !== 'state' || n++ % 25 === 0 ? p.post(m) : undefined) }));
    await r.runTo(40.3);
    const snap = r.e.snapshot();
    await r.runTo(80);
    r.e.restore(snap);
    r.pass = 1;
    await r.runTo(80);
    expect(r.taken[1]!.size).toBeGreaterThan(1500);
    expect(differing(r.taken)).toEqual([]);
  });

  it('a snapshot taken with no ventilator is unchanged, and restoring it gives none back', async () => {
    const e = createEngine({ seed: 7, patient: PROFILES.normal!.patient });
    e.advanceTo(1);
    const before = JSON.stringify(e.snapshot());
    e.dispatch({ id: 's', issuedBy: 'ventilator', type: 'deviceState', source: 'ventilator', state: { v: 1 } });
    expect(JSON.stringify(e.snapshot())).not.toBe(before);
    e.dispatch({ id: 's', issuedBy: 'ventilator', type: 'deviceState', source: 'ventilator', state: null });
    expect(JSON.stringify(e.snapshot())).toBe(before);
    const seen: string[] = [];
    e.on((x) => void seen.push(x.type), ['toneCancel', 'deviceState']);
    e.restore(JSON.parse(before));
    expect(seen).toEqual(['toneCancel']);
  });

  it('the engine gives the state back right after its restore marker, as it was dispatched', () => {
    const e = createEngine({ seed: 7, patient: PROFILES.normal!.patient });
    const state = { v: 1, x: [1, Number.NaN, -Infinity] };
    e.dispatch({ id: 's', issuedBy: 'ventilator', type: 'deviceState', source: 'ventilator', state });
    const snap = JSON.parse(JSON.stringify(e.snapshot()));
    const seen: EngineEvent[] = [];
    e.on((x) => void seen.push(x), ['toneCancel', 'deviceState']);
    e.restore(snap);
    expect(seen.map((x) => x.type)).toEqual(['toneCancel', 'deviceState']);
    expect((seen[1] as Extract<EngineEvent, { type: 'deviceState' }>).state).toEqual(state);
  });

  it('a ventilator that cannot load the state answers so, keeps its own and is learnt again', { timeout: 30_000 }, async () => {
    const r = rig();
    await r.runTo(10);
    const snap = r.e.snapshot();
    await r.runTo(30);
    r.d.ext = { face: 'another-face', save: () => null, load: () => {} };
    const at = r.d.simT();
    const answers: LinkMsg[] = [];
    r.monPort.onMessage((m) => void (m.kind === 'restored' && answers.push(m)));
    r.e.restore(snap);
    const outcome = r.link.restoring();
    r.pass = 1;
    await r.runTo(13);
    expect(await outcome).toBe('refused');
    expect(answers).toMatchObject([{ kind: 'restored', loaded: false }]);
    expect(r.d.simT()).toBeGreaterThan(at + 2); // its own state, not the bookmark's
    expect(r.taken[1]!.size).toBeGreaterThan(100); // and it ventilates the restored patient
  });

  it('a ventilator that sends no epoch (an older build) drives on as before', { timeout: 30_000 }, async () => {
    const legacy = (p: LinkPort): LinkPort => ({
      ...p,
      post: (m) => (m.kind === 'state' || m.kind === 'restored' ? undefined : p.post(m.kind === 'cmds' ? { v: 1, kind: 'cmds', tick: m.tick, cmds: m.cmds } : m)),
    });
    const r = rig(legacy);
    await r.runTo(10);
    const snap = r.e.snapshot();
    await r.runTo(30);
    const at = r.d.simT();
    r.e.restore(snap);
    expect(r.link.restoring()).toBeNull();
    r.pass = 1;
    await r.runTo(13);
    expect(r.d.simT()).toBeGreaterThan(at + 2);
    expect(r.taken[1]!.size).toBeGreaterThan(100);
  });
});
