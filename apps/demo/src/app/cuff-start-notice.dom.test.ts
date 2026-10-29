// @vitest-environment happy-dom
// fix-cuff-start-cockpit-notice: the saadat-like cuff starts on AUTO at every patient start and card load (O2, UI review
// #14). Its command went to HostSession.mirror with `notice` left at its default, so each start told the learners' phones
// "the ventilator is on the main screen" although the Ventilator view was closed: they held ≈ 2.5 s and resynced (found
// by PR #191, 30 Oct; it includes the card load that restores a case after the instructor reloads the page). Only the
// Ventilator view's own frames, while it is on screen, may send the phones a `cockpit` notice.
// The real AppSession and HostSession on a fake relay socket; the monitor is a stand-in (no worker, no canvas here).
import type { ManagedTransport, TransportStatus, WireEvent, WireMessage } from '@pme/controller';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import bronchospasm from './showcase/showcase-bronchospasm.json';

const net = vi.hoisted(() => ({ sent: [] as unknown[], cuffs: 0 }));

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
        dispatch: (c: { type: string; action?: { device?: string } }) => {
          if (c.type === 'device' && c.action?.device === 'nibp') net.cuffs++;
          return Promise.resolve({ accepted: true, tick: ++tick });
        },
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

const cockpits = () => (net.sent as WireMessage[]).filter((m) => m.kind === 'event').flatMap((m) => (m as Extract<WireMessage, { kind: 'event' }>).body).filter((e: WireEvent) => e.type === 'cockpit');
const settle = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};
const spec = { ageY: 40, sex: 'M' as const, weightKg: 70, heightCm: 175, comorbid: [], attached: true };

describe("the saadat-like cuff's start says nothing to the phones about the ventilator", () => {
  let wall = 0;
  let s: InstanceType<typeof AppSession>;
  beforeEach(async () => {
    net.sent.length = 0;
    net.cuffs = 0;
    wall = 1_000_000;
    vi.spyOn(performance, 'now').mockImplementation(() => wall);
    s = new AppSession(document.createElement('div'), { spec, mode: 'modeled' }, { skin: 'saadat-like', theme: '', code: 'KKQB2N', relay: 'ws://relay.test/' });
    await settle();
  });
  afterEach(() => {
    s.destroy();
    vi.restoreAllMocks();
  });

  it('a patient start (the page, then "Restart patient") starts the cuff and sends no cockpit notice', async () => {
    expect((net.sent as WireMessage[]).some((m) => m.kind === 'hello')).toBe(true); // the phones' link is on
    wall += 5000;
    s.restart({ spec, mode: 'modeled', seed: 9 });
    await settle();
    expect(net.cuffs).toBe(2); // the cuff started on AUTO both times
    expect(cockpits()).toEqual([]);
  });

  it('a card load (also the one that restores a case after a reload) starts the cuff and sends no cockpit notice', async () => {
    wall += 5000;
    expect(s.loadScenario(bronchospasm)).toMatchObject({ ok: true });
    await settle();
    expect(net.cuffs).toBe(2); // the page's patient, then the card's
    expect(cockpits()).toEqual([]);
  });

  it('the Ventilator view on screen still sends one with its first frame', async () => {
    wall += 5000;
    net.sent.length = 0;
    s.ventShown = true; // as the view's enter() sets it
    const frame = { id: 'vf-1', issuedBy: 'vent-link', type: 'externalDrive', source: 'ventilator', frame: { pawCmH2O: 5, flowLps: 0, volumeMl: 0, fio2: 0.4, peepCmH2O: 5 } } as never;
    await s.linked(s.monitor as never).dispatch(frame);
    expect(cockpits()).toHaveLength(1);
    expect(cockpits()[0]).not.toHaveProperty('off');
  });
});
