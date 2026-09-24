// WebSocket client transport (brief §3.7) to the relay in relay/. Reconnects with backoff; a relay heartbeat
// frame ({relay:'hb'}) every 10 s lets a browser notice a dead connection (JS cannot see ping frames).
// Upper layers (sessions) re-send `hello` on every 'open' — the relay needs it to route the new socket.
import type { ManagedTransport, WireMessage } from '../protocol.ts';
import { TransportBase } from './base.ts';
import { DEFAULT_BACKOFF, backoffDelay, type BackoffOptions } from './backoff.ts';
import { FATAL_CLOSE_CODES, isRelayFrame, type RelayFrame } from './relay-frames.ts';

export interface WebSocketLike {
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  onopen: ((ev: unknown) => void) | null;
  onclose: ((ev: { code: number; reason: string }) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
}
export type WebSocketCtor = new (url: string) => WebSocketLike;

export interface WebSocketTransportOptions {
  /** e.g. ws://192.168.1.20:8787/ */
  url: string;
  WebSocketImpl?: WebSocketCtor;
  backoff?: BackoffOptions;
  /** Close and reconnect when nothing arrives for this long (default 25 s = 2.5 relay heartbeats) [ENG]. */
  livenessMs?: number;
  /** Relay control frames (peers, errors) for the UI. */
  onRelayFrame?: (f: RelayFrame) => void;
}

const OPEN = 1;

class WsTransport extends TransportBase {
  readonly kind = 'websocket' as const;
  private readonly o: Required<Omit<WebSocketTransportOptions, 'onRelayFrame'>> & Pick<WebSocketTransportOptions, 'onRelayFrame'>;
  private ws: WebSocketLike | null = null;
  private attempt = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private liveTimer: ReturnType<typeof setTimeout> | null = null;
  /** Number of reconnects after the first open. */
  reconnects = 0;
  private everOpened = false;

  constructor(o: WebSocketTransportOptions) {
    super();
    this.o = {
      url: o.url,
      WebSocketImpl: o.WebSocketImpl ?? (WebSocket as unknown as WebSocketCtor),
      backoff: o.backoff ?? DEFAULT_BACKOFF,
      livenessMs: o.livenessMs ?? 25_000,
      onRelayFrame: o.onRelayFrame,
    };
    this.connect();
  }

  private connect(): void {
    this.setStatus('connecting');
    const ws = new this.o.WebSocketImpl(this.o.url);
    this.ws = ws;
    ws.onopen = () => {
      if (this.ws !== ws) return;
      this.attempt = 0;
      if (this.everOpened) this.reconnects++;
      this.everOpened = true;
      this.touch();
      this.setStatus('open');
    };
    ws.onmessage = (ev) => {
      if (this.ws !== ws) return;
      this.touch();
      if (typeof ev.data !== 'string') return;
      let o: unknown;
      try {
        o = JSON.parse(ev.data);
      } catch {
        this.rejected++;
        return;
      }
      if (isRelayFrame(o)) {
        if (o.relay === 'error') this.setStatus('error');
        this.o.onRelayFrame?.(o);
        return;
      }
      this.deliver(o);
    };
    ws.onerror = () => {
      /* onclose follows and decides */
    };
    ws.onclose = (ev) => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.clearLive();
      if (this.closed) return;
      if (FATAL_CLOSE_CODES.has(ev.code)) {
        this.setStatus('error');
        return;
      }
      this.setStatus('connecting');
      const delay = backoffDelay(this.attempt++, this.o.backoff);
      this.retryTimer = setTimeout(() => {
        this.retryTimer = null;
        if (!this.closed) this.connect();
      }, delay);
    };
  }

  private touch(): void {
    this.clearLive();
    this.liveTimer = setTimeout(() => this.ws?.close(4000, 'liveness timeout'), this.o.livenessMs);
  }

  private clearLive(): void {
    if (this.liveTimer !== null) clearTimeout(this.liveTimer);
    this.liveTimer = null;
  }

  protected write(m: WireMessage): void {
    if (this.ws && this.ws.readyState === OPEN) this.ws.send(JSON.stringify(m));
  }

  /** Test hook: drop the socket as if the network failed (the transport reconnects). */
  dropForTest(): void {
    this.ws?.close(4000, 'test drop');
  }

  protected teardown(): void {
    if (this.retryTimer !== null) clearTimeout(this.retryTimer);
    this.clearLive();
    const ws = this.ws;
    this.ws = null;
    ws?.close(1000, 'closed');
  }
}

export type WebSocketTransport = ManagedTransport & { readonly reconnects: number; dropForTest(): void };

export function createWebSocketTransport(o: WebSocketTransportOptions): WebSocketTransport {
  return new WsTransport(o);
}
