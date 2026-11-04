// @vitest-environment happy-dom
// fix-follower-pill-lag: a phone's status pill after the instructor's page reloads. Kit check 30 Oct: every phone was
// `synced` again within milliseconds, but two pills still read "Waiting for the instructor's monitor …" or "The
// instructor's monitor is not answering" — the pill was drawn only by the 500 ms poll, so it showed what the phone knew
// during the reload, not the sync it had just got. And a `cockpit` notice from the page that went away held the phone
// behind "The ventilator is on the main screen" for up to 2.5 s after the new page said hello.
// The real ViewerSync on a fake relay socket; the monitor is a stand-in clock (no canvas here).
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
const peers = (hostOnline: boolean) => net.relay?.({ relay: 'peers', hostOnline, peers: 1 });

describe("a phone's status pill after the instructor's page reloads", () => {
  let destroy = () => {};
  let pill = () => '';
  let sync = () => '';
  let a: ReturnType<typeof host>;
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame'] });
    net.listeners.length = 0;
    document.body.replaceChildren();
    const stage = document.createElement('div');
    const monitorHost = document.createElement('div');
    const bar = document.createElement('div');
    document.body.append(stage, monitorHost, bar);
    const f = mountFollower({ stage, monitorHost } as never, DEFAULT_SITE, CODE, bar, { relay: 'ws://relay.test/' });
    await vi.waitFor(() => expect(f.sync).not.toBeNull());
    destroy = () => f.destroy();
    pill = () => bar.querySelector('.status-pill')?.textContent ?? '';
    sync = () => f.sync?.status ?? 'none';
    // The first instructor page: hello, snapshot, its 1 Hz state
    a = host('host-aaaaaa');
    a({ kind: 'hello', role: 'host' });
    a({ kind: 'snapshot', body: snapshot });
    a({ kind: 'event', body: [{ type: 'state', t: 60, tick: 3000 } as never] });
    vi.advanceTimersByTime(500);
    expect(sync()).toBe('synced');
    expect(pill()).toBe(`Following session ${CODE}`);
  });
  afterEach(() => {
    destroy();
    vi.useRealTimers();
  });

  it('reads "Following" as soon as the phone is synced again — not what it knew while the page reloaded', () => {
    peers(false); // The relay: the instructor's page left
    vi.advanceTimersByTime(500);
    expect(pill()).toBe("The instructor's monitor is not answering");
    peers(true); // The reloaded page joins, says hello, and answers this phone's hello with a snapshot
    const b = host('host-bbbbbb');
    b({ kind: 'hello', role: 'host' });
    b({ kind: 'snapshot', body: snapshot });
    expect(sync()).toBe('synced');
    expect(pill()).toBe(`Following session ${CODE}`); // No poll since: the pill reads the sync it has
  });

  it('says "Waiting" while the new page has said hello but sent no snapshot, then "Following" with it', () => {
    const b = host('host-bbbbbb');
    b({ kind: 'hello', role: 'host' });
    expect(sync()).toBe('waiting');
    expect(pill()).toBe(`Waiting for the instructor's monitor ${CODE}…`);
    b({ kind: 'snapshot', body: snapshot });
    expect(pill()).toBe(`Following session ${CODE}`);
  });

  it('drops the ventilator hold of the page that went away: the reloaded page has not opened its Ventilator view', () => {
    a({ kind: 'event', body: [{ type: 'cockpit', t: 60, tick: 3000 } as never] });
    vi.advanceTimersByTime(500);
    expect(pill()).toBe('The ventilator is on the main screen: this monitor waits until it closes');
    const b = host('host-bbbbbb');
    b({ kind: 'hello', role: 'host' });
    b({ kind: 'snapshot', body: snapshot });
    vi.advanceTimersByTime(500); // Well inside the 2.5 s a cockpit notice lasts
    expect(pill()).toBe(`Following session ${CODE}`);
  });

  it('still holds while the NEW page says its Ventilator view drives the patient', () => {
    const b = host('host-bbbbbb');
    b({ kind: 'hello', role: 'host' });
    b({ kind: 'snapshot', body: snapshot });
    b({ kind: 'event', body: [{ type: 'cockpit', t: 60, tick: 3000 } as never] });
    expect(pill()).toBe('The ventilator is on the main screen: this monitor waits until it closes');
  });
});
