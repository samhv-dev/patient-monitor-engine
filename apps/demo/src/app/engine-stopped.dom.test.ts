// @vitest-environment happy-dom
// Brief 195: the instructor's page when its simulation stops. The monitor's `pme-monitor-failed` (an error while the
// engine stepped, a worker that crashed, a worker the watchdog found dead) used to give a 4 s toast and a console line:
// the patient froze, and the phones said "not answering" three seconds later. Now (1) the page shows a notice that stays
// until a new engine runs, saying that the simulation has stopped, why, and the two ways on the app already has, each
// with what it keeps and what it loses; and (2) the session tells every follower, through the host session, that the
// host's engine has stopped. The real AppSession and HostSession on a fake relay socket; the monitor is a stand-in.
import type { ManagedTransport, TransportStatus, WireEvent, WireMessage } from '@pme/controller';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const net = vi.hoisted(() => ({ sent: [] as unknown[] }));
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
    mountMonitor: (el: HTMLElement, o: { skin: string }) => {
      el.append(document.createElement('canvas')); // where a real monitor's `pme-monitor-failed` comes from
      return {
        skin: resolveSkin(o.skin),
        dispatch: () => Promise.resolve({ accepted: true, tick: 1 }),
        dispatchAll: (cs: unknown[]) => Promise.resolve(cs.map(() => ({ accepted: true, tick: 1 }))),
        on: () => () => {},
        snapshot: () => Promise.resolve({}),
        restore: () => Promise.resolve(),
        advance: () => Promise.resolve({ tick: 1, simT: 0.02 }),
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
const { stoppedNotice, STOPPED_TITLE, STOPPED_RESTART_CASE, STOPPED_RESTART_FREE, STOPPED_RELOAD } = await import('./engine-stopped.ts');

const REASON = 'an error in the simulation: the frame step threw';
const stops = () => (net.sent as WireMessage[]).filter((m) => m.kind === 'event').flatMap((m) => (m as Extract<WireMessage, { kind: 'event' }>).body).filter((e: WireEvent) => e.type === 'engineStopped');
const settle = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};
const spec = { ageY: 40, sex: 'M' as const, weightKg: 70, heightCm: 175, comorbid: [], attached: true };
const fail = (el: HTMLElement) => el.querySelector('canvas')!.dispatchEvent(new CustomEvent('pme-monitor-failed', { bubbles: true, detail: { reason: REASON } }));

describe('the session tells the followers that its engine has stopped', () => {
  let s: InstanceType<typeof AppSession>;
  let el: HTMLElement;
  beforeEach(async () => {
    net.sent.length = 0;
    el = document.createElement('div');
    s = new AppSession(el, { spec, mode: 'modeled' }, { skin: 'saadat-like', theme: '', code: 'KKQB2N', relay: 'ws://relay.test/' });
    await settle();
  });
  afterEach(() => s.destroy());

  it("the monitor's failure goes on the wire at once, with its reason; a restart (a new engine) ends it", async () => {
    expect(stops()).toEqual([]);
    fail(el);
    await settle();
    expect(stops()).toHaveLength(1);
    expect(stops()[0]).toMatchObject({ type: 'engineStopped', reason: REASON });
    s.restart({ spec, mode: 'modeled' });
    s.host.emitState(); // the host's 1 Hz turn
    s.host.flush();
    await settle();
    expect(stops()).toHaveLength(1);
  });
});

describe("the instructor's notice", () => {
  beforeEach(() => document.body.replaceChildren());

  it('says that the simulation has stopped, why, and the two ways on, each with what it keeps; it stays', () => {
    const ways = { restart: vi.fn(), reload: vi.fn() };
    const n = stoppedNotice(document.body, ways);
    n.show(REASON, true);
    const box = document.querySelector('.engine-stopped')!;
    expect(box.getAttribute('role')).toBe('alert');
    expect(box.querySelector('h2')?.textContent).toBe(STOPPED_TITLE);
    expect(box.textContent).toContain(`Reason: ${REASON}.`);
    expect(box.textContent).toContain(STOPPED_RESTART_CASE);
    expect(box.textContent).toContain(STOPPED_RELOAD);
    const [restart, reload] = [...box.querySelectorAll('button')];
    expect(restart?.textContent).toBe('Restart the patient');
    expect(reload?.textContent).toBe('Reload this page');
    restart!.click();
    expect(ways.restart).toHaveBeenCalledOnce();
    reload!.click();
    expect(ways.reload).toHaveBeenCalledOnce();
    expect(document.querySelector('.engine-stopped')).not.toBeNull(); // it goes with the new engine, not with a click
  });

  it('a free run (no case) says what its restart keeps; a second failure replaces the notice; hide removes it', () => {
    const n = stoppedNotice(document.body, { restart: () => {}, reload: () => {} });
    n.show(REASON, false);
    n.show("the monitor's worker stopped responding", false);
    expect(document.querySelectorAll('.engine-stopped')).toHaveLength(1);
    expect(document.querySelector('.engine-stopped')?.textContent).toContain(STOPPED_RESTART_FREE);
    expect(document.querySelector('.engine-stopped')?.textContent).toContain("Reason: the monitor's worker stopped responding.");
    n.hide();
    expect(document.querySelector('.engine-stopped')).toBeNull();
  });
});
