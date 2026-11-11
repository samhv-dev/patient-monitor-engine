// @vitest-environment happy-dom
// Plan pump-rack-tci.md A1 ("Tests first"; §4 D1, §7, §8): the pump page. The learner-PIN form comes first (L6's form,
// "learner PIN" in its words); the PIN is never in the address or the tablet's store; at sign-in the page says hello as
// `{role: 'pump', show: 'pump', device, pin}` (the real follower over a fake relay link the test drives); the rack shows
// once the host grants it, with n channels of the kinds Room setup sent on the `style` event; the faces follow the
// follower engine's `drugs` event; the syringe's contents are never in the page's DOM; the tablet does not carry the
// monitor's Sound and Silence (it shows no monitor). A host that never answers is said in words.
import { createStamper, INSTRUCTOR_REASONS, LEARNER_REASONS, type ManagedTransport, type RelayFrame, type TransportStatus, type WireBody, type WireMessage } from '@pme/controller';
import type { EngineEvent, PumpPanelRow } from '@pme/engine-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const CODE = 'GP3P4G';
const PIN = '5813';
const DEVICE = 'k3x9q2m7ab4c';

type Link = { sent: WireMessage[]; msg: Set<(m: WireMessage) => void>; rf: Set<(f: RelayFrame) => void>; st: Set<(s: TransportStatus) => void>; status: TransportStatus; closed: boolean };
const net = vi.hoisted(() => ({ links: [] as unknown[], engine: new Set<(e: unknown) => void>() }));
vi.mock('@pme/controller', async (orig) => {
  const real = await orig<typeof import('@pme/controller')>();
  const fake = (): ManagedTransport => {
    const l: Link = { sent: [], msg: new Set(), rf: new Set(), st: new Set(), status: 'open', closed: false };
    net.links.push(l);
    return {
      kind: 'websocket',
      get status() {
        return l.status;
      },
      send: (m: WireMessage) => void (!l.closed && l.sent.push(m)),
      onMessage: (fn: (m: WireMessage) => void) => (l.msg.add(fn), () => void l.msg.delete(fn)),
      onStatus: (fn: (s: TransportStatus) => void) => (l.st.add(fn), fn(l.status), () => void l.st.delete(fn)),
      onPresence: () => () => {},
      onRelayFrame: (fn: (f: RelayFrame) => void) => (l.rf.add(fn), () => void l.rf.delete(fn)),
      close: () => void (l.closed = true),
    } as unknown as ManagedTransport;
  };
  return { ...real, createWebSocketTransport: fake, createBroadcastChannelTransport: fake };
});
vi.mock('@pme/renderer', () => ({
  version: '0.0.0-test',
  mountMonitor: () => {
    let tick = 0;
    const clock = { restore: (s: { tick: number }) => void (tick = s.tick), dispatch: () => ({ accepted: true, tick }), on: () => () => {}, renderT: () => tick * 0.02, tick: () => tick, setRate: () => {}, setPaused: () => {}, jumpTo: () => {} };
    return {
      soundOn: false, viewerClock: () => Promise.resolve(clock), destroy: () => {}, setSkin: () => Promise.resolve(), setPortrait: () => {}, setHeaderNote: () => {}, setIbpScales: () => {}, disableSound: () => {}, enableSound: () => Promise.resolve(), silenceAudio: () => false,
      // the follower engine's events: the test plays the `drugs` event through it
      on: (fn: (e: unknown) => void) => (net.engine.add(fn), () => void net.engine.delete(fn)),
    };
  },
}));

const { pumpPageView, PUMP_WORDS } = await import('./page.ts');
const { mountFollower } = await import('../views/follower.ts');
const { DEFAULT_SITE } = await import('../site.ts');
const { store } = await import('../store.ts');

const link = () => net.links.at(-1) as Link;
const host = () => {
  const l = link();
  const stamp = createStamper(CODE, 'host-aaaaaa', () => Date.now());
  const send = (b: WireBody) => [...l.msg].forEach((fn) => fn(stamp(b)));
  const tabletFrom = () => [...l.sent].reverse().find((m) => m.kind === 'hello')?.from as string;
  return {
    hello: () => send({ kind: 'hello', role: 'host' }),
    grant: (granted: boolean, reason?: string) => send({ kind: 'grant', to: tabletFrom(), granted, ...(reason ? { reason } : {}) }),
    rack: (pumps?: Array<'syringe' | 'drip'>) => send({ kind: 'event', body: [{ type: 'style', skin: 'saadat-like', theme: '', ...(pumps ? { pumps } : {}), replay: true }] } as WireBody),
    relayError: (code: 'too-many-tries' | 'full' | 'forbidden', message = 'refused') => [...l.rf].forEach((fn) => fn({ relay: 'error', code, message })),
  };
};
const engine = (pumps: PumpPanelRow[]) => [...net.engine].forEach((fn) => fn({ type: 'drugs', t: 60, drugs: [], volatile: null, macTotal: 0, pumps } as EngineEvent));

/** Channel 1: a REMIFENTANIL 50 µg/mL syringe programmed as propofol 10 mg/mL (the §8 mismatch); channel 2: a drip. */
const ROWS: PumpPanelRow[] = [
  {
    ch: 1, kind: 'syringe', state: 'running',
    programmed: { drugId: 'propofol', concentration: { amount: 10, unit: 'mg', perMl: 1 } },
    contents: { drugId: 'remifentanil', concentration: { amount: 50, unit: 'mcg', perMl: 1 } },
    syringeMl: 50, set: null, mode: 'rate', rate: { rate: 20, unit: 'mL/h' }, rateMlH: 20, limitMl: null,
    volumeMl: 38, infusedMl: 12, wasteMl: 0, timeToEmptyMin: 114, alarms: [],
  },
  {
    ch: 2, kind: 'drip', state: 'loaded',
    programmed: null,
    contents: { drugId: 'magnesiumSulfate', concentration: { amount: 2, unit: 'g', perMl: 100 } },
    syringeMl: null, set: 20, mode: 'rate', rate: null, rateMlH: 0, limitMl: null,
    volumeMl: 100, infusedMl: 0, wasteMl: 0, timeToEmptyMin: null, alarms: [],
  },
];

function mount() {
  history.replaceState(null, '', `/?join=${CODE}#/pump`);
  const stage = document.createElement('div');
  const monitorHost = document.createElement('div');
  stage.append(monitorHost);
  document.body.append(stage);
  const v = pumpPageView({
    code: CODE,
    stage,
    profiles: null,
    follow: (code, bar, pin) => mountFollower({ stage, monitorHost } as never, DEFAULT_SITE, code, bar, { relay: 'ws://relay.test/' }, { show: 'pump', role: 'pump', device: DEVICE, pin, sound: false }),
  });
  document.body.append(v.el);
  const q = <T extends Element>(s: string) => v.el.querySelector(s) as T;
  const press = (label: string) => [...v.el.querySelectorAll<HTMLButtonElement>('.ip-peer-key')].find((k) => k.textContent === label)?.click();
  const signIn = async (pin = PIN) => {
    [...pin].forEach((d) => press(d));
    q<HTMLFormElement>('.ip-peer-form').requestSubmit();
    await vi.waitFor(() => expect(link().sent.some((m) => m.kind === 'hello')).toBe(true));
  };
  return { v, q, stage, signIn, words: () => q<HTMLElement>('.ip-peer-error').textContent, form: () => q<HTMLFormElement>('.ip-peer-form') };
}

let writes: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  net.links.length = 0;
  net.engine.clear();
  writes = vi.spyOn(store, 'set');
});
afterEach(() => {
  writes.mockRestore();
  document.body.replaceChildren();
  vi.useRealTimers();
});

describe('the pump page: the learner-PIN form first', () => {
  it('opens on the form, with the room code and "learner PIN" in its words; no rack, no monitor, nothing sent', () => {
    const { v, q, stage } = mount();
    expect(q<HTMLElement>('.ip-peer-form').hidden).toBe(false);
    expect(v.el.textContent).toContain(PUMP_WORDS.title);
    expect(v.el.textContent).toContain('learner PIN');
    expect(q<HTMLElement>('.pump-signed').hidden).toBe(true);
    expect(stage.hidden).toBe(true);
    expect(net.links).toHaveLength(0);
  });

  it('signs in as `pump` with show `pump`, its device key and the learner PIN; the PIN is in no address and no store', async () => {
    const { signIn } = mount();
    await signIn();
    const hello = link().sent.find((m) => m.kind === 'hello') as Extract<WireMessage, { kind: 'hello' }>;
    expect(hello).toMatchObject({ role: 'pump', show: 'pump', device: DEVICE, pin: PIN });
    expect(location.href).not.toContain(PIN);
    expect(writes.mock.calls.some((c) => String(c[1]).includes(PIN))).toBe(false);
  });

  it('shows the rack only once the host grants the tablet', async () => {
    const { q, signIn } = mount();
    await signIn();
    host().hello();
    host().rack(['syringe', 'syringe', 'drip', 'syringe']);
    expect(q<HTMLElement>('.pump-signed').hidden).toBe(true);
    host().grant(true);
    expect(q<HTMLElement>('.pump-signed').hidden).toBe(false);
    expect(q<HTMLElement>('.ip-peer-form').hidden).toBe(true);
  });
});

describe('the rack: Room setup\'s channels, the engine\'s rows', () => {
  it('builds n channels of their kinds from the room\'s setting, and says it waits while none has come', async () => {
    const { v, signIn } = mount();
    await signIn();
    host().hello();
    host().grant(true);
    expect(v.el.querySelectorAll('.pump-face')).toHaveLength(0);
    expect(v.el.textContent).toContain("Waiting for the room's pump setting");
    host().rack(['syringe', 'syringe', 'drip', 'syringe']);
    expect([...v.el.querySelectorAll<HTMLElement>('.pump-face')].map((f) => f.dataset.kind)).toEqual(['syringe', 'syringe', 'drip', 'syringe']);
    host().rack(['drip', 'drip']); // a change on Room setup reaches the tablet
    expect([...v.el.querySelectorAll<HTMLElement>('.pump-face')].map((f) => f.dataset.kind)).toEqual(['drip', 'drip']);
  });

  it('refuses a setting outside 1–8 channels or of another kind (the face keeps what it had)', async () => {
    const { v, signIn } = mount();
    await signIn();
    host().grant(true);
    host().rack(['syringe', 'drip']);
    host().rack(Array(9).fill('syringe'));
    host().rack(['syringe', 'tci' as never]);
    expect(v.el.querySelectorAll('.pump-face')).toHaveLength(2);
  });

  it("follows the engine's `drugs` rows: the programme on the face", async () => {
    const { v, signIn } = mount();
    await signIn();
    host().grant(true);
    host().rack(['syringe', 'drip', 'syringe', 'syringe']);
    engine(ROWS);
    const one = v.el.querySelector<HTMLElement>('.pump-face[data-ch="1"]') as HTMLElement;
    expect(one.querySelector('[data-face="programmed"]')?.textContent).toBe('Propofol 10 mg/mL');
    expect(one.dataset.state).toBe('running');
    const two = v.el.querySelector<HTMLElement>('.pump-face[data-ch="2"]') as HTMLElement;
    expect(two.querySelector('[data-face="programmed"]')?.textContent).toBe('Not programmed');
    expect(v.rack.channel(1)?.row()?.rateMlH).toBe(20);
  });

  it('the contents of a syringe or bag are nowhere in the page: no text, attribute or hidden node', async () => {
    const { signIn } = mount();
    await signIn();
    host().grant(true);
    host().rack(['syringe', 'drip']);
    engine(ROWS);
    const all = document.documentElement.outerHTML;
    expect(all).toContain('Propofol');
    expect(all).not.toMatch(/remifentanil|magnesium|50 µg|mcg|2 g in 100/i);
  });
});

describe('the tablet carries no monitor sound', () => {
  it('its connection line has no Sound or Silence', async () => {
    const { v, signIn } = mount();
    await signIn();
    host().grant(true);
    const words = [...v.el.querySelectorAll('button')].map((b) => b.textContent);
    expect(words.some((w) => /^Sound|Silence/.test(w ?? ''))).toBe(false);
  });
});

describe('refusals, in words', () => {
  it('a wrong learner PIN, a changed learner PIN and a host that takes no remote', async () => {
    const m = mount();
    await m.signIn('1111');
    host().grant(false, INSTRUCTOR_REASONS.wrongPin);
    expect(m.words()).toBe(PUMP_WORDS.wrongPin);
    expect(m.form().hidden).toBe(false);
    await m.signIn();
    host().grant(false, LEARNER_REASONS.pinChanged);
    expect(m.words()).toBe(PUMP_WORDS.pinChanged);
    await m.signIn();
    host().grant(false, LEARNER_REASONS.noRemote);
    expect(m.words()).toBe(PUMP_WORDS.noRemote);
  });

  it('too many tries at the relay', async () => {
    const m = mount();
    await m.signIn();
    host().relayError('too-many-tries');
    expect(m.words()).toBe(PUMP_WORDS.tooManyTries);
  });

  it("a host that answers but never signs the tablet in: said, not waited on for ever", async () => {
    const m = mount();
    vi.useFakeTimers();
    await m.signIn();
    host().hello();
    vi.advanceTimersByTime(10_001);
    expect(m.words()).toBe(PUMP_WORDS.notTaken);
    expect(m.form().hidden).toBe(false);
  });
});
