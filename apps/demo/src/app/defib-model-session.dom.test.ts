// @vitest-environment happy-dom
// Room plan R5b: the host sends the room's defibrillator model (`device {device:'defib', action:'model'}`, R5a) at every
// patient mount — the page's first patient, "Restart patient", a scenario load — and on a change in Room setup, through
// the host's own command path, so every follower (a window of this computer, a phone on the relay) replays it. With no
// model chosen it sends nothing (the showcase goldens are unchanged). The real AppSession and HostSession on a fake relay
// socket; the monitor is a stand-in that records what it is told to dispatch (no worker, no canvas here).
import type { ManagedTransport, TransportStatus, WireEvent, WireMessage } from '@pme/controller';
import { afterEach, describe, expect, it, vi } from 'vitest';
import bronchospasm from './showcase/showcase-bronchospasm.json';

const net = vi.hoisted(() => ({ sent: [] as unknown[], dispatched: [] as Array<{ type: string; action?: unknown }> }));

vi.mock('@pme/controller', async (orig) => {
  const real = await orig<typeof import('@pme/controller')>();
  return {
    ...real,
    createWebSocketTransport: (): ManagedTransport => ({
      kind: 'websocket',
      status: 'open',
      send: (m) => void net.sent.push(m),
      onMessage: () => () => {},
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
        dispatch: (c: { type: string; action?: unknown }) => (net.dispatched.push(c), Promise.resolve({ accepted: true, tick: ++tick })),
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

const MODEL = { device: 'defib', action: 'model', value: 'generic' };
const settle = async () => {
  for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 0));
};
const spec = { ageY: 40, sex: 'M' as const, weightKg: 70, heightCm: 175, comorbid: [], attached: true };
/** The model commands the monitor (the host's engine) was told to dispatch. */
const models = () => net.dispatched.filter((c) => c.type === 'device' && (c.action as { device?: string }).device === 'defib');
/** The model commands the phones were sent as applied (what a follower replays). */
const toPhones = () => (net.sent as WireMessage[]).filter((m) => m.kind === 'event').flatMap((m) => (m as Extract<WireMessage, { kind: 'event' }>).body)
  .filter((e: WireEvent) => e.type === 'commandApplied' && (e.resolved as { command?: { type?: string; action?: { device?: string } } } | undefined)?.command?.action?.device === 'defib');

describe("R5b: the host re-sends the room's defibrillator model at every patient mount", () => {
  let s: InstanceType<typeof AppSession>;
  afterEach(() => {
    s.destroy();
    net.sent.length = 0;
    net.dispatched.length = 0;
  });

  it('the page\'s patient, "Restart patient" and a scenario load each send it once, and the phones are sent it as applied', async () => {
    s = new AppSession(document.createElement('div'), { spec, mode: 'modeled' }, { skin: 'saadat-like', theme: '', code: 'KKQB2N', relay: 'ws://relay.test/', defibModel: 'generic' });
    await settle();
    expect(models().map((c) => c.action)).toEqual([MODEL]);
    s.restart({ spec, mode: 'modeled', seed: 9 });
    await settle();
    expect(models()).toHaveLength(2);
    expect(s.loadScenario(bronchospasm)).toMatchObject({ ok: true });
    await settle();
    expect(models()).toHaveLength(3);
    expect(toPhones().length).toBeGreaterThanOrEqual(3);
  });

  it('no model chosen: nothing is sent, at a mount or a load (today\'s behaviour, the goldens unchanged)', async () => {
    s = new AppSession(document.createElement('div'), { spec, mode: 'modeled' }, { skin: 'saadat-like', theme: '', code: 'KKQB2N', relay: 'ws://relay.test/' });
    await settle();
    s.restart({ spec, mode: 'modeled', seed: 9 });
    expect(s.loadScenario(bronchospasm)).toMatchObject({ ok: true });
    await settle();
    expect(models()).toEqual([]);
    expect(toPhones()).toEqual([]);
  });

  it('a choice in Room setup is sent at once, and kept for the next patient; "not chosen" sends nothing and applies from the next patient', async () => {
    s = new AppSession(document.createElement('div'), { spec, mode: 'modeled' }, { skin: 'saadat-like', theme: '', code: 'KKQB2N', relay: 'ws://relay.test/' });
    await settle();
    s.setDefibModel('generic');
    await settle();
    expect(models().map((c) => c.action)).toEqual([MODEL]);
    expect(toPhones()).toHaveLength(1);
    s.restart({ spec, mode: 'modeled', seed: 9 });
    await settle();
    expect(models()).toHaveLength(2);
    s.setDefibModel(null);
    s.restart({ spec, mode: 'modeled', seed: 10 });
    await settle();
    expect(models()).toHaveLength(2);
    expect(s.defibModel).toBeNull();
  });
});
