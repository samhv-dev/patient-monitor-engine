// @vitest-environment happy-dom
// Room plan R5b: Room setup's "Defibrillator in this room" (owner's Q6 ruling, 5 November). One model, the generic one,
// and the line that keeps the hook for the department's own machine. It sits in a card of its own on today's Room page
// (R7, the Room page proper, is not built yet).
import { createStamper, type ManagedTransport, type TransportStatus, type WireMessage } from '@pme/controller';
import { describe, expect, it } from 'vitest';
import { roomView } from './room.ts';

const quiet = (): ManagedTransport => ({ kind: 'broadcastChannel', status: 'open', send: () => undefined, close: () => undefined, onMessage: () => () => undefined, onStatus: (fn: (s: TransportStatus) => void) => (fn('open'), () => undefined) }) as unknown as ManagedTransport;

describe("R5b: Room setup's defibrillator choice", () => {
  it('shows the generic model with its values and "not named yet" for the department\'s machine; a choice is handed to the session', () => {
    let model: string | null = null;
    const chosen: Array<string | null> = [];
    const v = roomView({
      code: 'ABC234', relay: null, relayLink: null, local: quiet(), hostPeerId: 'host-1', learnerUrl: 'about:blank',
      followers: () => 0, onFollowers: () => () => undefined,
      defib: { model: () => model, choose: (m) => void (chosen.push(m), (model = m)) },
    });
    document.body.replaceChildren(v.el);
    const card = v.el.querySelector('.room-defib') as HTMLElement;
    expect(card.querySelector('h2')?.textContent).toBe('Defibrillator in this room');
    const sel = card.querySelector('select') as HTMLSelectElement;
    expect([...sel.options].map((o) => [o.value, o.textContent])).toEqual([
      ['', "Not chosen: the monitor style's own values"],
      ['generic', 'Generic defibrillator: 120 J adult, 50 J paediatric; pacer 70 ppm, PAUSE at 0 mA'], // row 58: the pacer too
    ]);
    expect(sel.value).toBe('');
    expect(card.textContent).toContain("Your department's machine: not named yet");
    sel.value = 'generic';
    sel.dispatchEvent(new Event('change'));
    expect(chosen).toEqual(['generic']);
    sel.value = '';
    sel.dispatchEvent(new Event('change'));
    expect(chosen).toEqual(['generic', null]);
    expect(card.textContent).toContain('from the next patient start');
  });
  it('without the session\'s choice (a page that does not pass one) there is no card', () => {
    const v = roomView({ code: 'ABC234', relay: null, relayLink: null, local: quiet(), hostPeerId: 'host-1', learnerUrl: 'about:blank', followers: () => 0, onFollowers: () => () => undefined });
    expect(v.el.querySelector('.room-defib')).toBeNull();
  });
});

describe("R5d + R8d: a defibrillator window on this computer is listed and kept for the layout", () => {
  /** A link that delivers the hellos the test says. */
  const link = (kind: 'broadcastChannel' | 'websocket') => {
    const fns = new Set<(m: WireMessage) => void>();
    const t = { kind, status: 'open', send: () => undefined, close: () => undefined, onMessage: (fn: (m: WireMessage) => void) => (fns.add(fn), () => void fns.delete(fn)), onStatus: (fn: (s: TransportStatus) => void) => (fn('open'), () => undefined) } as unknown as ManagedTransport;
    const hello = (from: string, body: Record<string, unknown>) => fns.forEach((fn) => fn(createStamper('ABC234', from)({ kind: 'hello', ...body } as never)));
    return { t, hello };
  };
  const memory = () => {
    const m = new Map<string, string>();
    return { get: (k: string) => m.get(k) ?? null, set: (k: string, v: string) => void m.set(k, v) };
  };

  it("a local `defib` hello is a row of this computer, the Defibrillator card's window, and one window to reopen next time", () => {
    const store = memory();
    const local = link('broadcastChannel');
    const relay = link('websocket');
    const opened: string[] = [];
    const deps = { code: 'ABC234', relay: 'ws://relay.test/', relayLink: relay.t, local: local.t, hostPeerId: 'host-1', learnerUrl: 'http://127.0.0.1:5173/?follow=ABC234#/monitor', followers: () => 0, onFollowers: () => () => undefined, store, open: (u: string) => void opened.push(u), info: () => Promise.resolve(null) };
    const v = roomView(deps);
    document.body.replaceChildren(v.el);
    local.hello('win-d1', { role: 'defib', show: 'defib' });
    relay.hello('tab-d2', { role: 'defib', show: 'defib' }); // over the relay: the relay's table lists it, not this computer
    const rows = [...v.el.querySelectorAll('.room-table tbody tr')].map((r) => r.textContent ?? '');
    expect(rows.filter((r) => r.includes('Defibrillator') && r.includes('this computer'))).toHaveLength(1);
    expect(v.el.querySelector('.room-openers [data-show="defib"] .st')?.textContent).toBe('Window 2');
    v.leave?.();
    const next = roomView({ ...deps, open: (u: string) => void opened.push(u) });
    const reopen = next.el.querySelector('.room-reopen') as HTMLButtonElement;
    expect(reopen.hidden).toBe(false);
    reopen.click();
    expect(opened).toEqual(['http://127.0.0.1:5173/?follow=ABC234#/defib']);
  });
});
