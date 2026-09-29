// Window link plumbing without a browser: local port pair, BroadcastChannel port (fake channel), the monitor side
// stamping frames with engine ticks, and the ventilator following the engine's clock.
import { createEngine, type Command, type DispatchResult, type EngineEvent } from '@pme/engine-core';
import { describe, expect, it } from 'vitest';
import { attachMonitorToLink, createBroadcastPort, createLocalPortPair, createVentDriver, LEAD_TICKS, MAX_AHEAD_TICKS, PROFILES, type LinkMsg } from '../src/index.ts';

class FakeChannel {
  static all = new Map<string, Set<FakeChannel>>();
  onmessage: ((e: MessageEvent) => void) | null = null;
  readonly name: string;
  constructor(name: string) {
    this.name = name;
    if (!FakeChannel.all.has(name)) FakeChannel.all.set(name, new Set());
    FakeChannel.all.get(name)!.add(this);
  }
  postMessage(d: unknown) {
    for (const c of FakeChannel.all.get(this.name)!) if (c !== this) c.onmessage?.({ data: structuredClone(d) } as MessageEvent);
  }
  close() { FakeChannel.all.get(this.name)!.delete(this); }
}

describe('link ports', () => {
  it('BroadcastChannel port: named pme-vent/<session>, never hears itself, drops foreign messages', () => {
    const Impl = FakeChannel as unknown as new (n: string) => BroadcastChannel;
    const a = createBroadcastPort('s1', Impl);
    const b = createBroadcastPort('s1', Impl);
    const got: LinkMsg[] = [];
    const mine: LinkMsg[] = [];
    b.onMessage((m) => got.push(m));
    a.onMessage((m) => mine.push(m));
    a.post({ v: 1, kind: 'time', action: 'pause' });
    new FakeChannel('pme-vent/s1').postMessage({ hello: 1 });
    expect(got).toEqual([{ v: 1, kind: 'time', action: 'pause' }]);
    expect(mine).toEqual([]);
    expect([...FakeChannel.all.keys()]).toEqual(['pme-vent/s1']);
    a.close();
    b.close();
  });

  it('monitor side: frames replay on their own engine ticks, lungState goes back, the ventilator never outruns the engine', async () => {
    const [ventPort, monPort] = createLocalPortPair();
    const e = createEngine({ seed: 7, patient: PROFILES.normal!.patient });
    const scheduled: number[] = [];
    const mon = {
      dispatch: (c: Command): DispatchResult => {
        const r = e.dispatch(c);
        if (c.type === 'externalDrive') scheduled.push(r.tick);
        return r;
      },
      on: (fn: (x: EngineEvent) => void) => e.on(fn),
    };
    attachMonitorToLink(mon, monPort);
    const d = createVentDriver(ventPort, 'normal');
    // the ventilator gets 1 s of wall time in one frame (a stalled tab): it may only run to the first clock limit
    d.frame(0);
    d.frame(1000);
    expect(d.simT()).toBeLessThanOrEqual(2 * LEAD_TICKS * 0.02 + 1e-9);
    await Promise.resolve();
    // now drive both: engine at real time, ventilator frames 20 ms apart
    for (let i = 1; i <= 500; i++) {
      d.frame(1000 + i * 20);
      e.advanceTo(i * 0.02);
      await Promise.resolve();
    }
    const gaps = scheduled.slice(10).map((t, i, a) => (i ? t - (a[i - 1] as number) : 1));
    expect(Math.max(...gaps)).toBe(1); // one frame per engine tick, in order
    expect(d.simT() - e.now().simT).toBeLessThanOrEqual(MAX_AHEAD_TICKS * 0.02 + 0.1);
    expect(d.core.lung.last).not.toBeNull(); // lungState arrived
  });

  // Stage V.1 gate (found on the combined page): a demo switch remounts the engine and reloads the ventilator. The OLD
  // ventilator's last frame (tick ≈ 3000) became the offset probe; the NEW ventilator (tick 1) reset the offset while
  // that probe was in flight, and its late result then installed offset 1 − 3000 + 5: every later frame carried a
  // negative atTick and was rejected — the monitor showed apnoea with the ventilator breathing.
  it('monitor side: a ventilator restart while the offset probe is in flight relearns from the new ventilator', async () => {
    const [ventPort, monPort] = createLocalPortPair();
    const sent: Command[] = [];
    let engTick = 0;
    let release: (() => void) | null = null;
    const mon = {
      dispatch: (c: Command): Promise<DispatchResult> | DispatchResult => {
        sent.push(c);
        const r = { accepted: c.atTick === undefined || (Number.isInteger(c.atTick) && c.atTick >= 0), tick: Math.max(c.atTick ?? 0, engTick + 1) };
        if (release === null && sent.length === 1) return new Promise((res) => { release = () => res(r); }); // the probe, held
        return r;
      },
      on: () => () => {},
    };
    const rejected: string[] = [];
    attachMonitorToLink(mon, monPort, (_c, why) => rejected.push(why ?? ''));
    const frame = (k: number) => ventPort.post({ v: 1, kind: 'cmds', tick: k, cmds: [{ id: `f${k}`, issuedBy: 'ventilator', type: 'externalDrive', source: 'ventilator', frame: {} } as unknown as Command] });
    frame(3000); // the old ventilator's frame: the probe
    frame(1); // the new ventilator starts over
    (release as (() => void) | null)?.();
    await Promise.resolve();
    await Promise.resolve();
    for (let k = 2; k <= 5; k++) frame(k);
    await Promise.resolve();
    expect(rejected).toEqual([]);
    for (const c of sent) if (c.atTick !== undefined) expect(c.atTick, c.id).toBeGreaterThanOrEqual(0);
    expect(sent.at(-1)?.atTick).toBeGreaterThan(0); // stamped again, from the new ventilator's ticks
  });
});
