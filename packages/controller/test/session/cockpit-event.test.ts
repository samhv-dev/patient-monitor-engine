// Stage 12: while the Ventilator view drives the patient, its frames still reach only same-browser viewers (FU-11 R50
// F3); every other transport gets a `cockpit` event at most once a second instead, so a phone on the relay knows it
// cannot follow (it holds) — also to a phone that joined long before (no viewer hello lately: R50 M1), never to the panel.
import { afterEach, describe, expect, it } from 'vitest';
import { createEngine } from '@pme/engine-core';
import { COCKPIT_EVENT_MS, HostSession } from '../../src/session/host-session.ts';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { TransportBase } from '../../src/transport/base.ts';
import { createStamper, type WireEvent, type WireMessage } from '../../src/protocol.ts';
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
  /** A message from the network (a phone's hello). */
  receive(m: WireMessage): void {
    this.deliver(m);
  }
}

const S = 'CKP234';
let hs: HostSession | null = null;
afterEach(() => hs?.close());
const events = (ms: WireMessage[]): WireEvent[] => ms.filter((m) => m.kind === 'event').flatMap((m) => (m as Extract<WireMessage, { kind: 'event' }>).body);

describe('the cockpit event', () => {
  it('once a second on the network (never the panel), with or without a recent viewer hello; the frames themselves never', async () => {
    const e = createEngine({ seed: 3 });
    let wall = 0;
    hs = new HostSession({ session: S, target: { dispatch: (c) => e.dispatch(c), snapshot: () => e.snapshot(), restore: (s) => e.restore(s), on: (f) => e.on(f), now: () => e.now(), time: () => undefined }, stateIntervalMs: 0, wallNow: () => wall });
    const hub = createInProcessHub();
    hs.addTransport(hub.connect());
    const panel = collect(hub.connect());
    const socket = new FakeSocket();
    hs.addTransport(socket);
    const frame = (id: string) => ({ id, issuedBy: 'vent-link', type: 'externalDrive', source: 'ventilator', frame: { pawCmH2O: 5, flowLps: 0, volumeMl: 0, fio2: 0.4, peepCmH2O: 5 } }) as never;
    hs.mirror(frame('a'), e.dispatch(frame('a')));
    expect(events(socket.sent).filter((x) => x.type === 'cockpit')).toHaveLength(1); // a phone that said hello long ago holds too
    socket.receive(createStamper(S, 'phone-1')({ kind: 'hello', role: 'viewer' }));
    await waitFor(() => socket.sent.some((m) => m.kind === 'snapshot'));
    wall += COCKPIT_EVENT_MS; // a second after the first notice
    for (let i = 0; i < 100; i++) {
      wall += 20; // 50 frames a second for 2 s
      hs.mirror(frame(`f${i}`), e.dispatch(frame(`f${i}`)));
    }
    await sleep(10);
    const notes = events(socket.sent).filter((x) => x.type === 'cockpit');
    expect(notes.length).toBe(1 + Math.floor((100 * 20) / COCKPIT_EVENT_MS)); // once a second
    expect(notes[0]).toMatchObject({ type: 'cockpit', tick: expect.any(Number) });
    expect(events(socket.sent).some((x) => x.type === 'commandApplied' && (x.resolved as { mirror?: boolean }).mirror)).toBe(false);
    expect(events(panel).some((x) => x.type === 'cockpit')).toBe(false);
  });

  it('UI-A #2: the Ventilator view off screen sends no notice, and its close tells a holding phone at once (`off`)', async () => {
    const e = createEngine({ seed: 3 });
    let wall = 0;
    hs = new HostSession({ session: S, target: { dispatch: (c) => e.dispatch(c), snapshot: () => e.snapshot(), restore: (s) => e.restore(s), on: (f) => e.on(f), now: () => e.now(), time: () => undefined }, stateIntervalMs: 0, wallNow: () => wall });
    const socket = new FakeSocket();
    hs.addTransport(socket);
    const notes = () => events(socket.sent).filter((x) => x.type === 'cockpit');
    const frame = (id: string) => ({ id, issuedBy: 'vent-link', type: 'externalDrive', source: 'ventilator', frame: { pawCmH2O: 5, flowLps: 0, volumeMl: 0, fio2: 0.4, peepCmH2O: 5 } }) as never;
    hs.cockpitOff(); // nothing said yet: nothing to take back
    expect(notes()).toHaveLength(0);
    hs.mirror(frame('a'), e.dispatch(frame('a'))); // on screen: the phone holds
    expect(notes()).toEqual([expect.objectContaining({ type: 'cockpit', tick: expect.any(Number) })]);
    expect(notes()[0]).not.toHaveProperty('off');
    hs.cockpitOff(); // the view closes
    expect(notes()).toHaveLength(2);
    expect(notes()[1]).toMatchObject({ type: 'cockpit', off: true, tick: expect.any(Number) });
    for (let i = 0; i < 100; i++) {
      wall += 20; // the cockpit still ventilates, off screen, for 2 s
      hs.mirror(frame(`h${i}`), e.dispatch(frame(`h${i}`)), false);
    }
    hs.cockpitOff(); // a second close says nothing more
    expect(notes()).toHaveLength(2);
    hs.mirror(frame('b'), e.dispatch(frame('b'))); // back on screen: at once, not a second later
    expect(notes()).toHaveLength(3);
    expect(notes()[2]).not.toHaveProperty('off');
  });
});
