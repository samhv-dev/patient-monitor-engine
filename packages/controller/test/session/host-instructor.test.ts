// Plan instructor-peer-role.md P3: the host verifies an instructor's PIN, grants or denies it per (transport, from),
// applies only allow-listed commands from the granted phone, files them as the Remote's, takes its notes, and hands
// the role to the newest phone (option B, the plan's recommendation; the owner has not ruled).
import { afterEach, describe, expect, it } from 'vitest';
import { createEngine } from '@pme/engine-core';
import { HostSession, samePin, type HostSessionOptions, type HostTarget } from '../../src/session/host-session.ts';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { createStamper, type AppliedResolution, type ManagedTransport, type WireMessage } from '../../src/protocol.ts';
import { collect, waitFor } from '../helpers.ts';

const S = 'HIN234';
const PIN = '4729';
const target = (e = createEngine({ seed: 3 })): HostTarget => ({
  dispatch: (c) => e.dispatch(c), snapshot: () => e.snapshot(), restore: (s) => e.restore(s), on: (f) => e.on(f), now: () => e.now(), time: () => undefined,
});
const hosts: HostSession[] = [];
afterEach(() => {
  for (const h of hosts.splice(0)) h.close();
});

type Grant = Extract<WireMessage, { kind: 'grant' }>;
type Ack = Extract<WireMessage, { kind: 'ack' }>;

/** A host, and one transport standing for the relay (every phone shares it); `link()` adds another transport. */
function setup(o: Partial<HostSessionOptions> = {}) {
  const host = new HostSession({ session: S, target: target(), stateIntervalMs: 0, instructorPin: () => PIN, ...o });
  hosts.push(host);
  const link = () => {
    const hub = createInProcessHub();
    const detach = host.addTransport(hub.connect());
    const relay = hub.connect();
    return { relay, got: collect(relay), detach };
  };
  return { host, link, ...link() };
}
const phone = (relay: ManagedTransport, from: string) => {
  const st = createStamper(S, from);
  let n = 0;
  return {
    hello: (pin?: string) => relay.send(st({ kind: 'hello', role: 'instructor', ...(pin !== undefined ? { pin } : {}) })),
    command: (body: Record<string, unknown>, id = `${from}-${++n}`) => {
      relay.send(st({ kind: 'command', body: { id, issuedBy: from, ...body } as never }));
      return id;
    },
  };
};
const grants = (got: WireMessage[], to?: string) => got.filter((m): m is Grant => m.kind === 'grant' && (to === undefined || m.to === to));
const ackOf = (got: WireMessage[], id: string) => got.find((m): m is Ack => m.kind === 'ack' && m.commandId === id);
const applied = (got: WireMessage[], id: string) =>
  got.flatMap((m) => (m.kind === 'event' ? m.body : [])).find((e) => e.type === 'commandApplied' && e.commandId === id) as
    | { resolved: AppliedResolution }
    | undefined;
const hr = { type: 'setTarget', variable: 'hr', value: 120 };

describe('the host verifies the instructor PIN and grants', () => {
  it('right PIN → grant true is sent before the welcome events and snapshot; wrong PIN → grant false; instructorPin null → grant false', async () => {
    const { relay, got } = setup({ welcomeEvents: () => [{ type: 'scenario', t: 0, stateId: 'welcome' }] });
    phone(relay, 'ph.1').hello(PIN);
    await waitFor(() => got.some((m) => m.kind === 'snapshot'));
    const gi = got.findIndex((m) => m.kind === 'grant');
    const ei = got.findIndex((m) => m.kind === 'event' && m.body.some((e) => e.type === 'scenario' && e.stateId === 'welcome'));
    const si = got.findIndex((m) => m.kind === 'snapshot');
    expect(got[gi]).toMatchObject({ kind: 'grant', to: 'ph.1', granted: true });
    expect(gi).toBeGreaterThanOrEqual(0);
    expect(gi).toBeLessThan(ei);
    expect(ei).toBeLessThan(si);

    phone(relay, 'ph.2').hello('0000');
    await waitFor(() => grants(got, 'ph.2').length === 1);
    expect(grants(got, 'ph.2')[0]).toMatchObject({ granted: false, reason: 'wrong PIN' });

    const off = setup({ instructorPin: () => null });
    phone(off.relay, 'ph.3').hello(PIN);
    await waitFor(() => grants(off.got, 'ph.3').length === 1);
    expect(grants(off.got, 'ph.3')[0]).toMatchObject({ granted: false, reason: 'this computer does not take an instructor phone' });
  });

  it('a host without instructorPin (an older app) denies every instructor', async () => {
    const { relay, got } = setup({ instructorPin: undefined });
    const p = phone(relay, 'ph.1');
    p.hello(PIN);
    await waitFor(() => grants(got, 'ph.1').length === 1);
    expect(grants(got, 'ph.1')[0]).toMatchObject({ granted: false, reason: 'this computer does not take an instructor phone' });
    const id = p.command(hr);
    await waitFor(() => ackOf(got, id) !== undefined);
    expect(ackOf(got, id)).toMatchObject({ accepted: false, reason: 'the instructor phone is not signed in' });
  });

  it('the comparison takes the same path for every PIN of the same length (constant time by construction: no early exit)', () => {
    const counting = (s: string) => {
      const c = { reads: 0 };
      const fake = { length: s.length, charCodeAt: (i: number) => (c.reads++, s.charCodeAt(i)) } as unknown as string;
      return { c, fake };
    };
    const reads: number[] = [];
    for (const cand of ['4729', '0729', '4720', '9999', '4700']) {
      const { c, fake } = counting(cand);
      expect(samePin(fake, PIN)).toBe(cand === PIN);
      reads.push(c.reads);
    }
    const { c, fake } = counting(PIN);
    expect(samePin(fake, PIN)).toBe(true);
    reads.push(c.reads);
    expect(new Set(reads)).toEqual(new Set([PIN.length])); // every candidate read in full, whatever digit differs first
    expect(samePin('47290', PIN)).toBe(false);
    expect(samePin('', PIN)).toBe(false);
  });
});

describe('what a granted instructor may send', () => {
  it("an ungranted instructor's command → refused ack", async () => {
    const { relay, got, host } = setup();
    const p = phone(relay, 'ph.1');
    p.hello('1111');
    const id = p.command(hr);
    await waitFor(() => ackOf(got, id) !== undefined);
    expect(ackOf(got, id)).toMatchObject({ accepted: false, reason: 'the instructor phone is not signed in' });
    expect(host.stats.applied).toBe(0);
  });

  it("a granted instructor's scenario load → refused with its reason; a bookmark of kind stage → refused; a census shape → applied", async () => {
    const { relay, got, host } = setup();
    const p = phone(relay, 'ph.1');
    p.hello(PIN);
    const load = p.command({ type: 'scenario', action: 'load', doc: {} });
    const stage = p.command({ type: 'scenario', action: 'bookmark', kind: 'stage', target: 'treating' });
    const setFactor = p.command({ type: 'setFactor', input: 'hrFactor', factor: 1.2 });
    const ok = p.command(hr);
    const mark = p.command({ type: 'scenario', action: 'bookmark', kind: 'good', note: 'nice' });
    await waitFor(() => ackOf(got, mark) !== undefined);
    expect(ackOf(got, load)).toMatchObject({ accepted: false, reason: "Load the case on the instructor's computer." });
    expect(ackOf(got, stage)).toMatchObject({ accepted: false, reason: "A stage mark is the scenario driver's own." });
    expect(ackOf(got, setFactor)).toMatchObject({ accepted: false, reason: 'No Instructor view sends this command.' });
    expect(ackOf(got, ok)).toMatchObject({ accepted: true });
    expect(ackOf(got, mark)).toMatchObject({ accepted: true });
    expect(host.stats.applied).toBe(2);
  });

  it("issuedBy overwritten to 'remote'", async () => {
    const { relay, got } = setup();
    const p = phone(relay, 'ph.1');
    p.hello(PIN);
    const id = p.command({ ...hr, issuedBy: 'scenario' });
    await waitFor(() => applied(got, id) !== undefined);
    expect(applied(got, id)?.resolved.command.issuedBy).toBe('remote');
  });

  it("a controller's issuedBy and allow-list stay as today (a host-trusted peer)", async () => {
    const { relay, got } = setup();
    const st = createStamper(S, 'panel');
    relay.send(st({ kind: 'hello', role: 'controller' }));
    relay.send(st({ kind: 'command', body: { id: 'c1', issuedBy: 'instructor', type: 'setFactor', input: 'hrFactor', factor: 1.2 } as never }));
    relay.send(st({ kind: 'command', body: { id: 'c2', issuedBy: 'instructor', ...hr } as never }));
    await waitFor(() => applied(got, 'c2') !== undefined);
    expect(ackOf(got, 'c1')?.reason).not.toBe('No Instructor view sends this command.');
    expect(applied(got, 'c2')?.resolved.command.issuedBy).toBe('instructor');
  });

  it('a note → onNote(t, text, kind) called once, ack accepted, commandApplied sent', async () => {
    const notes: [number, string, string][] = [];
    const { relay, got } = setup({ onNote: (t, text, kind) => notes.push([t, text, kind]) });
    const p = phone(relay, 'ph.1');
    p.hello(PIN);
    const id = p.command({ type: 'note', kind: 'marker', text: 'Called for help' });
    await waitFor(() => applied(got, id) !== undefined);
    p.command({ type: 'note', kind: 'marker', text: 'Called for help' }, id); // a re-send of the same id
    await waitFor(() => got.filter((m) => m.kind === 'ack' && m.commandId === id).length === 2);
    expect(ackOf(got, id)).toMatchObject({ accepted: true });
    expect(notes).toEqual([[0, 'Called for help', 'marker']]);
    expect(applied(got, id)?.resolved.command).toMatchObject({ type: 'note', kind: 'marker', text: 'Called for help', issuedBy: 'remote' });
  });

  it('a note on a host without onNote is refused with a reason', async () => {
    const { relay, got } = setup();
    const p = phone(relay, 'ph.1');
    p.hello(PIN);
    const id = p.command({ type: 'note', kind: 'note', text: 'x' });
    await waitFor(() => ackOf(got, id) !== undefined);
    expect(ackOf(got, id)).toMatchObject({ accepted: false, reason: 'this computer does not take notes from a remote' });
  });
});

describe('who holds the role', () => {
  it("option B: a second granted instructor → grant false, reason 'taken over' to the first", async () => {
    const { relay, got } = setup();
    const a = phone(relay, 'ph.1');
    const b = phone(relay, 'ph.2');
    a.hello(PIN);
    await waitFor(() => grants(got, 'ph.1').length === 1);
    b.hello(PIN);
    await waitFor(() => grants(got, 'ph.1').length === 2 && grants(got, 'ph.2').length === 1);
    expect(grants(got, 'ph.1')[1]).toMatchObject({ granted: false, reason: 'taken over' });
    expect(grants(got, 'ph.2')[0]).toMatchObject({ granted: true });
    const old = a.command(hr);
    const now = b.command(hr);
    await waitFor(() => ackOf(got, old) !== undefined && ackOf(got, now) !== undefined);
    expect(ackOf(got, old)).toMatchObject({ accepted: false, reason: 'the instructor phone is not signed in' });
    expect(ackOf(got, now)).toMatchObject({ accepted: true });
  });

  it('a grant is per (transport, from): the same id on another transport is not granted', async () => {
    const { link, relay, got } = setup();
    const ph = phone(relay, 'ph.1');
    ph.hello(PIN);
    await waitFor(() => grants(got, 'ph.1').length === 1);
    const { relay: other, got: got2 } = link();
    const imp = phone(other, 'ph.1');
    const id = imp.command(hr, 'forged-1');
    await waitFor(() => ackOf(got2, id) !== undefined);
    expect(ackOf(got2, id)).toMatchObject({ accepted: true }); // a peer that never said hello is treated as today
    imp.hello(); // says instructor on its own transport, without a PIN
    const id2 = imp.command(hr, 'forged-2');
    await waitFor(() => ackOf(got2, id2) !== undefined);
    expect(ackOf(got2, id2)).toMatchObject({ accepted: false, reason: 'the instructor phone is not signed in' });
    expect(grants(got2, 'ph.1')).toMatchObject([{ granted: false, reason: 'wrong PIN' }]);
    const real = ph.command(hr, 'real-1');
    await waitFor(() => ackOf(got, real) !== undefined);
    expect(ackOf(got, real)).toMatchObject({ accepted: true }); // the impostor's denial did not touch the real grant
  });

  it('a PIN change → every grant revoked', async () => {
    let pin = PIN;
    const { relay, got, host } = setup({ instructorPin: () => pin });
    const p = phone(relay, 'ph.1');
    p.hello(PIN);
    await waitFor(() => grants(got, 'ph.1').length === 1);
    pin = '8100';
    host.instructorPinChanged();
    await waitFor(() => grants(got, 'ph.1').length === 2);
    expect(grants(got, 'ph.1')[1]).toMatchObject({ granted: false, reason: 'the PIN was changed' });
    const id = p.command(hr);
    await waitFor(() => ackOf(got, id) !== undefined);
    expect(ackOf(got, id)).toMatchObject({ accepted: false, reason: 'the instructor phone is not signed in' });
  });

  it('a PIN changed without the call still revokes at the next command', async () => {
    let pin = PIN;
    const { relay, got } = setup({ instructorPin: () => pin });
    const p = phone(relay, 'ph.1');
    p.hello(PIN);
    await waitFor(() => grants(got, 'ph.1').length === 1);
    pin = '8100';
    const id = p.command(hr);
    await waitFor(() => ackOf(got, id) !== undefined);
    expect(ackOf(got, id)).toMatchObject({ accepted: false, reason: 'the instructor phone is not signed in' });
    expect(grants(got, 'ph.1')[1]).toMatchObject({ granted: false, reason: 'the PIN was changed' });
  });

  it('20 wrong PINs on one transport do not stop the next right PIN (no host lockout); the denial count is reported', async () => {
    const { relay, got, host } = setup();
    for (let i = 0; i < 20; i++) phone(relay, `learner.${i}`).hello(String(1000 + i));
    const p = phone(relay, 'ph.1');
    p.hello(PIN);
    await waitFor(() => grants(got, 'ph.1').length === 1);
    expect(grants(got).filter((g) => !g.granted)).toHaveLength(20);
    expect(grants(got, 'ph.1')[0]).toMatchObject({ granted: true });
    expect(host.instructorDenials()).toBe(20);
    const id = p.command(hr);
    await waitFor(() => ackOf(got, id) !== undefined);
    expect(ackOf(got, id)).toMatchObject({ accepted: true });
  });

  it('1 000 wrong PINs leave the denial record at its cap, and the next right PIN still grants', async () => {
    const { relay, got, host } = setup();
    for (let i = 0; i < 1000; i++) phone(relay, `flood.${i}`).hello(String(1000 + i));
    const p = phone(relay, 'ph.1');
    p.hello(PIN);
    await waitFor(() => grants(got, 'ph.1').length === 1, 5000);
    expect(grants(got).filter((g) => !g.granted)).toHaveLength(1000);
    expect(host.instructorDenials()).toBe(100);
    expect(grants(got, 'ph.1')[0]).toMatchObject({ granted: true });
  });

  it('the denial count covers the last minute only', async () => {
    let wall = 1_000_000;
    const { relay, got, host } = setup({ wallNow: () => wall });
    phone(relay, 'l.1').hello('1111');
    await waitFor(() => grants(got).length === 1);
    wall += 61_000;
    phone(relay, 'l.2').hello('2222');
    await waitFor(() => grants(got).length === 2);
    expect(host.instructorDenials()).toBe(1);
  });

  it('onInstructors(n) reports grants and revocations', async () => {
    const seen: number[] = [];
    const { link, relay, got, host } = setup({ onInstructors: (n) => seen.push(n) });
    const ph = phone(relay, 'ph.1');
    ph.hello(PIN);
    await waitFor(() => seen.length === 1);
    ph.hello(PIN); // the holder says hello again (a restore): no change
    phone(relay, 'ph.2').hello(PIN); // takes over: still one
    await waitFor(() => grants(got, 'ph.2').length === 1);
    host.instructorPinChanged();
    await waitFor(() => seen.length === 3);
    expect(seen).toEqual([1, 1, 0]);
    const other = link();
    phone(other.relay, 'ph.9').hello(PIN);
    await waitFor(() => seen.length === 4);
    other.detach();
    await waitFor(() => seen.length === 5);
    expect(seen).toEqual([1, 1, 0, 1, 0]); // the holder's transport went away
  });
});
