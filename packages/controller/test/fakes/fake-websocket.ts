// A scriptable WebSocket for unit tests of the WebSocket transport (no network).
import type { WebSocketLike } from '../../src/transport/websocket.ts';

export class FakeWebSocket implements WebSocketLike {
  static all: FakeWebSocket[] = [];
  readyState = 0;
  sent: string[] = [];
  onopen: ((ev: unknown) => void) | null = null;
  onclose: ((ev: { code: number; reason: string }) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  readonly url: string;
  constructor(url: string) {
    this.url = url;
    FakeWebSocket.all.push(this);
  }
  static get last(): FakeWebSocket {
    return FakeWebSocket.all[FakeWebSocket.all.length - 1] as FakeWebSocket;
  }
  send(data: string): void {
    this.sent.push(data);
  }
  close(code = 1000, reason = ''): void {
    if (this.readyState === 3) return;
    this.readyState = 3;
    this.onclose?.({ code, reason });
  }
  // test controls
  open(): void {
    this.readyState = 1;
    this.onopen?.({});
  }
  receive(o: unknown): void {
    this.onmessage?.({ data: typeof o === 'string' ? o : JSON.stringify(o) });
  }
}
