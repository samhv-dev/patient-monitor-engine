// The ventilator goes back with the patient: the link keeps its state in the engine (`deviceState`), a restore loads it.
import { createEngine, encodeState, type Command, type DispatchResult, type EngineEvent } from '@pme/engine-core';
import { describe, expect, it, vi } from 'vitest';
import {
  attachMonitorToLink, createBroadcastPort, createFramePort, createLocalPortPair, createRelayPort, createVentDriver, isLinkRecord, PROFILES,
  RECORD_LUNGS_MAX, RELAY_BATCH_MS, REMAKE_TICKS_MAX, RUN_TIMEOUT_MS,
  type LinkMsg, type LinkPort, type LinkRecord, type VentSnapshot, type VentWire, type VentWireBody,
} from '../src/index.ts';

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

  it('replays the same frames when the lung changes and the ventilator runs further ahead of the engine the second time', { timeout: 60_000 }, async () => {
    // The ventilator takes each lungState on the tick the link names, so how far ahead of the engine the wall clock let
    // it run does not change the frames: the first time it keeps level with the engine, the second its frames come at
    // twice the engine's pace, so it runs at its clock limit
    const [ventPort, monPort] = createLocalPortPair();
    const e = createEngine({ seed: 7, patient: PROFILES.normal!.patient });
    const taken = [new Map<number, string>(), new Map<number, string>()];
    let pass = 0;
    attachMonitorToLink({
      dispatch: (c: Command): DispatchResult => {
        const r = e.dispatch(c);
        if (c.type === 'externalDrive' && r.accepted) taken[pass]!.set(r.tick, JSON.stringify(c.frame));
        return r;
      },
      on: (fn: (x: EngineEvent) => void) => e.on(fn),
    }, monPort);
    const d = createVentDriver(ventPort, 'normal');
    let ms = 0;
    let target = 0;
    const runTo = async (t: number) => {
      for (let i = 0; i < 20_000 && e.now().simT < t - 1e-9; i++) {
        const step = 20;
        ms += pass === 0 ? step : 2 * step;
        d.frame(ms);
        target += step / 1000;
        e.advanceTo(target);
        await Promise.resolve();
      }
    };
    d.frame(0);
    await runTo(20);
    const snap = e.snapshot();
    const spasm = { id: 'spasm', issuedBy: 'test', type: 'applyEvent', event: { kind: 'lungCondition', id: 'bronchospasm', severity: 0.8 }, atTick: snap.tick + 250 } as Command;
    e.dispatch(spasm);
    await runTo(50);
    e.restore(snap);
    target = e.now().simT;
    pass = 1;
    e.dispatch(spasm);
    await runTo(50);
    expect(taken[1]!.size).toBeGreaterThan(1400);
    expect(differing(taken)).toEqual([]);
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
    r.d.ext = { face: 'another-face', save: () => null, valid: () => true, load: () => {} };
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

/** A BroadcastChannel of this process: a post reaches the other channels of its name in a later task, as a copy. */
class TaskChannel {
  static all = new Map<string, Set<TaskChannel>>();
  onmessage: ((e: MessageEvent) => void) | null = null;
  readonly name: string;
  constructor(name: string) {
    this.name = name;
    const set = TaskChannel.all.get(name) ?? new Set<TaskChannel>();
    set.add(this);
    TaskChannel.all.set(name, set);
  }
  postMessage(m: unknown) {
    for (const c of TaskChannel.all.get(this.name) ?? []) if (c !== this) setTimeout(() => c.onmessage?.({ data: structuredClone(m) } as MessageEvent), 0);
  }
  close() {
    TaskChannel.all.get(this.name)?.delete(this);
  }
}

/** Two ends of one relay wire: what one sends, the other hears at once, as JSON. */
function wire(): [VentWire, VentWire] {
  const fns = { a: new Set<(b: VentWireBody) => void>(), b: new Set<(b: VentWireBody) => void>() };
  const end = (me: 'a' | 'b'): VentWire => ({
    send: (body) => { for (const fn of [...fns[me === 'a' ? 'b' : 'a']]) fn(JSON.parse(JSON.stringify(body)) as VentWireBody); },
    onBody: (fn) => (fns[me].add(fn), () => void fns[me].delete(fn)),
  });
  return [end('a'), end('b')];
}

describe('the ventilator goes back with the patient on every path a cockpit drives by', () => {
  const paths: Array<[string, () => [LinkPort, LinkPort], () => Promise<unknown>]> = [
    ['the in-page pair', () => createLocalPortPair(), () => Promise.resolve()],
    ['the Ventilator view (frame port)', () => {
      const vw = {};
      const mw = {};
      return [createFramePort('fp', () => mw, vw), createFramePort('fp', () => vw, mw)];
    }, () => Promise.resolve()],
    ['its own window (BroadcastChannel)', () => [
      createBroadcastPort('bc', TaskChannel as unknown as new (n: string) => BroadcastChannel),
      createBroadcastPort('bc', TaskChannel as unknown as new (n: string) => BroadcastChannel),
    ], () => vi.advanceTimersByTimeAsync(1)],
    ['a device over the relay', () => {
      const [a, b] = wire();
      return [createRelayPort(a), createRelayPort(b)];
    }, () => vi.advanceTimersByTimeAsync(RELAY_BATCH_MS)],
  ];

  it.each(paths)('%s: every frame after "Return here" is the first run\'s, and the cockpit took the bookmark back', { timeout: 120_000 }, async (_name, ports, settle) => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
    try {
      const [ventPort, monPort] = ports();
      const e = createEngine({ seed: 7, patient: PROFILES.normal!.patient });
      const taken = [new Map<number, string>(), new Map<number, string>()];
      let pass = 0;
      const link = attachMonitorToLink({
        dispatch: (c: Command): DispatchResult => {
          const r = e.dispatch(c);
          if (c.type === 'externalDrive' && r.accepted) taken[pass]!.set(r.tick, JSON.stringify(c.frame));
          return r;
        },
        on: (fn: (x: EngineEvent) => void) => e.on(fn),
      }, monPort);
      const d = createVentDriver(ventPort, 'normal');
      let ms = 0;
      const runTo = async (t: number) => {
        for (let i = 0; i < 5_000 && e.now().simT < t - 1e-9; i++) {
          ms += 20;
          d.frame(ms);
          await settle();
          e.advanceTo(e.now().simT + 0.02);
          await settle();
        }
      };
      d.frame(0);
      await runTo(20);
      const snap = e.snapshot();
      await runTo(40);
      e.restore(snap);
      pass = 1;
      const outcome = link.restoring();
      await runTo(40);
      expect(await outcome).toBe('loaded');
      expect(taken[1]!.size).toBeGreaterThan(900);
      expect(differing(taken)).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('what the link trusts and keeps', () => {
  /** A cockpit whose state the host keeps, the record it writes, and the host's engine at 20 s. */
  async function kept() {
    const r = rig();
    const records: Array<LinkRecord | null> = [];
    r.link();
    const link = attachMonitorToLink({ dispatch: (c: Command) => r.e.dispatch(c), on: (fn: (x: EngineEvent) => void) => r.e.on(fn) }, r.monPort, () => {}, {
      keep: (s) => void records.push(s),
    });
    await r.runTo(20);
    return { ...r, link, records };
  }

  it('a ventilator answers "not loaded" to a state it cannot load, and to a restore whose ticks do not fit, never throwing', () => {
    const [ventPort, monPort] = createLocalPortPair();
    const d = createVentDriver(ventPort, 'normal');
    const answers: LinkMsg[] = [];
    monPort.onMessage((m) => void (m.kind === 'restored' && answers.push(m)));
    const good = d.snapshot();
    const restore = (epoch: string, state: unknown, upTo = good.tick, allowed = good.tick + 10) =>
      monPort.post({ v: 1, kind: 'restore', epoch, state: state as VentSnapshot, lungs: [], upTo, allowed });
    restore('a', { ...good, body: { vs: 1 } });
    restore('b', { ...good, body: encodeState({ nothing: true }) });
    restore('c', { ...good, tick: 10_000_000 }, 10_000_000, 10_000_010);
    restore('d', good, good.tick + REMAKE_TICKS_MAX + 1, good.tick + REMAKE_TICKS_MAX + 2);
    restore('e', good);
    expect(answers.map((m) => (m as { loaded: boolean }).loaded)).toEqual([false, false, false, false, true]);
  });

  it('a record holds at most RECORD_LUNGS_MAX lungStates after its state: past that it is cleared, not grown', async () => {
    const r = await kept();
    expect(r.records.at(-1)).not.toBeNull();
    const t0 = r.e.now().tick;
    for (let i = 0; i <= RECORD_LUNGS_MAX; i++) {
      r.e.dispatch({ id: `l${i}`, issuedBy: 'test', type: 'applyEvent', event: { kind: 'lungCondition', id: 'bronchospasm', severity: 0.2 + i / 10 }, atTick: t0 + 1 + 60 * i } as Command);
    }
    // the ventilator does not run meanwhile, so no state comes from it: only lungStates go to it
    const lungs: LinkMsg[] = [];
    r.ventPort.onMessage((m) => void (m.kind === 'lungState' && lungs.push(m)));
    for (let i = 0; i < 400 && lungs.length <= RECORD_LUNGS_MAX; i++) r.e.advanceTo(r.e.now().simT + 0.02);
    await Promise.resolve();
    expect(lungs.length).toBeGreaterThan(RECORD_LUNGS_MAX);
    expect(r.records.at(-1)).toBeNull();
  });

  it('a record a peer could have planted (a last tick far from the engine, an offset that is not one) is no record', () => {
    const vent = createVentDriver(null).snapshot();
    const link = { offset: 5, lastTick: vent.tick, allowed: vent.tick + 70, engTick: 0 };
    expect(isLinkRecord({ v: 1, vent, link, lungs: [] }, vent.tick + 5)).toBe(true);
    expect(isLinkRecord({ v: 1, vent, link: { ...link, lastTick: vent.tick + 10_000 }, lungs: [] }, vent.tick + 5)).toBe(false);
    expect(isLinkRecord({ v: 1, vent, link: { ...link, offset: 0.5 }, lungs: [] }, vent.tick + 5)).toBe(false);
    expect(isLinkRecord({ v: 1, vent, link, lungs: [] }, vent.tick + 10_000)).toBe(false);
    expect(isLinkRecord({ v: 1, vent, link, lungs: new Array(RECORD_LUNGS_MAX + 1).fill({ ev: { type: 'lungState' }, at: 1 }) }, vent.tick + 5)).toBe(false);
  });

  it('after a restore is answered, a message from before it is still not heard; a reloaded ventilator is', async () => {
    const r = rig();
    await r.runTo(10);
    const snap = r.e.snapshot();
    await r.runTo(20);
    r.e.restore(snap);
    await r.runTo(11);
    r.pass = 1;
    r.taken[1]!.clear();
    r.ventPort.post({ v: 1, kind: 'cmds', tick: 5_000, epoch: 'an-old-one', cmds: [{ id: 'x', issuedBy: 'ventilator', type: 'externalDrive', source: 'ventilator', frame: { pawCmH2O: 1, flowLps: 0, volumeMl: 0, fio2: 0.21, peepCmH2O: 0 } } as Command] });
    await Promise.resolve();
    expect(r.taken[1]!.size).toBe(0);
    const fresh = createVentDriver(r.ventPort, 'normal');
    fresh.frame(0);
    fresh.frame(20);
    await Promise.resolve();
    expect(r.taken[1]!.size).toBeGreaterThan(0);
  });

  it('a restore nobody answers ends in RUN_TIMEOUT_MS', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    try {
      const r = rig();
      await r.runTo(10);
      const snap = r.e.snapshot();
      await r.runTo(12);
      r.d.dispose(); // the cockpit's page is gone
      r.e.restore(snap);
      const outcome = r.link.restoring();
      await vi.advanceTimersByTimeAsync(RUN_TIMEOUT_MS);
      expect(await outcome).toBe('silent');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('a snapshot taken just after a lungState', () => {
  it('holds that lungState once completed by the link: the replay is the first run; without it, it is not', { timeout: 120_000 }, async () => {
    const [ventPort, monPort] = createLocalPortPair();
    const e = createEngine({ seed: 7, patient: PROFILES.normal!.patient });
    const taken = [new Map<number, string>(), new Map<number, string>(), new Map<number, string>()];
    let pass = 0;
    const link = attachMonitorToLink({
      dispatch: (c: Command): DispatchResult => {
        const r = e.dispatch(c);
        if (c.type === 'externalDrive' && r.accepted) taken[pass]!.set(r.tick, JSON.stringify(c.frame));
        return r;
      },
      on: (fn: (x: EngineEvent) => void) => e.on(fn),
    }, monPort);
    let lungStates = 0; // the lungStates that changed the lung's compliance
    let c = NaN;
    ventPort.onMessage((m) => {
      if (m.kind !== 'lungState' || m.ev.complianceMlPerCmH2O === c) return;
      c = m.ev.complianceMlPerCmH2O;
      lungStates++;
    });
    const d = createVentDriver(ventPort, 'normal');
    let ms = 0;
    const step = () => {
      ms += 20;
      d.frame(ms);
      e.advanceTo(e.now().simT + 0.02);
    };
    const runTo = async (t: number) => {
      for (let i = 0; i < 5_000 && e.now().simT < t - 1e-9; i++) {
        step();
        await Promise.resolve();
      }
    };
    d.frame(0);
    await runTo(10);
    // one lung ventilated from one tick on: a step in the lung, after which lungStates come once a second
    e.dispatch({ id: 'tube', issuedBy: 'test', type: 'applyEvent', event: { kind: 'mainstem', ventilated: 'right' }, atTick: e.now().tick + 50 } as Command);
    // the snapshot is taken in the same task as the lungState the change emits: before the link's record has it
    const seen = lungStates;
    for (let i = 0; i < 500 && lungStates === seen; i++) {
      step();
      if (lungStates === seen) await Promise.resolve();
    }
    expect(lungStates).toBeGreaterThan(seen);
    const raw = e.snapshot();
    const completed = link.complete(raw);
    expect(completed).not.toEqual(raw);
    await Promise.resolve();
    await runTo(raw.tick * 0.02 + 20);
    const end = e.now().simT;
    const replay = async (s: typeof raw, into: number) => {
      e.restore(s);
      pass = into;
      await runTo(end);
      return [...taken[into]!.keys()].filter((tk) => taken[0]!.has(tk) && taken[into]!.get(tk) !== taken[0]!.get(tk));
    };
    expect((await replay(raw, 1)).length).toBeGreaterThan(0);
    expect(await replay(completed, 2)).toEqual([]);
  });
});
