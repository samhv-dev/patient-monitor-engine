// The host's side of the round after its page reloads: a device admitted on a PIN was handed a ticket; a new host on
// the same book admits it on that ticket and hands on the next; every case that must ask for the PIN again is refused
// with its own reason (the PIN changed, taken over, another session, a ticket not known or said by a copy).
import { afterEach, describe, expect, it } from 'vitest';
import { HostSession, INSTRUCTOR_REASONS, LEARNER_REASONS, TICKET_REASONS, type HostTarget } from '../../src/session/host-session.ts';
import { SignInBook, type BookKeep } from '../../src/session/sign-in-book.ts';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { createStamper, type ManagedTransport, type WireMessage } from '../../src/protocol.ts';
import { collect, waitFor } from '../helpers.ts';

const S = 'RMW234';
const LEARNER_PIN = '582913';
const INSTRUCTOR_PIN = '4729';
const KEY = 'remote0001';

const target: HostTarget = {
  dispatch: (c) => ({ accepted: true, tick: c.atTick ?? 0 }),
  dispatchGroup: (cs) => cs.map((c) => ({ accepted: true, tick: c.atTick ?? 0 })),
  snapshot: () => ({ schema: 'x', tick: 0 } as never),
  restore: () => undefined,
  on: () => () => undefined,
  now: () => ({ tick: 0, simT: 0 }),
  time: () => undefined,
};
type Grant = Extract<WireMessage, { kind: 'grant' }>;
const hosts: HostSession[] = [];
afterEach(() => {
  for (const h of hosts.splice(0)) h.close();
});
const memory = (): BookKeep => {
  let v: string | null = null;
  return { read: () => v, write: (s) => void (v = s) };
};

/** A host page on `keep` (the tab's storage): a second call with the same keep is that page reloaded. */
function hostPage(keep: BookKeep, pins: { learner: () => string | null; instructor: () => string | null }, rack = true) {
  const host = new HostSession({ session: S, target, stateIntervalMs: 0, instructorPin: pins.instructor, learnerPin: pins.learner, signIns: new SignInBook(S, keep), pumpRack: () => (rack ? ['syringe'] : []) as never, onVent: () => undefined });
  hosts.push(host);
  const hub = createInProcessHub();
  host.addTransport(hub.connect());
  const relay = hub.connect();
  return { host, relay, got: collect(relay) };
}
function device(t: ManagedTransport, from: string, role: 'learner' | 'pump' | 'instructor' | 'ventilator', extra: Record<string, unknown> = {}) {
  const st = createStamper(S, from);
  return (proof: Record<string, unknown>) => t.send(st({ kind: 'hello', role, ...extra, ...proof } as never));
}
async function answer(got: WireMessage[], to: string, n: number): Promise<Grant> {
  await waitFor(() => got.filter((m) => m.kind === 'grant' && m.to === to).length >= n, 2000, `grant ${n} to ${to}`);
  return got.filter((m): m is Grant => m.kind === 'grant' && m.to === to)[n - 1] as Grant;
}

describe('a device comes back on its ticket after the host page reloads', () => {
  const pins = { learner: () => LEARNER_PIN, instructor: () => INSTRUCTOR_PIN };
  const roles = [
    { role: 'learner', extra: { show: 'learner', device: KEY }, pin: LEARNER_PIN },
    { role: 'pump', extra: { device: KEY }, pin: LEARNER_PIN },
    { role: 'instructor', extra: {}, pin: INSTRUCTOR_PIN },
    { role: 'ventilator', extra: {}, pin: INSTRUCTOR_PIN },
  ] as const;
  for (const r of roles) {
    it(`${r.role}: the PIN's grant hands on a ticket; the reloaded host admits that ticket and hands on another`, async () => {
      const keep = memory();
      const a = hostPage(keep, pins);
      device(a.relay, 'd.1', r.role, r.extra)({ pin: r.pin });
      const g1 = await answer(a.got, 'd.1', 1);
      expect(g1).toMatchObject({ granted: true });
      expect(g1.ticket).toBeDefined();
      a.host.close();
      const b = hostPage(keep, pins);
      device(b.relay, 'd.2', r.role, r.extra)({ ticket: g1.ticket });
      const g2 = await answer(b.got, 'd.2', 1);
      expect(g2.granted).toBe(true);
      expect(g2.ticket).toBeDefined();
      expect(g2.ticket).not.toBe(g1.ticket);
    });
  }

  it('the holder that says its hello again (the same socket) is handed the ticket it holds, not a new one', async () => {
    const a = hostPage(memory(), pins);
    const hello = device(a.relay, 'lr.1', 'learner', { show: 'learner', device: KEY });
    hello({ pin: LEARNER_PIN });
    const g1 = await answer(a.got, 'lr.1', 1);
    hello({ ticket: g1.ticket }); // a resync: the follower says hello again
    expect(await answer(a.got, 'lr.1', 2)).toMatchObject({ granted: true, ticket: g1.ticket });
  });

  it('the peer id the chain was handed to may say the ticket it replaced (its grant was lost), before and after another reload', async () => {
    const keep = memory();
    const a = hostPage(keep, pins);
    device(a.relay, 'lr.1', 'learner', { show: 'learner', device: KEY })({ pin: LEARNER_PIN });
    const g1 = await answer(a.got, 'lr.1', 1);
    a.host.close();
    const b = hostPage(keep, pins);
    const helloB = device(b.relay, 'lr.1', 'learner', { show: 'learner', device: KEY });
    helloB({ ticket: g1.ticket });
    const g2 = await answer(b.got, 'lr.1', 1);
    expect(g2.ticket).not.toBe(g1.ticket);
    helloB({ ticket: g1.ticket }); // g2 never reached the phone
    expect(await answer(b.got, 'lr.1', 2)).toMatchObject({ granted: true, ticket: g2.ticket });
    b.host.close();
    const c = hostPage(keep, pins);
    device(c.relay, 'lr.1', 'learner', { show: 'learner', device: KEY })({ ticket: g1.ticket });
    expect(await answer(c.got, 'lr.1', 1)).toMatchObject({ granted: true });
  });
});

describe('the cases that ask for the PIN again, each with its reason', () => {
  it('the learner PIN changed meanwhile: "the learner PIN was changed", for a learner remote and a pump', async () => {
    const keep = memory();
    let learner = LEARNER_PIN;
    const a = hostPage(keep, { learner: () => learner, instructor: () => INSTRUCTOR_PIN });
    device(a.relay, 'lr.1', 'learner', { show: 'learner', device: KEY })({ pin: LEARNER_PIN });
    device(a.relay, 'p.1', 'pump', { device: 'tablet0001' })({ pin: LEARNER_PIN });
    const [l, p] = [await answer(a.got, 'lr.1', 1), await answer(a.got, 'p.1', 1)];
    learner = '771234';
    a.host.learnerPinChanged();
    a.host.close();
    const b = hostPage(keep, { learner: () => learner, instructor: () => INSTRUCTOR_PIN });
    device(b.relay, 'lr.1', 'learner', { show: 'learner', device: KEY })({ ticket: l.ticket });
    device(b.relay, 'p.1', 'pump', { device: 'tablet0001' })({ ticket: p.ticket });
    expect(await answer(b.got, 'lr.1', 1)).toMatchObject({ granted: false, reason: LEARNER_REASONS.pinChanged });
    expect(await answer(b.got, 'p.1', 1)).toMatchObject({ granted: false, reason: LEARNER_REASONS.pinChanged });
  });

  it("the instructor's PIN changed: the phone's and the cockpit's tickets say so", async () => {
    const keep = memory();
    const a = hostPage(keep, { learner: () => LEARNER_PIN, instructor: () => INSTRUCTOR_PIN });
    device(a.relay, 'ins.1', 'instructor')({ pin: INSTRUCTOR_PIN });
    const g = await answer(a.got, 'ins.1', 1);
    a.host.instructorPinChanged();
    device(a.relay, 'ins.2', 'instructor')({ ticket: g.ticket });
    expect(await answer(a.got, 'ins.2', 1)).toMatchObject({ granted: false, reason: INSTRUCTOR_REASONS.pinChanged });
  });

  it('removed by another phone taking over: the first phone\'s ticket says "taken over"', async () => {
    const a = hostPage(memory(), { learner: () => LEARNER_PIN, instructor: () => INSTRUCTOR_PIN });
    device(a.relay, 'ins-a.1', 'instructor')({ pin: INSTRUCTOR_PIN });
    const g = await answer(a.got, 'ins-a.1', 1);
    device(a.relay, 'ins-b.1', 'instructor')({ pin: INSTRUCTOR_PIN });
    expect(await answer(a.got, 'ins-a.1', 2)).toMatchObject({ granted: false, reason: INSTRUCTOR_REASONS.takenOver });
    device(a.relay, 'ins-a.2', 'instructor')({ ticket: g.ticket });
    expect(await answer(a.got, 'ins-a.2', 1)).toMatchObject({ granted: false, reason: INSTRUCTOR_REASONS.takenOver });
  });

  it('another session started, or a host that lost its book: "started a new session"', async () => {
    const a = hostPage(memory(), { learner: () => LEARNER_PIN, instructor: () => INSTRUCTOR_PIN });
    device(a.relay, 'lr.1', 'learner', { show: 'learner', device: KEY })({ pin: LEARNER_PIN });
    const g = await answer(a.got, 'lr.1', 1);
    a.host.close();
    const b = hostPage(memory(), { learner: () => LEARNER_PIN, instructor: () => INSTRUCTOR_PIN });
    device(b.relay, 'lr.1', 'learner', { show: 'learner', device: KEY })({ ticket: g.ticket });
    expect(await answer(b.got, 'lr.1', 1)).toMatchObject({ granted: false, reason: TICKET_REASONS.newSession });
  });

  it('a ticket not known, or of another device key, is refused and counted with the wrong PINs', async () => {
    const a = hostPage(memory(), { learner: () => LEARNER_PIN, instructor: () => INSTRUCTOR_PIN });
    device(a.relay, 'lr.1', 'learner', { show: 'learner', device: KEY })({ pin: LEARNER_PIN });
    const g = await answer(a.got, 'lr.1', 1);
    const forged = `${(g.ticket as string).split('.')[0]}.${'A'.repeat(22)}`;
    device(a.relay, 'x.1', 'learner', { show: 'learner', device: KEY })({ ticket: forged });
    device(a.relay, 'x.2', 'learner', { show: 'learner', device: 'other00001' })({ ticket: g.ticket });
    expect(await answer(a.got, 'x.1', 1)).toMatchObject({ granted: false, reason: TICKET_REASONS.used });
    expect(await answer(a.got, 'x.2', 1)).toMatchObject({ granted: false, reason: TICKET_REASONS.used });
    expect(a.host.learnerDenials()).toBe(2);
  });

  it('two devices with one ticket: the replaced ticket from another peer id signs both out, and the chain admits no more', async () => {
    const keep = memory();
    const a = hostPage(keep, { learner: () => LEARNER_PIN, instructor: () => INSTRUCTOR_PIN });
    device(a.relay, 'lr.1', 'learner', { show: 'learner', device: KEY })({ pin: LEARNER_PIN });
    const g1 = await answer(a.got, 'lr.1', 1); // overheard on the Wi-Fi
    a.host.close();
    const b = hostPage(keep, { learner: () => LEARNER_PIN, instructor: () => INSTRUCTOR_PIN });
    const real = device(b.relay, 'lr.1', 'learner', { show: 'learner', device: KEY });
    real({ ticket: g1.ticket });
    const g2 = await answer(b.got, 'lr.1', 1);
    device(b.relay, 'eve.1', 'learner', { show: 'learner', device: KEY })({ ticket: g1.ticket });
    expect(await answer(b.got, 'eve.1', 1)).toMatchObject({ granted: false, reason: TICKET_REASONS.used });
    expect(await answer(b.got, 'lr.1', 2)).toMatchObject({ granted: false, reason: TICKET_REASONS.used });
    real({ ticket: g2.ticket });
    expect(await answer(b.got, 'lr.1', 3)).toMatchObject({ granted: false, reason: TICKET_REASONS.used });
    expect(b.host.learnerRemotes()).toBe(0);
    expect(b.host.learnerDenials()).toBe(2);
  });

  it('the current ticket said by another peer id takes the chain: the earlier socket is told "taken over"', async () => {
    const a = hostPage(memory(), { learner: () => LEARNER_PIN, instructor: () => INSTRUCTOR_PIN });
    device(a.relay, 'lr.1', 'learner', { show: 'learner', device: KEY })({ pin: LEARNER_PIN });
    const g = await answer(a.got, 'lr.1', 1);
    device(a.relay, 'eve.1', 'learner', { show: 'learner', device: KEY })({ ticket: g.ticket });
    expect(await answer(a.got, 'eve.1', 1)).toMatchObject({ granted: true });
    expect(await answer(a.got, 'lr.1', 2)).toMatchObject({ granted: false, reason: INSTRUCTOR_REASONS.takenOver });
    expect(a.host.learnerRemotes()).toBe(1);
  });

  it('a host without a book hands on no ticket and refuses one', async () => {
    const host = new HostSession({ session: S, target, stateIntervalMs: 0, learnerPin: () => LEARNER_PIN, instructorPin: () => INSTRUCTOR_PIN });
    hosts.push(host);
    const hub = createInProcessHub();
    host.addTransport(hub.connect());
    const relay = hub.connect();
    const got = collect(relay);
    device(relay, 'lr.1', 'learner', { show: 'learner', device: KEY })({ pin: LEARNER_PIN });
    expect((await answer(got, 'lr.1', 1)).ticket).toBeUndefined();
    device(relay, 'lr.2', 'learner', { show: 'learner', device: KEY })({ ticket: `ABCDEFGH.${'A'.repeat(22)}` });
    expect(await answer(got, 'lr.2', 1)).toMatchObject({ granted: false, reason: TICKET_REASONS.newSession });
  });
});
