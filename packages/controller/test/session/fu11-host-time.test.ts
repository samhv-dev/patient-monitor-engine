// FU-11 Task F3 (showcase kit K5): every controller knows the speed and pause the HOST runs at (a Remote showed ×1
// under a ×4 host).
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
}
const S = 'PRS234';
const host = createStamper(S, 'host-1');

describe('FU-11 F3: the host\'s speed and pause (K5)', () => {
  it('follow applied time commands, sticky replays included', () => {
    const t = new Fake();
    const s = new ControllerSession({ session: S, transport: t });
    t.open();
    expect(s.timeScale).toBe(1);
    t.inject(host({ kind: 'event', body: [{ type: 'commandApplied', commandId: 'x', tick: 0, resolved: { command: { id: 'x', issuedBy: 'i', type: 'time', action: 'scale', value: 4 }, replay: true } }] }));
    expect(s.timeScale).toBe(4);
    t.inject(host({ kind: 'event', body: [{ type: 'commandApplied', commandId: 'y', tick: 0, resolved: { command: { id: 'y', issuedBy: 'i', type: 'time', action: 'pause' } } }] }));
    expect(s.hostPaused).toBe(true);
    s.close();
  });
});
