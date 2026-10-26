// Room (E125, owner's mockup f2-room): who follows this session and how to join it. Top right, the connection status
// (room-status.ts: Stable / Weak / Disconnected, from the relay socket and the phones' hellos; no ping for rc.4). Left,
// Join: the QR code (the app's only one), the code, and the two ways in — scan, or type the address the relay serves
// (its network address and port; the code is in it, there being no code-entry page for phones). Right, Connected now:
// this window, the windows of this browser and the phones that said hello, with their state and when they were last
// heard; the openers for this computer; and the windows opened from here this session (nothing is remembered across a
// reload, so nothing is claimed).
import type { ManagedTransport, WireMessage } from '@pme/controller';
import { qrTarget, relayInfo, type RelayInfo } from '../classroom.ts';
import { qrSvg } from '../qr.ts';
import { ago, PeerLog, RESYNC_MS, roomStatus, type PeerSeen, type RelayState, type RoomLevel } from '../room-status.ts';
import { hrefOf } from '../router.ts';
import type { View } from '../shell.ts';
import { button, h, setText } from '../ui.ts';

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
  /** The relay's count of devices following, and its changes. */
  followers(): number;
  onFollowers(fn: (n: number) => void): () => void;
  /** The address of a second-screen learner monitor that follows this session. */
  learnerUrl: string;
  now?: () => number;
  /** For tests: the relay's description (default: ask the relay). */
  info?: (relay: string) => Promise<RelayInfo | null>;
}

export interface RoomView extends View {
  /** "N devices" for the rail (this window, the windows heard on this computer, the phones on the relay). */
  devices(): number;
  /** Redraw the status box and the table now. */
  draw(): void;
}

const LEVEL_TEXT: Record<RoomLevel, string> = { stable: 'stable', weak: 'weak', down: 'disconnected' };

export function roomView(d: RoomDeps): RoomView {
  const now = d.now ?? Date.now;
  const log = new PeerLog();
  const opened: Array<{ what: string; at: number }> = [];
  const listen = (t: ManagedTransport, via: PeerSeen['via']) => t.onMessage((m: WireMessage) => {
    if (m.from === d.hostPeerId) return;
    if (m.kind === 'hello' && m.role !== 'host') log.heard(m.from, via, m.role, now());
    else if (m.kind === 'command') log.heard(m.from, via, 'controller', now());
    else return;
    draw();
  });
  const relayState = (): RelayState => (!d.relay || !d.relayLink ? 'none' : d.relayLink.status === 'open' ? 'open' : 'down');

  // ------------------------------------------------------------------------------------------------------ status box
  const dot = h('i', { class: 'room-dot', 'aria-hidden': 'true' });
  const sTitle = h('b', {});
  const sSub = h('small', {});
  const status = h('div', { class: 'room-status', role: 'status', 'aria-live': 'polite' }, dot, h('div', {}, sTitle, sSub));

  // ------------------------------------------------------------------------------------------------------------ join
  const count = h('p', { class: 'phones-count', role: 'status' });
  const drawCount = (n: number) => setText(count, n === 1 ? '1 phone following' : `${n} phones following`);
  drawCount(d.followers());
  const qr = h('div', { class: 'room-qr-slot' });
  const scanWay = h('li', {}, h('span', { class: 'n', 'aria-hidden': 'true' }, '1'), h('span', {}, h('b', {}, 'Scan the code'), " with the phone's camera."));
  const addr = h('code', { class: 'phones-url' });
  const typeWay = h('li', {}, h('span', { class: 'n', 'aria-hidden': 'true' }, '2'), h('span', {}, 'Or type ', addr, " in the phone's browser, on the same Wi-Fi as this computer."));
  const others = h('p', { class: 'hint room-others' });
  const why = h('p', { class: 'error', role: 'alert' });
  const ways = h('ol', { class: 'room-ways' }, scanWay, typeWay);
  const join = h('section', { class: 'room-card room-join', 'aria-labelledby': 'room-join-h' },
    h('h2', { id: 'room-join-h' }, 'Join'), qr,
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
    if (!t.ok) {
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
  const table = h('table', { class: 'room-table' },
    h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, h('span', { class: 'sr-only' }, 'State')), h('th', { scope: 'col' }, 'Device'), h('th', { scope: 'col' }, 'Showing'), h('th', { scope: 'col' }, 'Sync'), h('th', { scope: 'col' }, 'Last heard'))),
    rows);
  const row = (level: RoomLevel, device: (Node | string)[], showing: string, sync: string, heard: string) =>
    h('tr', { 'data-level': level }, h('td', { class: 's' }, h('i', { class: `room-dot ${level}`, role: 'img', 'aria-label': LEVEL_TEXT[level] })), h('td', {}, ...device), h('td', {}, showing), h('td', { class: 'm' }, sync), h('td', { class: 'm' }, heard));
  const openedBox = h('p', { class: 'room-opened' });
  const openLearner = button('Learner monitor in a new window', () => {
    // `noopener` puts the window in its own process (an opener would share this page's main thread with its engine)
    window.open(d.learnerUrl, '_blank', 'noopener,width=1280,height=800');
    opened.push({ what: 'learner monitor window', at: now() });
    draw();
  });
  const connected = h('section', { class: 'room-card room-connected', 'aria-labelledby': 'room-conn-h' },
    h('h2', { id: 'room-conn-h' }, 'Connected now'),
    h('div', { class: 'room-scroll' }, table),
    h('p', { class: 'room-legend' }, ...(['stable', 'weak', 'down'] as const).map((l) => h('span', {}, h('i', { class: `room-dot ${l}`, 'aria-hidden': 'true' }), LEVEL_TEXT[l]))),
    h('p', { class: 'hint' }, 'A phone speaks to this computer when it joins or catches up; the relay counts the ones following. A window closed on this computer stays listed until this page reloads.'),
    h('div', { class: 'room-open' }, h('span', {}, 'Open on this computer:'), openLearner, h('a', { class: 'btn', href: hrefOf('remote') }, 'Open a remote')),
    openedBox);

  const clock = (t: number) => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  function draw(): void {
    const t = now();
    const relay = relayState();
    const peers = log.list();
    const s = roomStatus({ relay, phones: d.followers(), peers, now: t });
    status.dataset.level = s.level;
    setText(sTitle, s.title);
    setText(sSub, s.sub);
    const list: HTMLElement[] = [row('stable', [h('b', {}, 'This window')], 'Instructor pages and the monitor', '—', 'now')];
    let w = 0;
    let p = 0;
    for (const x of peers) {
      if (x.via === 'local') list.push(row('stable', [h('b', {}, `Window ${++w + 1}`), ' · this computer'], x.role === 'viewer' ? 'Learner monitor' : 'Remote', 'synced', ago(t - x.lastAt)));
      else {
        const lvl: RoomLevel = relay !== 'open' ? 'down' : t - x.lastAt < RESYNC_MS ? 'weak' : 'stable';
        list.push(row(lvl, [h('b', {}, `Phone ${++p}`)], x.role === 'viewer' ? 'Learner monitor' : 'Remote', lvl === 'down' ? 'relay down' : lvl === 'weak' ? 'catching up' : 'synced', ago(t - x.lastAt)));
      }
    }
    // Devices the relay counts that said nothing since this page opened (they joined before a reload of it)
    const quiet = relay === 'open' ? d.followers() - peers.filter((x) => x.via === 'relay').length : 0;
    for (let i = 0; i < quiet; i++) list.push(row('stable', [h('b', {}, `Phone ${++p}`)], 'Learner monitor', 'following', 'before this page opened'));
    rows.replaceChildren(...list);
    openedBox.hidden = !opened.length;
    setText(openedBox, opened.length ? `Opened from this page this session: ${opened.map((o) => `${o.what} at ${clock(o.at)}`).join(', ')}.` : '');
  }

  let timer: ReturnType<typeof setInterval> | null = null;
  const el = h('section', { class: 'console room', 'aria-labelledby': 'room-h' },
    h('div', { class: 'console-page' },
      h('header', { class: 'console-head' },
        h('div', {}, h('h1', { id: 'room-h' }, 'Room'), h('p', { class: 'console-sub' }, 'Every screen and phone that joins with this code follows the same patient.')),
        status),
      h('div', { class: 'room-cols' }, join, connected)));
  // Wired once everything above exists (a transport replays its status on subscribe)
  listen(d.local, 'local');
  if (d.relayLink) listen(d.relayLink, 'relay');
  d.onFollowers((n) => (log.keepPhones(n), drawCount(n), draw()));
  d.relayLink?.onStatus(() => draw());
  draw();
  return {
    id: 'room',
    el,
    devices: () => roomStatus({ relay: relayState(), phones: d.followers(), peers: log.list(), now: now() }).devices,
    draw,
    enter() {
      if (!asked) void findAddress();
      draw();
      timer ??= setInterval(draw, 1000);
    },
    leave() {
      if (timer) clearInterval(timer);
      timer = null;
    },
  };
}
