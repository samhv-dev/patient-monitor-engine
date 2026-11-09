// @vitest-environment happy-dom
// Room plan R8d: Room setup's Ventilator card opens the cockpit in a window of its own on this computer
// (`vent-hamilton.html?link=<code>`, over BroadcastChannel, no PIN), beside "Open here" (the Ventilator view); the device
// table says where the ventilator is and whether it drives: "Ventilator · driving" or "handed over", for the laptop
// window and for a tablet the relay lists with the `ventilator` role.
import type { ManagedTransport, RelayDevice, TransportStatus } from '@pme/controller';
import { describe, expect, it } from 'vitest';
import { deviceRows } from '../room-status.ts';
import { roomView } from './room.ts';

const quiet = (status: TransportStatus = 'open'): ManagedTransport => ({ kind: 'websocket', status, send: () => undefined, close: () => undefined, onMessage: () => () => undefined, onStatus: (fn: (s: TransportStatus) => void) => (fn(status), () => undefined) }) as unknown as ManagedTransport;
const base = { code: 'ABC234', relay: null, relayLink: null, local: quiet(), hostPeerId: 'host-1', learnerUrl: 'http://127.0.0.1:1/?follow=ABC234#/monitor', followers: () => 0, onFollowers: () => () => undefined };
const tablet = (granted: boolean): RelayDevice => ({ id: 'vent-1.1', role: 'ventilator', show: null, device: null, granted, rttMs: 12, sinceMs: 500 });

describe("R8d: the ventilator's own screen on Room setup", () => {
  it('the Ventilator card opens the cockpit in a new window, by the room code over BroadcastChannel; "Open here" stays', () => {
    const opened: string[] = [];
    const v = roomView({ ...base, open: (u) => void opened.push(u) });
    document.body.replaceChildren(v.el);
    const card = v.el.querySelector('.room-openers .join-card[data-show="vent"]') as HTMLElement;
    const win = [...card.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Ventilator in a new window') as HTMLButtonElement;
    expect(win.textContent).toBe('New window');
    expect(card.querySelector('a')?.textContent).toBe('Open here');
    win.click();
    expect(opened).toEqual(['/vent-hamilton.html?link=ABC234']);
    expect(opened[0]).not.toMatch(/pin/i);
  });

  it('the laptop window is a row of this computer: Ventilator · driving, then handed over', () => {
    const rows = (window: 'driving' | 'handed over' | null) =>
      deviceRows({ relay: 'none', phones: 0, peers: [], now: 0, devices: null, vent: { window, device: null } }).filter((r) => r.showing === 'Ventilator');
    expect(rows(null)).toEqual([]);
    expect(rows('driving')).toMatchObject([{ name: 'Ventilator window', where: 'this computer', showing: 'Ventilator', state: 'driving', level: 'stable' }]);
    expect(rows('handed over')).toMatchObject([{ state: 'handed over' }]);
  });

  it("a granted tablet says driving or handed over; one signing in says so; the relay's own row otherwise", () => {
    const state = (granted: boolean, device: 'driving' | 'handed over' | null) =>
      deviceRows({ relay: 'open', phones: 0, peers: [], now: 0, devices: [tablet(granted)], vent: { window: null, device } }).find((r) => r.showing === 'Ventilator')?.state;
    expect(state(true, 'driving')).toBe('driving');
    expect(state(true, 'handed over')).toBe('handed over');
    expect(state(false, null)).toBe('signing in');
    expect(state(true, null)).toBe('granted');
    // an app that reports no cockpit (an older page) keeps R2's words
    expect(deviceRows({ relay: 'open', phones: 0, peers: [], now: 0, devices: [tablet(true)] }).find((r) => r.showing === 'Ventilator')?.state).toBe('granted');
  });

  it("the Room table draws the session's ventilator states", () => {
    let vent: { window: 'driving' | 'handed over' | null; device: 'driving' | 'handed over' | null } = { window: 'driving', device: null };
    const v = roomView({ ...base, vent: () => vent });
    document.body.replaceChildren(v.el);
    const row = () => [...v.el.querySelectorAll('.room-table tbody tr')].find((r) => r.textContent?.includes('Ventilator window'))?.textContent;
    expect(row()).toContain('driving');
    vent = { window: 'handed over', device: null };
    v.draw();
    expect(row()).toContain('handed over');
  });
});
