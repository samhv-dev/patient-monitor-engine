// @vitest-environment happy-dom
// Room plan R5d: the defibrillator window's two buttons. Charge and Shock, always enabled (the window blocks nothing: the
// host's device decides), each sends the bare command on the window's own transport under its own `defib` hello; the
// host applies it as the instructor's press and files it as the learner's; a refusal comes back in the ack and the
// window shows it as the device's words ("Not charged"). The harness is defib-window.dom.test.ts's: real engines, the
// real ViewerSync and HostSession over an in-process hub, the monitor a stand-in around the follower's real engine.
import type { ManagedTransport } from '@pme/controller';
import { createEngine, type Command, type EngineEvent, type MonitorEngine } from '@pme/engine-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const CODE = 'KKQB2N';
type Status = Extract<EngineEvent, { type: 'deviceStatus' }>;
const net = vi.hoisted(() => ({ hub: null as null | { connect(): ManagedTransport }, skins: [] as Array<[string, string]>, ve: null as unknown, v: { t: 0, paused: true, rate: 1 } }));

vi.mock('@pme/controller', async (orig) => {
  const real = await orig<typeof import('@pme/controller')>();
  net.hub = real.createInProcessHub();
  return { ...real, createBroadcastChannelTransport: () => (net.hub as { connect(): ManagedTransport }).connect() };
});
vi.mock('@pme/renderer', async () => {
  const { createEngine: mk } = await import('@pme/engine-core');
  return {
    version: '0.0.0-test',
    mountMonitor: (_el: unknown, o: { skin: string; theme?: string }) => {
      net.skins.push([o.skin, o.theme ?? '']);
      const ve = mk({ seed: 99, device: { skin: o.skin } });
      net.ve = ve;
      const v = net.v;
      const clock = {
        restore: (s: { tick: number }) => (ve.restore(s as never), void (v.t = s.tick * 0.02)),
        dispatch: (c: Command) => ve.dispatch(c),
        on: (fn: (e: EngineEvent) => void, types?: EngineEvent['type'][]) => ve.on(fn, types),
        renderT: () => v.t,
        tick: () => ve.now().tick,
        setRate: (k: number) => void (v.rate = k),
        setPaused: (p: boolean) => void (v.paused = p),
        jumpTo: (simT: number) => ((v.t = simT), void ve.advanceTo(simT)),
      };
      return {
        soundOn: false, viewerClock: () => Promise.resolve(clock), destroy: () => {}, disableSound: () => {}, enableSound: () => Promise.resolve(), silenceAudio: () => false,
        on: (fn: (e: EngineEvent) => void, types?: EngineEvent['type'][]) => ve.on(fn, types),
        setSkin: (skin: string, x: { theme?: string } = {}) => (net.skins.push([skin, x.theme ?? '']), ve.dispatch({ id: `s-${Math.random()}`, issuedBy: 'renderer', type: 'device', action: { device: 'monitor', action: 'skin', value: skin } } as Command), Promise.resolve()),
        setIbpScales: () => {},
      };
    },
  };
});

const { ControllerSession, HostSession, createInProcessHub } = await import('@pme/controller');
/** Every command the host applied, as its commandApplied says (a transport of its own, listening only). */
const applied: Array<Record<string, unknown>> = [];
function spyHub(into: Array<Record<string, unknown>>): ManagedTransport {
  const hub = createInProcessHub();
  const end = hub.connect();
  hub.connect().onMessage((m) => {
    if (m.kind === 'event') for (const e of m.body) if (e.type === 'commandApplied') into.push((e.resolved as { command: Record<string, unknown> }).command);
  });
  return end;
}
const { mountFollower, publishStyle } = await import('./follower.ts');
const { DEFAULT_SITE } = await import('../site.ts');

describe('R5d: the defibrillator window presses', { timeout: 60_000 }, () => {
  let he: MonitorEngine;
  let close = () => {};
  let style = { skin: 'saadat-like', theme: '', defib: null as string | null };
  let styleFns = new Set<() => void>();
  const say = () => styleFns.forEach((f) => f());
  const flush = () => new Promise((r) => setTimeout(r, 0));
  let f: ReturnType<typeof mountFollower>;
  let ctl: InstanceType<typeof ControllerSession>;
  let hs: InstanceType<typeof HostSession>;
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'setInterval', 'clearInterval'] });
    net.skins.length = 0;
    Object.assign(net.v, { t: 0, paused: true, rate: 1 });
    style = { skin: 'saadat-like', theme: '', defib: null };
    styleFns = new Set();
    he = createEngine({ seed: 7, device: { skin: 'saadat-like' } });
    const host = { dispatch: (c: Command) => he.dispatch(c), snapshot: () => he.snapshot(), restore: (s: never) => he.restore(s), on: (fn: (e: EngineEvent) => void) => he.on(fn), now: () => he.now(), time: () => {} };
    hs = new HostSession({ session: CODE, target: host, stateIntervalMs: 0 });
    hs.addTransport((net.hub as { connect(): ManagedTransport }).connect());
    ctl = new ControllerSession({ session: CODE, transport: (net.hub as { connect(): ManagedTransport }).connect() });
    await vi.waitFor(() => expect(ctl.hostOnline).toBe(true));
    const offStyle = publishStyle(CODE, () => style, (fn) => (styleFns.add(fn), () => void styleFns.delete(fn)));
    document.body.replaceChildren();
    const stage = document.createElement('div');
    const monitorHost = document.createElement('div');
    const bar = document.createElement('div');
    document.body.append(stage, monitorHost, bar);
    applied.length = 0;
    hs.addTransport(spyHub(applied));
    f = mountFollower({ stage, monitorHost } as never, DEFAULT_SITE, CODE, bar, undefined, { show: 'defib', device: 'bed2defib01' });
    await vi.waitFor(() => expect(f.sync?.status).toBe('synced'));
    close = () => (f.destroy(), offStyle(), hs.close(), ctl.close());
  });
  afterEach(() => (close(), vi.useRealTimers()));

  const ve = () => net.ve as MonitorEngine;
  const readout = () => document.querySelector('.defib-readout')?.textContent ?? null;
  /** Run both engines `seconds` at the host's tick (the window follows as the learner monitor does). */
  const run = async (seconds: number, each?: () => void) => {
    for (let i = 0; i < seconds * 50; i++) {
      he.advanceTo(he.now().simT + 0.02 + 1e-9);
      if (i % 10 === 0) hs.emitState();
      await flush();
      f.sync?.follow();
      if (!net.v.paused) {
        net.v.t += 0.02 * net.v.rate;
        ve().advanceTo(net.v.t);
      }
      each?.();
    }
  };


  const keys = () => [...document.querySelectorAll<HTMLButtonElement>('.defib-keys button')];
  const said = () => document.querySelector('.defib-said')?.textContent ?? '';
  const press = async (label: 'Charge' | 'Shock') => {
    keys().find((b) => b.textContent === label)?.click();
    for (let i = 0; i < 5; i++) await flush();
  };

  it('has Charge and Shock, both enabled, and nothing else that commands', () => {
    expect(keys().map((b) => [b.textContent, b.disabled])).toEqual([['Charge', false], ['Shock', false]]);
  });

  it("a Shock with no charge is sent (nothing in the window blocks it) and comes back as the device's words; the buttons stay enabled", async () => {
    await press('Shock');
    expect(said()).toBe('Not charged');
    expect(keys().every((b) => !b.disabled)).toBe(true);
    expect(applied.filter((c) => c.type === 'applyEvent')).toEqual([]); // refused: nothing reached the patient
  });

  it("Charge then Shock land on the host as the learner's: bare, the room's energy, the device key as `by`", async () => {
    await press('Charge');
    await run(1);
    expect(readout()).toMatch(/CHARGING$/);
    expect(said()).toBe('');
    await run(6);
    expect(readout()).toMatch(/READY$/);
    await press('Shock');
    await run(1);
    const presses = applied.filter((c) => c.type === 'applyEvent');
    expect(presses.map((c) => [c.issuedBy, c.by, c.event])).toEqual([
      ['learner', 'bed2defib01', { kind: 'defib', action: 'charge' }],
      ['learner', 'bed2defib01', { kind: 'defib', action: 'shock' }],
    ]);
    expect(said()).toBe('');
    expect(he.now().tick).toBeGreaterThan(0);
  });
});
