// @vitest-environment happy-dom
// EEG plan E12: the host switches the room's depth-of-anaesthesia device on (`device eeg on`, then `device eeg model
// <id>`: the engine refuses a model while the EEG is off) at every patient mount — the page's first patient, "Restart
// patient", a scenario load — and on a change in Room setup, through the host's own command path, so every follower (a
// depth window, a phone on the relay) replays both and its own engine reads the same samples (D3). With no device chosen
// it sends nothing (no EEG: the showcase goldens are unchanged); "Off" in Room setup switches it off at once. The real
// AppSession and HostSession on a fake relay socket; the monitor is a stand-in that records what it is told to dispatch.
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

const ON = { device: 'eeg', action: 'on' };
const MODEL = { device: 'eeg', action: 'model', value: 'generic' };
const OFF = { device: 'eeg', action: 'off' };
const settle = async () => {
  for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 0));
};
const spec = { ageY: 40, sex: 'M' as const, weightKg: 70, heightCm: 175, comorbid: [], attached: true };
/** The EEG commands the monitor (the host's engine) was told to dispatch, in order. */
const eeg = () => net.dispatched.filter((c) => c.type === 'device' && (c.action as { device?: string }).device === 'eeg').map((c) => c.action);
/** The EEG commands the phones were sent as applied (what a follower replays). */
const toPhones = () => (net.sent as WireMessage[]).filter((m) => m.kind === 'event').flatMap((m) => (m as Extract<WireMessage, { kind: 'event' }>).body)
  .filter((e: WireEvent) => e.type === 'commandApplied' && (e.resolved as { command?: { type?: string; action?: { device?: string } } } | undefined)?.command?.action?.device === 'eeg');

describe("E12: the host switches the room's depth-of-anaesthesia device on at every patient mount", () => {
  let s: InstanceType<typeof AppSession>;
  afterEach(() => {
    s.destroy();
    net.sent.length = 0;
    net.dispatched.length = 0;
  });

  it('the page\'s patient, "Restart patient" and a scenario load each send on, then the model; the phones are sent both as applied', async () => {
    s = new AppSession(document.createElement('div'), { spec, mode: 'modeled' }, { skin: 'saadat-like', theme: '', code: 'KKQB2N', relay: 'ws://relay.test/', eegModel: 'generic' });
    await settle();
    expect(eeg()).toEqual([ON, MODEL]);
    s.restart({ spec, mode: 'modeled', seed: 9 });
    await settle();
    expect(eeg()).toEqual([ON, MODEL, ON, MODEL]);
    expect(s.loadScenario(bronchospasm)).toMatchObject({ ok: true });
    await settle();
    expect(eeg()).toHaveLength(6);
    expect(toPhones().length).toBeGreaterThanOrEqual(6);
  });

  it('no device chosen: nothing is sent, at a mount or a load (no EEG, as before)', async () => {
    s = new AppSession(document.createElement('div'), { spec, mode: 'modeled' }, { skin: 'saadat-like', theme: '', code: 'KKQB2N', relay: 'ws://relay.test/' });
    await settle();
    s.restart({ spec, mode: 'modeled', seed: 9 });
    expect(s.loadScenario(bronchospasm)).toMatchObject({ ok: true });
    await settle();
    expect(eeg()).toEqual([]);
    expect(toPhones()).toEqual([]);
  });

  it('a choice in Room setup is sent at once and kept for the next patient; Off switches it off at once and sends nothing at the next', async () => {
    s = new AppSession(document.createElement('div'), { spec, mode: 'modeled' }, { skin: 'saadat-like', theme: '', code: 'KKQB2N', relay: 'ws://relay.test/' });
    await settle();
    s.setEegModel('generic');
    await settle();
    expect(eeg()).toEqual([ON, MODEL]);
    s.restart({ spec, mode: 'modeled', seed: 9 });
    await settle();
    expect(eeg()).toHaveLength(4);
    s.setEegModel(null);
    await settle();
    expect(eeg().at(-1)).toEqual(OFF);
    s.restart({ spec, mode: 'modeled', seed: 10 });
    await settle();
    expect(eeg()).toHaveLength(5);
    expect(s.eegModel).toBeNull();
  });
});
