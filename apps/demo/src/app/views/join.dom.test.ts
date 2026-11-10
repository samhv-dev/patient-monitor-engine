// @vitest-environment happy-dom
// Plan room-and-instruments.md R4 (Q1 ruled 5 November): the device that scans the room's QR opens the instrument picker
// (the owner's mock-up m5, docs/plans/room-and-instruments/mockup/), Learner monitor first and preselected, one tap; the
// follower it opens says what it shows on every hello. The card words are ONE literal below, so a change of wording is
// a reviewed diff (the owner rules the final words; the PR lists each change from m5).
import { createStamper, type ManagedTransport, type TransportStatus, type WireBody, type WireMessage } from '@pme/controller';
import { engineKey } from '@pme/engine-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const CODE = 'GP3P4G';
const net = vi.hoisted(() => ({ listeners: [] as Array<(m: unknown) => void>, sent: [] as unknown[], monitor: [] as Array<Record<string, unknown>> }));
vi.mock('@pme/controller', async (orig) => {
  const real = await orig<typeof import('@pme/controller')>();
  const fake = (): ManagedTransport => ({
    kind: 'websocket',
    status: 'open',
    send: (m) => void net.sent.push(m),
    onMessage: (fn) => (net.listeners.push(fn as (m: unknown) => void), () => void net.listeners.splice(net.listeners.indexOf(fn as (m: unknown) => void), 1)),
    onStatus: (fn: (s: TransportStatus) => void) => (fn('open'), () => {}),
    close: () => {},
  });
  return { ...real, createWebSocketTransport: fake, createBroadcastChannelTransport: fake };
});
vi.mock('@pme/renderer', () => ({
  version: '0.0.0-test',
  mountMonitor: (_host: unknown, o: Record<string, unknown>) => {
    net.monitor.push(o);
    let tick = 0;
    const clock = { restore: (s: { tick: number }) => void (tick = s.tick), dispatch: () => ({ accepted: true, tick }), on: () => () => {}, renderT: () => tick * 0.02, tick: () => tick, setRate: () => {}, setPaused: () => {}, jumpTo: () => {} };
    return { soundOn: false, viewerClock: () => Promise.resolve(clock), destroy: () => {}, setSkin: () => Promise.resolve(), setPortrait: () => {}, disableSound: () => {}, enableSound: () => Promise.resolve(), silenceAudio: () => false };
  },
}));

const { pickerView, PICKER_WORDS, deviceKey } = await import('./join.ts');
const { mountFollower } = await import('./follower.ts');
const { DEFAULT_SITE } = await import('../site.ts');

/** The picker's words: m5's where the product does what they say, changed where it does not (PR body: each change). */
const WORDS = {
  title: 'Choose what this screen shows',
  lead: 'Each screen in the room is one instrument. Choose the one this screen shows.',
  codeLabel: 'Room code',
  action: 'Show here',
  lastHere: 'Last on this device',
  ready: 'Ready',
  cards: [
    { show: 'learner', title: 'Learner monitor', chip: 'Ready', text: 'This phone follows the patient monitor.', foot: 'Upright on a phone', action: true },
    { show: 'monitor', title: 'Patient monitor', chip: 'Ready', text: "ECG, pressures, SpO₂, capnography and temperature in the room's monitor style.", foot: 'Sideways, the whole screen', action: true },
    // R8d: the ventilator on a tablet, signed in with the instructor's PIN (m5's card; its chip and foot say how)
    { show: 'vent', title: 'Ventilator', chip: "With the instructor's PIN", text: 'Modes, settings, pressure and flow loops, with the lung mechanics of the loaded patient.', foot: 'A tablet drives the patient', action: true },
    { show: 'depth', title: 'Depth of anaesthesia', chip: 'Coming later', text: 'The engine simulates the EEG and reads it as a processed-EEG monitor; its screen in the room is still to come.', foot: 'Not in this release', action: false },
    { show: 'iabp', title: 'Intra-aortic balloon pump', chip: 'Coming later', text: "Timing, augmentation and the arterial trace with the balloon's effect.", foot: 'Not in this release', action: false },
  ],
};

const memory = (init: Record<string, string> = {}) => {
  const m = new Map(Object.entries(init));
  return { get: (k: string) => m.get(k) ?? null, set: (k: string, v: string) => void m.set(k, v), m };
};
const cards = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('.join-card')];
const read = (c: HTMLElement) => ({
  show: c.dataset.show,
  title: c.querySelector('h2')?.textContent,
  chip: c.querySelector('.st')?.textContent,
  text: c.querySelector('p')?.textContent,
  foot: c.querySelector('.join-foot')?.textContent,
  action: !!c.querySelector('button'),
});

describe('the instrument picker at #/pick (R4)', () => {
  beforeEach(() => document.body.replaceChildren());

  it("shows m5's cards in m5's order with Learner monitor first, in the words above", () => {
    const el = pickerView({ code: CODE, store: memory(), go: () => {}, parent: document.body });
    expect(PICKER_WORDS).toEqual(WORDS);
    expect(el.querySelector('h1')?.textContent).toBe(WORDS.title);
    expect(el.querySelector('.join-lead')?.textContent).toBe(WORDS.lead);
    expect(el.querySelector('.join-code .small')?.textContent).toBe(WORDS.codeLabel);
    expect(el.querySelector('.join-code .code')?.textContent).toBe(CODE);
    expect(cards(el).map(read)).toEqual(WORDS.cards);
    for (const c of cards(el)) {
      // each card has its drawing, inline: no image, no external font
      const svg = c.querySelector('.join-pic svg');
      expect(svg, c.dataset.show).not.toBeNull();
      expect(svg?.outerHTML).not.toMatch(/<text|<image|href=|font-family/);
      const b = c.querySelector('button');
      if (b) expect(b.textContent).toBe(WORDS.action);
    }
  });

  it('Defibrillator and Instructor remote are not offered yet (R5 and P7 have not merged)', () => {
    const el = pickerView({ code: CODE, store: memory(), go: () => {} });
    const titles = cards(el).map((c) => c.querySelector('h2')?.textContent);
    expect(titles).not.toContain('Defibrillator');
    expect(titles).not.toContain('Instructor remote');
    expect(el.textContent).not.toMatch(/tick what they noticed|SQI|EMG|BIS/);
    // R8d: the PIN is named on the Ventilator card only (the card that signs in with it), never asked for here
    for (const c of cards(el)) if (c.dataset.show !== 'vent') expect(c.textContent, c.dataset.show).not.toMatch(/PIN/);
    expect(el.querySelector('input')).toBeNull();
  });

  it('Learner monitor is preselected and focused; one tap opens it, and the choice is kept on this device', () => {
    const store = memory();
    const go = vi.fn();
    const el = pickerView({ code: CODE, store, go, parent: document.body });
    const first = cards(el)[0] as HTMLElement;
    expect(first.dataset.selected).toBe('true');
    expect(cards(el).filter((c) => c.dataset.selected === 'true')).toHaveLength(1);
    expect(document.activeElement).toBe(first.querySelector('button'));
    expect(go).not.toHaveBeenCalled();
    (first.querySelector('button') as HTMLButtonElement).click();
    expect(store.m.get('instrument')).toBe('learner');
    expect(go).toHaveBeenCalledExactlyOnceWith('#/monitor');
  });

  it('the last choice is preselected next time and marked, never applied without a tap', () => {
    const store = memory({ instrument: 'monitor' });
    const go = vi.fn();
    const el = pickerView({ code: CODE, store, go, parent: document.body });
    const [learner, monitor] = cards(el) as [HTMLElement, HTMLElement];
    expect(learner.dataset.show).toBe('learner'); // the order stays m5's
    expect(monitor.dataset.selected).toBe('true');
    expect(learner.dataset.selected).toBeUndefined();
    expect(monitor.querySelector('.st')?.textContent).toBe(WORDS.lastHere);
    expect(monitor.querySelector('.st')?.classList.contains('on')).toBe(true);
    expect(learner.querySelector('.st')?.classList.contains('on')).toBe(false);
    expect(document.activeElement).toBe(monitor.querySelector('button'));
    expect(go).not.toHaveBeenCalled();
    (monitor.querySelector('button') as HTMLButtonElement).click();
    expect(go).toHaveBeenCalledExactlyOnceWith('#/monitor/wide');
  });

  it('a stored value that is not an instrument this device can show preselects the learner monitor', () => {
    for (const bad of ['depth', 'vent', 'defib', 'x', ''])
      expect(cards(pickerView({ code: CODE, store: memory({ instrument: bad }), go: () => {} }))[0]?.dataset.selected, bad).toBe('true');
  });

  it("R8d: the Ventilator's Show here opens the ventilator's own page for this room (its PIN form), the code and relay only", () => {
    const store = memory();
    const go = vi.fn();
    const open = vi.fn();
    const el = pickerView({ code: CODE, store, go, open, here: { pathname: '/', search: `?join=${CODE}&relay=ws%3A%2F%2F10.0.0.2%3A8787%2F` } });
    (el.querySelector('.join-card[data-show="vent"] button') as HTMLButtonElement).click();
    expect(open).toHaveBeenCalledExactlyOnceWith(`/vent-hamilton.html?join=${CODE}&relay=ws%3A%2F%2F10.0.0.2%3A8787%2F#/vent`);
    expect(go).not.toHaveBeenCalled();
    // the picker grants nothing: the PIN is typed on the ventilator's page; the choice is not preselected next time
    expect(store.m.get('instrument')).toBeUndefined();
  });

  it('the Depth of anaesthesia and balloon pump cards have no action; each says why in its chip', () => {
    const el = pickerView({ code: CODE, store: memory(), go: () => {} });
    for (const show of ['depth', 'iabp']) {
      const c = el.querySelector(`.join-card[data-show="${show}"]`) as HTMLElement;
      expect(c.querySelector('button, a'), show).toBeNull();
      expect(c.querySelector('.st')?.textContent, show).not.toBe('');
    }
  });

  it("the device key: 8 to 16 of [a-z0-9], kept in the device's store, the same next time", () => {
    const store = memory();
    const k = deviceKey(store);
    expect(k).toMatch(/^[a-z0-9]{8,16}$/);
    expect(deviceKey(store)).toBe(k);
    expect(store.m.get('device')).toBe(k);
    const other = memory({ device: 'NOT A KEY' }); // an invalid stored key is replaced
    expect(deviceKey(other)).toMatch(/^[a-z0-9]{8,16}$/);
  });
});

describe("the follower says what it shows (R4, §4 D1: the page wraps its transport's hello)", () => {
  let destroy = () => {};
  beforeEach(() => {
    net.listeners.length = 0;
    net.sent.length = 0;
    net.monitor.length = 0;
    document.body.replaceChildren();
  });
  afterEach(() => destroy());
  const mount = async (show: 'learner' | 'monitor', relay = true) => {
    const stage = document.createElement('div');
    const monitorHost = document.createElement('div');
    const bar = document.createElement('div');
    document.body.append(stage, monitorHost, bar);
    const f = mountFollower({ stage, monitorHost } as never, DEFAULT_SITE, CODE, bar, relay ? { relay: 'ws://relay.test/' } : undefined, { show, device: 'k3x9q2m7' });
    await vi.waitFor(() => expect(f.sync).not.toBeNull());
    destroy = () => f.destroy();
    return { f, bar };
  };
  const hellos = () => (net.sent as WireMessage[]).filter((m) => m.kind === 'hello');

  it('every hello it sends carries its show and its device key, the first and each re-said one', async () => {
    await mount('learner');
    const stamp = createStamper(CODE, 'host-aaaaaa', () => Date.now());
    const host = (b: WireBody) => net.listeners.forEach((fn) => fn(stamp(b)));
    host({ kind: 'hello', role: 'host' }); // a (re)loaded host: the viewer says hello again
    host({ kind: 'snapshot', body: { schema: 'pme-snapshot/1', engineVersion: engineKey, seed: 7, tick: 3000, state: {} } as never });
    host({ kind: 'event', body: [{ type: 'timeline', t: 60, cause: 'restart' } as never] }); // a new timeline: hello again
    await vi.waitFor(() => expect(hellos().length).toBeGreaterThanOrEqual(2));
    for (const m of hellos()) expect(m).toMatchObject({ kind: 'hello', role: 'viewer', show: 'learner', device: 'k3x9q2m7' });
    expect((net.sent as WireMessage[]).filter((m) => m.kind !== 'hello').every((m) => !('show' in m) && !('device' in m))).toBe(true);
  });

  it('the learner monitor is upright on a phone; the patient monitor is landscape and does not turn', async () => {
    await mount('monitor');
    expect(net.monitor.at(-1)).toMatchObject({ portrait: false, role: 'viewer' });
    expect(hellos()[0]).toMatchObject({ show: 'monitor' });
  });

  it('a "Change" link in the follower bar returns to #/pick', async () => {
    const { bar } = await mount('learner');
    const change = bar.querySelector<HTMLAnchorElement>('a.follower-change');
    expect(change?.textContent).toBe('Change');
    expect(change?.getAttribute('href')).toBe('#/pick');
  });
});
