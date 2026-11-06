// @vitest-environment happy-dom
// Plan instructor-peer-role.md P7, the laptop's half: the Room page's instructor card. The PIN is not in the page until
// the button is held (pointer or keyboard); Change the PIN draws a new one and revokes the signed-in phone (P3's revoke,
// observed on a real HostSession whose phone is a real instructor ControllerSession); the row says the phone's state
// and since when; the second QR code is the phone's address and carries no PIN.
import { ControllerSession, createInProcessHub, HostSession, INSTRUCTOR_REASONS, type HostTarget } from '@pme/controller';
import { createEngine } from '@pme/engine-core';
import { afterEach, describe, expect, it } from 'vitest';
import { instructorPin, type PinStore } from '../instructor-pin.ts';
import { HIDDEN_PIN, instructorRoomCard } from './room-instructor.ts';
import { roomView } from './room.ts';

const CODE = 'AB2CD3';
const target = (): HostTarget => {
  const e = createEngine({ seed: 3 });
  return { dispatch: (c) => e.dispatch(c), snapshot: () => e.snapshot(), restore: (s) => e.restore(s), on: (f) => e.on(f), now: () => e.now(), time: () => undefined };
};
const memory = (): PinStore & { m: Map<string, string> } => {
  const m = new Map<string, string>();
  return { m, get: () => m.get('k') ?? null, set: (v) => void m.set('k', v) };
};
const closers: Array<() => void> = [];
afterEach(() => {
  for (const c of closers.splice(0)) c();
});
const until = async (ok: () => boolean, what: string) => {
  for (let i = 0; i < 200 && !ok(); i++) await new Promise((r) => setTimeout(r, 5));
  if (!ok()) throw new Error(`timed out: ${what}`);
};

/** The laptop's host with the PIN store, the card wired as main.ts wires it, and a phone that signs in. */
function laptop(o: { relay?: string | null } = {}) {
  let clock = new Date(2026, 10, 6, 13, 5).getTime();
  const draws = [4729, 4729, 815]; // the first PIN; a change that draws it again draws once more
  const pin = instructorPin(memory(), () => draws.shift() ?? 1);
  let n = 0;
  const fns = new Set<(n: number) => void>();
  const host = new HostSession({ session: CODE, target: target(), stateIntervalMs: 0, instructorPin: () => pin.get(), onInstructors: (k) => ((n = k), [...fns].forEach((f) => f(k))) });
  const hub = createInProcessHub();
  host.addTransport(hub.connect());
  closers.push(() => host.close());
  const card = instructorRoomCard({
    code: CODE, relay: o.relay === undefined ? 'ws://192.168.1.20:8642/' : o.relay, pin, host,
    instructors: () => n, onInstructors: (f) => (fns.add(f), () => void fns.delete(f)), now: () => clock,
    info: async () => ({ relay: 'pme', port: 8642, addresses: ['192.168.1.20'], serves: true }),
  });
  document.body.replaceChildren(card.el);
  const phone = (typed: string) => {
    const t = hub.connect();
    const ctl = new ControllerSession({ session: CODE, transport: t, role: 'instructor', pin: () => typed, issuedBy: 'remote' });
    closers.push(() => ctl.close());
    return ctl;
  };
  const q = (s: string) => card.el.querySelector(s) as HTMLElement;
  return { pin, host, card, phone, q, tick: (ms: number) => (clock += ms), row: () => `${q('.ip-peer-state').textContent} ${q('.ip-peer-when').textContent}` };
}

describe("the Room's instructor PIN", () => {
  it('is not in the page until the button is held, by pointer or by keyboard, and goes when it is let go', () => {
    const { card, q, pin } = laptop();
    const hold = q('.ip-peer-hold') as HTMLButtonElement;
    const shown = () => card.el.outerHTML.includes(pin.get());
    expect(pin.get()).toBe('4729');
    expect(shown()).toBe(false);
    expect(q('.ip-peer-pin-value').textContent).toBe(HIDDEN_PIN);
    hold.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, bubbles: true }));
    expect(q('.ip-peer-pin-value').textContent).toBe('4729');
    expect(hold.getAttribute('aria-pressed')).toBe('true');
    hold.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, bubbles: true }));
    expect(shown()).toBe(false);
    hold.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(shown()).toBe(true);
    hold.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
    expect(shown()).toBe(false);
    hold.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 2, bubbles: true }));
    card.leave(); // leaving the Room hides it too
    expect(shown()).toBe(false);
    hold.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 3, bubbles: true }));
    hold.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 3, bubbles: true }));
    expect(shown()).toBe(false);
  });

  it('changing it revokes the signed-in phone (the host says "the PIN was changed"), and the old PIN no longer signs in', async () => {
    const { q, pin, phone, row, tick, host } = laptop();
    const a = phone('4729');
    await until(() => a.access.state === 'granted', 'the phone signed in');
    expect(row()).toBe('Signed in since 13:05');
    tick(7 * 60_000);
    (q('.ip-peer-change') as HTMLButtonElement).click();
    expect(pin.get()).toBe('0815');
    await until(() => a.access.state === 'revoked', 'the phone revoked');
    expect(a.access).toMatchObject({ state: 'revoked', reason: INSTRUCTOR_REASONS.pinChanged });
    expect(row()).toBe('Signed out: the PIN was changed at 13:12');
    const old = phone('4729');
    await until(() => old.access.state === 'denied', 'the old PIN refused');
    expect(old.access.reason).toBe(INSTRUCTOR_REASONS.wrongPin);
    expect(host.instructorDenials()).toBe(1);
    const fresh = phone(pin.get());
    await until(() => fresh.access.state === 'granted', 'the new PIN signs in');
  });
});

describe("the instructor phone's row", () => {
  it('no phone; signed in since; another phone took over; lost when its link goes; the wrong PINs of the last minute', async () => {
    const { phone, row, tick, q, card } = laptop();
    expect(row()).toBe('No phone signed in —');
    const a = phone('4729');
    await until(() => a.access.state === 'granted', 'a signed in');
    expect(row()).toBe('Signed in since 13:05');
    tick(2 * 60_000);
    const b = phone('4729');
    await until(() => b.access.state === 'granted' && a.access.state === 'revoked', 'b took over');
    expect(a.access.reason).toBe(INSTRUCTOR_REASONS.takenOver);
    expect(row()).toBe('Signed in (another phone took over) since 13:07');
    phone('0000');
    phone('1234');
    await until(() => (card.draw(), !q('.ip-peer-denials').hidden), 'denials counted');
    expect(q('.ip-peer-denials').textContent).toBe('2 wrong PINs in the last minute');
    tick(60_000);
    b.close(); // the phone's link closes: the host forgets the grant when its transport goes
  });

  it('lost: the grant goes without a PIN change (the phone is gone); the case runs on', () => {
    let n = 1;
    let fire: (k: number) => void = () => undefined;
    const card = instructorRoomCard({
      code: CODE, relay: 'ws://h/', pin: instructorPin(memory(), () => 1), host: { instructorPinChanged: () => undefined, instructorDenials: () => 0 },
      instructors: () => n, onInstructors: (f) => ((fire = f), () => undefined), now: () => new Date(2026, 10, 6, 14, 20).getTime(),
    });
    expect(card.el.querySelector('.ip-peer-state')?.textContent).toBe('Signed in');
    fire((n = 0));
    expect(card.el.querySelector('.ip-peer-state')?.textContent).toBe('Lost: the case runs on; the phone signs in again with the PIN');
    expect(card.el.querySelector('.ip-peer-when')?.textContent).toBe('at 14:20');
  });

  it('without a relay: no PIN and no QR code, and it says why', () => {
    const { q } = laptop({ relay: null });
    expect(q('.ip-peer-pinbox').hidden).toBe(true);
    expect(q('.ip-peer-qr').hidden).toBe(true);
    expect(q('.ip-peer-norelay').hidden).toBe(false);
  });
});

describe("the phone's QR code", () => {
  it("is the phone's address ?relay#/remote?code=CODE and carries no PIN; the whole Room page carries none", async () => {
    const { card, pin } = laptop();
    card.enter();
    await until(() => !!card.el.querySelector('.ip-peer-qr .room-qr'), 'the QR drawn');
    const url = 'http://192.168.1.20:8642/?relay#/remote?code=AB2CD3';
    expect(card.el.querySelector('.ip-peer-qr .room-qr')?.getAttribute('aria-label')).toBe(`QR code of ${url}`);
    expect(card.el.querySelector('.ip-peer-url')?.textContent).toBe(url);
    expect(card.el.outerHTML).not.toContain(pin.get());

    // the Room page with the card in it: the learners' QR, the phone's QR, the table, the large view
    const room = roomView({
      code: CODE, relay: 'ws://192.168.1.20:8642/', relayLink: null, local: createInProcessHub().connect(), hostPeerId: 'host-x', learnerUrl: '/?follow=AB2CD3',
      followers: () => 0, onFollowers: () => () => undefined, info: async () => ({ relay: 'pme', port: 8642, addresses: ['192.168.1.20'], serves: true }), instructor: card,
    });
    document.body.replaceChildren(room.el);
    room.enter?.('');
    await until(() => !!room.el.querySelector('.room-join .room-qr'), 'the learners QR drawn');
    expect(room.el.contains(card.el)).toBe(true);
    expect(room.el.outerHTML).not.toContain(pin.get());
    room.leave?.();
  });
});
