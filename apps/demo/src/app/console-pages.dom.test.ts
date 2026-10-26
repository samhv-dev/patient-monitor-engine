// @vitest-environment happy-dom
// E125: the app opens on Home; the workflow rail marks the current page and its switch saves the light/dark screen;
// the pages before a session (Home, Room, Scenarios, Patient) have no stage and no session bar, the Instructor and
// Monitor views do; the Room's status box says Stable / Weak / Disconnected; a Load shows in the Scenarios' Recent.
import type { ManagedTransport, TransportStatus, WireMessage } from '@pme/controller';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FOOTER_LINE } from './about.ts';
import { persianDate, Rail, railClock } from './rail.ts';
import { noteRecent } from './recent.ts';
import { roomStatus, PeerLog } from './room-status.ts';
import { parseRoute, type RouteId } from './router.ts';
import type { ScenarioCard } from './scenarios.ts';
import { Shell, type View } from './shell.ts';
import { DEFAULT_SITE, loadSite, setLightScreen } from './site.ts';
import { homeView } from './views/home.ts';
import { roomView } from './views/room.ts';
import { DEMO_CARDS, scenariosView } from './views/scenarios.ts';
import { Meters } from './meters.ts';

const view = (id: RouteId): View => ({ id, el: document.createElement('section') });
const ALL: RouteId[] = ['home', 'room', 'scenarios', 'patient', 'teach', 'monitor', 'explore', 'debrief'];

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
    shell.show({ id: 'teach', sub: '' });
    expect(current()).toEqual(['teach']);
    shell.show({ id: 'home', sub: '' });
    expect(current()).toEqual(['home']);
    expect(rail.el.querySelectorAll('.rail-hr')).toHaveLength(4); // groups parted by lines, no captions
    rail.destroy();
  });

  it('hides the stage and the session bar on the pages before a session, shows them on the Instructor and Monitor views', () => {
    const { shell } = shellWithRail();
    for (const id of ['home', 'room', 'scenarios', 'patient'] as const) {
      shell.show({ id, sub: '' });
      expect([shell.stage.hidden, shell.bar.hidden], id).toEqual([true, true]);
    }
    for (const id of ['teach', 'monitor'] as const) {
      shell.show({ id, sub: '' });
      expect([shell.stage.hidden, shell.bar.hidden], id).toEqual([false, false]);
    }
  });

  it('carries the disclaimer as a footer line; a learner window has none', () => {
    shellWithRail();
    expect(document.querySelector('.app-foot')?.textContent).toBe(FOOTER_LINE);
    expect(FOOTER_LINE).toBe('For educational use only; Not to be used in patient care.');
    document.body.replaceChildren();
    new Shell(document.body, { hostless: false, follower: true });
    expect(document.querySelector('.app-foot')).toBeNull();
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

  it('the clock: the time on one line, the date (with the Persian date where the browser has it) on the next', () => {
    const [time, date] = railClock(new Date(2026, 9, 26, 21, 48));
    expect(time).toBe('21:48');
    expect(date).toMatch(/^Mon 26 Oct/);
    if (persianDate(new Date(2026, 9, 26))) expect(date).toContain('4 Aban 1405');
  });
});

describe('Home', () => {
  it('one button to the Room, the repository, the tiles CPU · Memory · Engine', () => {
    const v = homeView({ meters: new Meters() });
    document.body.append(v.el);
    expect(v.el.querySelector('h1')?.textContent).toBe('Patient monitor simulator');
    expect([...v.el.querySelectorAll('.btn')].map((b) => [b.textContent, b.getAttribute('href')])).toEqual([['Start here', '#/room']]);
    expect(v.el.querySelector('code')?.textContent).toBe('github.com/samhv-dev/patient-monitor-engine');
    expect([...v.el.querySelectorAll('.home-k')].map((e) => e.textContent)).toEqual(['CPU, this app', 'Memory', 'Engine']);
    expect(v.el.querySelector('[data-about]')?.textContent).toMatch(/^Version \S+ · (pre-release · )?build \S+$/);
  });
});

/** A transport the test drives: its status and the messages that arrive on it. */
function fakeTransport(status: TransportStatus = 'open') {
  const msg = new Set<(m: WireMessage) => void>();
  const st = new Set<(s: TransportStatus) => void>();
  const t = {
    kind: 'websocket', status, send: () => undefined, close: () => undefined,
    onMessage: (fn: (m: WireMessage) => void) => (msg.add(fn), () => void msg.delete(fn)),
    onStatus: (fn: (s: TransportStatus) => void) => (st.add(fn), fn(t.status), () => void st.delete(fn)),
    hello: (from: string, role: 'viewer' | 'controller') => msg.forEach((fn) => fn({ v: 1, session: 'ABC234', from, seq: 1, sentAt: 0, kind: 'hello', role } as WireMessage)),
    set: (s: TransportStatus) => ((t.status = s), st.forEach((fn) => fn(s))),
  };
  return t as typeof t & ManagedTransport;
}

describe('Room', () => {
  it('status: stable, weak while a phone catches up, disconnected without the relay', () => {
    const log = new PeerLog();
    log.heard('p1', 'relay', 'viewer', 0);
    expect(roomStatus({ relay: 'open', phones: 1, peers: log.list(), now: 5000 })).toMatchObject({ level: 'stable', title: 'Stable connection', sub: '2 devices' });
    log.heard('p1', 'relay', 'viewer', 4500);
    expect(roomStatus({ relay: 'open', phones: 1, peers: log.list(), now: 5000 }).level).toBe('weak');
    expect(roomStatus({ relay: 'down', phones: 1, peers: log.list(), now: 5000 })).toMatchObject({ level: 'down', title: 'Disconnected' });
    expect(roomStatus({ relay: 'none', phones: 0, peers: [], now: 0 })).toMatchObject({ level: 'down', sub: '1 device · no relay: phones cannot join' });
  });

  it('the status box and the table follow the phones and the relay socket', async () => {
    let now = 10_000;
    let followers = 0;
    const fns = new Set<(n: number) => void>();
    const relay = fakeTransport('open');
    const local = fakeTransport('open');
    const v = roomView({
      code: 'ABC234', relay: 'ws://192.168.1.20:8787/', relayLink: relay, local, hostPeerId: 'host-1', learnerUrl: 'about:blank', now: () => now,
      followers: () => followers, onFollowers: (f) => (fns.add(f), () => void fns.delete(f)),
      info: async () => ({ relay: 'pme', port: 8787, addresses: ['192.168.1.20'], serves: true }),
    });
    document.body.append(v.el);
    v.enter?.('');
    await vi.waitFor(() => expect(v.el.querySelector('.phones-url')?.textContent).toBe('http://192.168.1.20:8787/?join=ABC234'));
    expect(v.el.querySelector('.room-qr svg')).not.toBeNull();
    const box = () => v.el.querySelector('.room-status') as HTMLElement;
    expect(box().dataset.level).toBe('stable');
    followers = 1;
    relay.hello('phone-a', 'viewer');
    fns.forEach((f) => f(1));
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
    expect(location.hash).toBe('#/teach');
    v.enter?.('');
    const recent = v.el.querySelector('[aria-label="Recent"]') as HTMLElement;
    expect(recent.querySelector('.t')?.textContent).toBe('Malignant hyperthermiaDemonstration 1');
    expect(recent.querySelectorAll('button')).toHaveLength(1);
  });
});
