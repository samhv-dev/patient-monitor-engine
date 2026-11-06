// Plan instructor-peer-role.md P7 (§1, Q2, §7): the laptop's PIN store, and the two places the PIN must never reach
// that are not addresses (classroom.test.ts) or the page (views/room-instructor.dom.test.ts): the tab's state, and a
// learner's frames. The learner's phone here is a raw socket on the real relay, beside the laptop's real HostSession
// (reading this store) and real instructor phones: a wrong PIN, the right one, a command, a PIN change, a takeover.
import { createEngine } from '@pme/engine-core';
import { ControllerSession, createWebSocketTransport, HostSession, PIN_RE, type HostTarget } from '@pme/controller';
import { afterEach, describe, expect, it } from 'vitest';
import { startRelay, type RelayHandle } from '../../../../packages/controller/relay/server.ts';
import { drawPin, instructorPin, PIN_KEY } from './instructor-pin.ts';
import { keptItems } from './position.ts';
import { store } from './store.ts';

const memory = () => {
  const m = new Map<string, string>();
  return { m, get: () => m.get('k') ?? null, set: (v: string) => void m.set('k', v) };
};

describe("the laptop's PIN", () => {
  it('four random digits drawn at first use and kept; a stored PIN is kept; a damaged one is drawn again', () => {
    for (let i = 0; i < 200; i++) expect(drawPin()).toMatch(/^[0-9]{4}$/);
    expect(drawPin(() => 7)).toBe('0007');
    const s = memory();
    const a = instructorPin(s, () => 4729);
    expect(a.get()).toBe('4729');
    expect(s.m.get('k')).toBe('4729');
    expect(instructorPin(s, () => 1111).get()).toBe('4729'); // a reload keeps it
    s.set('12ab');
    expect(instructorPin(s, () => 1111).get()).toBe('1111');
    expect(PIN_RE.test(a.get())).toBe(true);
  });

  it('a change draws a different PIN, keeps it and tells the listeners (the host revokes the phone)', () => {
    const s = memory();
    const seq = [4729, 4729, 4729, 815];
    const p = instructorPin(s, () => seq.shift() ?? 0);
    const heard: string[] = [];
    p.onChange((v) => heard.push(v));
    expect(p.change()).toBe('0815');
    expect(p.get()).toBe('0815');
    expect(s.m.get('k')).toBe('0815');
    expect(heard).toEqual(['0815']);
  });

  it("lives in the computer's store under pme.instructorPin only: never in the tab's state that a reload or another tab reads", () => {
    const local = new Map<string, string>();
    const session = new Map<string, string>();
    const asStorage = (m: Map<string, string>) => ({ getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), key: (i: number) => [...m.keys()][i] ?? null, get length() { return m.size; }, clear: () => m.clear() }) as unknown as Storage;
    const g = globalThis as { localStorage?: Storage; sessionStorage?: Storage };
    const was = [g.localStorage, g.sessionStorage];
    g.localStorage = asStorage(local);
    g.sessionStorage = asStorage(session);
    try {
      session.set('pme.position', JSON.stringify({ code: 'AB2CD3', simT: 12 })); // what position.ts keeps
      const p = instructorPin();
      expect([...local.keys()]).toEqual([`pme.${PIN_KEY}`]);
      expect(store.get(PIN_KEY)).toBe(p.get());
      expect(session.size).toBe(1);
      // what host-guard.ts hands to another tab of this browser, and what a reload restores
      expect(JSON.stringify(keptItems(asStorage(session)))).not.toContain(p.get());
      expect(JSON.stringify(Object.fromEntries(session))).not.toContain(p.get());
    } finally {
      [g.localStorage, g.sessionStorage] = was;
    }
  });
});

describe("a learner's frames never carry the PIN", () => {
  let relay: RelayHandle | null = null;
  const closers: Array<() => void> = [];
  afterEach(async () => {
    for (const c of closers.splice(0)) c();
    await relay?.close();
    relay = null;
  });
  const until = async (ok: () => boolean, what: string) => {
    for (let i = 0; i < 400 && !ok(); i++) await new Promise((r) => setTimeout(r, 10));
    if (!ok()) throw new Error(`timed out: ${what}`);
  };

  it('through a wrong PIN, a sign-in, a command, a PIN change and a takeover on the real relay', async () => {
    const CODE = 'NPS234';
    // eight digits, so that no clock or id can hold them by chance; the second PIN the store draws is as long
    const draws = [90_817_263, 46_150_392];
    const s = memory();
    s.set(String(draws[0]));
    const pin = instructorPin(s, () => draws[1] as number);
    const pins = [pin.get()];
    relay = await startRelay({ port: 0, host: '127.0.0.1', heartbeatMs: 60_000, remoteRoles: 'viewer', isLocal: (_a, req) => !req?.url?.includes('e2e-remote'), log: () => undefined });
    const url = `ws://127.0.0.1:${relay.port}/`;
    const e = createEngine({ seed: 3 });
    const target: HostTarget = { dispatch: (c) => e.dispatch(c), snapshot: () => e.snapshot(), restore: (x) => e.restore(x), on: (f) => e.on(f), now: () => e.now(), time: () => undefined };
    const host = new HostSession({ session: CODE, target, stateIntervalMs: 0, instructorPin: () => pin.get() });
    const hostLink = createWebSocketTransport({ url });
    host.addTransport(hostLink);
    closers.push(() => (host.close(), hostLink.close()));
    await until(() => hostLink.status === 'open', 'the host on the relay');

    // the learner's phone: a raw socket that keeps every frame it receives
    const raw: string[] = [];
    const learner = new WebSocket(`${url}?e2e-remote`);
    learner.onmessage = (m) => void raw.push(String(m.data));
    await new Promise((ok) => (learner.onopen = ok));
    closers.push(() => learner.close());
    learner.send(JSON.stringify({ v: 1, session: CODE, from: 'view-l1', seq: 1, sentAt: Date.now(), kind: 'hello', role: 'viewer' }));
    await until(() => raw.some((f) => f.includes('"snapshot"')), 'the learner welcomed');

    const phone = (typed: string) => {
      const t = createWebSocketTransport({ url: `${url}?e2e-remote` });
      const c = new ControllerSession({ session: CODE, transport: t, role: 'instructor', pin: () => typed, issuedBy: 'remote' });
      closers.push(() => (c.close(), t.close()));
      return c;
    };
    const wrong = phone('12345678');
    await until(() => wrong.access.state === 'denied', 'a wrong PIN refused');
    const a = phone(pin.get());
    await until(() => a.access.state === 'granted', 'the right PIN signed in');
    expect((await a.send({ type: 'time', action: 'pause' })).accepted).toBe(true);
    pin.change();
    pins.push(pin.get());
    host.instructorPinChanged();
    await until(() => a.access.state === 'revoked', 'revoked by the change');
    const b = phone(pin.get());
    await until(() => b.access.state === 'granted', 'the new PIN signed in');
    const c = phone(pin.get());
    await until(() => c.access.state === 'granted' && b.access.state === 'revoked', 'a takeover');
    await new Promise((r) => setTimeout(r, 100)); // whatever the relay still sends the learner

    expect(pins).toEqual(['90817263', '46150392']);
    // the learner heard the session the whole time: its welcome, and the phone's pause applied
    expect(raw.some((f) => f.includes('"snapshot"'))).toBe(true);
    expect(raw.some((f) => f.includes('"commandApplied"') && f.includes('"pause"'))).toBe(true);
    for (const f of raw) for (const p of pins) expect(f).not.toContain(p);
    for (const f of raw) expect(f).not.toMatch(/"pin"\s*:|"grant"|instructorView/);
  });
});
