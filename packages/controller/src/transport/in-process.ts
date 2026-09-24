// Same-page transport (brief §3.7 `in-process`): a hub that fans each message out to every OTHER endpoint,
// asynchronously and as a structured clone, so code behaves exactly as it will over a real wire.
import type { ManagedTransport, WireMessage } from '../protocol.ts';
import { TransportBase } from './base.ts';

class InProcessTransport extends TransportBase {
  readonly kind = 'in-process' as const;
  private readonly peers: Set<InProcessTransport>;

  constructor(peers: Set<InProcessTransport>) {
    super();
    this.peers = peers;
    peers.add(this);
    this.setStatus('open');
  }

  protected write(m: WireMessage): void {
    for (const p of this.peers) {
      if (p === this) continue;
      const copy = structuredClone(m);
      queueMicrotask(() => p.receive(copy));
    }
  }

  receive(m: WireMessage): void {
    this.deliver(m);
  }

  protected teardown(): void {
    this.peers.delete(this);
  }
}

export interface InProcessHub {
  connect(): ManagedTransport;
}

export function createInProcessHub(): InProcessHub {
  const peers = new Set<InProcessTransport>();
  return { connect: () => new InProcessTransport(peers) };
}
