// The defibrillator core (plan defibrillator-zoll-m2.md §4.2, piece F0) with a fake driver and a fake face: a press
// becomes the face table's command; the view follows the status; the Trim Knob's pending value is sent on the knob's
// press and dropped at the face's time-out, as the ventilator's (vent/core/pending.ts) is; the quick-key levels and the
// menu stack are the core's, never the face's.
import { createEngine, M2_ENERGIES_J, type Command, type M2Status } from '@pme/engine-core';
import { describe, expect, it } from 'vitest';
import { createDefibCore } from './core.ts';
import type { DefibCommand, DefibDriver, DefibFaceSpec, DefibStatusIn } from './types.ts';

const ev = (action: string): DefibCommand => ({ type: 'applyEvent', event: { kind: 'defib', action } });
const status = (energyJ: number, state: 'idle' | 'charging' | 'ready', o: Partial<DefibStatusIn> = {}): DefibStatusIn => ({
  defib: { energyJ, state, sync: false, readyAt: null, shocks: 0, lastShock: null },
  pacer: { mode: 'off', ratePpm: 70, mA: 0, paused: false },
  ...o,
});

function fakeDriver() {
  const sent: Array<[string, DefibCommand]> = [];
  const statusFns = new Set<(s: DefibStatusIn) => void>();
  const ackFns = new Set<(id: string, ok: boolean, reason?: string) => void>();
  let n = 0;
  const d: DefibDriver = {
    send: (c) => (sent.push([`c${++n}`, c]), `c${n}`),
    onStatus: (fn) => (statusFns.add(fn), () => void statusFns.delete(fn)),
    onAck: (fn) => (ackFns.add(fn), () => void ackFns.delete(fn)),
  };
  return {
    d, sent,
    status: (s: DefibStatusIn) => statusFns.forEach((fn) => fn(s)),
    ack: (id: string, ok: boolean, reason?: string) => ackFns.forEach((fn) => fn(id, ok, reason)),
    listeners: () => statusFns.size + ackFns.size,
  };
}

/** A face whose energy field steps through the model's list, and whose Shock sends its down and up phases. */
const FACE: DefibFaceSpec = {
  id: 'fake', label: 'Fake',
  levels: { defib: [['lead', 'sync', 'more'], ['alarms', 'back']], monitor: [['lead', 'more'], ['back']] },
  keys: {
    charge: (p) => (p === 'click' ? ev('charge') : null),
    shock: (p) => (p === 'click' ? null : { type: 'device', action: { device: 'defib', action: 'shockButton', value: { phase: p, button: 'panel' } } }),
    sync: (p, v) => (p === 'click' ? ev(v.defib?.sync ? 'syncOff' : 'syncOn') : null),
  },
  menuRoot: 'settings',
  cursor: (v) => (v.menu.at(-1) === 'settings' ? ['ecg', 'x'] : ['energy', 'hr']),
  fields: {
    energy: { setting: { values: (v) => v.energiesJ ?? [], read: (v) => v.defib?.energyJ ?? 0, command: (j) => ({ type: 'applyEvent', event: { kind: 'defib', action: 'selectEnergy', energyJ: j } }) } },
    hr: { menu: 'hr' },
    ecg: { menu: 'ecg' },
    x: { close: true },
  },
  revertMs: 10_000,
};
/** A real engine's M2 status (the room's model set to the M2, as the host sends it at mount), at its selector. */
const M2_IDLE: M2Status = (() => {
  const e = createEngine({ seed: 1, device: { skin: 'saadat-like' } });
  let got: M2Status | undefined;
  e.on((x) => void (x.type === 'deviceStatus' && x.m2 && (got = x.m2)), ['deviceStatus']);
  e.dispatch({ id: 'm', issuedBy: 'instructor', type: 'device', action: { device: 'defib', action: 'model', value: 'zoll-m2' } } as Command);
  e.advanceTo(1.1);
  if (!got) throw new Error('no M2 status');
  return got;
})();
const m2 = (selector: M2Status['power']['selector'] = 'defib'): M2Status => ({ ...M2_IDLE, power: { ...M2_IDLE.power, selector } });

const setup = (face = FACE) => {
  const f = fakeDriver();
  const clock = { ms: 0 };
  const core = createDefibCore(f.d, face, { now: () => clock.ms });
  return { f, clock, core };
};

describe('the defibrillator core: presses', () => {
  it("a press becomes the face table's command, sent once; a phase the table maps to nothing sends nothing", () => {
    const { f, core } = setup();
    expect(core.press('charge', 'down')).toBeNull();
    expect(core.press('charge', 'click')).toEqual(ev('charge'));
    expect(f.sent.map(([, c]) => c)).toEqual([ev('charge')]);
  });

  it("the Shock key's pointer-down and pointer-up reach the core separately, each its own command", () => {
    const { f, core } = setup();
    core.press('shock', 'down');
    core.press('shock', 'up');
    core.press('shock', 'click');
    expect(f.sent.map(([, c]) => (c as { action: { value: unknown } }).action.value)).toEqual([{ phase: 'down', button: 'panel' }, { phase: 'up', button: 'panel' }]);
  });

  it('an unknown key sends nothing', () => {
    const { f, core } = setup();
    expect(core.press('nibp', 'click')).toBeNull();
    expect(f.sent).toEqual([]);
  });

  it("a refusal of the window's own press reads in the device's words; another peer's ack is not this window's; a new press clears it", () => {
    const { f, core } = setup();
    core.press('charge', 'click');
    f.ack('someone-else', false, 'defibrillator is not charged');
    expect(core.view().said).toBe('');
    f.ack('c1', false, 'defibrillator is not charged');
    expect(core.view().said).toBe('Not charged');
    core.press('charge', 'click');
    expect(core.view().said).toBe('');
    f.ack('c2', true);
    expect(core.view().said).toBe('');
    f.ack('c2', false, 'late'); // an id is answered once
    expect(core.view().said).toBe('');
  });
});

describe('the defibrillator core: the view follows the status', () => {
  it('reads the energy and CHARGING / READY; the generic model has no energy list and is always Defib', () => {
    const { f, core } = setup();
    expect(core.view().readout).toBe('');
    f.status(status(120, 'charging'));
    expect(core.view()).toMatchObject({ readout: '120 J CHARGING', energiesJ: null, mode: 'defib', m2: null });
    f.status(status(120, 'ready'));
    expect(core.view().readout).toBe('120 J READY');
  });

  it("on the M2 the energy list is the model's [G A-2] and the mode is its selector", () => {
    const { f, core } = setup();
    f.status(status(120, 'idle', { m2: m2('monitor') }));
    expect(core.view().energiesJ).toEqual(M2_ENERGIES_J);
    expect(core.view().mode).toBe('monitor');
  });

  it('tells the face of every change, and stop() lets go of the driver', () => {
    const { f, core } = setup();
    let n = 0;
    const off = core.onChange(() => void n++);
    f.status(status(120, 'idle'));
    core.press('charge', 'click');
    expect(n).toBe(2);
    off();
    f.status(status(120, 'idle'));
    expect(n).toBe(2);
    core.stop();
    expect(f.listeners()).toBe(0);
  });
});

describe("the defibrillator core: the Trim Knob's pending value", () => {
  const onEnergy = () => {
    const s = setup();
    s.f.status(status(120, 'idle', { m2: m2() }));
    s.core.turn(1); // the cursor onto the first field
    expect(s.core.view().cursor).toBe('energy');
    s.core.press('knob', 'click');
    return s;
  };

  it('is held in the core until the knob is pressed, then sent as the setting\'s command', () => {
    const { f, core } = onEnergy();
    expect(core.view().pending).toEqual({ key: 'energy', value: 120, changed: false });
    core.turn(2);
    expect(core.view().pending).toEqual({ key: 'energy', value: 200, changed: true });
    core.turn(5); // the list ends at 200 J
    expect(core.view().pending?.value).toBe(200);
    expect(f.sent).toEqual([]);
    core.turn(-3);
    core.press('knob', 'click');
    expect(f.sent.map(([, c]) => c)).toEqual([{ type: 'applyEvent', event: { kind: 'defib', action: 'selectEnergy', energyJ: 100 } }]);
    expect(core.view().pending).toBeNull();
  });

  it('pressed unchanged, it sends nothing', () => {
    const { f, core } = onEnergy();
    core.press('knob', 'click');
    expect(f.sent).toEqual([]);
    expect(core.view().pending).toBeNull();
  });

  it("is dropped at the face's time-out, counted again from each turn; nothing is sent", () => {
    const { f, clock, core } = onEnergy();
    clock.ms = 6000;
    core.turn(1);
    clock.ms = 15_999;
    expect(core.view().pending?.value).toBe(150);
    clock.ms = 16_000;
    expect(core.view().pending).toBeNull();
    core.press('knob', 'click'); // the cursor is still on the field: the press selects it again
    expect(f.sent).toEqual([]);
    expect(core.view().pending).toEqual({ key: 'energy', value: 120, changed: false });
  });

  it('a face with no time-out keeps it', () => {
    const { f, clock, core } = setup({ ...FACE, revertMs: null });
    f.status(status(120, 'idle', { m2: m2() }));
    core.turn(1);
    core.press('knob', 'click');
    core.turn(1);
    clock.ms = 3_600_000;
    expect(core.view().pending?.value).toBe(150);
  });

  it('shows the status\'s value while not turned (another window changed it)', () => {
    const { f, core } = onEnergy();
    f.status(status(150, 'idle', { m2: m2() }));
    expect(core.view().pending).toEqual({ key: 'energy', value: 150, changed: false });
  });
});

describe('the defibrillator core: cursor, quick-key levels and menus', () => {
  it('the cursor travels around the screen\'s fields both ways [G 2-16]', () => {
    const { core } = setup();
    core.turn(1);
    core.turn(1);
    expect(core.view().cursor).toBe('hr');
    core.turn(1);
    expect(core.view().cursor).toBe('energy');
    core.turn(-1);
    expect(core.view().cursor).toBe('hr');
  });

  it('More and Back step through the levels of the mode showing [G 2-14]; each mode keeps its own level', () => {
    const { f, core } = setup();
    f.status(status(120, 'idle', { m2: m2('defib') }));
    expect(core.view()).toMatchObject({ level: 0, keys: ['lead', 'sync', 'more'] });
    expect(core.press('more', 'click')).toBeNull();
    expect(core.view()).toMatchObject({ level: 1, keys: ['alarms', 'back'] });
    core.press('more', 'click'); // no third level
    expect(core.view().level).toBe(1);
    f.status(status(120, 'idle', { m2: m2('monitor') }));
    expect(core.view()).toMatchObject({ level: 0, keys: ['lead', 'more'] });
    f.status(status(120, 'idle', { m2: m2('defib') }));
    expect(core.view().level).toBe(1);
    core.press('back', 'click');
    expect(core.view().level).toBe(0);
    expect(f.sent).toEqual([]);
  });

  it('a mode with no levels shows no keys', () => {
    const { f, core } = setup();
    f.status(status(120, 'idle', { m2: m2() }));
    f.status(status(120, 'idle', { m2: m2('pacer') }));
    expect(core.view().keys).toEqual([]);
  });

  it('Menu opens the settings and is Home inside a menu [G 2-4]; a field opens a window and its X closes it', () => {
    const { core } = setup();
    core.press('menu', 'click');
    expect(core.view().menu).toEqual(['settings']);
    expect(core.view().cursor).toBeNull(); // a new screen: the cursor starts again
    core.turn(1);
    core.press('knob', 'click');
    expect(core.view().menu).toEqual(['settings', 'ecg']);
    core.press('menu', 'click');
    expect(core.view().menu).toEqual([]);
    core.press('menu', 'click');
    core.turn(-1); // around the other way, onto the X
    expect(core.view().cursor).toBe('x');
    core.press('knob', 'click');
    expect(core.view().menu).toEqual([]);
  });

  it('only a click acts on the core\'s own keys', () => {
    const { core } = setup();
    core.press('menu', 'down');
    core.press('menu', 'up');
    expect(core.view().menu).toEqual([]);
  });
});
