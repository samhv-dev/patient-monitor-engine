// @vitest-environment happy-dom
// Plan room-and-instruments.md R8d: the ventilator's own page signs in over the relay as the `ventilator` role (R8a),
// with the PIN typed into P7's form and held in the page's memory only. Every socket says its own hello, from a fresh
// peer id, with the PIN; its link messages go out only once the host has granted it, and only a `vent` for it is heard.
// A refusal (wrong PIN, taken over, the PIN changed, too many tries) ends the link and says why. The network gone (the
// browser's `offline`), it drops its socket, so the host hears the silence and hands over; back (`online`) it signs in
// again with the PIN it holds. The relay is a fake link the test drives with the host's and the relay's frames.
import { createStamper, INSTRUCTOR_REASONS, type ManagedTransport, type RelayFrame, type TransportStatus, type WireBody, type WireMessage } from '@pme/controller';
import { afterEach, describe, expect, it } from 'vitest';
import { signInVentilator, type VentDevice } from './device-link.ts';

const CODE = 'AB2CD3';
const PIN = '6152';

function fakeRelay() {
  let status: TransportStatus = 'connecting';
  const msg = new Set<(m: WireMessage) => void>();
  const st = new Set<(s: TransportStatus) => void>();
  const rf = new Set<(f: RelayFrame) => void>();
  const sent: WireMessage[] = [];
  const t = {
    kind: 'websocket',
    get status() {
      return status;
    },
    sent,
    send: (m: WireMessage) => void (status === 'open' && sent.push(m)),
    onMessage: (fn: (m: WireMessage) => void) => (msg.add(fn), () => void msg.delete(fn)),
    onStatus: (fn: (s: TransportStatus) => void) => (st.add(fn), fn(status), () => void st.delete(fn)),
    onRelayFrame: (fn: (f: RelayFrame) => void) => (rf.add(fn), () => void rf.delete(fn)),
    close: () => t.setStatus('closed'),
    setStatus(s: TransportStatus) {
      if (status === 'closed') return;
      status = s;
      for (const fn of [...st]) fn(s);
    },
    deliver: (m: WireMessage) => [...msg].forEach((fn) => fn(m)),
    frame: (f: RelayFrame) => [...rf].forEach((fn) => fn(f)),
  };
  return t;
}
type Relay = ReturnType<typeof fakeRelay>;
let links: Relay[] = [];
let dev: VentDevice | null = null;
afterEach(() => {
  dev?.close();
  dev = null;
  links = [];
});

const start = () => {
  dev = signInVentilator({ code: CODE, relay: 'ws://relay.test/?e2e-remote', pin: PIN, connect: () => (links.push(fakeRelay()), links.at(-1) as unknown as ManagedTransport) });
  return dev;
};
const host = (r: Relay) => {
  const stamp = createStamper(CODE, 'host-h1');
  const send = (b: WireBody) => r.deliver(stamp(b));
  const from = () => [...r.sent].reverse().find((m) => m.kind === 'hello')?.from as string;
  return { from, grant: (granted: boolean, reason?: string) => send({ kind: 'grant', to: from(), granted, ...(reason ? { reason } : {}) }), vent: (to: string | undefined, body: unknown) => send({ kind: 'vent', ...(to ? { to } : {}), body } as never) };
};
const hellos = (r: Relay) => r.sent.filter((m) => m.kind === 'hello');

describe("R8d: the ventilator device's sign-in over the relay", () => {
  it('says a ventilator hello with the PIN on every open socket, from a fresh id each time', () => {
    const d = start();
    const r = links[0] as Relay;
    expect(hellos(r)).toEqual([]);
    r.setStatus('open');
    expect(hellos(r)).toMatchObject([{ kind: 'hello', role: 'ventilator', pin: PIN, session: CODE }]);
    expect(d.state).toBe('pending');
    const first = host(r).from();
    r.setStatus('connecting');
    r.setStatus('open');
    expect(hellos(r)).toHaveLength(2);
    expect(host(r).from()).not.toBe(first);
    expect(d.sender).toBe(host(r).from());
    // the PIN rides the hello only
    expect(r.sent.filter((m) => m.kind !== 'hello' && JSON.stringify(m).includes(PIN))).toEqual([]);
  });

  it('sends its link messages only once granted, as `vent`; hears only a `vent` for itself', () => {
    const d = start();
    const r = links[0] as Relay;
    r.setStatus('open');
    const heard: unknown[] = [];
    d.wire.onBody((b) => void heard.push(b));
    d.wire.send({ v: 1, kind: 'time', action: 'resume' });
    expect(r.sent.filter((m) => m.kind === 'vent')).toEqual([]);
    host(r).grant(true);
    expect(d.state).toBe('granted');
    d.wire.send({ v: 1, kind: 'time', action: 'resume' });
    expect(r.sent.filter((m) => m.kind === 'vent')).toMatchObject([{ kind: 'vent', body: { kind: 'time', action: 'resume' } }]);
    host(r).vent('someone-else', { v: 1, kind: 'clock', ventTick: 10 });
    host(r).vent(d.sender ?? '', { v: 1, kind: 'clock', ventTick: 20 });
    expect(heard).toEqual([{ v: 1, kind: 'clock', ventTick: 20 }]);
  });

  it('a wrong PIN, a take-over, a PIN change or too many tries end the link with the reason', () => {
    for (const [granted, reason, state] of [[false, INSTRUCTOR_REASONS.wrongPin, 'denied'], [true, INSTRUCTOR_REASONS.takenOver, 'revoked'], [true, INSTRUCTOR_REASONS.pinChanged, 'revoked']] as const) {
      const d = start();
      const r = links.at(-1) as Relay;
      r.setStatus('open');
      if (granted) host(r).grant(true);
      host(r).grant(false, reason);
      expect(d.state, reason).toBe(state);
      expect(d.access.reason).toBe(reason);
      expect(r.status).toBe('closed');
      d.close();
    }
    const d = start();
    const r = links.at(-1) as Relay;
    r.setStatus('open');
    r.frame({ relay: 'error', code: 'too-many-tries', message: 'too many tries' } as RelayFrame);
    expect(d.state).toBe('denied');
    expect(d.access.code).toBe('too-many-tries');
  });

  it('offline: it drops its socket at once (the host hears silence); online: it signs in again with the PIN it holds', () => {
    const d = start();
    const r = links[0] as Relay;
    r.setStatus('open');
    host(r).grant(true);
    const was = d.sender;
    dispatchEvent(new Event('offline'));
    expect(r.status).toBe('closed');
    expect(d.state).toBe('offline');
    d.wire.send({ v: 1, kind: 'time', action: 'resume' }); // nothing goes while it is offline
    expect(links).toHaveLength(1);
    dispatchEvent(new Event('online'));
    expect(links).toHaveLength(2);
    const r2 = links[1] as Relay;
    r2.setStatus('open');
    expect(hellos(r2)).toMatchObject([{ role: 'ventilator', pin: PIN }]);
    expect(d.state).toBe('pending');
    host(r2).grant(true);
    expect(d.state).toBe('granted');
    expect(d.sender).not.toBe(was);
  });

  it('closed, it sends nothing more and does not come back online', () => {
    const d = start();
    (links[0] as Relay).setStatus('open');
    d.close();
    dispatchEvent(new Event('online'));
    expect(links).toHaveLength(1);
    expect(d.state).toBe('closed');
  });
});
