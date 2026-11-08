// Room plan R7 (docs/plans/room-and-instruments.md §7, §4 D8; Q10 ruled 5 November): the remembered layout — device
// names and what each showed, kept under the device's key across days; this computer's windows, for "Reopen that
// layout"; "Forget the room" clears both and never the room code.
import type { RelayDevice } from '@pme/controller';
import { describe, expect, it } from 'vitest';
import { forgetRoom, lastTime, LAYOUT_KEY, MAX_DEVICES, noteDevices, readLayout, readWindows, rename, windowsOf, WINDOWS_KEY, writeLayout, writeWindows } from './room-layout.ts';
import { ROOM_CODE_KEY } from './room-code.ts';
import type { PeerSeen } from './room-status.ts';

const mem = () => {
  const m = new Map<string, string>();
  return { m, get: (k: string) => m.get(k) ?? null, set: (k: string, v: string) => void m.set(k, v) };
};
const dev = (id: string, o: Partial<RelayDevice> = {}): RelayDevice => ({ id, role: 'viewer', show: 'learner', device: null, granted: false, rttMs: 12, sinceMs: 1000, ...o });

describe('the remembered layout', () => {
  it('keeps each keyed viewer with what it shows and when, its name across a new sighting; a Remote or an unkeyed phone is not kept', () => {
    let l = noteDevices({}, [dev('a', { device: 'phonekey0001' }), dev('b', { device: 'tabletkey002', show: 'monitor' }), dev('c'), dev('d', { role: 'controller', show: null })], 1000);
    expect(l).toEqual({ phonekey0001: { name: null, show: 'learner', lastSeen: 1000 }, tabletkey002: { name: null, show: 'monitor', lastSeen: 1000 } });
    l = rename(l, 'phonekey0001', '  Bed 3 phone  ', 2000);
    l = noteDevices(l, [dev('a2', { device: 'phonekey0001', show: 'monitor' })], 3000);
    expect(l.phonekey0001).toEqual({ name: 'Bed 3 phone', show: 'monitor', lastSeen: 3000 });
    expect(rename(l, 'phonekey0001', '   ', 4000).phonekey0001?.name).toBeNull(); // empty: the default name again
    expect(rename(l, 'not a key!', 'x', 4000)).toBe(l);
    expect(rename(l, 'phonekey0001', 'x'.repeat(50), 4000).phonekey0001?.name).toHaveLength(32);
  });

  it('R5d: keeps a keyed learner defibrillator window (role defib) as showing the defibrillator, its name across sightings', () => {
    let l = noteDevices({}, [dev('w', { role: 'defib', show: null, device: 'defibkey0001' })], 1000);
    expect(l).toEqual({ defibkey0001: { name: null, show: 'defib', lastSeen: 1000 } });
    l = noteDevices(rename(l, 'defibkey0001', 'bed 2', 1500), [dev('w2', { role: 'defib', show: 'defib', device: 'defibkey0001' })], 2000);
    expect(l.defibkey0001).toEqual({ name: 'bed 2', show: 'defib', lastSeen: 2000 });
  });

  it('round-trips through the store and drops what is not its own; at most 64 devices, the newest kept', () => {
    const s = mem();
    writeLayout(s, noteDevices({}, [dev('a', { device: 'phonekey0001' })], 5));
    expect(readLayout(s)).toEqual({ phonekey0001: { name: null, show: 'learner', lastSeen: 5 } });
    s.set(LAYOUT_KEY, JSON.stringify({ phonekey0001: { name: 'A', show: 'bis', lastSeen: 7 }, 'BAD KEY': { lastSeen: 1 }, abcdefgh1234: { name: 3 } }));
    expect(readLayout(s)).toEqual({ phonekey0001: { name: 'A', show: null, lastSeen: 7 } });
    s.set(LAYOUT_KEY, '{not json');
    expect(readLayout(s)).toEqual({});
    const many = Array.from({ length: 70 }, (_, i) => dev(`p${i}`, { device: `devicekey${String(i).padStart(3, '0')}` }));
    let l = {};
    many.forEach((d, i) => (l = noteDevices(l, [d], i)));
    expect(Object.keys(l)).toHaveLength(MAX_DEVICES);
    expect(Object.keys(l)).not.toContain('devicekey000'); // the oldest six went
    expect(Object.keys(l)).toContain('devicekey069');
  });

  it("this computer's windows by what they show, kept only when one is open; Forget the room clears both and leaves the code", () => {
    const s = mem();
    const local = (id: string, show: PeerSeen['show'], role: PeerSeen['role'] = 'viewer'): PeerSeen => ({ id, via: 'local', role, show, firstAt: 0, lastAt: 0 });
    const w = windowsOf([local('w1', 'learner'), local('w2', 'monitor'), local('w3', null), local('w4', 'defib'), local('r', null, 'controller'), { ...local('p', 'learner'), via: 'relay' }]);
    expect(w).toEqual({ learner: 2, monitor: 1, defib: 1 });
    writeWindows(s, {});
    expect(s.get(WINDOWS_KEY)).toBeNull();
    writeWindows(s, w);
    expect(readWindows(s)).toEqual({ learner: 2, monitor: 1, defib: 1 });
    s.set(ROOM_CODE_KEY, 'ABC234');
    writeLayout(s, { phonekey0001: { name: 'Bed 3', show: 'learner', lastSeen: 1 } });
    forgetRoom(s);
    expect([readLayout(s), readWindows(s), s.get(ROOM_CODE_KEY)]).toEqual([{}, {}, 'ABC234']);
  });

  it('"Last time in this room": the windows of this computer and the devices, or nothing', () => {
    expect(lastTime({}, {})).toBeNull();
    expect(lastTime({ a: { name: null, show: 'learner', lastSeen: 1 }, b: { name: 'X', show: 'learner', lastSeen: 1 }, c: { name: null, show: 'monitor', lastSeen: 1 } }, { monitor: 1, learner: 2 }))
      .toBe('Last time in this room: 1 monitor window and 2 learner monitor windows on this computer; 3 devices (2 learner monitors, 1 monitor).');
    expect(lastTime({}, { learner: 1 })).toBe('Last time in this room: 1 learner monitor window on this computer.');
  });
});
