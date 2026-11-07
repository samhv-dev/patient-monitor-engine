// @vitest-environment happy-dom
// E125: the app opens on Home; the workflow rail marks the current page and its switch saves the light/dark screen;
// the pages before a session (Home, Room, Scenarios, Patient) have no stage and no session bar, the Instructor and
// Monitor views do; the Room's status box says Stable / Weak / Disconnected; a Load shows in the Scenarios' Recent.
// Room plan R7: Room setup — the device table from the relay's ping table, the openers, the room code, the layout.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Instrument, ManagedTransport, RelayDevice, TransportStatus, WireMessage } from '@pme/controller';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EDUCATION_LINE } from './about.ts';
import { persianDate, Rail, railClock } from './rail.ts';
import { noteRecent } from './recent.ts';
import { deviceRows, roomStatus, PeerLog } from './room-status.ts';
import { parseRoute, type RouteId } from './router.ts';
import type { ScenarioCard } from './scenarios.ts';
import { Shell, type View } from './shell.ts';
import { DEFAULT_SITE, loadSite, setLightScreen } from './site.ts';
import { homeView } from './views/home.ts';
import { roomView } from './views/room.ts';
import { DEMO_CARDS, scenariosView } from './views/scenarios.ts';
import { Meters } from './meters.ts';
import { h } from './ui.ts';

const view = (id: RouteId): View => ({ id, el: document.createElement('section') });
const ALL: RouteId[] = ['home', 'room', 'scenarios', 'patient', 'teach2', 'monitor', 'explore', 'debrief'];

function shellWithRail() {
  const shell = new Shell(document.body, { hostless: false });
  for (const id of ALL) shell.add(view(id));
  const rail = new Rail({ version: '1.0.0-rc.4, pre-release', theme: { light: () => false, set: () => undefined }, badges: { room: () => '3 devices' } });
  shell.setRail(rail);
  return { shell, rail };
}

beforeEach(() => {
  document.body.replaceChildren();
  // An in-memory storage for this browser's site profile and Recent (no storage is guaranteed under Node)
  const m = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), clear: () => m.clear() });
  location.hash = '';
});
afterEach(() => (vi.useRealTimers(), vi.unstubAllGlobals()));

describe('the frame', () => {
  it('opens on Home: an empty hash, #/ and the old #/start are the Home route', () => {
    for (const hash of ['', '#/', '#/home', '#/start']) expect(parseRoute(hash).id).toBe('home');
    const { shell } = shellWithRail();
    shell.show(parseRoute(''));
    expect(shell.root.dataset.route).toBe('home');
    expect(document.title).toBe('Home: patient monitor simulator');
  });

  it('the rail marks the current page, and Tools on Validate and Developer', () => {
    const { shell, rail } = shellWithRail();
    const current = () => [...rail.el.querySelectorAll('[aria-current="page"]')].map((a) => (a as HTMLElement).dataset.route);
    shell.show({ id: 'room', sub: '' });
    expect(current()).toEqual(['room']);
    expect(rail.el.querySelector('[data-route="room"] .rail-badge')?.textContent).toBe('3 devices');
    shell.show({ id: 'teach2', sub: '' });
    expect(current()).toEqual(['teach2']);
    shell.show({ id: 'home', sub: '' });
    expect(current()).toEqual(['home']);
    expect(rail.el.querySelectorAll('.rail-hr')).toHaveLength(4); // groups parted by lines, no captions
    rail.destroy();
  });

  it('hides the stage and the session bar on the pages before a session, shows the stage on the Instructor and Monitor views', () => {
    const { shell } = shellWithRail();
    for (const id of ['home', 'room', 'scenarios', 'patient'] as const) {
      shell.show({ id, sub: '' });
      expect([shell.stage.hidden, shell.bar.hidden], id).toEqual([true, true]);
    }
    // Instructor v2 carries its own header in place of the session bar (OWN_BAR_ROUTES, shell.dom.test.ts)
    for (const [id, bar] of [['teach2', true], ['monitor', false]] as const) {
      shell.show({ id, sub: '' });
      expect([shell.stage.hidden, shell.bar.hidden], id).toEqual([false, bar]);
    }
  });

  it('carries no footer line on the working views; Home shows the education line once, as part of its own page', () => {
    // the owner, 30 October: the line leaves the bottom of the working pages so Instructor v2's dock sits flush
    const shell = new Shell(document.body, { hostless: false });
    shell.add({ ...homeView({ meters: new Meters() }), enter: undefined });
    for (const id of ['teach2', 'scenarios', 'settings', 'debrief'] as const) shell.add(view(id));
    shell.setRail(new Rail({ version: 'x', theme: { light: () => false, set: () => undefined } }));
    /** The page's text as shown: hidden views left out. */
    const shown = () => {
      const c = shell.root.cloneNode(true) as HTMLElement;
      for (const e of c.querySelectorAll('[hidden]')) e.remove();
      return c.textContent ?? '';
    };
    const times = (t: string) => t.split(EDUCATION_LINE).length - 1;
    for (const id of ['teach2', 'scenarios', 'settings', 'debrief'] as const) {
      shell.show({ id, sub: '' });
      expect(document.querySelectorAll('.app-foot'), id).toHaveLength(0);
      expect(times(shown()), id).toBe(0);
    }
    shell.show({ id: 'home', sub: '' });
    expect(document.querySelectorAll('.app-foot')).toHaveLength(0);
    expect(times(shown())).toBe(1);
    expect(shell.root.querySelector('.view.home .home-foot')?.textContent).toBe(EDUCATION_LINE);
    expect(EDUCATION_LINE).toBe('For educational use only; Not to be used in patient care.');
  });

  it('print still hides the rail (and the Home line); the Debrief keeps its own footer line word for word', () => {
    const css = readFileSync(resolve(import.meta.dirname, 'app.css'), 'utf8');
    const print = [...css.matchAll(/@media print \{([^{}]*)\{([^}]*)\}/g)].filter((m) => /display: none !important/.test(m[2] as string)).map((m) => m[1] as string).join(',');
    expect(print.split(',').map((s) => s.trim())).toEqual(expect.arrayContaining(['.rail', '.home-foot']));
    const debrief = readFileSync(resolve(import.meta.dirname, 'views/debrief.ts'), 'utf8');
    expect(debrief).toContain("const FOOT = `For educational use only; Not to be used in patient care. Version ${version}${version.includes('-') ? ' (pre-release)' : ''}, build ${BUILD}.`;");
  });

  it('a hostless Remote keeps its stage and session bar hidden and has no rail', () => {
    const shell = new Shell(document.body, { hostless: true });
    shell.add(view('remote'));
    shell.show({ id: 'remote', sub: '' });
    expect([shell.stage.hidden, shell.bar.hidden]).toEqual([true, true]);
    expect(document.querySelector('.rail')).toBeNull();
  });
});

describe('the rail foot', () => {
  it('the switch saves the screen theme for this browser and says which it is', () => {
    const site = { ...DEFAULT_SITE };
    const rail = new Rail({ version: 'x', theme: { light: () => site.theme === 'projector-light', set: (l) => setLightScreen(site, l) } });
    const sw = rail.el.querySelector('.rail-theme') as HTMLButtonElement;
    expect([sw.getAttribute('aria-checked'), sw.textContent]).toEqual(['false', 'Dark']);
    sw.click();
    expect(loadSite().theme).toBe('projector-light');
    expect(document.documentElement.dataset.theme).toBe('bench');
    expect([sw.getAttribute('aria-checked'), sw.textContent]).toEqual(['true', 'Light']);
    sw.click();
    expect(loadSite().theme).toBe('');
    expect(document.documentElement.dataset.theme).toBe('');
    rail.destroy();
  });

  it('the clock: the time on one line, the date (with the Persian date in Persian script where the browser has it) on the next', () => {
    const c = railClock(new Date(2026, 9, 26, 21, 48));
    expect([c.time, c.day]).toEqual(['21:48', 'Mon 26 Oct']);
    if (persianDate(new Date(2026, 9, 26))) expect(c.fa).toBe('۴ آبان ۱۴۰۵');
    const rail = new Rail({ version: 'x', theme: { light: () => false, set: () => undefined }, now: () => new Date(2026, 9, 26, 21, 48) });
    const fa = rail.el.querySelector('.rail-fa') as HTMLElement;
    expect([fa.lang, fa.dir]).toEqual(['fa', 'rtl']);
    expect(rail.el.querySelector('.rail-date')?.textContent).toBe(c.fa ? `Mon 26 Oct · ${c.fa}` : 'Mon 26 Oct');
    rail.destroy();
  });
});

describe('Home', () => {
  it('one button to the Room, the repository, the tiles CPU · Memory · Engine', () => {
    // a browser with a memory API (Chrome, Edge); without one there is no Memory tile (MUI-17, home-tiles.dom.test.ts)
    Object.defineProperty(performance, 'memory', { configurable: true, value: { usedJSHeapSize: 1048576 } });
    const v = homeView({ meters: new Meters() });
    delete (performance as Performance & { memory?: unknown }).memory;
    document.body.append(v.el);
    expect(v.el.querySelector('h1')?.textContent).toBe('Patient monitor simulator');
    expect([...v.el.querySelectorAll('.btn')].map((b) => [b.textContent, b.getAttribute('href')])).toEqual([['Start here', '#/room']]);
    expect(v.el.querySelector('code')?.textContent).toBe('github.com/samhv-dev/patient-monitor-engine');
    expect([...v.el.querySelectorAll('.home-k')].map((e) => e.textContent)).toEqual(['CPU, this app', 'Memory', 'Engine']);
    expect(v.el.querySelector('[data-about]')?.textContent).toMatch(/^Version \S+ · (pre-release · )?build \S+$/);
  });
});

/** One entry of the relay's device table (R2). */
const dev = (id: string, o: Partial<RelayDevice> = {}): RelayDevice => ({ id, role: 'viewer', show: 'learner', device: null, granted: false, rttMs: 12, sinceMs: 1000, ...o });

/** A transport the test drives: its status and the messages that arrive on it. */
function fakeTransport(status: TransportStatus = 'open') {
  const msg = new Set<(m: WireMessage) => void>();
  const st = new Set<(s: TransportStatus) => void>();
  const t = {
    kind: 'websocket', status, send: () => undefined, close: () => undefined,
    onMessage: (fn: (m: WireMessage) => void) => (msg.add(fn), () => void msg.delete(fn)),
    onStatus: (fn: (s: TransportStatus) => void) => (st.add(fn), fn(t.status), () => void st.delete(fn)),
    hello: (from: string, role: 'viewer' | 'controller', show?: Instrument) => msg.forEach((fn) => fn({ v: 1, session: 'ABC234', from, seq: 1, sentAt: 0, kind: 'hello', role, ...(show ? { show } : {}) } as WireMessage)),
    set: (s: TransportStatus) => ((t.status = s), st.forEach((fn) => fn(s))),
  };
  return t as typeof t & ManagedTransport;
}

describe('Room', () => {
  it('status from a relay of an older build (no device table): stable, weak while a phone catches up, disconnected without the relay', () => {
    const log = new PeerLog();
    log.heard('p1', 'relay', 'viewer', 0);
    expect(roomStatus({ relay: 'open', phones: 1, peers: log.list(), now: 5000 })).toMatchObject({ level: 'stable', title: 'Stable connection', sub: '2 devices' });
    log.heard('p1', 'relay', 'viewer', 4500);
    expect(roomStatus({ relay: 'open', phones: 1, peers: log.list(), now: 5000 }).level).toBe('weak');
    expect(roomStatus({ relay: 'down', phones: 1, peers: log.list(), now: 5000 })).toMatchObject({ level: 'down', title: 'Disconnected' });
    expect(roomStatus({ relay: 'none', phones: 0, peers: [], now: 0 })).toMatchObject({ level: 'down', sub: '1 device · no relay: phones cannot join' });
  });

  it("R7 status from the relay's ping table (Q9: a ping over 300 ms or one missed 10 s heartbeat is Weak)", () => {
    const log = new PeerLog();
    log.heard('w2', 'local', 'viewer', 0, 'monitor'); // a window of this computer: no ping
    const five = [12, 42, 30, 8, 25].map((rtt, i) => dev(`p${i}`, { rttMs: rtt }));
    const st = (devices: RelayDevice[], relay: 'open' | 'down' = 'open') => roomStatus({ relay, phones: devices.length, peers: log.list(), now: 60_000, devices });
    // this window + the window of this computer + five devices on the relay
    expect(st(five)).toEqual({ level: 'stable', title: 'Stable connection', sub: '7 devices · worst ping 42 ms', devices: 7 });
    expect(st([...five, dev('x', { rttMs: 300 })]).level).toBe('stable'); // "over" 300 ms
    expect(st([...five, dev('x', { rttMs: 301 })])).toMatchObject({ level: 'weak', title: 'Weak connection', sub: '8 devices · worst ping 301 ms' });
    // the last ping unanswered and nothing heard for more than one heartbeat: it missed one
    expect(st([...five, dev('x', { rttMs: null, sinceMs: 10_001 })])).toMatchObject({ level: 'weak', sub: '8 devices · worst ping 42 ms · a device missed a heartbeat' });
    // the last ping unanswered but heard within the heartbeat (it joined since, or its answer is on its way): not a miss
    expect(st([...five, dev('x', { rttMs: null, sinceMs: 9000 })]).level).toBe('stable');
    expect(st([dev('x', { rttMs: null, sinceMs: 2000 })])).toMatchObject({ level: 'stable', sub: '3 devices' }); // no ping measured yet
    expect(st(five, 'down')).toMatchObject({ level: 'down', title: 'Disconnected', sub: '2 devices · the relay does not answer' });
  });

  it("R7 the table: one row per device the relay lists, with what it shows, its ping and when it was last heard; this computer's windows; remembered names; the absent grey", () => {
    const log = new PeerLog();
    log.heard('w2', 'local', 'viewer', 58_000, 'monitor');
    const devices = [
      dev('p1', { device: 'phonekey0001', rttMs: 18, sinceMs: 4000 }),
      dev('p2', { show: null, rttMs: 420, sinceMs: 3000 }), // an older build: no show, no key
      dev('p3', { role: 'instructor', show: null, granted: false, rttMs: 25, sinceMs: 2000 }),
      dev('p4', { role: 'instructor', show: null, granted: true, rttMs: 22, sinceMs: 2000 }),
      dev('p5', { show: 'depth', device: 'depthkey0001', rttMs: null, sinceMs: 11_000 }),
      dev('p6', { role: 'controller', show: null, rttMs: 9, sinceMs: 1000 }),
      dev('p7', { show: 'defib', rttMs: 9, sinceMs: 1000 }),
    ];
    const known = { phonekey0001: { name: 'Bed 3', show: 'learner' as const, lastSeen: 1 }, tabletkey002: { name: 'Projector tablet', show: 'monitor' as const, lastSeen: 60_000 - 86_400_000 } };
    const rows = deviceRows({ relay: 'open', phones: 7, peers: log.list(), now: 60_000, devices, known });
    expect(rows.map((r) => [r.level, r.name, r.showing, r.state, r.ping, r.heard])).toEqual([
      ['stable', 'This window', 'Instructor pages and the monitor', '—', '—', 'now'],
      ['stable', 'Window 2', 'Monitor', 'connected', 'this computer', '2 s ago'],
      ['stable', 'Bed 3', 'Learner monitor', 'connected', '18 ms', '4 s ago'],
      ['weak', 'Phone 1', 'Learner monitor', 'slow', '420 ms', '3 s ago'],
      ['stable', 'Phone 2', 'Instructor remote', 'signing in', '25 ms', '2 s ago'],
      ['stable', 'Phone 3', 'Instructor remote', 'granted', '22 ms', '2 s ago'],
      ['weak', 'Phone 4', 'Depth of anaesthesia', 'Not available yet', '—', '11 s ago'],
      ['stable', 'Phone 5', 'Remote', 'connected', '9 ms', 'now'],
      ['stable', 'Phone 6', 'Defibrillator', 'connected', '9 ms', 'now'],
      ['absent', 'Projector tablet', 'Monitor', 'expected, not connected', '—', '24 h ago'],
    ]);
    // "last heard" ages from the relay's frame (it reports each heartbeat); the table's levels read the frame as sent
    expect(deviceRows({ relay: 'open', phones: 7, peers: [], now: 60_000, devices: devices.slice(0, 1), ageMs: 3000 })[1]).toMatchObject({ level: 'stable', heard: '7 s ago' });
    expect(rows.filter((r) => r.named).map((r) => r.device)).toEqual(['phonekey0001', 'depthkey0001', 'tabletkey002']);
    // no "before this page opened" rows: the relay lists every socket
    expect(rows.some((r) => r.heard === 'before this page opened')).toBe(false);
    // an older relay: the hellos heard and the count, as before R7
    const old = deviceRows({ relay: 'open', phones: 2, peers: log.list(), now: 60_000, devices: null });
    expect(old.slice(2).map((r) => [r.name, r.heard])).toEqual([['Phone 1', 'before this page opened'], ['Phone 2', 'before this page opened']]);
  });

  it('the status box and the table follow the phones and the relay socket', async () => {
    let now = 10_000;
    let followers = 0;
    const fns = new Set<(n: number, d: RelayDevice[] | null) => void>();
    const relay = fakeTransport('open');
    const local = fakeTransport('open');
    const v = roomView({
      code: 'ABC234', relay: 'ws://192.168.1.20:8787/', relayLink: relay, local, hostPeerId: 'host-1', learnerUrl: 'about:blank', now: () => now,
      followers: () => followers, onFollowers: (f) => (fns.add(f), () => void fns.delete(f)),
      info: async () => ({ relay: 'pme', port: 8787, addresses: ['192.168.1.20'], serves: true }),
    });
    document.body.append(v.el);
    v.enter?.('');
    await vi.waitFor(() => expect(v.el.querySelector('.phones-url')?.textContent).toBe('http://192.168.1.20:8787/?join=ABC234#/pick')); // R4: the QR opens the picker
    expect(v.el.querySelector('.room-qr svg')).not.toBeNull();
    const box = () => v.el.querySelector('.room-status') as HTMLElement;
    expect(box().dataset.level).toBe('stable');
    followers = 1;
    relay.hello('phone-a', 'viewer');
    fns.forEach((f) => f(1, null));
    expect(box().dataset.level).toBe('weak'); // the phone is joining
    now += 3000;
    v.draw();
    expect([box().dataset.level, box().textContent]).toEqual(['stable', 'Stable connection2 devices']);
    expect([...v.el.querySelectorAll('tbody tr td:nth-child(2)')].map((td) => td.textContent)).toEqual(['This window', 'Phone 1']);
    local.hello('win-b', 'viewer');
    expect(v.devices()).toBe(3);
    relay.set('closed');
    expect(box().dataset.level).toBe('down');
    expect(v.el.querySelector('tbody tr[data-level="down"]')).not.toBeNull();
    v.leave?.();
  });

  /** Room setup on a fake relay of three devices (R7). */
  function setup(o: { devices?: RelayDevice[]; renew?: (code: string) => void } = {}) {
    let table: RelayDevice[] | null = o.devices ?? [
      dev('p1', { device: 'phonekey0001', rttMs: 18, sinceMs: 4000 }),
      dev('p2', { show: 'monitor', device: 'tabletkey002', rttMs: 35, sinceMs: 5000 }),
      dev('p3', { role: 'instructor', show: null, granted: true, rttMs: 22, sinceMs: 2000 }),
    ];
    const fns = new Set<(n: number, d: RelayDevice[] | null) => void>();
    const opened: string[] = [];
    const local = fakeTransport('open');
    const make = () => roomView({
      code: 'ABC234', relay: 'ws://192.168.1.20:8787/', relayLink: fakeTransport('open'), local, hostPeerId: 'host-1', learnerUrl: 'http://127.0.0.1:5173/?follow=ABC234#/monitor', now: () => 100_000,
      followers: () => table?.filter((x) => x.role !== 'instructor').length ?? 0, onFollowers: (f) => (fns.add(f), () => void fns.delete(f)), devices: () => table,
      info: async () => ({ relay: 'pme', port: 8787, addresses: ['192.168.1.20'], serves: true }), open: (u) => void opened.push(u), ...(o.renew ? { renew: o.renew } : {}),
    });
    const v = make();
    document.body.append(v.el);
    v.enter?.('');
    const tell = (next: RelayDevice[]) => ((table = next), fns.forEach((f) => f(next.length, next)));
    const rows = () => [...v.el.querySelectorAll<HTMLTableRowElement>('.room-table tbody tr')].map((tr) => [tr.dataset.level, ...[...tr.cells].slice(1).map((td) => (td.querySelector('input') as HTMLInputElement | null)?.placeholder ?? td.textContent)]);
    return { v, make, tell, rows, opened, local };
  }

  it('R7 Room setup: the table of a three-device fake relay, the box, and the instructor slot left empty for P7', () => {
    const { v, rows } = setup();
    expect(v.el.querySelector('h1')?.textContent).toBe('Room setup');
    expect((v.el.querySelector('.room-status') as HTMLElement).textContent).toBe('Stable connection4 devices · worst ping 35 ms');
    expect(rows()).toEqual([
      ['stable', 'This window', 'Instructor pages and the monitor', '—', '—', 'now'],
      ['stable', 'Phone 1', 'Learner monitor', 'connected', '18 ms', '4 s ago'],
      ['stable', 'Phone 2', 'Monitor', 'connected', '35 ms', '5 s ago'],
      ['stable', 'Phone 3', 'Instructor remote', 'granted', '22 ms', '2 s ago'],
    ]);
    expect([...v.el.querySelectorAll('.room-table tbody tr')].map((tr) => [(tr as HTMLElement).dataset.show ?? null, (tr as HTMLElement).dataset.device ?? null])).toEqual([[null, null], ['learner', 'phonekey0001'], ['monitor', 'tabletkey002'], [null, null]]);
    expect(v.el.querySelector('.room-legend')?.textContent).toBe('stableweakdisconnectedexpected, not connected');
    expect(v.el.querySelector('.room-rule')?.textContent).toBe("Weak: a ping over 300 ms, or a device that missed one 10 s heartbeat (an engineering choice, not a standard). The ping is the relay's round trip to the device: in the kit, the Wi-Fi.");
    const slot = v.el.querySelector('#room-instructor');
    expect([slot === null, slot?.childNodes.length]).toEqual([false, 0]);
    v.leave?.();
  });

  it("R7 the instructor phone's card (P7, room-instructor.ts) sits in Room setup's `#room-instructor` slot, unchanged", () => {
    const calls: string[] = [];
    const card = { el: h('section', { class: 'room-card ip-room' }, 'instructor card'), draw: () => void calls.push('draw'), enter: () => void calls.push('enter'), leave: () => void calls.push('leave') };
    const v = roomView({ code: 'ABC234', relay: null, relayLink: null, local: fakeTransport('open'), hostPeerId: 'host-1', learnerUrl: 'about:blank', followers: () => 0, onFollowers: () => () => undefined, instructor: card });
    document.body.append(v.el);
    expect(v.el.querySelector('#room-instructor > .ip-room')).toBe(card.el);
    v.enter?.('');
    v.leave?.();
    expect(calls).toContain('enter');
    expect(calls).toContain('leave');
    expect(calls).toContain('draw');
  });

  it('R7 names: edited, kept under the device key across a reload of the page, the absent device grey; "Forget the room" clears them, not the code', () => {
    localStorage.setItem('pme.roomCode', 'ABC234');
    const { v, make, tell, rows } = setup();
    const input = v.el.querySelector<HTMLInputElement>('tr[data-device="phonekey0001"] input.room-name')!;
    expect(input.getAttribute('aria-label')).toBe('Name of Phone 1');
    input.value = 'Bed 3 phone';
    input.dispatchEvent(new Event('change'));
    expect(JSON.parse(localStorage.getItem('pme.roomLayout')!).phonekey0001).toEqual({ name: 'Bed 3 phone', show: 'learner', lastSeen: 100_000 });
    v.leave?.();
    v.el.remove();
    // the next day: the page again, the tablet not here
    const again = make();
    document.body.append(again.el);
    tell([dev('q1', { device: 'phonekey0001', rttMs: 20, sinceMs: 1000 })]);
    const names = () => [...again.el.querySelectorAll<HTMLTableRowElement>('.room-table tbody tr')].map((tr) => (tr.querySelector('input') as HTMLInputElement | null)?.value || tr.cells[1]?.textContent);
    expect(names()).toEqual(['This window', 'Bed 3 phone', '']);
    const grey = again.el.querySelector<HTMLTableRowElement>('tr[data-device="tabletkey002"]')!;
    expect([grey.dataset.level, grey.cells[2]?.textContent, grey.cells[3]?.textContent]).toEqual(['absent', 'Monitor', 'expected, not connected']);
    expect(again.el.querySelector('.room-last')?.textContent).toBe('Last time in this room: 2 devices (1 learner monitor, 1 monitor).');
    (again.el.querySelector('.room-forget') as HTMLButtonElement).click();
    expect(again.el.querySelector('tr[data-device="tabletkey002"]')).toBeNull();
    expect((again.el.querySelector<HTMLInputElement>('tr[data-device="phonekey0001"] input')!).value).toBe('');
    expect(again.el.querySelector('.room-said')?.textContent).toBe('Forgotten: the device names and the windows. The room code ABC234 stays.');
    expect(localStorage.getItem('pme.roomCode')).toBe('ABC234');
    expect(rows().length).toBeGreaterThan(0);
    again.leave?.();
  });

  it('R7 "New room code" asks first; "Keep" keeps it, "Make a new code" hands a new one on', () => {
    const renewed: string[] = [];
    const { v } = setup({ renew: (c) => void renewed.push(c) });
    const ask = v.el.querySelector('dialog.room-renew') as HTMLDialogElement;
    expect(v.el.querySelector('.room-code-now')?.textContent).toBe('ABC234');
    (v.el.querySelector('.room-renew-open') as HTMLButtonElement).click();
    expect(ask.open).toBe(true);
    expect(ask.textContent).toContain('The phones and screens following ABC234 will stay on it');
    ([...ask.querySelectorAll('button')].find((b) => b.textContent === 'Keep ABC234') as HTMLButtonElement).click();
    expect([ask.open, renewed]).toEqual([false, []]);
    (v.el.querySelector('.room-renew-open') as HTMLButtonElement).click();
    ([...ask.querySelectorAll('button')].find((b) => b.textContent === 'Make a new code') as HTMLButtonElement).click();
    expect(ask.open).toBe(false);
    expect(renewed).toHaveLength(1);
    expect(renewed[0]).toMatch(/^[A-Z0-9]{6}$/);
    expect(renewed[0]).not.toBe('ABC234');
    v.leave?.();
  });

  it("R7 the openers on R4's cards: Learner monitor, Monitor and Defibrillator windows (R5), the Ventilator in this window, the chips say which window shows each", () => {
    const { v, opened, local } = setup();
    const cards = () => [...v.el.querySelectorAll<HTMLElement>('.room-openers .join-card')];
    expect(cards().map((c) => [c.dataset.show, c.querySelector('h2')?.textContent, c.querySelector('.st')?.textContent, [...c.querySelectorAll('.btn')].map((b) => b.textContent)])).toEqual([
      ['learner', 'Learner monitor', 'Not open', ['New window']],
      ['monitor', 'Patient monitor', 'This window', ['New window']],
      ['defib', 'Defibrillator', 'Not open', ['New window']],
      ['vent', 'Ventilator', 'On this computer', ['Open here']],
      ['depth', 'Depth of anaesthesia', 'Not available yet', []],
      ['iabp', 'Intra-aortic balloon pump', 'Coming later', []],
    ]);
    expect(v.el.querySelector('.room-openers [data-show="vent"] a')?.getAttribute('href')).toBe('#/vent');
    (v.el.querySelector('.room-openers [data-show="learner"] button') as HTMLButtonElement).click();
    (v.el.querySelector('.room-openers [data-show="monitor"] button') as HTMLButtonElement).click();
    (v.el.querySelector('.room-openers [data-show="defib"] button') as HTMLButtonElement).click();
    expect(opened).toEqual(['http://127.0.0.1:5173/?follow=ABC234#/monitor', 'http://127.0.0.1:5173/?follow=ABC234#/monitor/wide', 'http://127.0.0.1:5173/?follow=ABC234#/defib']);
    local.hello('win-2', 'viewer', 'learner');
    local.hello('win-3', 'viewer', 'monitor');
    local.hello('win-4', 'viewer', 'defib');
    expect(cards().slice(0, 3).map((c) => c.querySelector('.st')?.textContent)).toEqual(['Window 2', 'This window · Window 3', 'Window 4']);
    // kept for "Reopen that layout" the next time
    expect(JSON.parse(localStorage.getItem('pme.roomWindows')!)).toEqual({ learner: 1, monitor: 1, defib: 1 });
    v.leave?.();
    v.el.remove();
    const next = setup();
    expect(next.v.el.querySelector('.room-last')?.textContent).toMatch(/^Last time in this room: 1 monitor window, 1 defibrillator window and 1 learner monitor window on this computer; /);
    const reopen = next.v.el.querySelector('.room-reopen') as HTMLButtonElement;
    expect(reopen.hidden).toBe(false);
    reopen.click();
    expect(next.opened).toEqual(['http://127.0.0.1:5173/?follow=ABC234#/monitor/wide', 'http://127.0.0.1:5173/?follow=ABC234#/defib', 'http://127.0.0.1:5173/?follow=ABC234#/monitor']);
    expect(reopen.hidden).toBe(true);
    next.v.leave?.();
  });
});

describe('Scenarios', () => {
  it('two cards with full-width buttons; the library pins the two demonstrations; Recent shows a Load', async () => {
    const loaded: string[] = [];
    const session = { live: false };
    const v = scenariosView({ session, loadScenario: (c: ScenarioCard) => (loaded.push(c.id), noteRecent(c.id), true) });
    document.body.append(v.el);
    v.enter?.('');
    expect([...v.el.querySelectorAll('.scen-card > a.scen-open')].map((a) => a.textContent)).toEqual(['Open the library', 'Open the builder']);
    expect(v.el.querySelector('.scen-row span')).toBeNull(); // no sentence beside the buttons
    expect(v.el.querySelector('[aria-label="Recent"]')?.textContent).toContain('The cases you load appear here');
    v.enter?.('library');
    const lib = [...v.el.querySelectorAll('.scen-demos h3')].map((e) => e.textContent);
    expect(lib).toHaveLength(DEMO_CARDS.length);
    expect(lib[0]).toMatch(/Malignant hyperthermia/);
    expect(v.el.querySelectorAll('.scen-details summary').length).toBeGreaterThan(10);
    (v.el.querySelector('.scen-demos button[aria-label^="Load Malignant"]') as HTMLButtonElement).click();
    await Promise.resolve();
    expect(loaded).toEqual(['showcase-mh']);
    expect(location.hash).toBe('#/teach2');
    v.enter?.('');
    const recent = v.el.querySelector('[aria-label="Recent"]') as HTMLElement;
    expect(recent.querySelector('.t')?.textContent).toBe('Malignant hyperthermiaDemonstration 1');
    expect(recent.querySelectorAll('button')).toHaveLength(1);
  });
});
