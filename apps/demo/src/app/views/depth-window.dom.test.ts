// @vitest-environment happy-dom
// EEG plan E12: the depth-of-anaesthesia window (`?follow=CODE#/depth`). It is a follower: its own engine, synced to
// the host's by ViewerSync, replays the host's `device eeg on` and `device eeg model generic` and reads the same samples
// (D3), and the window draws that engine's readings: the values it shows are the host's own, at the same sim time. With
// no device on it says so; switched off, it says so again after DEPTH_STALE_S. The window joins once the room's device
// is on (the classroom's order: Room setup, then the screens; the host also switches it on at every patient mount, before
// a follower's fresh snapshot): its snapshot carries the host's EEG. A device switched on while a window already follows
// is generated from the follower engine's own seed (the engine's restore keeps its own seed, not the snapshot's: a
// finding for engine-core, reported with E12), so that order is not asserted here. It has no Sound and no Silence (the
// patient monitor under it is not its instrument). Real engines and the real ViewerSync over an in-process hub; the
// monitor is a stand-in around the follower's real engine (no canvas here), as defib-window.dom.test.ts does.
import type { ManagedTransport } from '@pme/controller';
import { createEngine, type Command, type EngineEvent, type Measured, type MonitorEngine } from '@pme/engine-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const CODE = 'KKQB2N';
const net = vi.hoisted(() => ({ hub: null as null | { connect(): ManagedTransport }, ve: null as unknown, v: { t: 0, paused: true, rate: 1 } }));

vi.mock('@pme/controller', async (orig) => {
  const real = await orig<typeof import('@pme/controller')>();
  net.hub = real.createInProcessHub();
  return { ...real, createBroadcastChannelTransport: () => (net.hub as { connect(): ManagedTransport }).connect() };
});
vi.mock('@pme/renderer', async (orig) => {
  const real = await orig<typeof import('@pme/renderer')>();
  const { createEngine: mk } = await import('@pme/engine-core');
  return {
    ...real,
    mountMonitor: (_el: unknown, o: { skin: string }) => {
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
        setNominalRate: () => {},
        setPaused: (p: boolean) => void (v.paused = p),
        jumpTo: (simT: number) => ((v.t = simT), void ve.advanceTo(simT)),
      };
      return {
        soundOn: false, viewerClock: () => Promise.resolve(clock), destroy: () => {}, disableSound: () => {}, enableSound: () => Promise.resolve(), silenceAudio: () => false,
        on: (fn: (e: EngineEvent) => void, types?: EngineEvent['type'][]) => ve.on(fn, types),
        setSkin: () => Promise.resolve(), setIbpScales: () => {}, setPortrait: () => {},
      };
    },
  };
});

const { ControllerSession, HostSession } = await import('@pme/controller');
const { mountFollower } = await import('./follower.ts');
const { DEPTH_STALE_S, DEPTH_WORDS, mountDepthWindow } = await import('./depth.ts');
const { DEFAULT_SITE } = await import('../site.ts');

describe('E12: the depth-of-anaesthesia window', { timeout: 90_000 }, () => {
  let he: MonitorEngine;
  let close = () => {};
  const flush = () => new Promise((r) => setTimeout(r, 0));
  let f: ReturnType<typeof mountFollower> | null = null;
  let w: ReturnType<typeof mountDepthWindow>;
  let ctl: InstanceType<typeof ControllerSession>;
  let bar: HTMLElement;
  /** The host engine's own EEG numerics, by the reading's sim time. */
  const host = new Map<number, Partial<Record<string, Measured>>>();
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'setInterval', 'clearInterval'] });
    Object.assign(net.v, { t: 0, paused: true, rate: 1 });
    host.clear();
    he = createEngine({ seed: 7, device: { skin: 'saadat-like' } });
    he.on((e) => void (e.type === 'measurement' && e.values.sef && host.set(e.t, e.values)), ['measurement']);
    const target = { dispatch: (c: Command) => he.dispatch(c), snapshot: () => he.snapshot(), restore: (s: never) => he.restore(s), on: (fn: (e: EngineEvent) => void) => he.on(fn), now: () => he.now(), time: () => {} };
    const hs = new HostSession({ session: CODE, target, stateIntervalMs: 0 });
    hs.addTransport((net.hub as { connect(): ManagedTransport }).connect());
    ctl = new ControllerSession({ session: CODE, transport: (net.hub as { connect(): ManagedTransport }).connect() });
    await vi.waitFor(() => expect(ctl.hostOnline).toBe(true));
    document.body.replaceChildren();
    close = () => (hs.close(), ctl.close());
    // the host's run loop, as defib-window.dom.test.ts: both engines at the host's tick (the host alone before the join)
    run = async (seconds: number) => {
      for (let i = 0; i < seconds * 50; i++) {
        he.advanceTo(he.now().simT + 0.02 + 1e-9);
        if (i % 10 === 0) hs.emitState();
        await flush();
        f?.sync?.follow();
        if (f && !net.v.paused) {
          net.v.t += 0.02 * net.v.rate;
          (net.ve as MonitorEngine).advanceTo(net.v.t);
        }
      }
      vi.advanceTimersByTime(600); // the window's 500 ms check
    };
    /** The window opens (`#/depth`): the follower, its depth window on the follower's own engine, synced. */
    join = async () => {
      const stage = document.createElement('div');
      const monitorHost = document.createElement('div');
      bar = document.createElement('div');
      document.body.append(stage, monitorHost, bar);
      f = mountFollower({ stage, monitorHost } as never, DEFAULT_SITE, CODE, bar, undefined, { show: 'depth', device: 'depthkey0001' });
      w = mountDepthWindow(stage);
      w.attach(await f.monitor.viewerClock());
      await vi.waitFor(() => expect(f?.sync?.status).toBe('synced'));
      const prev = close;
      close = () => (w.destroy(), f?.destroy(), (f = null), prev());
    };
  });
  afterEach(() => (close(), vi.useRealTimers()));
  let run: (seconds: number) => Promise<void> = async () => {};
  let join: () => Promise<void> = async () => {};
  const eeg = (action: 'on' | 'off' | 'model') => ctl.send({ type: 'device', action: { device: 'eeg', action, ...(action === 'model' ? { value: 'generic' } : {}) } } as never);

  const text = (sel: string) => document.querySelector(`.depth-window ${sel}`)?.textContent ?? null;
  const offShown = () => !(document.querySelector('.depth-off') as HTMLElement).hidden;

  it('with no device on in the room it says so', async () => {
    await run(1);
    await join();
    await run(3);
    expect(offShown()).toBe(true);
    expect(text('.depth-off')).toContain(DEPTH_WORDS.off);
  });

  it("joined after the room's device is on, it shows the host's own values at the same sim time; off again after the stale time", async () => {
    await eeg('on');
    await eeg('model');
    await run(1);
    await join();
    await run(6);
    expect(offShown()).toBe(false);
    expect(text('.depth-label')).toBe('Processed EEG (generic)');
    const t = Number(w.el.dataset.t);
    const h = host.get(t);
    expect(h, `the host read at ${t}`).toBeDefined();
    expect(w.last?.values.sef?.value).toBe(h?.sef?.value); // the same samples, the same reader, the same number
    expect(text('.depth-tile[data-id="sef"] .v')).toBe(h?.sef?.value?.toFixed(1));
    expect(text('.depth-tile[data-id="eegSr"] .v')).toBe(String(Math.round(h?.eegSr?.value ?? NaN)));
    expect(text('.depth-tile[data-id="mf"] .v')).toBe(h?.mf?.value?.toFixed(1));
    expect(text('.depth-tile[data-id="eegImp"] .v')).toBe(h?.eegImp?.value?.toFixed(1));
    expect(text('.depth-sqi')).toBe(DEPTH_WORDS.quality.good);
    for (let k = 0; k < 3; k++) { // still the host's, reading after reading
      await run(1);
      const tk = Number(w.el.dataset.t);
      expect(w.last?.values.sef?.value, `at ${tk}`).toBe(host.get(tk)?.sef?.value);
    }
    await eeg('off');
    await run(DEPTH_STALE_S + 1);
    expect(offShown()).toBe(true);
  });

  it('has no Sound and no Silence: only its status and Change', async () => {
    await join();
    expect([...bar.querySelectorAll('button')].map((b) => b.textContent)).toEqual([]);
    expect(bar.querySelector('a.follower-change')?.getAttribute('href')).toBe('#/pick');
  });

  it("wears the host's theme: light under the projector theme, else dark", async () => {
    await join();
    w.setTheme('projector-light');
    expect(w.el.dataset.theme).toBe('light');
    w.setTheme('');
    expect(w.el.dataset.theme).toBe('dark');
  });
});
