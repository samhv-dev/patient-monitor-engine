// BroadcastChannel transport (brief §3.7): same origin, same browser — e.g. an instructor window plus a
// projector window. The channel is named after the session code; a channel never hears its own posts.
// A page that closes, reloads or closes its link says so (a `peer-left` frame, for each id it sent as). Any page of the
// origin can post one naming any id, so it is a farewell, not the relay's proof that a socket left: onFarewell, never
// onPeerLeft.
import type { ManagedTransport, WireMessage } from '../protocol.ts';
import { TransportBase } from './base.ts';

export type BroadcastChannelCtor = new (name: string) => BroadcastChannel;
export const channelName = (session: string): string => `pme/${session}`;

class BroadcastChannelTransport extends TransportBase {
  readonly kind = 'broadcastChannel' as const;
  private readonly ch: BroadcastChannel;
  private readonly senders = new Set<string>();
  private readonly leave = () => {
    for (const id of this.senders) this.ch.postMessage({ relay: 'peer-left', id });
    this.senders.clear();
  };

  constructor(session: string, Impl: BroadcastChannelCtor) {
    super();
    this.ch = new Impl(channelName(session));
    this.ch.onmessage = (ev: MessageEvent) => {
      const o = ev.data as { relay?: unknown; id?: unknown } | null;
      if (o?.relay === 'peer-left' && typeof o.id === 'string') return this.farewell(o.id);
      this.deliver(o); // every other frame is a wire message or rejected
    };
    this.ch.onmessageerror = () => this.rejected++;
    globalThis.addEventListener?.('pagehide', this.leave);
    this.setStatus('open');
  }

  protected write(m: WireMessage): void {
    this.senders.add(m.from);
    this.ch.postMessage(m);
  }

  protected teardown(): void {
    globalThis.removeEventListener?.('pagehide', this.leave);
    this.leave();
    this.ch.onmessage = null;
    this.ch.close();
  }
}

export function createBroadcastChannelTransport(
  session: string,
  opts: { BroadcastChannelImpl?: BroadcastChannelCtor } = {},
): ManagedTransport {
  return new BroadcastChannelTransport(session, opts.BroadcastChannelImpl ?? BroadcastChannel);
}
