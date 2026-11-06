// @vitest-environment happy-dom
// Room plan R5: the defibrillator window (`?follow=CODE#/defib`). It is a follower: its own engine, synced to the host's
// by ViewerSync; it wears the room's defibrillator model's look (instrument.ts defibSkin), and its readout — the energy
// and CHARGING / READY — comes from ITS OWN engine's deviceStatus, at the same tick as the host's. The host's style
// changes the theme only; a model change in Room setup switches the look. Real engines and the real ViewerSync over an
// in-process hub; the monitor is a stand-in around the follower's real engine (no canvas here).
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

const { ControllerSession, HostSession } = await import('@pme/controller');
const { mountFollower, publishStyle } = await import('./follower.ts');
const { DEFAULT_SITE } = await import('../site.ts');

describe('R5: the defibrillator window', () => {
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
    f = mountFollower({ stage, monitorHost } as never, DEFAULT_SITE, CODE, bar, undefined, { defib: true });
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

  it('wears the room model\'s look (zoll-like for the generic model), and the host\'s style changes its theme only', async () => {
    style = { skin: 'saadat-like', theme: '', defib: 'generic' };
    say();
    await vi.waitFor(() => expect(net.skins.at(-1)).toEqual(['zoll-like', '']));
    style = { skin: 'philips-like', theme: 'projector-light', defib: 'generic' };
    say();
    await vi.waitFor(() => expect(net.skins.at(-1)).toEqual(['zoll-like', 'projector-light']));
    style = { skin: 'philips-like', theme: 'projector-light', defib: null }; // the room's model unchosen: the monitor style
    say();
    await vi.waitFor(() => expect(net.skins.at(-1)).toEqual(['philips-like', 'projector-light']));
  });

  it('shows the energy and CHARGING / READY from its own engine, at the same tick as the host\'s', async () => {
    style = { skin: 'saadat-like', theme: '', defib: 'generic' };
    say();
    await ctl.send({ type: 'device', action: { device: 'defib', action: 'model', value: 'generic' } } as never);
    await run(1);
    expect(readout()).toBe('120 J');
    const first = { host: new Map<string, number>(), window: new Map<string, number>() };
    he.on((e) => void (first.host.has((e as Status).defib!.state) || first.host.set((e as Status).defib!.state, (e as Status).t)), ['deviceStatus']);
    ve().on((e) => void (first.window.has((e as Status).defib!.state) || first.window.set((e as Status).defib!.state, (e as Status).t)), ['deviceStatus']);
    const seen = new Set<string>();
    await ctl.send({ type: 'applyEvent', event: { kind: 'defib', action: 'charge' } });
    await run(6, () => void seen.add(readout() ?? ''));
    expect(seen).toContain('120 J CHARGING');
    expect(seen).toContain('120 J READY');
    expect(first.window.get('charging')).toBe(first.host.get('charging'));
    expect(first.window.get('ready')).toBe(first.host.get('ready'));
    expect(first.host.get('ready')! - first.host.get('charging')!).toBeCloseTo(4.2, 1); // 120 J × 7 s / 200 J
  });
});
