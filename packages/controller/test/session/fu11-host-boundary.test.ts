// FU-11 Task A3 (browser audit BA11; R50 F2): the host takes only its own session's messages and splits big event
// batches — by count AND by encoded size — under the receivers' budget.
import { afterEach, describe, expect, it } from 'vitest';
import { createEngine } from '@pme/engine-core';
import { EVENTS_PER_MESSAGE, HostSession, MESSAGE_BUDGET_BYTES, type HostTarget } from '../../src/session/host-session.ts';
import { wireBudgetError } from '../../src/guard.ts';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { createStamper, type WireMessage } from '../../src/protocol.ts';
import { collect, waitFor } from '../helpers.ts';

const S = 'HBD234';
const target = (e = createEngine({ seed: 3 })): HostTarget => ({
  dispatch: (c) => e.dispatch(c), snapshot: () => e.snapshot(), restore: (s) => e.restore(s), on: (f) => e.on(f), now: () => e.now(), time: () => undefined,
});
let hs: HostSession | null = null;
afterEach(() => hs?.close());

describe('FU-11 A3: the host boundary', () => {
  it('a command stamped with another session is not applied; the valid sentinel after it is', async () => {
    const hub = createInProcessHub();
    hs = new HostSession({ session: S, target: target(), stateIntervalMs: 0 });
    hs.addTransport(hub.connect());
    const peer = hub.connect();
    const got = collect(peer);
    const foreign = createStamper('DEF567', 'x');
    const ours = createStamper(S, 'x');
    peer.send(foreign({ kind: 'command', body: { id: 'bad', issuedBy: 'x', type: 'setTarget', variable: 'hr', value: 130 } as never }));
    peer.send(ours({ kind: 'command', body: { id: 'sentinel', issuedBy: 'x', type: 'setTarget', variable: 'hr', value: 80 } as never }));
    await waitFor(() => got.some((m) => m.kind === 'ack' && m.commandId === 'sentinel'));
    expect(hs.stats.applied).toBe(1);
    expect(got.some((m) => m.kind === 'ack' && m.commandId === 'bad')).toBe(false);
  });
  it('a peer that said hello as a viewer cannot command (as on the relay); one that said controller can (R50 M13)', async () => {
    const hub = createInProcessHub();
    hs = new HostSession({ session: S, target: target(), stateIntervalMs: 0 });
    hs.addTransport(hub.connect());
    const peer = hub.connect();
    const got = collect(peer);
    const v = createStamper(S, 'viewer-1');
    peer.send(v({ kind: 'hello', role: 'viewer' }));
    peer.send(v({ kind: 'command', body: { id: 'from-viewer', issuedBy: 'x', type: 'setTarget', variable: 'hr', value: 130 } as never }));
    await waitFor(() => got.some((m) => m.kind === 'ack' && m.commandId === 'from-viewer'));
    expect(got.find((m) => m.kind === 'ack' && m.commandId === 'from-viewer')).toMatchObject({ accepted: false, reason: 'a viewer cannot command' });
    peer.send(v({ kind: 'hello', role: 'controller' }));
    peer.send(v({ kind: 'command', body: { id: 'now-controller', issuedBy: 'x', type: 'setTarget', variable: 'hr', value: 80 } as never }));
    await waitFor(() => got.some((m) => m.kind === 'ack' && m.commandId === 'now-controller'));
    expect(got.find((m) => m.kind === 'ack' && m.commandId === 'now-controller')).toMatchObject({ accepted: true });
    expect(hs.stats.applied).toBe(1);
  });
  it(`a batch of 1 000 events goes out as messages of at most ${EVENTS_PER_MESSAGE}, all delivered in order`, async () => {
    const hub = createInProcessHub();
    hs = new HostSession({ session: S, target: target(), stateIntervalMs: 0 });
    hs.addTransport(hub.connect());
    const got = collect(hub.connect());
    for (let i = 0; i < 1000; i++) hs.publish({ type: 'scenario', t: i, stateId: `s${i}` });
    hs.flush();
    await waitFor(() => got.filter((m) => m.kind === 'event').length >= 5);
    const batches = got.filter((m): m is Extract<WireMessage, { kind: 'event' }> => m.kind === 'event');
    expect(Math.max(...batches.map((b) => b.body.length))).toBeLessThanOrEqual(EVENTS_PER_MESSAGE);
    expect(batches.flatMap((b) => b.body).map((e) => (e as { t: number }).t)).toEqual(Array.from({ length: 1000 }, (_, i) => i));
  });
  it(`a minute of the app's real events (truth at 1 Hz) in one batch goes out in messages of ≤ ${MESSAGE_BUDGET_BYTES / 1024} KB, all accepted`, async () => {
    const e = createEngine({ seed: 7, mode: 'modeled', truthHz: 1, patient: { sensors: { ecg: 'on', spo2: 'on', abp: 'connected', co2: 'on', nibp: 'on' } } } as never);
    const hub = createInProcessHub();
    hs = new HostSession({ session: S, target: target(e), stateIntervalMs: 0 });
    hs.addTransport(hub.connect());
    const got = collect(hub.connect());
    e.advanceTo(60); // a hidden-tab catch-up: one batch
    hs.flush();
    await waitFor(() => got.some((m) => m.kind === 'event'));
    await new Promise((r) => setTimeout(r, 50));
    const batches = got.filter((m): m is Extract<WireMessage, { kind: 'event' }> => m.kind === 'event');
    const events = batches.flatMap((b) => b.body);
    expect(events.filter((x) => x.type === 'truth').length).toBe(60);
    for (const b of batches) expect(wireBudgetError(b)).toBeNull();
    expect(Math.max(...batches.map((b) => JSON.stringify(b).length))).toBeLessThanOrEqual(MESSAGE_BUDGET_BYTES + 2048);
  });
});
