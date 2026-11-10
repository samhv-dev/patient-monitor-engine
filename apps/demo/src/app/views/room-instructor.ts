// The Room page's instructor phone (plan instructor-peer-role.md P7, §1, §3, §5): one card, self-contained so that the
// Room set-up page (R7) can move it into its `#room-instructor` slot with no change here. It holds:
// - the instructor phone's row: no phone, signed in since hh:mm (a second phone with the PIN takes over: option B),
//   lost at hh:mm (its socket left; the case runs on, Q5), or signed out by a PIN change; and the host's count of wrong
//   PINs in the last minute (no host lockout: the relay limits each phone's address);
// - the PIN behind press-and-hold (Q2): while not held the digits are not in the page at all, so a laptop mirrored to
//   the projector never shows them; Change the PIN draws a new one and the host revokes the phone at once;
// - a second QR code, the phone's address `?relay#/remote?code=CODE` (classroom.ts instructorUrl), which carries no
//   PIN, folded away so that the learners scan the Join code.
// The times are this computer's wall clock (hh:mm), as the Room's "Opened from this page" line prints them.
import type { InstructorPin } from '../instructor-pin.ts';
import { instructorTarget, relayInfo, type RelayInfo } from '../classroom.ts';
import { qrSvg } from '../qr.ts';
import { button, h, setText } from '../ui.ts';

export interface InstructorRoomDeps {
  code: string;
  /** The relay address, or null: no phone can sign in. */
  relay: string | null;
  pin: InstructorPin;
  /** The host's half: a PIN change revokes the phone; the wrong PINs it counted in the last minute. */
  host: { instructorPinChanged(): void; instructorDenials(): number };
  /** Instructor phones granted now (0 or 1), and every grant or revocation (a takeover calls it with 1 again). */
  instructors(): number;
  onInstructors(fn: (n: number) => void): () => void;
  now?: () => number;
  /** For tests: the relay's description (default: ask the relay). */
  info?: (relay: string) => Promise<RelayInfo | null>;
}

export interface InstructorRoomCard {
  el: HTMLElement;
  draw(): void;
  enter(): void;
  leave(): void;
}

type Row = { state: 'none' } | { state: 'in'; since: number; tookOver: boolean } | { state: 'lost'; at: number } | { state: 'changed'; at: number };

export const HIDDEN_PIN = '••••';

const hhmm = (t: number) => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

/** The row's words (plan P7: the instructor phone's state and since when). */
export function rowWords(r: Row): { level: 'stable' | 'weak' | 'down'; state: string; when: string } {
  if (r.state === 'in') return { level: 'stable', state: r.tookOver ? 'Signed in (another phone took over)' : 'Signed in', when: `since ${hhmm(r.since)}` };
  if (r.state === 'lost') return { level: 'down', state: 'Lost: the case runs on; the phone signs in again with the PIN', when: `at ${hhmm(r.at)}` };
  if (r.state === 'changed') return { level: 'weak', state: 'Signed out: the PIN was changed', when: `at ${hhmm(r.at)}` };
  return { level: 'weak', state: 'No phone signed in', when: '—' };
}

/**
 * P7's press-and-hold (Q2), for a PIN of this computer: while not held the digits are not in the page at all, so a
 * laptop mirrored to the projector never shows them. L6 shows the learner PIN with the same control (views/room.ts).
 * `what`: the PIN's name in a sentence ("PIN", "learner PIN").
 */
export function pinHold(o: { get(): string; what: string }): { value: HTMLElement; hold: HTMLButtonElement; reveal(on: boolean): void; held(): boolean } {
  const name = o.what.charAt(0).toUpperCase() + o.what.slice(1);
  const value = h('span', { class: 'ip-peer-pin-value', role: 'status', 'aria-label': `${name} hidden` }, HIDDEN_PIN);
  let held = false;
  const reveal = (on: boolean) => {
    held = on;
    value.textContent = on ? o.get() : HIDDEN_PIN; // never in the page while not held
    value.setAttribute('aria-label', on ? `${name} ${o.get().split('').join(' ')}` : `${name} hidden`);
    hold.setAttribute('aria-pressed', String(on));
  };
  const key = (e: Event) => (e as KeyboardEvent).key === ' ' || (e as KeyboardEvent).key === 'Enter';
  const hold = h('button', {
    type: 'button', class: 'btn ip-peer-hold', 'aria-pressed': 'false', title: `Press and hold to show the ${o.what}`,
    onpointerdown: (e: Event) => {
      try {
        hold.setPointerCapture((e as PointerEvent).pointerId); // the release is heard even off the button
      } catch {
        /* no capture: pointerup / pointercancel still hide it */
      }
      reveal(true);
    },
    onpointerleave: () => reveal(false),
    onpointerup: () => reveal(false), onpointercancel: () => reveal(false), onlostpointercapture: () => reveal(false),
    onkeydown: (e: Event) => void (key(e) && (e.preventDefault(), !(e as KeyboardEvent).repeat && reveal(true))),
    onkeyup: (e: Event) => void (key(e) && reveal(false)),
    onblur: () => reveal(false),
    oncontextmenu: (e: Event) => e.preventDefault(), // a long press on a touch screen
  }, `Hold to show the ${o.what}`);
  return { value, hold, reveal, held: () => held };
}

export function instructorRoomCard(d: InstructorRoomDeps): InstructorRoomCard {
  const now = d.now ?? Date.now;
  let row: Row = d.instructors() > 0 ? { state: 'in', since: now(), tookOver: false } : { state: 'none' };
  let changing = false; // the revocation our own Change the PIN causes is "signed out", not "lost"

  // ------------------------------------------------------------------------------------------------------- the row
  const dot = h('i', { class: 'room-dot', role: 'img' });
  const state = h('span', { class: 'ip-peer-state' });
  const when = h('span', { class: 'ip-peer-when' });
  const denials = h('p', { class: 'hint ip-peer-denials', role: 'status' });
  const rowEl = h('div', { class: 'ip-peer-row', role: 'status', 'aria-live': 'polite' }, dot, h('b', {}, 'Instructor phone'), state, when);

  // --------------------------------------------------------------------------------------------------- the PIN
  const { value, hold, reveal, held } = pinHold({ get: () => d.pin.get(), what: 'PIN' });
  const change = button('Change the PIN', () => {
    changing = true;
    d.pin.change();
    d.host.instructorPinChanged();
    changing = false;
    if (held()) reveal(true);
    draw();
  }, 'ip-peer-change');
  const pinBox = h('div', { class: 'ip-peer-pinbox' }, h('span', { class: 'ip-peer-pin-label' }, 'PIN'), value, hold, change);

  // ------------------------------------------------------------------------------------------- the phone's QR code
  const qr = h('div', { class: 'ip-peer-qr-slot' });
  const addr = h('code', { class: 'ip-peer-url' });
  const why = h('p', { class: 'hint ip-peer-why' });
  const qrBox = h('details', { class: 'ip-peer-qr' }, h('summary', {}, "The phone's QR code"), qr, addr, why);
  let asked = false;
  const findAddress = async () => {
    if (!d.relay) return;
    asked = true;
    const t = instructorTarget(d.code, location, d.relay, await (d.info ?? relayInfo)(d.relay));
    if (!t.ok) {
      asked = false; // ask again on the next visit (the relay may have started)
      qr.replaceChildren();
      setText(addr, '');
      return setText(why, t.why);
    }
    qr.replaceChildren(h('div', { class: 'room-qr', role: 'img', 'aria-label': `QR code of ${t.url}` }, qrSvg(t.url, 160)));
    setText(addr, t.url);
    setText(why, 'The phone opens this address, then enters the PIN. The address carries no PIN.');
  };

  const noRelay = h('p', { class: 'hint ip-peer-norelay' }, 'No relay: an instructor phone signs in through the classroom (Start Classroom).');
  const el = h('section', { class: 'room-card ip-peer-room', 'aria-labelledby': 'ip-peer-h' },
    h('h2', { id: 'ip-peer-h' }, "Instructor's phone"),
    rowEl, denials, pinBox, qrBox,
    h('p', { class: 'hint' }, 'One phone at a time: another phone that enters the PIN takes over, and the first is told. This computer always commands.'),
    noRelay);

  function draw(): void {
    const w = rowWords(row);
    dot.className = `room-dot ${w.level}`;
    dot.setAttribute('aria-label', w.level === 'stable' ? 'signed in' : w.level === 'down' ? 'lost' : 'not signed in');
    setText(state, w.state);
    setText(when, w.when);
    const n = d.host.instructorDenials();
    setText(denials, n ? `${n} wrong PIN${n === 1 ? '' : 's'} in the last minute` : '');
    denials.hidden = !n;
    noRelay.hidden = !!d.relay;
    pinBox.hidden = qrBox.hidden = !d.relay;
  }

  d.onInstructors((n) => {
    const t = now();
    if (n > 0) row = { state: 'in', since: t, tookOver: row.state === 'in' };
    else if (row.state === 'in') row = changing ? { state: 'changed', at: t } : { state: 'lost', at: t };
    draw();
  });
  draw();
  return {
    el,
    draw,
    enter() {
      if (!asked) void findAddress();
      draw();
    },
    leave: () => reveal(false),
  };
}
