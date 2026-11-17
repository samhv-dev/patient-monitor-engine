// The host's sign-in check waits on a SHA-256 (sign-in-book.ts, crypto.subtle). Here the digest is held and released in a
// chosen order, so each case is the same every run: a step of the host's own (a PIN change, the ventilator's silence
// hand-over, a transport that closes, "Forget the room") taken while a device's check is pending comes after that check,
// and the same device's next message too.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HostSession, INSTRUCTOR_REASONS, LEARNER_REASONS, TICKET_REASONS, VENTILATOR_REASONS, type HostTarget } from '../../src/session/host-session.ts';
import { SignInBook, type BookKeep } from '../../src/session/sign-in-book.ts';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { createStamper, type WireMessage } from '../../src/protocol.ts';
import { collect, waitFor } from '../helpers.ts';

const S = 'RMW234';
const LEARNER_PIN = '582913';
const INSTRUCTOR_PIN = '4729';
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
afterEach(async () => {
  vi.restoreAllMocks();
  stampers.clear();
  for (const h of hosts.splice(0)) await h.close();
});

/** Every SHA-256 the book asks for waits until `release()`; `asked` counts those still held. */
function holdDigests() {
  const real = crypto.subtle.digest.bind(crypto.subtle);
  const held: Array<() => void> = [];
  vi.spyOn(crypto.subtle, 'digest').mockImplementation(((alg: AlgorithmIdentifier, data: BufferSource) => new Promise<ArrayBuffer>((ok) => held.push(() => void real(alg, data).then(ok)))) as never);
  return { asked: () => held.length, release: () => (held.splice(0).forEach((go) => go()), vi.restoreAllMocks()) };
}
const memory = (): BookKeep => {
  let v: string | null = null;
  return { read: () => v, write: (s) => void (v = s) };
};
function host(keep: BookKeep, pins: { learner: () => string; instructor: () => string }) {
  const counts: number[] = [];
  const vents: Array<string | null> = [];
  const h = new HostSession({
    session: S, target, stateIntervalMs: 0, instructorPin: pins.instructor, learnerPin: pins.learner, signIns: new SignInBook(S, keep),
    onInstructors: (n) => counts.push(n), onVent: () => undefined, onVentilator: (f) => vents.push(f), pumpRack: () => ['syringe'],
  });
  hosts.push(h);
  const hub = createInProcessHub();
  const side = hub.connect();
  h.addTransport(side);
  const relay = hub.connect();
  return { h, side, relay, got: collect(relay), counts, vents };
}
const grants = (got: WireMessage[], to: string) => got.filter((m): m is Grant => m.kind === 'grant' && m.to === to);
const stampers = new Map<string, ReturnType<typeof createStamper>>(); // one sequence per peer id, as a page keeps
const hello = (relay: ReturnType<typeof host>['relay'], from: string, role: 'learner' | 'pump' | 'instructor' | 'ventilator', proof: Record<string, string>) =>
  relay.send((stampers.get(from) ?? stampers.set(from, createStamper(S, from)).get(from)!)({ kind: 'hello', role, ...(role === 'learner' ? { show: 'learner', device: 'remote0001' } : role === 'pump' ? { device: 'pump00000001' } : {}), ...proof } as never));
const forgotten = (h: HostSession) => h.forgetSignIns();

describe("the host's own steps while a sign-in check is pending come after it", () => {
  type Case = { role: 'learner' | 'pump' | 'instructor' | 'ventilator'; pin: string; reason: string; change: (h: HostSession) => Promise<void> };
  const cases: Case[] = [
    { role: 'learner', pin: LEARNER_PIN, reason: LEARNER_REASONS.pinChanged, change: (h: HostSession) => h.learnerPinChanged() },
    { role: 'instructor', pin: INSTRUCTOR_PIN, reason: INSTRUCTOR_REASONS.pinChanged, change: (h: HostSession) => h.instructorPinChanged() },
    { role: 'ventilator', pin: INSTRUCTOR_PIN, reason: INSTRUCTOR_REASONS.pinChanged, change: (h: HostSession) => h.instructorPinChanged() },
    ...(['learner', 'pump', 'instructor', 'ventilator'] as const).map((role) => ({ role, pin: role === 'learner' || role === 'pump' ? LEARNER_PIN : INSTRUCTOR_PIN, reason: TICKET_REASONS.roomForgotten, change: forgotten })),
  ];
  for (const c of cases) {
    it(`${c.role}: ${c.change === forgotten ? 'the room is forgotten' : 'the PIN changes'} during the check: the device ends refused, and its ticket admits it no more`, async () => {
      const keep = memory();
      const a = host(keep, { learner: () => LEARNER_PIN, instructor: () => INSTRUCTOR_PIN });
      const d = holdDigests();
      hello(a.relay, 'd.1', c.role, { pin: c.pin });
      await waitFor(() => d.asked() > 0, 2000, 'the check pending');
      const changed = c.change(a.h);
      d.release();
      await changed;
      await waitFor(() => grants(a.got, 'd.1').length === 2, 2000, 'the grant, then its revocation');
      const all = grants(a.got, 'd.1');
      expect(all.at(-1)).toMatchObject({ granted: false, reason: c.reason });
      expect(a.h.learnerRemotes() + (a.counts.at(-1) ?? 0) + (a.h.ventilator ? 1 : 0)).toBe(0);
      const ticket = all.find((g) => g.ticket)?.ticket as string;
      hello(a.relay, 'd.2', c.role, { ticket });
      await waitFor(() => grants(a.got, 'd.2').length > 0, 2000, 'the answer to the ticket');
      expect(grants(a.got, 'd.2').at(-1)).toMatchObject({ granted: false, reason: c.reason });
    });
  }

  it('a learner proving its ticket while the room is forgotten: the ticket handed on is void too', async () => {
    const a = host(memory(), { learner: () => LEARNER_PIN, instructor: () => INSTRUCTOR_PIN });
    hello(a.relay, 'lr.1', 'learner', { pin: LEARNER_PIN });
    await waitFor(() => grants(a.got, 'lr.1').length > 0, 2000, 'the grant');
    const first = grants(a.got, 'lr.1')[0]?.ticket as string;
    const d = holdDigests();
    hello(a.relay, 'lr.2', 'learner', { ticket: first }); // its new socket, proving the ticket
    await waitFor(() => d.asked() > 0, 2000, 'the check pending');
    const done = a.h.forgetSignIns();
    d.release();
    await done;
    expect(grants(a.got, 'lr.2').map((g) => [g.granted, g.reason])).toEqual([[true, undefined], [false, TICKET_REASONS.roomForgotten]]);
    expect(a.h.learnerRemotes()).toBe(0);
    for (const ticket of [first, grants(a.got, 'lr.2')[0]?.ticket as string]) {
      const n = grants(a.got, 'lr.3').length;
      hello(a.relay, 'lr.3', 'learner', { ticket });
      await waitFor(() => grants(a.got, 'lr.3').length > n, 2000, 'the answer to the ticket');
      expect(grants(a.got, 'lr.3').at(-1)).toMatchObject({ granted: false, reason: TICKET_REASONS.roomForgotten });
    }
  });

  it("the ventilator's silence hand-over during its own pending check: it ends revoked for its silence, the place free", async () => {
    const a = host(memory(), { learner: () => LEARNER_PIN, instructor: () => INSTRUCTOR_PIN });
    hello(a.relay, 'v.1', 'ventilator', { pin: INSTRUCTOR_PIN });
    await waitFor(() => grants(a.got, 'v.1').length > 0, 2000, 'the grant');
    const ticket = grants(a.got, 'v.1')[0]?.ticket as string;
    const d = holdDigests();
    hello(a.relay, 'v.1', 'ventilator', { ticket }); // its hello again (the host's hello resync), checked anew
    await waitFor(() => d.asked() > 0, 2000, 'the check pending');
    const revoked = a.h.revokeVentilator('v.1', VENTILATOR_REASONS.silent);
    d.release();
    expect(await revoked).toBe(true);
    await waitFor(() => grants(a.got, 'v.1').length === 3, 2000, 'the first grant, the check, the revocation');
    expect(grants(a.got, 'v.1').at(-1)).toMatchObject({ granted: false, reason: VENTILATOR_REASONS.silent });
    expect(a.h.ventilator).toBeNull();
    expect(a.vents.at(-1)).toBeNull();
  });

  it("the transport closes during an instructor's check: no phone is ever counted on it, and no grant goes out", async () => {
    const a = host(memory(), { learner: () => LEARNER_PIN, instructor: () => INSTRUCTOR_PIN });
    const d = holdDigests();
    hello(a.relay, 'ins.1', 'instructor', { pin: INSTRUCTOR_PIN });
    await waitFor(() => d.asked() > 0, 2000, 'the check pending');
    a.side.close();
    d.release();
    await a.h.idle();
    expect(a.counts).not.toContain(1);
    expect(grants(a.got, 'ins.1')).toEqual([]);
  });

  it('close during a check: it resolves after the check, and no grant is sent after it', async () => {
    const a = host(memory(), { learner: () => LEARNER_PIN, instructor: () => INSTRUCTOR_PIN });
    const d = holdDigests();
    hello(a.relay, 'lr.1', 'learner', { pin: LEARNER_PIN });
    await waitFor(() => d.asked() > 0, 2000, 'the check pending');
    const closed = a.h.close();
    d.release();
    await closed;
    expect(grants(a.got, 'lr.1')).toEqual([]);
    expect(a.h.learnerRemotes()).toBe(0);
  });

  it("the same device's command sent straight after its hello is answered after the grant, never refused as not signed in", async () => {
    const a = host(memory(), { learner: () => LEARNER_PIN, instructor: () => INSTRUCTOR_PIN });
    const d = holdDigests();
    const st = createStamper(S, 'ins.1');
    a.relay.send(st({ kind: 'hello', role: 'instructor', pin: INSTRUCTOR_PIN }));
    a.relay.send(st({ kind: 'command', body: { id: 'c1', issuedBy: 'remote', type: 'time', action: 'pause' } as never }));
    await waitFor(() => d.asked() > 0, 2000, 'the check pending');
    d.release();
    await a.h.idle();
    const order = a.got.filter((m) => (m.kind === 'grant' && m.to === 'ins.1') || (m.kind === 'ack' && m.commandId === 'c1')).map((m) => m.kind);
    expect(order).toEqual(['grant', 'ack']);
    expect(a.got.find((m) => m.kind === 'ack' && m.commandId === 'c1')).toMatchObject({ accepted: true });
  });
});
