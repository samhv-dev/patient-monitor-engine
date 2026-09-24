// BroadcastChannel transport (brief §3.7): same origin, same browser — e.g. an instructor window plus a
// projector window. The channel is named after the session code; a channel never hears its own posts.
import type { ManagedTransport, WireMessage } from '../protocol.ts';
import { TransportBase } from './base.ts';

export type BroadcastChannelCtor = new (name: string) => BroadcastChannel;
export const channelName = (session: string): string => `pme/${session}`;

class BroadcastChannelTransport extends TransportBase {
  readonly kind = 'broadcastChannel' as const;
  private readonly ch: BroadcastChannel;

  constructor(session: string, Impl: BroadcastChannelCtor) {
    super();
    this.ch = new Impl(channelName(session));
    this.ch.onmessage = (ev: MessageEvent) => this.deliver(ev.data);
    this.ch.onmessageerror = () => this.rejected++;
    this.setStatus('open');
  }

  protected write(m: WireMessage): void {
    this.ch.postMessage(m);
  }

  protected teardown(): void {
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
