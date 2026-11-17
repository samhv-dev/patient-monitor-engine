// The host's sign-in check waits on a SHA-256 (sign-in-book.ts, crypto.subtle). Here the digest is held and released in a
// chosen order, so each case is the same every run: what the host does with a step of its own (a PIN change, a transport
// that closes) taken while a device's check is pending, and with the same device's next message.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HostSession, LEARNER_REASONS, type HostTarget } from '../../src/session/host-session.ts';
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
afterEach(() => {
  for (const h of hosts.splice(0)) h.close();
  vi.restoreAllMocks();
});

/** Every SHA-256 the book asks for waits until `release()`; `asked` counts them. */
function holdDigests() {
  const real = crypto.subtle.digest.bind(crypto.subtle);
  const held: Array<() => void> = [];
  vi.spyOn(crypto.subtle, 'digest').mockImplementation(((alg: AlgorithmIdentifier, data: BufferSource) => new Promise<ArrayBuffer>((ok) => held.push(() => void real(alg, data).then(ok)))) as never);
  return { asked: () => held.length, release: () => held.splice(0).forEach((go) => go()) };
}
const memory = (): BookKeep => {
  let v: string | null = null;
  return { read: () => v, write: (s) => void (v = s) };
};
function host(keep: BookKeep, pins: { learner: () => string; instructor: () => string }, onInstructors?: (n: number) => void) {
  const h = new HostSession({ session: S, target, stateIntervalMs: 0, instructorPin: pins.instructor, learnerPin: pins.learner, signIns: new SignInBook(S, keep), ...(onInstructors ? { onInstructors } : {}) });
  hosts.push(h);
  const hub = createInProcessHub();
  const side = hub.connect();
  h.addTransport(side);
  const relay = hub.connect();
  return { h, side, relay, got: collect(relay) };
}
/** The host's queue of received frames has run to its end (every check finished). */
const settled = (h: HostSession) => (h as unknown as { chain: Promise<void> }).chain;
const grants = (got: WireMessage[], to: string) => got.filter((m): m is Grant => m.kind === 'grant' && m.to === to);

describe("the host's own steps while a sign-in check is pending", () => {
  it('a learner PIN change during the check: the device is refused, and no ticket of the old PIN admits it later', async () => {
    const keep = memory();
    let learner = LEARNER_PIN;
    const a = host(keep, { learner: () => learner, instructor: () => INSTRUCTOR_PIN });
    const d = holdDigests();
    a.relay.send(createStamper(S, 'lr.1')({ kind: 'hello', role: 'learner', show: 'learner', device: 'remote0001', pin: LEARNER_PIN }));
    await waitFor(() => d.asked() > 0, 2000, 'the check pending');
    learner = '771234';
    a.h.learnerPinChanged();
    d.release();
    await waitFor(() => grants(a.got, 'lr.1').length > 0, 2000, 'the answer');
    const g = grants(a.got, 'lr.1')[0] as Grant;
    vi.restoreAllMocks();
    expect(g).toMatchObject({ granted: false, reason: LEARNER_REASONS.pinChanged });
    expect(a.h.learnerRemotes()).toBe(0);
  });

  it("the transport closes during an instructor's check: no phone is left signed in on it", async () => {
    const counts: number[] = [];
    const a = host(memory(), { learner: () => LEARNER_PIN, instructor: () => INSTRUCTOR_PIN }, (n) => counts.push(n));
    const d = holdDigests();
    a.relay.send(createStamper(S, 'ins.1')({ kind: 'hello', role: 'instructor', pin: INSTRUCTOR_PIN }));
    await waitFor(() => d.asked() > 0, 2000, 'the check pending');
    a.side.close();
    d.release();
    await settled(a.h);
    vi.restoreAllMocks();
    expect(counts).not.toContain(1);
  });

  it("the same device's command sent straight after its hello is answered after the grant, never refused as not signed in", async () => {
    const a = host(memory(), { learner: () => LEARNER_PIN, instructor: () => INSTRUCTOR_PIN });
    const d = holdDigests();
    const st = createStamper(S, 'ins.1');
    a.relay.send(st({ kind: 'hello', role: 'instructor', pin: INSTRUCTOR_PIN }));
    a.relay.send(st({ kind: 'command', body: { id: 'c1', issuedBy: 'remote', type: 'time', action: 'pause' } as never }));
    await waitFor(() => d.asked() > 0, 2000, 'the check pending');
    d.release();
    await waitFor(() => a.got.some((m) => m.kind === 'ack' && m.commandId === 'c1'), 2000, 'the ack');
    vi.restoreAllMocks();
    const order = a.got.filter((m) => (m.kind === 'grant' && m.to === 'ins.1') || (m.kind === 'ack' && m.commandId === 'c1')).map((m) => m.kind);
    expect(order).toEqual(['grant', 'ack']);
    expect(a.got.find((m) => m.kind === 'ack' && m.commandId === 'c1')).toMatchObject({ accepted: true });
  });
});
