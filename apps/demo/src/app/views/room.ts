// Room setup (E125, owner's mockup f2-room; Room plan R7, docs/plans/room-and-instruments.md §7, Q2 ruled 5 November:
// today's Room page grown). Top right, the connection status (room-status.ts: Stable / Weak / Disconnected, from the
// relay socket and the relay's ping table, R2; Q9's thresholds on the legend). Left, Join: the QR code (the app's only
// one), the code, and the two ways in — scan, or type the address the relay serves. Right, Connected now: this window,
// the windows of this browser (their hellos), and every device the relay lists, with what it shows, its ping and when
// it was last heard; a device's name can be edited and is kept under its key (room-layout.ts, Q10), and a remembered
// device that is not here is a grey row "expected, not connected". Under them, mock-up m5's host side with R4's card
// component: the openers for this computer ("New window" per instrument; the Ventilator in this window), which window
// shows each, the room code with "New room code" (Q3: the code lives until that press), "Forget the room", and the
// remembered layout ("Last time in this room: … Reopen that layout"). `#room-instructor` is P7's slot (its PIN panel),
// left empty here. L6 (plan learner-action-remote.md §4 D9): `#room-learner` beside it, the learner PIN's panel
// (learnerPinCard: the learner remotes signed in, the PIN behind P7's press-and-hold, "New learner PIN").
// R8d: the Ventilator card opens the cockpit in a window of its own too ("New window": `vent-hamilton.html?link=<code>`,
// over BroadcastChannel, no PIN, §4 D9), beside "Open here"; the table lists the ventilator's screens — that window and a
// tablet signed in with the PIN — as "Ventilator · driving" or "handed over" (the desk's own state, views/vent.ts).
// Post-demo (4 November): "Show large" (or Q on the Room) puts the same QR, drawn again as vector at the size of the
// screen, with the code, the address and the live count beneath, for a hall to scan from the back; Escape or the same
// control returns. At 1920×1080 the card's QR is 220 px (a fifth of the height): scannable from the front rows only.
import { isTyping } from '@pme/controller';
import { newSessionCode, type ManagedTransport, type RelayDevice, type WireMessage } from '@pme/controller';
import { hashOf, qrTarget, relayInfo, ventWindowUrl, type RelayInfo } from '../classroom.ts';
import { qrSvg } from '../qr.ts';
import { keepRoomCode } from '../room-code.ts';
import { forgetRoom, lastTime, noteDevices, readLayout, readWindows, rename, windowsOf, writeLayout, writeWindows, type Windows } from '../room-layout.ts';
import { deviceRows, HEARTBEAT_MS, PeerLog, roomStatus, WEAK_PING_MS, type DeviceRow, type PeerSeen, type RelayState, type RoomLevel, type VentScreens } from '../room-status.ts';
import { hrefOf } from '../router.ts';
import type { View } from '../shell.ts';
import { DEFIB_CHOICES, defibDefaults, pacerDefaults } from '../site.ts';
import { store as appStore } from '../store.ts';
import { button, h, select, setText } from '../ui.ts';
import { instrumentCard, PICKER_WORDS, type CardShow } from './join.ts';
import type { InstructorPin } from '../instructor-pin.ts';
import { pinHold, type InstructorRoomCard } from './room-instructor.ts';

type Store = { get(k: string): string | null; set(k: string, v: string): void };

export interface RoomDeps {
  code: string;
  /** The relay address (`?relay`), or null: no phones. */
  relay: string | null;
  /** The session's transport to the relay (its status and the phones' hellos), or null. */
  relayLink: ManagedTransport | null;
  /** The session's same-browser channel (a learner monitor window, a Remote window). */
  local: ManagedTransport;
  /** This page's own peer id (its messages are not a device). */
  hostPeerId: string;
  /** The relay's count of devices following, and its changes (with its device table, R2: null from an older relay). */
  followers(): number;
  onFollowers(fn: (n: number, devices: RelayDevice[] | null) => void): () => void;
  /** The relay's device table now (R2), or null (an older relay, none yet). */
  devices?: () => RelayDevice[] | null;
  /** The address of a second-screen learner monitor that follows this session (`#/monitor`; the patient monitor's is its `#/monitor/wide`). */
  learnerUrl: string;
  now?: () => number;
  /** For tests: the relay's description (default: ask the relay). */
  info?: (relay: string) => Promise<RelayInfo | null>;
  /** For tests: where the remembered layout is kept (default: this browser's store). */
  store?: Store;
  /** For tests: a window opener (default: `window.open`). */
  open?: (url: string) => void;
  /** For tests: what "New room code" does once confirmed (default: store it and reload this page under it). */
  renew?: (code: string) => void;
  /** The instructor phone's card (room-instructor.ts, plan instructor-peer-role.md P7), in the `#room-instructor` slot. */
  instructor?: InstructorRoomCard;
  /** The room's defibrillator model (R5b): the site's choice, and the session's hand-over of a new one (it saves it and
   *  sends it to the patient's engine). Absent: no card. */
  defib?: { model(): string | null; choose(model: string | null): void };
  /** R8d: the ventilator's own screens and whether each drives (views/vent.ts `ventScreens`). Absent: no rows. */
  vent?: () => VentScreens;
  /** L6: the learner PIN and the host's count of learner remotes, for the panel beside the instructor's card. Absent: no panel. */
  learner?: LearnerPinDeps;
}

/** L6 (plan learner-action-remote.md §4 D9, LQ1 ruled 9 November): the learner PIN's panel's words. */
export const LEARNER_PIN_WORDS = {
  heading: 'Learner remotes',
  none: 'No learner remote signed in',
  some: (n: number) => `${n} learner remote${n === 1 ? '' : 's'} signed in`,
  denials: (n: number) => `${n} wrong learner PIN${n === 1 ? '' : 's'} in the last minute`,
  label: 'Learner PIN',
  change: 'New learner PIN',
  hint: "A learner picks Learner remote on the room's QR page and types this PIN. It is not the instructor's PIN and opens the learner remote only. A new learner PIN signs every learner remote out.",
  noRelay: 'No relay: a learner remote signs in through the classroom (Start Classroom).',
} as const;

export interface LearnerPinDeps {
  /** The learner PIN (instructor-pin.ts learnerPin): its `change()` draws a new one; main.ts tells the host, which revokes every learner remote. */
  pin: InstructorPin;
  /** The host's half (L4): wrong learner PINs in the last minute, and the learner remotes granted now. */
  host: { learnerDenials(): number; learnerRemotes(): number };
  /** The relay address, or null: no learner remote can sign in. */
  relay: string | null;
}

/**
 * L6: the learner PIN beside the instructor's (§4 D9): how many learner remotes are signed in, the wrong learner PINs in
 * the last minute, the PIN behind P7's press-and-hold (not in the page until held) and "New learner PIN".
 */
export function learnerPinCard(d: LearnerPinDeps): { el: HTMLElement; draw(): void; leave(): void } {
  const W = LEARNER_PIN_WORDS;
  const dot = h('i', { class: 'room-dot', role: 'img' });
  const state = h('span', { class: 'ip-peer-state' });
  const denials = h('p', { class: 'hint ip-peer-denials', role: 'status' });
  const { value, hold, reveal, held } = pinHold({ get: () => d.pin.get(), what: 'learner PIN' });
  const change = button(W.change, () => {
    d.pin.change();
    if (held()) reveal(true);
    draw();
  }, 'ip-peer-change lr-pin-change');
  const pinBox = h('div', { class: 'ip-peer-pinbox' }, h('span', { class: 'ip-peer-pin-label' }, W.label), value, hold, change);
  const noRelay = h('p', { class: 'hint ip-peer-norelay' }, W.noRelay);
  const el = h('section', { class: 'room-card ip-peer-room lr-pin-room', 'aria-labelledby': 'lr-pin-h' },
    h('h2', { id: 'lr-pin-h' }, W.heading),
    h('div', { class: 'ip-peer-row', role: 'status', 'aria-live': 'polite' }, dot, h('b', {}, W.heading), state),
    denials, pinBox, h('p', { class: 'hint' }, W.hint), noRelay);
  function draw(): void {
    const n = d.host.learnerRemotes();
    dot.className = `room-dot ${n ? 'stable' : 'weak'}`;
    dot.setAttribute('aria-label', n ? 'signed in' : 'not signed in');
    setText(state, n ? W.some(n) : W.none);
    const k = d.host.learnerDenials();
    setText(denials, k ? W.denials(k) : '');
    denials.hidden = !k;
    noRelay.hidden = !!d.relay;
    pinBox.hidden = !d.relay;
  }
  draw();
  return { el, draw, leave: () => reveal(false) };
}

export interface RoomView extends View {
  /** "N devices" for the rail (this window, the windows heard on this computer, the phones on the relay). */
  devices(): number;
  /** Redraw the status box and the table now. */
  draw(): void;
}

const LEVEL_TEXT: Record<RoomLevel | 'absent', string> = { stable: 'stable', weak: 'weak', down: 'disconnected', absent: 'expected, not connected' };

/** The legend's line under the table (Q9 ruled 5 November: the numbers are an engineering choice, and say so). */
export const ROOM_LEGEND = `Weak: a ping over ${WEAK_PING_MS} ms, or a device that missed one ${HEARTBEAT_MS / 1000} s heartbeat (an engineering choice, not a standard). The ping is the relay's round trip to the device: in the kit, the Wi-Fi.`;

/** The host side of mock-up m5, on R4's cards: what each card says on this computer. */
const OPENERS: Array<{ show: CardShow; title?: string; text: string; foot: string }> = [
  { show: 'learner', text: 'A window that follows the patient monitor, as the phones do.', foot: 'A second screen or the projector' },
  { show: 'monitor', text: "ECG, pressures, SpO₂, capnography and temperature in the room's monitor style, the whole screen.", foot: 'A second screen or the projector' },
  { show: 'defib', title: 'Defibrillator', text: "The room's defibrillator: energy, charge, shock and sync, with the patient's rhythm.", foot: 'A second screen or a tablet' },
  { show: 'vent', text: 'Modes, settings, pressure and flow loops, with the lung mechanics of the loaded patient.', foot: 'The Ventilator view, or a window of its own' },
  { show: 'depth', text: 'The engine simulates the EEG and reads it as a processed-EEG monitor; its window is still to come.', foot: 'Not in this release' },
  { show: 'iabp', text: "Timing, augmentation and the arterial trace with the balloon's effect.", foot: 'Not in this release' },
];

/** The address of a window of this computer that shows `show` (the learner monitor's address, its hash changed). */
export const windowUrl = (learnerUrl: string, show: 'learner' | 'monitor' | 'defib'): string => learnerUrl.replace(/#.*$/, '') + hashOf(show);

export function roomView(d: RoomDeps): RoomView {
  const now = d.now ?? Date.now;
  const learner = d.learner ? learnerPinCard(d.learner) : null;
  const kept = d.store ?? appStore;
  const log = new PeerLog();
  const listen = (t: ManagedTransport, via: PeerSeen['via']) => t.onMessage((m: WireMessage) => {
    if (m.from === d.hostPeerId) return;
    // R8a's `ventilator` is not listed from a hello (its window and tablet are the desk's rows, R8d). R5d's defibrillator
    // window says `defib`: one on this computer is a window that follows as a viewer does, shown as the defibrillator, and
    // counts toward "Reopen that layout"; one over the relay is in the relay's table (R2). The learner action remote
    // (learner-action-remote.md L3) is in the relay's table too; its own row label is L6's
    if (m.kind === 'hello' && m.role === 'defib') {
      if (via !== 'local') return;
      log.heard(m.from, via, 'viewer', now(), 'defib');
    } else if (m.kind === 'hello' && m.role !== 'host' && m.role !== 'ventilator' && m.role !== 'defib' && m.role !== 'learner') log.heard(m.from, via, m.role, now(), m.role === 'viewer' ? (m.show ?? null) : null);
    else if (m.kind === 'command') log.heard(m.from, via, 'controller', now());
    else return;
    if (via === 'local') writeWindows(kept, windowsOf(log.list()));
    draw();
  });
  const relayState = (): RelayState => (!d.relay || !d.relayLink ? 'none' : d.relayLink.status === 'open' ? 'open' : 'down');
  const table = (): RelayDevice[] | null => d.devices?.() ?? null;
  let tableAt = now(); // when the relay last sent its table (its `sinceMs` are as of then)
  // The remembered layout (room-layout.ts): read once for "Last time", then kept up to date as devices come
  let layout = readLayout(kept);
  const before: { windows: Windows; line: string | null } = { windows: readWindows(kept), line: lastTime(layout, readWindows(kept)) };
  const seen = (devices: RelayDevice[] | null) => {
    if (!devices?.some((x) => x.device)) return;
    layout = noteDevices(layout, devices, now());
    writeLayout(kept, layout);
  };

  // ------------------------------------------------------------------------------------------------------ status box
  const dot = h('i', { class: 'room-dot', 'aria-hidden': 'true' });
  const sTitle = h('b', {});
  const sSub = h('small', {});
  const status = h('div', { class: 'room-status', role: 'status', 'aria-live': 'polite' }, dot, h('div', {}, sTitle, sSub));

  // ------------------------------------------------------------------------------------------------------------ join
  const count = h('p', { class: 'phones-count', role: 'status' });
  // The large view: a modal dialog (Escape closes it natively), its QR drawn from the same address at full size
  const bigQr = h('div', { class: 'room-big-qr', role: 'img' });
  const bigCode = h('p', { class: 'room-big-code', 'aria-label': `Code ${d.code.split('').join(' ')}` }, d.code);
  const bigAddr = h('p', { class: 'room-big-url' });
  const bigCount = h('p', { class: 'room-big-count', role: 'status' });
  const big = h('dialog', { class: 'room-big', 'aria-label': 'Join code, large' },
    bigQr, bigCode, bigAddr, bigCount,
    button('Back to the Room', () => big.close(), 'room-big-back', { 'aria-keyshortcuts': 'Escape Q' }));
  const drawCount = (n: number) => {
    const t = n === 1 ? '1 phone following' : `${n} phones following`;
    setText(count, t);
    setText(bigCount, t);
  };
  drawCount(d.followers());
  let target = '';
  const toggleBig = () => {
    if (big.open) return big.close();
    if (!target) return;
    bigQr.replaceChildren(qrSvg(target, 1000)); // vector (crispEdges): the CSS sets the drawn size
    bigQr.setAttribute('aria-label', `QR code of ${target}`);
    setText(bigAddr, target);
    bigCount.hidden = !d.relay;
    big.showModal();
  };
  const large = button('Show large', toggleBig, 'room-large', { 'aria-keyshortcuts': 'Q', title: 'Show the QR code at the size of the screen (Q)', hidden: true });
  const onKey = (e: KeyboardEvent) => {
    if ((e.key !== 'q' && e.key !== 'Q') || isTyping(e) || e.metaKey || e.ctrlKey || e.altKey || !target) return;
    e.preventDefault();
    toggleBig();
  };
  const qr = h('div', { class: 'room-qr-slot' });
  const scanWay = h('li', {}, h('span', { class: 'n', 'aria-hidden': 'true' }, '1'), h('span', {}, h('b', {}, 'Scan the code'), " with the phone's camera."));
  const addr = h('code', { class: 'phones-url' });
  const typeWay = h('li', {}, h('span', { class: 'n', 'aria-hidden': 'true' }, '2'), h('span', {}, 'Or type ', addr, " in the phone's browser, on the same Wi-Fi as this computer."));
  const others = h('p', { class: 'hint room-others' });
  const why = h('p', { class: 'error', role: 'alert' });
  const ways = h('ol', { class: 'room-ways' }, scanWay, typeWay);
  const join = h('section', { class: 'room-card room-join', 'aria-labelledby': 'room-join-h' },
    h('h2', { id: 'room-join-h' }, 'Join'), qr, large,
    h('p', { class: 'phones-code', 'aria-label': `Code ${d.code.split('').join(' ')}` }, d.code),
    why, ways, others, count);
  let asked = false;
  const findAddress = async () => {
    if (!d.relay) return show(qrTarget(d.code, location, null, null));
    asked = true;
    setText(why, '');
    qr.replaceChildren(h('p', { class: 'muted room-looking' }, 'Looking for this computer on the network…'));
    show(qrTarget(d.code, location, d.relay, await (d.info ?? relayInfo)(d.relay)));
  };
  const show = (t: ReturnType<typeof qrTarget>) => {
    ways.hidden = !t.ok;
    count.hidden = !d.relay;
    large.hidden = !t.ok;
    target = t.ok ? t.url : '';
    if (!t.ok) {
      if (big.open) big.close();
      qr.replaceChildren();
      setText(why, t.why);
      setText(others, '');
      asked = false; // ask again on the next visit (the relay may have started)
      return;
    }
    qr.replaceChildren(h('div', { class: 'phones-qr room-qr', role: 'img', 'aria-label': `QR code of ${t.url}` }, qrSvg(t.url, 220)));
    setText(addr, t.url);
    setText(others, t.others.length ? `If that address does not open: ${t.others.join('  ·  ')}` : '');
  };

  // ------------------------------------------------------------------------------------------------- connected now
  const rows = h('tbody', {});
  const tableEl = h('table', { class: 'room-table' },
    h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, h('span', { class: 'sr-only' }, 'State')), h('th', { scope: 'col' }, 'Device'), h('th', { scope: 'col' }, 'Showing'), h('th', { scope: 'col' }, 'Status'), h('th', { scope: 'col' }, 'Ping'), h('th', { scope: 'col' }, 'Last heard'))),
    rows);
  const nameCell = (r: DeviceRow): Array<Node | string> => {
    if (!r.named || !r.device) return [h('b', {}, r.name), ...(r.where ? [` · ${r.where}`] : [])];
    const key = r.device;
    const input = h('input', { type: 'text', class: 'room-name', value: layout[key]?.name ?? '', placeholder: r.name, maxlength: '32', 'aria-label': `Name of ${r.name}`, spellcheck: 'false' });
    input.addEventListener('change', () => {
      layout = rename(layout, key, input.value, now());
      writeLayout(kept, layout);
      draw();
    });
    return [input];
  };
  const row = (r: DeviceRow) =>
    h('tr', { 'data-level': r.level, ...(r.show ? { 'data-show': r.show } : {}), ...(r.device ? { 'data-device': r.device } : {}) },
      h('td', { class: 's' }, h('i', { class: `room-dot ${r.level}`, role: 'img', 'aria-label': LEVEL_TEXT[r.level] })),
      h('td', {}, ...nameCell(r)), h('td', {}, r.showing), h('td', { class: 'm' }, r.state), h('td', { class: 'm room-ping' }, r.ping), h('td', { class: 'm' }, r.heard));
  const connected = h('section', { class: 'room-card room-connected', 'aria-labelledby': 'room-conn-h' },
    h('h2', { id: 'room-conn-h' }, 'Connected now'),
    h('div', { class: 'room-scroll' }, tableEl),
    h('p', { class: 'room-legend' }, ...(['stable', 'weak', 'down', 'absent'] as const).map((l) => h('span', {}, h('i', { class: `room-dot ${l}`, 'aria-hidden': 'true' }), LEVEL_TEXT[l]))),
    h('p', { class: 'hint room-rule' }, ROOM_LEGEND),
    h('p', { class: 'hint' }, "Last heard: the device's last answer to the relay's ping, which the relay reports at each heartbeat. Type a name over a device to keep it for the next time in this room. A window closed on this computer stays listed until this page reloads."),
    // P7's card (room-instructor.ts: the instructor phone's row, its PIN behind press-and-hold, its QR fold), unchanged
    h('div', { id: 'room-instructor' }, ...(d.instructor ? [d.instructor.el] : [])),
    // L6: the learner PIN's panel, beside the instructor's
    ...(learner ? [h('div', { id: 'room-learner' }, learner.el)] : []));

  // ---------------------------------------------------------------------------------------------- on this computer
  const cards = h('div', { class: 'join-grid room-openers' });
  type Win = 'learner' | 'monitor' | 'defib';
  const winOf = (show: DeviceRow['show']): Win => (show === 'monitor' || show === 'defib' ? show : 'learner');
  const windowNames = (show: Win, rs: readonly DeviceRow[]) =>
    rs.filter((r) => r.where === 'this computer' && winOf(r.show) === show && r.showing !== 'Remote' && r.showing !== 'Instructor remote').map((r) => r.name);
  const openWindow = (show: Win) => {
    const url = windowUrl(d.learnerUrl, show);
    // `noopener` puts the window in its own process (an opener would share this page's main thread with its engine)
    if (d.open) d.open(url);
    else window.open(url, '_blank', 'noopener,width=1280,height=800');
  };
  const drawCards = (rs: readonly DeviceRow[]) => {
    cards.replaceChildren(...OPENERS.map((o) => {
      const w = PICKER_WORDS.cards.find((c) => c.show === o.show);
      const title = o.title ?? w?.title ?? o.show;
      if (o.show === 'learner' || o.show === 'monitor' || o.show === 'defib') {
        const show = o.show;
        const names = [...(show === 'monitor' ? ['This window'] : []), ...windowNames(show, rs)];
        return instrumentCard({ show, title, chip: names.length ? names.join(' · ') : 'Not open', on: names.length > 0, text: o.text, foot: o.foot,
          actions: [button('New window', () => openWindow(show), 'small', { 'aria-label': `${title} in a new window` })] });
      }
      if (o.show === 'vent') {
        const v = d.vent?.();
        const on = v?.window === 'driving' ? 'Window · driving' : v?.device === 'driving' ? 'Tablet · driving' : 'On this computer';
        return instrumentCard({ show: 'vent', title, chip: on, on: on !== 'On this computer', text: o.text, foot: o.foot, actions: [
          h('a', { class: 'btn small', href: hrefOf('vent') }, 'Open here'),
          // `noopener`, as the other windows: its own process; the link is the room code's BroadcastChannel
          button('New window', () => (d.open ?? ((u: string) => void window.open(u, '_blank', 'noopener,width=1280,height=800')))(ventWindowUrl(d.code, location.pathname)), 'small', { 'aria-label': `${title} in a new window` }),
        ] });
      }
      return instrumentCard({ show: o.show, title, chip: w?.chip ?? '', text: o.text, foot: o.foot, actions: [] });
    }));
  };
  const lastLine = h('p', { class: 'room-last' });
  const reopen = button('Reopen that layout', () => {
    for (const show of ['monitor', 'defib', 'learner'] as const) for (let i = 0; i < (before.windows[show] ?? 0); i++) openWindow(show);
    reopen.hidden = true;
  }, 'small room-reopen');
  const said = h('p', { class: 'hint room-said', role: 'status' });
  const drawLast = () => {
    setText(lastLine, before.line ?? 'Nothing was kept from an earlier time in this room: the names you give the devices and the windows you open are kept for the next time.');
    reopen.hidden = !((before.windows.learner ?? 0) + (before.windows.monitor ?? 0) + (before.windows.defib ?? 0));
  };
  const forget = button('Forget the room', () => {
    forgetRoom(kept);
    layout = {};
    before.windows = {};
    before.line = null;
    setText(said, `Forgotten: the device names and the windows. The room code ${d.code} stays.`);
    drawLast();
    draw();
  }, 'small room-forget');

  // ------------------------------------------------------------------------------------------------- the room code
  const renewNo = button(`Keep ${d.code}`, () => ask.close(), 'small');
  const renewYes = button('Make a new code', () => {
    ask.close();
    const code = newSessionCode();
    (d.renew ?? ((c: string) => {
      keepRoomCode(c);
      const u = new URL(location.href);
      u.searchParams.set('session', c);
      location.replace(u);
    }))(code);
  }, 'primary small');
  const ask = h('dialog', { class: 'room-renew', 'aria-labelledby': 'room-renew-h' },
    h('h2', { id: 'room-renew-h' }, 'A new room code?'),
    h('p', {}, `The phones and screens following ${d.code} will stay on it: they join the new code by scanning the new QR code. This page reloads under the new code, and a case running now is not carried over.`),
    h('div', { class: 'room-renew-acts' }, renewNo, renewYes));
  const roomCard = h('section', { class: 'room-card room-setup', 'aria-labelledby': 'room-setup-h' },
    h('h2', { id: 'room-setup-h' }, 'This room'),
    h('div', { class: 'room-code-row' },
      h('span', {}, 'Room code ', h('b', { class: 'room-code-now', 'aria-label': `Code ${d.code.split('').join(' ')}` }, d.code), ' — it stays until you make a new one.'),
      button('New room code', () => ask.showModal(), 'small room-renew-open')),
    h('div', { class: 'room-code-row' }, lastLine, reopen),
    h('div', { class: 'room-code-row' }, h('span', { class: 'hint' }, 'Forgetting the room clears the device names and the windows, not the code.'), forget),
    said);
  const computer = h('section', { class: 'room-card room-computer', 'aria-labelledby': 'room-pc-h' },
    h('h2', { id: 'room-pc-h' }, 'Open on this computer'), cards,
    h('p', { class: 'room-open' }, h('a', { class: 'btn small', href: hrefOf('remote') }, 'Open a remote')));

  function draw(): void {
    d.instructor?.draw();
    learner?.draw();
    const t = now();
    const relay = relayState();
    const peers = log.list();
    const devices = table();
    const s = roomStatus({ relay, phones: d.followers(), peers, now: t, devices });
    status.dataset.level = s.level;
    setText(sTitle, s.title);
    setText(sSub, s.sub);
    const rs = deviceRows({ relay, phones: d.followers(), peers, now: t, devices, known: layout, ageMs: t - tableAt, ...(d.vent ? { vent: d.vent() } : {}) });
    // a name being typed is not redrawn under the instructor's fingers
    if (!(document.activeElement instanceof HTMLInputElement && rows.contains(document.activeElement))) rows.replaceChildren(...rs.map(row));
    drawCards(rs);
  }

  // ------------------------------------------------------------------------------------- defibrillator in this room
  // R5b (plan room-and-instruments.md §7; owner's Q6 ruling, 5 November): the room's defibrillator model, apart from the
  // monitor style, in a card of its own under the openers
  const defibCard = d.defib ? (() => {
    const choice = d.defib;
    const label = (id: string, l: string) => {
      const e = defibDefaults(id);
      const p = pacerDefaults(id); // the pacer follows the model too (row 58)
      const pacer = p ? `; pacer ${p.ratePpm} ppm, PAUSE at ${p.pausePct === null ? '0 mA' : `${p.pausePct} % of the rate`}` : '';
      return `${l}: ${e.energyAdultJ} J adult${e.energyPaedJ === null ? '' : `, ${e.energyPaedJ} J paediatric`}${pacer}`;
    };
    const pick = select('Model', [['', "Not chosen: the monitor style's own values"], ...DEFIB_CHOICES.map((c): [string, string] => [c.id, label(c.id, c.label)])], choice.model() ?? '', (v) => choice.choose(v || null));
    return h('section', { class: 'room-card room-defib', 'aria-labelledby': 'room-defib-h' },
      h('h2', { id: 'room-defib-h' }, 'Defibrillator in this room'),
      pick.el,
      h('p', { class: 'hint' }, "Your department's machine: not named yet."),
      h('p', { class: 'hint' }, "A model applies to the patient at once and to every new patient; 'Not chosen' applies from the next patient start."));
  })() : null;

  let timer: ReturnType<typeof setInterval> | null = null;
  const el = h('section', { class: 'console room', 'aria-labelledby': 'room-h' },
    h('div', { class: 'console-page' },
      h('header', { class: 'console-head' },
        h('div', {}, h('h1', { id: 'room-h' }, 'Room setup'), h('p', { class: 'console-sub' }, 'Every screen and phone that joins with this code follows the same patient.')),
        status),
      h('div', { class: 'room-cols' }, join, connected),
      computer, ...(defibCard ? [defibCard] : []), roomCard), big, ask);
  // Wired once everything above exists (a transport replays its status on subscribe)
  listen(d.local, 'local');
  if (d.relayLink) listen(d.relayLink, 'relay');
  d.onFollowers((n, devices) => ((tableAt = now()), log.keepPhones(n), seen(devices), drawCount(n), draw()));
  d.relayLink?.onStatus(() => draw());
  seen(table());
  drawLast();
  draw();
  return {
    id: 'room',
    el,
    devices: () => roomStatus({ relay: relayState(), phones: d.followers(), peers: log.list(), now: now(), devices: table() }).devices,
    draw,
    enter() {
      if (!asked) void findAddress();
      d.instructor?.enter();
      draw();
      timer ??= setInterval(draw, 1000);
      document.addEventListener('keydown', onKey);
    },
    leave() {
      d.instructor?.leave();
      learner?.leave();
      document.removeEventListener('keydown', onKey);
      if (big.open) big.close();
      if (ask.open) ask.close();
      if (timer) clearInterval(timer);
      timer = null;
    },
  };
}
