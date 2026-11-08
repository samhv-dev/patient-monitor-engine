// @vitest-environment happy-dom
// Plan instructor-peer-role.md P7: the instructor phone's way in. With a relay the Remote is a PIN form with a numeric
// keypad that joins as `instructor`; the PIN is never in the address or the history and the field is emptied at
// sign-in and on leave; each state has its words (signing in, signed in, wrong PIN, too many tries, taken over, the PIN
// changed, the computer restarted, a kit that does not answer after 10 s). The relay is a fake link the test drives
// with the host's own frames.
import { createStamper, INSTRUCTOR_REASONS, type ManagedTransport, type RelayFrame, type TransportStatus, type WireBody, type WireMessage } from '@pme/controller';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SITE } from '../site.ts';
import { GIVE_UP_MS, PHONE_WORDS, remoteView } from './remote.ts';

const CODE = 'AB2CD3';
const PIN = '4729';

/** A relay link the test drives: what the phone sends is kept; the host's frames and the relay's are delivered. */
function fakeRelay() {
  let status: TransportStatus = 'connecting';
  const msg = new Set<(m: WireMessage) => void>();
  const st = new Set<(s: TransportStatus) => void>();
  const pres = new Set<(p: { hostOnline: boolean }) => void>();
  const rf = new Set<(f: RelayFrame) => void>();
  const sent: WireMessage[] = [];
  const t: ManagedTransport & { sent: WireMessage[]; setStatus(s: TransportStatus): void; deliver(m: WireMessage): void; frame(f: RelayFrame): void; presence(on: boolean): void } = {
    kind: 'websocket',
    get status() {
      return status;
    },
    rejected: 0,
    sent,
    send: (m: WireMessage) => void (status === 'open' && sent.push(m)),
    onMessage: (fn: (m: WireMessage) => void) => (msg.add(fn), () => void msg.delete(fn)),
    onStatus: (fn: (s: TransportStatus) => void) => (st.add(fn), fn(status), () => void st.delete(fn)),
    onPresence: (fn: (p: { hostOnline: boolean }) => void) => (pres.add(fn), () => void pres.delete(fn)),
    onRelayFrame: (fn: (f: RelayFrame) => void) => (rf.add(fn), () => void rf.delete(fn)),
    close: () => t.setStatus('closed'),
    setStatus(s: TransportStatus) {
      if (status === 'closed') return; // a closed link stays closed, as the real one does
      status = s;
      for (const fn of [...st]) fn(s);
    },
    deliver: (m: WireMessage) => [...msg].forEach((fn) => fn(m)),
    frame: (f: RelayFrame) => {
      [...rf].forEach((fn) => fn(f));
      if (f.relay === 'error' && (f.code === 'denied' || f.code === 'too-many-tries')) t.setStatus('error');
    },
    presence: (on: boolean) => [...pres].forEach((fn) => fn({ hostOnline: on })),
  } as unknown as ManagedTransport & { sent: WireMessage[]; setStatus(s: TransportStatus): void; deliver(m: WireMessage): void; frame(f: RelayFrame): void; presence(on: boolean): void };
  return t;
}

type Relay = ReturnType<typeof fakeRelay>;
let links: Relay[] = [];
const bar = () => document.body.querySelector('.bar-test') as HTMLElement;

function mount(hash = `#/remote?code=${CODE}`) {
  history.replaceState(null, '', `/?relay${hash}`);
  const b = document.createElement('div');
  b.className = 'bar-test';
  b.hidden = true;
  document.body.append(b);
  const v = remoteView({ site: DEFAULT_SITE, hostless: true, bar: b, connect: () => (links.push(fakeRelay()), links.at(-1) as Relay) });
  document.body.append(v.el);
  const q = <T extends Element>(s: string) => v.el.querySelector(s) as T;
  const pinField = () => q<HTMLInputElement>('.ip-peer-pin');
  const keys = () => [...v.el.querySelectorAll<HTMLButtonElement>('.ip-peer-key')];
  const press = (label: string) => keys().find((k) => k.textContent === label || k.getAttribute('aria-label') === label)?.click();
  const typePin = (pin: string) => [...pin].forEach((d) => press(d));
  const submit = () => (q<HTMLFormElement>('.ip-peer-form').requestSubmit(), links.at(-1) as Relay);
  return { v, q, pinField, keys, press, typePin, submit, words: () => q<HTMLElement>('.ip-peer-error').textContent, status: () => q<HTMLElement>('.ip-peer-status').textContent };
}

/** The host's side of the link: its hello, its grant to the phone's current `from`, a state event. */
const host = (r: Relay, id = 'host-h1') => {
  const stamp = createStamper(CODE, id);
  const send = (b: WireBody) => r.deliver(stamp(b));
  const phoneFrom = () => [...r.sent].reverse().find((m) => m.kind === 'hello')?.from as string;
  return {
    hello: () => send({ kind: 'hello', role: 'host' }),
    grant: (granted: boolean, reason?: string) => send({ kind: 'grant', to: phoneFrom(), granted, ...(reason ? { reason } : {}) }),
    clock: (t: number) => send({ kind: 'event', body: [{ type: 'state', t, tick: Math.round(t / 0.02), mode: 'manual', values: {}, control: {} } as never] }),
  };
};
/** The h1s a reader sees: none of their ancestors hidden (the audit's "one h1 visible", research/41 row 62). */
const visibleH1s = (el: Element) => [...el.querySelectorAll('h1')].filter((x) => !x.closest('[hidden]')).map((x) => x.textContent);
const hellos = (r: Relay) => r.sent.filter((m): m is Extract<WireMessage, { kind: 'hello' }> => m.kind === 'hello');

beforeEach(() => {
  document.body.replaceChildren();
  links = [];
});
afterEach(() => {
  vi.useRealTimers();
  for (const l of links) l.close();
});

describe("the instructor phone's PIN form", () => {
  it('a numeric keypad fills a PIN field that has no name; the keypad deletes and stops at 8 digits', () => {
    const f = mount();
    expect(f.pinField().getAttribute('name')).toBeNull();
    expect(f.pinField().type).toBe('password');
    expect(f.pinField().getAttribute('inputmode')).toBe('numeric');
    expect(f.keys().map((k) => k.textContent)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'Sign in']);
    f.typePin('123456789');
    expect(f.pinField().value).toBe('12345678');
    f.press('Delete the last digit');
    expect(f.pinField().value).toBe('1234567');
    // every key is labelled by its text, the delete key by its aria-label
    for (const k of f.keys()) expect((k.getAttribute('aria-label') ?? k.textContent ?? '').trim()).not.toBe('');
    expect(f.q('label[for]')?.textContent).toBe('Session code');
  });

  it('never puts the PIN in the address or the history, and empties the field at sign-in', () => {
    const f = mount();
    const before = history.length;
    f.typePin(PIN);
    const r = f.submit();
    expect(f.pinField().value).toBe('');
    expect(location.href).not.toContain(PIN);
    expect(location.href).toContain(`#/remote?code=${CODE}`);
    expect(JSON.stringify(history.state)).not.toContain(PIN);
    expect(history.length).toBe(before); // replaced, never pushed
    // the PIN goes on the relay link only, in the instructor hello
    r.setStatus('open');
    expect(hellos(r)).toMatchObject([{ role: 'instructor', pin: PIN }]);
    expect(f.words()).toBe(PHONE_WORDS.signingIn);
  });

  it('clears the PIN field when the page is left (another route, the tab hidden or closed)', () => {
    const f = mount();
    f.typePin(PIN);
    f.v.leave?.();
    expect(f.pinField().value).toBe('');
    f.typePin(PIN);
    dispatchEvent(new Event('pagehide'));
    expect(f.pinField().value).toBe('');
  });

  it('a bad code or a short PIN is refused before anything is sent', () => {
    const f = mount('#/remote');
    f.typePin(PIN);
    f.submit();
    expect(links).toHaveLength(0);
    expect(f.words()).toBe(PHONE_WORDS.badCode);
    (f.q('.ip-peer-code') as HTMLInputElement).value = CODE;
    f.typePin('12');
    f.submit();
    expect(links).toHaveLength(0);
    expect(f.words()).toBe(PHONE_WORDS.badPin);
  });
});

describe('the states and their words', () => {
  const signIn = () => {
    const f = mount();
    f.typePin(PIN);
    const r = f.submit();
    r.setStatus('open');
    return { f, r, h: host(r) };
  };

  it('signed in: the grant mounts the panel and the status says so; a refusal before it keeps the form', () => {
    const { f, r, h } = signIn();
    h.hello();
    expect(f.q('.panel')).toBeNull();
    h.grant(true);
    expect(f.q<HTMLElement>('.ip-peer-form').hidden).toBe(true);
    expect(f.q('.panel')).not.toBeNull();
    expect(f.status()).toBe(PHONE_WORDS.signedIn(CODE));
    expect(bar().hidden).toBe(false);
    expect(r.status).toBe('open');
  });

  it('one visible h1 before and after sign-in: the heading stays when the form hides (research/41 row 62)', () => {
    const { f, h } = signIn();
    expect(visibleH1s(f.v.el)).toEqual(['Instructor remote']);
    h.hello();
    h.grant(true);
    expect(f.q<HTMLElement>('.ip-peer-form').hidden).toBe(true);
    expect(visibleH1s(f.v.el)).toEqual(['Instructor remote']);
  });

  it('wrong PIN: the form again, its words, the field empty and focused, the link closed', () => {
    const { f, r, h } = signIn();
    h.hello();
    h.grant(false, INSTRUCTOR_REASONS.wrongPin);
    r.frame({ relay: 'error', code: 'denied', message: INSTRUCTOR_REASONS.wrongPin });
    expect(f.q<HTMLElement>('.ip-peer-form').hidden).toBe(false);
    expect(f.words()).toBe(PHONE_WORDS.wrongPin);
    expect(f.pinField().value).toBe('');
    expect(document.activeElement).toBe(f.pinField());
    expect(r.status).toBe('closed');
    // and the next try is a new link with the new PIN
    f.typePin('1111');
    const r2 = f.submit();
    expect(r2).not.toBe(r);
    r2.setStatus('open');
    expect(hellos(r2)).toMatchObject([{ role: 'instructor', pin: '1111' }]);
  });

  it('too many tries: the relay refuses the hello', () => {
    const { f, r } = signIn();
    r.frame({ relay: 'error', code: 'too-many-tries', message: 'too many wrong PINs from this device: wait a minute' });
    expect(f.words()).toBe(PHONE_WORDS.tooManyTries);
  });

  it('taken over: another phone entered the PIN; the words carry the case clock', () => {
    const { f, h } = signIn();
    h.hello();
    h.grant(true);
    h.clock(125);
    h.grant(false, INSTRUCTOR_REASONS.takenOver);
    expect(f.q<HTMLElement>('.ip-peer-form').hidden).toBe(false);
    expect(f.q('.panel')).toBeNull();
    expect(f.words()).toBe(PHONE_WORDS.takenOver('02:05'));
    expect(f.words()).toBe('Taken over by another phone at 02:05. Enter the PIN to sign in again.');
    expect(bar().hidden).toBe(true);
  });

  it('the PIN changed on the laptop, and a laptop that takes no phone', () => {
    const a = signIn();
    a.h.hello();
    a.h.grant(true);
    a.h.grant(false, INSTRUCTOR_REASONS.pinChanged);
    expect(a.f.words()).toBe(PHONE_WORDS.pinChanged);
    document.body.replaceChildren();
    const b = signIn();
    b.h.hello();
    b.h.grant(false, INSTRUCTOR_REASONS.noPhone);
    expect(b.f.words()).toBe(PHONE_WORDS.noPhone);
  });

  it('computer restarted: a host hello from a new id says so, the phone signs in again by itself and stays mounted', () => {
    const { f, r, h } = signIn();
    h.hello();
    h.grant(true);
    h.clock(61);
    const said = hellos(r).length;
    const reloaded = host(r, 'host-h2');
    reloaded.hello();
    const notice = f.q<HTMLElement>('.ip-peer-notice');
    expect(notice.hidden).toBe(false);
    expect(notice.textContent).toBe(PHONE_WORDS.restarted('01:01'));
    expect(f.status()).toBe(PHONE_WORDS.signingInAgain);
    expect(hellos(r).slice(said)).toMatchObject([{ role: 'instructor', pin: PIN }]); // the PIN it holds, said again
    expect(f.q('.panel')).not.toBeNull();
    reloaded.grant(true);
    expect(f.status()).toBe(PHONE_WORDS.signedIn(CODE));
  });

  it('kit too old: no answer to the instructor hello in 10 s; or no laptop in the session; or no relay reached', () => {
    vi.useFakeTimers();
    const a = signIn();
    a.r.presence(true); // the relay says the laptop is in the room, and nothing answers the hello (an rc.4 kit)
    vi.advanceTimersByTime(GIVE_UP_MS - 1);
    expect(a.f.words()).toBe(PHONE_WORDS.signingIn);
    vi.advanceTimersByTime(1);
    expect(a.f.words()).toBe(PHONE_WORDS.kitTooOld);
    expect(a.f.words()).toBe('This classroom kit does not take an instructor phone. Use the kit from the same release as the app.');
    expect(a.r.status).toBe('closed');

    document.body.replaceChildren();
    const b = signIn();
    vi.advanceTimersByTime(GIVE_UP_MS);
    expect(b.f.words()).toBe(PHONE_WORDS.noHost);

    document.body.replaceChildren();
    const c = mount();
    c.typePin(PIN);
    c.submit(); // the link never opens
    vi.advanceTimersByTime(GIVE_UP_MS);
    expect(c.words()).toBe(PHONE_WORDS.unreachable);
  });
});

describe('without a relay', () => {
  it('the Remote is the same-browser code form, with no PIN field', () => {
    history.replaceState(null, '', `/#/remote`);
    const v = remoteView({ site: DEFAULT_SITE, hostless: true, bar: document.createElement('div') });
    expect(v.el.querySelector('.ip-peer-pin, .ip-peer-keypad')).toBeNull();
    expect(v.el.querySelector('h1')?.textContent).toBe('Instructor remote');
  });

  it('the same-browser Remote keeps one visible h1 once connected (its code form hides; research/41 row 62)', async () => {
    history.replaceState(null, '', `/#/remote?code=${CODE}`);
    const v = remoteView({ site: DEFAULT_SITE, hostless: true, bar: document.createElement('div') });
    document.body.append(v.el);
    expect(visibleH1s(v.el)).toEqual(['Instructor remote']);
    await Promise.resolve(); // the code in the address connects in a microtask
    expect(v.el.querySelector<HTMLElement>('form')?.hidden).toBe(true);
    expect(v.el.querySelector('.status-pill')).not.toBeNull();
    expect(visibleH1s(v.el)).toEqual(['Instructor remote']);
  });
});
