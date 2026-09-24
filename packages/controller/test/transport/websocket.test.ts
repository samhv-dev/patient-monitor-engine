// WebSocket transport behaviour without a network: reconnect with backoff, fatal relay refusals, liveness.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStamper } from '../../src/protocol.ts';
import { backoffDelay } from '../../src/transport/backoff.ts';
import { RELAY_CLOSE } from '../../src/transport/relay-frames.ts';
import { createWebSocketTransport } from '../../src/transport/websocket.ts';
import { FakeWebSocket } from '../fakes/fake-websocket.ts';

const opts = { url: 'ws://relay.test/', WebSocketImpl: FakeWebSocket, backoff: { baseMs: 100, maxMs: 1000, jitter: 0 }, livenessMs: 5000 };

describe('backoffDelay', () => {
  it('doubles from base to max, with ± jitter', () => {
    const o = { baseMs: 250, maxMs: 8000, jitter: 0 };
    expect([0, 1, 2, 3, 4, 5, 6].map((a) => backoffDelay(a, o))).toEqual([250, 500, 1000, 2000, 4000, 8000, 8000]);
    expect(backoffDelay(0, { baseMs: 1000, maxMs: 1000, jitter: 0.2 }, () => 0)).toBe(800);
    expect(backoffDelay(0, { baseMs: 1000, maxMs: 1000, jitter: 0.2 }, () => 1)).toBe(1200);
  });
});

describe('WebSocket transport', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeWebSocket.all = [];
  });
  afterEach(() => vi.useRealTimers());

  it('goes connecting → open, sends JSON, delivers WireMessages and hands relay frames aside', () => {
    const frames: unknown[] = [];
    const t = createWebSocketTransport({ ...opts, onRelayFrame: (f) => frames.push(f) });
    const seen: string[] = [];
    t.onStatus((s) => seen.push(s));
    const got: unknown[] = [];
    t.onMessage((m) => got.push(m));
    FakeWebSocket.last.open();
    const m = createStamper('ABC234', 'h')({ kind: 'hello', role: 'host' });
    t.send(m);
    expect(JSON.parse(FakeWebSocket.last.sent[0] as string)).toEqual(m);
    FakeWebSocket.last.receive(m);
    FakeWebSocket.last.receive({ relay: 'peers', hostOnline: true, peers: 1 });
    FakeWebSocket.last.receive('garbage');
    expect(seen).toEqual(['connecting', 'open']);
    expect(got).toEqual([m]);
    expect(frames).toEqual([{ relay: 'peers', hostOnline: true, peers: 1 }]);
    expect(t.status).toBe('open');
  });

  it('reconnects with backoff after a drop, and counts reconnects', () => {
    const t = createWebSocketTransport(opts);
    FakeWebSocket.last.open();
    FakeWebSocket.last.close(1006);
    expect(t.status).toBe('connecting');
    expect(FakeWebSocket.all).toHaveLength(1);
    vi.advanceTimersByTime(99);
    expect(FakeWebSocket.all).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(FakeWebSocket.all).toHaveLength(2);
    FakeWebSocket.last.close(1006); // failed attempt → next delay doubles
    vi.advanceTimersByTime(199);
    expect(FakeWebSocket.all).toHaveLength(2);
    vi.advanceTimersByTime(1);
    FakeWebSocket.last.open();
    expect(t.status).toBe('open');
    expect(t.reconnects).toBe(1);
  });

  it('stops for good on a fatal relay close code (host exists)', () => {
    const t = createWebSocketTransport(opts);
    FakeWebSocket.last.open();
    FakeWebSocket.last.close(RELAY_CLOSE.hostExists, 'host exists');
    expect(t.status).toBe('error');
    vi.advanceTimersByTime(10_000);
    expect(FakeWebSocket.all).toHaveLength(1);
  });

  it('closes and reconnects when nothing arrives for livenessMs', () => {
    const t = createWebSocketTransport(opts);
    FakeWebSocket.last.open();
    vi.advanceTimersByTime(4000);
    FakeWebSocket.last.receive({ relay: 'hb', t: 1 }); // heartbeat keeps it alive
    vi.advanceTimersByTime(4000);
    expect(t.status).toBe('open');
    vi.advanceTimersByTime(1000);
    expect(t.status).toBe('connecting');
  });

  it('drops sends while not open, and close() stops reconnecting', () => {
    const t = createWebSocketTransport(opts);
    t.send(createStamper('ABC234', 'h')({ kind: 'hello', role: 'host' }));
    expect(FakeWebSocket.last.sent).toEqual([]);
    FakeWebSocket.last.open();
    t.close();
    expect(t.status).toBe('closed');
    vi.advanceTimersByTime(10_000);
    expect(FakeWebSocket.all).toHaveLength(1);
  });
});
