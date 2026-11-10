// @vitest-environment happy-dom
// Plan learner-action-remote.md L6 ("Tests first"; §4 D1, D9; LQ1 ruled 9 November): the learner remote's page. The
// learner-PIN form comes first, in P7's form with "learner PIN" in its words; the PIN is never in the address or the
// phone's store; a wrong learner PIN, too many tries and a changed learner PIN say so in words; the page says hello as
// `learner` with its device key and the PIN (the real follower over a fake relay link the test drives); granted, the
// monitor strip shows with three tabs and the connection line; "Change" returns to #/pick. Also Room setup's learner PIN
// panel: behind press-and-hold, "New learner PIN". The tabs' 44 px is measured in a browser (mobile-learner.e2e.ts).
import { createStamper, INSTRUCTOR_REASONS, LEARNER_REASONS, type ManagedTransport, type RelayFrame, type TransportStatus, type WireBody, type WireMessage } from '@pme/controller';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const CODE = 'GP3P4G';
const PIN = '5813';
const DEVICE = 'k3x9q2m7ab4c';

type Link = { sent: WireMessage[]; msg: Set<(m: WireMessage) => void>; rf: Set<(f: RelayFrame) => void>; st: Set<(s: TransportStatus) => void>; status: TransportStatus; closed: boolean };
const net = vi.hoisted(() => ({ links: [] as unknown[] }));
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
    return { soundOn: false, viewerClock: () => Promise.resolve(clock), destroy: () => {}, setSkin: () => Promise.resolve(), setPortrait: () => {}, setHeaderNote: () => {}, setIbpScales: () => {}, disableSound: () => {}, enableSound: () => Promise.resolve(), silenceAudio: () => false };
  },
}));

const { learnerRemoteView, LEARNER_TABS, LEARNER_WORDS } = await import('./learner-remote.ts');
const { mountFollower } = await import('./follower.ts');
const { learnerPinCard, LEARNER_PIN_WORDS } = await import('./room.ts');
const { HIDDEN_PIN } = await import('./room-instructor.ts');
const { DEFAULT_SITE } = await import('../site.ts');

const link = () => net.links.at(-1) as Link;
/** The host's side of the latest link: its hello, its grant to the phone's hello `from`, the relay's error frame. */
const host = () => {
  const l = link();
  const stamp = createStamper(CODE, 'host-aaaaaa', () => Date.now());
  const send = (b: WireBody) => [...l.msg].forEach((fn) => fn(stamp(b)));
  const phoneFrom = () => [...l.sent].reverse().find((m) => m.kind === 'hello')?.from as string;
  return {
    hello: () => send({ kind: 'hello', role: 'host' }),
    grant: (granted: boolean, reason?: string) => send({ kind: 'grant', to: phoneFrom(), granted, ...(reason ? { reason } : {}) }),
    relayError: (code: 'denied' | 'too-many-tries' | 'full' | 'forbidden', message = 'refused') => [...l.rf].forEach((fn) => fn({ relay: 'error', code, message })),
  };
};

function mount() {
  history.replaceState(null, '', `/?join=${CODE}#/remote/learner`);
  const stage = document.createElement('div');
  const monitorHost = document.createElement('div');
  stage.append(monitorHost);
  document.body.append(stage);
  const v = learnerRemoteView({
    code: CODE,
    stage,
    follow: (code, bar, pin) => mountFollower({ stage, monitorHost } as never, DEFAULT_SITE, code, bar, { relay: 'ws://relay.test/' }, { show: 'learner', device: DEVICE, pin }),
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

const { store } = await import('../store.ts');
/** Every key and value this page wrote to the phone's store (store.ts, the app's only way into localStorage). */
let writes: ReturnType<typeof vi.spyOn>;
const stored = () => writes.mock.calls.map((c) => c.join('=')).join('|');

describe("the learner remote's page (L6)", () => {
  beforeEach(() => {
    net.links.length = 0;
    document.body.replaceChildren();
    writes = vi.spyOn(store, 'set');
  });
  let view: ReturnType<typeof learnerRemoteView> | null = null;
  afterEach(() => view?.follower()?.destroy());

  it("the learner-PIN form comes first, in P7's keypad with 'learner PIN' in its words; nothing follows yet", () => {
    const m = mount();
    view = m.v;
    expect(m.form().hidden).toBe(false);
    expect(m.q('h1')?.textContent).toBe(LEARNER_WORDS.title);
    expect(m.q('.lede')?.textContent).toBe(LEARNER_WORDS.lede);
    expect(m.v.el.querySelectorAll('.ip-peer-key')).toHaveLength(12);
    expect(m.q<HTMLInputElement>('input.ip-peer-code').value).toBe(CODE);
    expect(m.q('label[for]')?.textContent).toBe('Session code');
    expect([...m.v.el.querySelectorAll('label')].map((l) => l.textContent)).toContain(LEARNER_WORDS.pinLabel);
    expect(m.q<HTMLElement>('.lr-signed').hidden).toBe(true);
    expect(m.stage.hidden).toBe(true);
    expect(net.links).toHaveLength(0); // no socket, no hello before the PIN
    m.q<HTMLFormElement>('.ip-peer-form').requestSubmit(); // no PIN typed
    expect(m.words()).toBe(LEARNER_WORDS.badPin);
    expect(net.links).toHaveLength(0);
  });

  it('says hello as `learner` with its device key and the PIN; the PIN is never in the address or the phone\'s store', async () => {
    const m = mount();
    view = m.v;
    await m.signIn();
    expect(m.q<HTMLInputElement>('.ip-peer-pin').value).toBe(''); // emptied at sign-in
    expect(m.words()).toBe(LEARNER_WORDS.signingIn);
    const hellos = () => link().sent.filter((x) => x.kind === 'hello');
    expect(hellos()[0]).toMatchObject({ kind: 'hello', session: CODE, role: 'learner', show: 'learner', device: DEVICE, pin: PIN });
    host().hello(); // a (re)loaded host: the remote says hello again, with the PIN from the page's memory
    await vi.waitFor(() => expect(hellos().length).toBeGreaterThanOrEqual(2));
    for (const x of hellos()) expect(x).toMatchObject({ role: 'learner', show: 'learner', device: DEVICE, pin: PIN });
    for (const x of link().sent.filter((y) => y.kind !== 'hello')) expect(JSON.stringify(x)).not.toContain(PIN);
    expect(location.href).not.toContain(PIN);
    expect(history.state).toBeNull();
    expect(stored()).not.toContain(PIN);
  });

  it('granted: the monitor strip, the three tabs (Drugs, Infusions, Labs, empty frames) and the connection line with "Change" to #/pick', async () => {
    const m = mount();
    view = m.v;
    await m.signIn();
    host().grant(true);
    expect(m.form().hidden).toBe(true);
    expect(m.stage.hidden).toBe(false);
    expect(m.q<HTMLElement>('.lr-signed').hidden).toBe(false);
    expect(m.q('.lr-status')?.textContent).toBe(LEARNER_WORDS.signedIn(CODE));
    const tabs = [...m.v.el.querySelectorAll<HTMLButtonElement>('[role=tab]')];
    expect(tabs.map((t) => t.textContent)).toEqual(['Drugs', 'Infusions', 'Labs']);
    expect(LEARNER_TABS.map((t) => t.id)).toEqual(['drugs', 'infusions', 'labs']);
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true');
    tabs[2]?.click();
    expect(tabs[2]?.getAttribute('aria-selected')).toBe('true');
    expect(m.v.panels.labs.isConnected).toBe(true);
    expect(m.v.panels.labs.textContent).toBe(LEARNER_WORDS.empty.labs);
    // the connection line is the follower's, and its "Change" returns to the picker
    const bar = m.q<HTMLElement>('.lr-bar');
    expect(bar.hidden).toBe(false);
    expect(bar.querySelector('.status-pill')).not.toBeNull();
    expect(bar.querySelector<HTMLAnchorElement>('a.follower-change')?.getAttribute('href')).toBe('#/pick');
    expect(m.v.el.querySelectorAll('h1:not([hidden])').length).toBeGreaterThanOrEqual(1);
  });

  it('a "Change" on the form returns to #/pick before signing in', () => {
    const m = mount();
    view = m.v;
    const a = m.v.el.querySelector<HTMLAnchorElement>('.lr-change a');
    expect(a?.textContent).toBe('Change');
    expect(a?.getAttribute('href')).toBe('#/pick');
  });

  it('a wrong learner PIN, too many tries, a changed learner PIN, a full room and an older kit say so in words; the form comes back empty', async () => {
    const m = mount();
    view = m.v;
    const cases: Array<[(h: ReturnType<typeof host>) => void, string]> = [
      [(h) => h.grant(false, INSTRUCTOR_REASONS.wrongPin), LEARNER_WORDS.wrongPin],
      [(h) => h.relayError('too-many-tries', 'too many wrong PINs from this device: wait a minute'), LEARNER_WORDS.tooManyTries],
      [(h) => h.relayError('full'), LEARNER_WORDS.full],
      [(h) => h.relayError('forbidden', 'learner only from the instructor\'s computer'), LEARNER_WORDS.kitTooOld],
      [(h) => h.grant(false, LEARNER_REASONS.noRemote), LEARNER_WORDS.noRemote],
      [(h) => h.grant(false, LEARNER_REASONS.samePins), LEARNER_WORDS.samePins],
    ];
    for (const [refuse, words] of cases) {
      await m.signIn();
      const l = link();
      refuse(host());
      expect(m.words(), words).toBe(words);
      expect(m.form().hidden).toBe(false);
      expect(m.q<HTMLInputElement>('.ip-peer-pin').value).toBe('');
      expect(l.closed).toBe(true); // the follower is gone with its socket
      expect(m.v.follower()).toBeNull();
    }
    // signed in, then the learner PIN changed on the laptop (the host revokes): the form again, with the reason
    await m.signIn();
    host().grant(true);
    host().grant(false, LEARNER_REASONS.pinChanged);
    host().relayError('denied', 'the learner PIN was changed'); // the relay's close follows; the host's words stand
    expect(m.words()).toBe(LEARNER_WORDS.pinChanged);
    expect(m.stage.hidden).toBe(true);
    expect(m.q<HTMLElement>('.lr-signed').hidden).toBe(true);
    expect(stored()).not.toContain(PIN);
  });
});

describe("Room setup's learner PIN (L6, §4 D9)", () => {
  const pin = (first = '2468') => {
    let v = first;
    const fns = new Set<(p: string) => void>();
    return { get: () => v, change: vi.fn(() => ((v = v === '2468' ? '1357' : '2468'), fns.forEach((f) => f(v)), v)), onChange: (f: (p: string) => void) => (fns.add(f), () => void fns.delete(f)) };
  };
  const card = (o: { remotes?: number; denials?: number; relay?: string | null } = {}) => {
    const p = pin();
    const c = learnerPinCard({ pin: p, host: { learnerRemotes: () => o.remotes ?? 0, learnerDenials: () => o.denials ?? 0 }, relay: o.relay === undefined ? 'ws://relay.test/' : o.relay });
    document.body.replaceChildren(c.el);
    return { c, p, hold: c.el.querySelector('.ip-peer-hold') as HTMLButtonElement, value: c.el.querySelector('.ip-peer-pin-value') as HTMLElement };
  };

  it('the learner PIN is not in the page until held; held, it shows; released, it goes', () => {
    const { c, hold, value } = card();
    expect(c.el.textContent).not.toContain('2468');
    expect(value.textContent).toBe(HIDDEN_PIN);
    expect(hold.textContent).toBe('Hold to show the learner PIN');
    hold.dispatchEvent(new Event('pointerdown'));
    expect(value.textContent).toBe('2468');
    expect(value.getAttribute('aria-label')).toBe('Learner PIN 2 4 6 8');
    hold.dispatchEvent(new Event('pointerup'));
    expect(c.el.textContent).not.toContain('2468');
  });

  it('"New learner PIN" draws a new one (main.ts tells the host, which revokes every learner remote)', () => {
    const { c, p, hold, value } = card();
    const btn = [...c.el.querySelectorAll('button')].find((b) => b.textContent === LEARNER_PIN_WORDS.change) as HTMLButtonElement;
    btn.click();
    expect(p.change).toHaveBeenCalledOnce();
    expect(c.el.textContent).not.toContain('1357');
    hold.dispatchEvent(new Event('pointerdown'));
    expect(value.textContent).toBe('1357');
  });

  it('says how many learner remotes are signed in and the wrong learner PINs of the last minute; no relay, no PIN', () => {
    expect(card().c.el.querySelector('.ip-peer-state')?.textContent).toBe(LEARNER_PIN_WORDS.none);
    const two = card({ remotes: 2, denials: 3 }).c.el;
    expect(two.querySelector('.ip-peer-state')?.textContent).toBe('2 learner remotes signed in');
    expect(two.querySelector('.ip-peer-denials')?.textContent).toBe('3 wrong learner PINs in the last minute');
    const none = card({ relay: null }).c.el;
    expect((none.querySelector('.ip-peer-pinbox') as HTMLElement).hidden).toBe(true);
    expect((none.querySelector('.ip-peer-norelay') as HTMLElement).hidden).toBe(false);
  });
});
