// FU-11 Task F2 (browser audit BA12): the relay's "host left" reaches the session.
import { describe, expect, it } from 'vitest';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { TransportBase } from '../../src/transport/base.ts';
import { createStamper, type WireMessage } from '../../src/protocol.ts';

class Fake extends TransportBase {
  readonly kind = 'websocket' as const;
  protected write(): void {}
  protected teardown(): void {}
  open(): void {
    this.setStatus('open');
  }
  inject(m: WireMessage): void {
    this.deliver(m);
  }
  peers(hostOnline: boolean): void {
    this.presence({ hostOnline });
  }
}
const S = 'PRS234';
const host = createStamper(S, 'host-1');

describe('FU-11 F2: host presence (BA12)', () => {
  it('hostOnline goes false on a relay "host offline" notice and true again on the host hello', () => {
    const t = new Fake();
    const s = new ControllerSession({ session: S, transport: t });
    t.open();
    t.inject(host({ kind: 'hello', role: 'host' }));
    expect(s.hostOnline).toBe(true);
    t.peers(false);
    expect(s.hostOnline).toBe(false);
    expect(s.log.at(-1)?.text).toBe('host offline');
    t.inject(host({ kind: 'hello', role: 'host' }));
    expect(s.hostOnline).toBe(true);
    s.close();
  });
});
