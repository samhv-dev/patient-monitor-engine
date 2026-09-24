// postMessage transport (brief §3.7): an iframe, a worker or a MessagePort. Messages travel inside a
// { __pme: 1, m } envelope so unrelated window messages are ignored.
import type { ManagedTransport, WireMessage } from '../protocol.ts';
import { TransportBase } from './base.ts';

/** The subset of Worker / MessagePort / Window-pair that the transport needs. */
export interface PostEndpoint {
  postMessage(data: unknown): void;
  addEventListener(type: 'message', fn: (ev: MessageEvent) => void): void;
  removeEventListener(type: 'message', fn: (ev: MessageEvent) => void): void;
  /** MessagePort needs start() when listening through addEventListener. */
  start?(): void;
}

type Envelope = { __pme: 1; m: unknown };
const isEnvelope = (d: unknown): d is Envelope => d !== null && typeof d === 'object' && (d as Envelope).__pme === 1;

class PostMessageTransport extends TransportBase {
  readonly kind = 'postMessage' as const;
  private readonly ep: PostEndpoint;
  private readonly onMsg = (ev: MessageEvent) => {
    if (isEnvelope(ev.data)) this.deliver(ev.data.m);
  };

  constructor(ep: PostEndpoint) {
    super();
    this.ep = ep;
    ep.addEventListener('message', this.onMsg);
    ep.start?.();
    this.setStatus('open');
  }

  protected write(m: WireMessage): void {
    this.ep.postMessage({ __pme: 1, m } satisfies Envelope);
  }

  protected teardown(): void {
    this.ep.removeEventListener('message', this.onMsg);
  }
}

export function createPostMessageTransport(ep: PostEndpoint): ManagedTransport {
  return new PostMessageTransport(ep);
}

/**
 * Endpoint for talking to another window (an iframe's contentWindow, or window.parent from inside the iframe).
 * Only messages whose source is `other` and whose origin is `targetOrigin` are accepted ('*' accepts any).
 */
export function windowEndpoint(other: Window, targetOrigin: string, self: Window = window): PostEndpoint {
  const wrapped = new Map<(ev: MessageEvent) => void, (ev: MessageEvent) => void>();
  return {
    postMessage: (data) => other.postMessage(data, targetOrigin),
    addEventListener: (_t, fn) => {
      const w = (ev: MessageEvent) => {
        if (ev.source !== other) return;
        if (targetOrigin !== '*' && ev.origin !== targetOrigin) return;
        fn(ev);
      };
      wrapped.set(fn, w);
      self.addEventListener('message', w);
    },
    removeEventListener: (_t, fn) => {
      const w = wrapped.get(fn);
      if (w) self.removeEventListener('message', w);
      wrapped.delete(fn);
    },
  };
}
