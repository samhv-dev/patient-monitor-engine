// FU-11 Task G1 (showcase kit K2; R50 F3): commands applied OUTSIDE the session (the Ventilator view's link) reach a
// second-screen viewer as `mirror` commandApplied events — only once a viewer has said hello, only over the same-browser
// BroadcastChannel (they are the ventilator's samples: never the relay, WebRTC or the in-process panel).
import { afterEach, describe, expect, it } from 'vitest';
import { createEngine } from '@pme/engine-core';
import { HostSession } from '../../src/session/host-session.ts';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { createBroadcastChannelTransport } from '../../src/transport/broadcast-channel.ts';
import { TransportBase } from '../../src/transport/base.ts';
import { createStamper, type WireMessage } from '../../src/protocol.ts';
import { collect, sleep, waitFor } from '../helpers.ts';

class FakeSocket extends TransportBase {
  readonly kind = 'websocket' as const;
  readonly sent: WireMessage[] = [];
  constructor() {
    super();
    this.setStatus('open');
  }
  protected write(m: WireMessage): void {
    this.sent.push(m);
  }
  protected teardown(): void {}
}

const S = 'MIR234';
let hs: HostSession | null = null;
afterEach(() => hs?.close());
const mirrored = (ms: WireMessage[]) => ms.filter((m) => m.kind === 'event').flatMap((m) => (m as Extract<WireMessage, { kind: 'event' }>).body).filter((x) => x.type === 'commandApplied' && (x.resolved as { mirror?: boolean }).mirror);

describe('HostSession.mirror', () => {
  it('nothing without a viewer; after a viewer hello each accepted link command goes out once, at its tick, on BroadcastChannel only', async () => {
    const e = createEngine({ seed: 3 });
    hs = new HostSession({ session: S, target: { dispatch: (c) => e.dispatch(c), snapshot: () => e.snapshot(), restore: (s) => e.restore(s), on: (f) => e.on(f), now: () => e.now(), time: () => undefined }, stateIntervalMs: 0 });
    const hub = createInProcessHub();
    hs.addTransport(hub.connect());
    const panel = collect(hub.connect());
    const socket = new FakeSocket();
    hs.addTransport(socket);
    hs.addTransport(createBroadcastChannelTransport(S));
    const viewer = createBroadcastChannelTransport(S);
    const got = collect(viewer);
    const frame = (id: string) => ({ id, issuedBy: 'vent-link', type: 'externalDrive', source: 'ventilator', frame: { pawCmH2O: 5, flowLps: 0, volumeMl: 0, fio2: 0.4, peepCmH2O: 5 } }) as never;
    hs.mirror(frame('v1'), e.dispatch(frame('v1')));
    await sleep(30);
    expect(mirrored(got)).toHaveLength(0);
    viewer.send(createStamper(S, 'view-1')({ kind: 'hello', role: 'viewer' }));
    await waitFor(() => got.some((m) => m.kind === 'snapshot'));
    const r = e.dispatch(frame('v2'));
    hs.mirror(frame('v2'), r);
    await waitFor(() => mirrored(got).length === 1);
    expect(mirrored(got)[0]).toMatchObject({ commandId: 'v2', tick: r.tick, resolved: { mirror: true, command: { atTick: r.tick } } });
    expect(mirrored(socket.sent)).toHaveLength(0);
    expect(mirrored(panel)).toHaveLength(0);
    viewer.close();
  });
});
