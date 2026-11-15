// @vitest-environment happy-dom
// Brief 195: a phone's status pill when the instructor's simulation stops. The host is still there and says, once a
// second, that its engine has stopped (`engineStopped`): the pill says that, for as long as it lasts, and not "The
// instructor's monitor is not answering" (which it said three seconds after a stop before, as for a host gone). When
// the instructor restarts the patient (a new timeline, then a snapshot) the phone follows again. When the host then goes
// silent, it is "not answering" again. The real ViewerSync on a fake relay socket; the monitor is a stand-in clock.
import { createStamper, type ManagedTransport, type RelayFrame, type TransportStatus, type WireBody, type WireMessage } from '@pme/controller';
import { engineKey } from '@pme/engine-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const CODE = 'KKQB2N';
const net = vi.hoisted(() => ({ listeners: [] as Array<(m: unknown) => void>, relay: null as null | ((f: unknown) => void) }));

vi.mock('@pme/controller', async (orig) => {
  const real = await orig<typeof import('@pme/controller')>();
  return {
    ...real,
    createWebSocketTransport: (o: { onRelayFrame?: (f: RelayFrame) => void }): ManagedTransport => {
      net.relay = o.onRelayFrame as (f: unknown) => void;
      const statusFns: Array<(s: TransportStatus) => void> = [];
      return {
        kind: 'websocket',
        status: 'open',
        send: () => {},
        onMessage: (fn) => (net.listeners.push(fn as (m: unknown) => void), () => void net.listeners.splice(net.listeners.indexOf(fn as (m: unknown) => void), 1)),
        onStatus: (fn) => (statusFns.push(fn), fn('open'), () => {}),
        close: () => {},
      };
    },
  };
});
vi.mock('@pme/renderer', () => ({
  version: '0.0.0-test',
  mountMonitor: () => {
    let tick = 0;
    const clock = {
      restore: (s: { tick: number }) => void (tick = s.tick),
      dispatch: () => ({ accepted: true, tick }),
      on: () => () => {},
      renderT: () => tick * 0.02,
      tick: () => tick,
      setRate: () => {},
      setPaused: () => {},
      jumpTo: () => {},
    };
    return { soundOn: false, viewerClock: () => Promise.resolve(clock), destroy: () => {}, setSkin: () => Promise.resolve(), disableSound: () => {}, enableSound: () => Promise.resolve(), silenceAudio: () => false };
  },
}));

const { mountFollower } = await import('./follower.ts');
const { DEFAULT_SITE } = await import('../site.ts');

/** One instructor page (a reload is a new one: a new peer id, its own seq). */
const host = (id: string) => {
  const stamp = createStamper(CODE, id, () => Date.now());
  return (b: WireBody) => {
    const m: WireMessage = stamp(b);
    for (const fn of [...net.listeners]) fn(m);
  };
};
const snapshot = { schema: 'pme-snapshot/1', engineVersion: engineKey, seed: 7, tick: 3000, state: {} } as never;
const STOPPED = { type: 'engineStopped', t: 61, tick: 3050, reason: 'an error in the simulation: the frame step threw' } as never;
const { ENGINE_STOPPED } = await import('./follower-status.ts');

describe('a phone when the instructor’s simulation stops', () => {
  let destroy = () => {};
  let pill = () => '';
  let sync = () => '';
  let bar: HTMLElement;
  let a: ReturnType<typeof host>;
  /** `s` seconds of the host saying, once a second, that its engine has stopped. */
  const saysStopped = (s: number) => {
    for (let i = 0; i < s; i++) {
      a({ kind: 'event', body: [STOPPED] });
      vi.advanceTimersByTime(1000);
    }
  };
  const mount = async () => {
    net.listeners.length = 0;
    document.body.replaceChildren();
    const stage = document.createElement('div');
    const monitorHost = document.createElement('div');
    bar = document.createElement('div');
    document.body.append(stage, monitorHost, bar);
    const f = mountFollower({ stage, monitorHost } as never, DEFAULT_SITE, CODE, bar, { relay: 'ws://relay.test/' });
    await vi.waitFor(() => expect(f.sync).not.toBeNull());
    destroy = () => f.destroy();
    pill = () => bar.querySelector('.status-pill')?.textContent ?? '';
    sync = () => f.sync?.status ?? 'none';
  };
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame'] });
    await mount();
    a = host('host-aaaaaa');
  });
  afterEach(() => {
    destroy();
    vi.useRealTimers();
  });
  const following = () => {
    a({ kind: 'hello', role: 'host' });
    a({ kind: 'snapshot', body: snapshot });
    a({ kind: 'event', body: [{ type: 'state', t: 60, tick: 3000 } as never] });
    vi.advanceTimersByTime(500);
    expect(sync()).toBe('synced');
    expect(pill()).toBe(`Following session ${CODE}`);
  };

  it('says the simulation has stopped, at once and for as long as the host says so, never "not answering"', () => {
    following();
    a({ kind: 'event', body: [STOPPED] });
    expect(pill()).toBe(ENGINE_STOPPED); // at the notice, not at the next poll
    expect(bar.querySelector('.status-pill')?.getAttribute('data-ok')).toBe('false');
    saysStopped(30); // well past the 5 s a silent host is given
    expect(pill()).toBe(ENGINE_STOPPED);
  });

  it('follows again when the instructor restarts the patient: a new timeline, then its snapshot', () => {
    following();
    saysStopped(3);
    a({ kind: 'event', body: [{ type: 'timeline', t: 0, tick: 0, cause: 'restart' } as never] });
    a({ kind: 'snapshot', body: { ...(snapshot as object), tick: 0 } as never });
    a({ kind: 'event', body: [{ type: 'state', t: 0.5, tick: 25 } as never] });
    vi.advanceTimersByTime(500);
    expect(sync()).toBe('synced');
    expect(pill()).toBe(`Following session ${CODE}`);
  });

  it('a reloaded instructor page (its hello) is a new engine: the phone waits for it, then follows', () => {
    following();
    saysStopped(2);
    const b = host('host-bbbbbb');
    b({ kind: 'hello', role: 'host' });
    expect(pill()).toBe(`Waiting for the instructor's monitor ${CODE}…`);
    b({ kind: 'snapshot', body: snapshot });
    expect(pill()).toBe(`Following session ${CODE}`);
  });

  it('a stopped host that goes silent is "not answering" again', () => {
    following();
    saysStopped(2);
    vi.advanceTimersByTime(5000); // the notices end: the host has gone
    expect(pill()).toBe("The instructor's monitor is not answering");
  });

  it('a phone that joins after the stop is told so (no snapshot comes), not left "Waiting"', () => {
    a({ kind: 'hello', role: 'host' });
    saysStopped(10);
    expect(sync()).toBe('waiting');
    expect(pill()).toBe(ENGINE_STOPPED);
  });
});
