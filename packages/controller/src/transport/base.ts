// Shared plumbing for every transport: listener sets, status replay on subscribe, send-side sample guard,
// receive-side validation. Subclasses implement write() and teardown() and call deliver()/setStatus().
import { assertWireSafe, parseWireMessage } from '../guard.ts';
import type { ManagedTransport, TransportKind, TransportStatus, WireMessage } from '../protocol.ts';

export abstract class TransportBase implements ManagedTransport {
  abstract readonly kind: TransportKind;
  private readonly msgFns = new Set<(m: WireMessage) => void>();
  private readonly statusFns = new Set<(s: TransportStatus) => void>();
  private current: TransportStatus = 'connecting';
  protected closed = false;
  /** Messages refused by parseWireMessage (malformed, oversized or carrying samples). */
  rejected = 0;

  get status(): TransportStatus {
    return this.current;
  }

  /** Throws WireSafetyError for sample data; silently drops after close() or while not open. */
  send(m: WireMessage): void {
    assertWireSafe(m);
    if (this.closed || this.current !== 'open') return;
    this.write(m);
  }

  onMessage(fn: (m: WireMessage) => void): () => void {
    this.msgFns.add(fn);
    return () => {
      this.msgFns.delete(fn);
    };
  }

  /** Calls `fn` at once with the current status, then on every change. */
  onStatus(fn: (s: TransportStatus) => void): () => void {
    this.statusFns.add(fn);
    fn(this.current);
    return () => {
      this.statusFns.delete(fn);
    };
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.teardown();
    this.setStatus('closed');
  }

  protected abstract write(m: WireMessage): void;
  protected abstract teardown(): void;

  protected setStatus(s: TransportStatus): void {
    if (s === this.current) return;
    if (this.closed && s !== 'closed') return;
    this.current = s;
    for (const fn of [...this.statusFns]) fn(s);
  }

  /** Validate untrusted input, then hand it to the listeners. */
  protected deliver(data: unknown): void {
    if (this.closed) return;
    const m = parseWireMessage(data);
    if (!m) {
      this.rejected++;
      return;
    }
    for (const fn of [...this.msgFns]) fn(m);
  }
}
