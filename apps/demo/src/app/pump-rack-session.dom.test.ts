// @vitest-environment happy-dom
// Plan pump-rack-tci.md A1 (§5; PQ1 = C): the room's pump rack reaches the pump tablet on the host's `style` event, as
// the room's defibrillator model does: in the answer to every hello (so a tablet that restarts or joins late builds its
// rack again) and at every change on Room setup. The real AppSession and HostSession on a fake relay socket (the harness
// of defib-model-session.dom.test.ts).
import { createStamper, type ManagedTransport, type TransportStatus, type WireEvent, type WireMessage } from '@pme/controller';
import { afterEach, describe, expect, it, vi } from 'vitest';

const net = vi.hoisted(() => ({ sent: [] as unknown[], msg: new Set<(m: unknown) => void>() }));

vi.mock('@pme/controller', async (orig) => {
  const real = await orig<typeof import('@pme/controller')>();
  return {
    ...real,
    createWebSocketTransport: (): ManagedTransport => ({
      kind: 'websocket',
      status: 'open',
      send: (m) => void net.sent.push(m),
      onMessage: (fn: (m: WireMessage) => void) => (net.msg.add(fn as (m: unknown) => void), () => void net.msg.delete(fn as (m: unknown) => void)),
      onStatus: (fn: (s: TransportStatus) => void) => (fn('open'), () => {}),
      close: () => {},
    }),
  };
});
vi.mock('@pme/renderer', async () => {
  const { resolveSkin } = await import('@pme/skins');
  return {
    version: '0.0.0-test',
    mountMonitor: (_el: unknown, o: { skin: string }) => {
      let tick = 0;
      return {
        skin: resolveSkin(o.skin),
        dispatch: () => Promise.resolve({ accepted: true, tick: ++tick }),
        on: () => () => {},
        snapshot: () => Promise.resolve({}),
        restore: () => Promise.resolve(),
        advance: () => Promise.resolve({ tick, simT: tick * 0.02 }),
        setTimeScale: () => {},
        pause: () => {},
        resume: () => {},
        enableSound: () => Promise.resolve(),
        destroy: () => {},
      };
    },
  };
});

const { AppSession } = await import('./session.ts');

const settle = async () => {
  for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 0));
};
const spec = { ageY: 40, sex: 'M' as const, weightKg: 70, heightCm: 175, comorbid: [], attached: true };
const styles = () => (net.sent as WireMessage[]).filter((m) => m.kind === 'event').flatMap((m) => (m as Extract<WireMessage, { kind: 'event' }>).body)
  .filter((e: WireEvent): e is Extract<WireEvent, { type: 'style' }> => e.type === 'style');

describe("A1: the host sends the room's pump rack on its style event", () => {
  let s: InstanceType<typeof AppSession>;
  afterEach(() => {
    s.destroy();
    net.sent.length = 0;
    net.msg.clear();
  });

  it("answers a tablet's hello with the rack, and sends every change", async () => {
    s = new AppSession(document.createElement('div'), { spec, mode: 'modeled' }, { skin: 'saadat-like', theme: '', code: 'KKQB2N', relay: 'ws://relay.test/', pumpRack: ['syringe', 'drip', 'syringe'] });
    await settle();
    const hello = createStamper('KKQB2N', 'tablet-1')({ kind: 'hello', role: 'pump', show: 'pump', device: 'k3x9q2m7ab4c', pin: '5813' });
    for (const fn of net.msg) fn(hello);
    await settle();
    expect(styles().at(-1)?.pumps).toEqual(['syringe', 'drip', 'syringe']);
    s.setPumpRack(['drip']);
    await settle();
    expect(styles().at(-1)?.pumps).toEqual(['drip']);
    expect(s.pumpRack).toEqual(['drip']);
  });
});
