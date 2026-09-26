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
    expect(d.core.lung.ref).not.toBeNull(); // lungState arrived
  });
});
