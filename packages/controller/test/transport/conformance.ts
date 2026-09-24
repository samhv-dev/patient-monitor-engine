// One behavioural contract, run against all five transports (brief §7.5). `a` plays the host (sends events),
// `b` a controller (sends commands) — the relay only routes those directions, the others route everything.
import { afterEach, describe, expect, it } from 'vitest';
import { WireSafetyError } from '../../src/guard.ts';
import { createStamper, type ManagedTransport, type TransportKind, type WireMessage } from '../../src/protocol.ts';
import { collect, sleep, waitFor, waitStatus } from '../helpers.ts';

export interface TransportPair {
  a: ManagedTransport; // host side
  b: ManagedTransport; // controller side
  cleanup(): Promise<void>;
}

export const SESSION = 'ABC234';
export const HOST_ID = 'host-1';
export const CTL_ID = 'ctl-1';
const hostMsg = createStamper(SESSION, HOST_ID);
const ctlMsg = createStamper(SESSION, CTL_ID);
const event = (n: number): WireMessage =>
  hostMsg({ kind: 'event', body: [{ type: 'measurement', t: n, values: { hr: { value: 60 + n, flag: 'valid', at: n } } }] });
const command = (n: number): WireMessage =>
  ctlMsg({ kind: 'command', body: { id: `c${n}`, issuedBy: 'test', type: 'setTarget', variable: 'hr', value: 60 + n } });
const only = (list: WireMessage[], kind: WireMessage['kind']) => list.filter((m) => m.kind === kind);

export function runTransportConformance(kind: TransportKind, makePair: () => Promise<TransportPair>): void {
  describe(`transport conformance: ${kind}`, () => {
    let pair: TransportPair | null = null;
    const open = async () => {
      pair = await makePair();
      await waitStatus(pair.a, 'open');
      await waitStatus(pair.b, 'open');
      return pair;
    };
    afterEach(async () => {
      await pair?.cleanup();
      pair = null;
    });

    it('reports its kind and replays the current status to a new subscriber', async () => {
      const { a, b } = await open();
      expect(a.kind).toBe(kind);
      expect(b.kind).toBe(kind);
      const seen: string[] = [];
      a.onStatus((s) => seen.push(s));
      expect(seen).toEqual(['open']);
    });

    it('delivers host → controller and controller → host, deep-equal', async () => {
      const { a, b } = await open();
      const atA = collect(a);
      const atB = collect(b);
      const e = event(1);
      const c = command(1);
      a.send(e);
      b.send(c);
      await waitFor(() => only(atB, 'event').length === 1 && only(atA, 'command').length === 1);
      expect(only(atB, 'event')[0]).toEqual(e);
      expect(only(atA, 'command')[0]).toEqual(c);
    });

    it('keeps order over 50 messages and never echoes to the sender', async () => {
      const { a, b } = await open();
      const atA = collect(a);
      const atB = collect(b);
      for (let i = 0; i < 50; i++) a.send(event(100 + i));
      await waitFor(() => only(atB, 'event').length === 50);
      expect(only(atB, 'event').map((m) => m.seq)).toEqual([...only(atB, 'event').map((m) => m.seq)].sort((x, y) => x - y));
      await sleep(20);
      expect(only(atA, 'event')).toEqual([]);
    });

    it('stops delivering to an unsubscribed listener', async () => {
      const { a, b } = await open();
      const got: WireMessage[] = [];
      const off = b.onMessage((m) => got.push(m));
      off();
      a.send(event(7));
      await sleep(30);
      expect(only(got, 'event')).toEqual([]);
    });

    it('refuses sample data with WireSafetyError and sends nothing', async () => {
      const { a, b } = await open();
      const atB = collect(b);
      const leak = { ...event(9), body: [{ type: 'measurement', t: 9, values: {}, samples: new Float32Array(500) }] };
      expect(() => a.send(leak as unknown as WireMessage)).toThrow(WireSafetyError);
      await sleep(30);
      expect(only(atB, 'event')).toEqual([]);
    });

    it('goes to closed on close(), and later sends are silent no-ops', async () => {
      const { a, b } = await open();
      const atB = collect(b);
      a.close();
      expect(a.status).toBe('closed');
      expect(() => a.send(event(11))).not.toThrow();
      await sleep(30);
      expect(only(atB, 'event')).toEqual([]);
    });
  });
}
