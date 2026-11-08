// Room plan R5 (docs/plans/room-and-instruments.md §7 R5, §4 D5): which skin an instrument wears. The defibrillator
// window wears the room's defibrillator model's own look (its skin's defibrillator block is the model's spec), whatever
// the monitor style; with no model chosen it wears the monitor style (its engine then holds the host's own spec).
import { describe, expect, it } from 'vitest';
import { defibReadout, defibSkin, defibWords } from './instrument.ts';
import { DEFIB_CHOICES, MONITORS } from './site.ts';

describe('R5: the defibrillator window\'s skin', () => {
  it('is the model\'s own look for every model R5a knows, whatever the monitor skin', () => {
    for (const m of DEFIB_CHOICES) for (const mon of MONITORS) expect(defibSkin(m.id, mon.id)).toBe(m.look);
    expect(defibSkin('generic', 'lifepak-like')).toBe('zoll-like');
  });
  it('is the monitor style with no model chosen (or one this build does not know)', () => {
    expect(defibSkin(null, 'saadat-like')).toBe('saadat-like');
    expect(defibSkin('lifepak-like', 'philips-like')).toBe('philips-like');
  });
});

describe('R5: the defibrillator window\'s readout', () => {
  const st = (energyJ: number, state: 'idle' | 'charging' | 'ready', sync = false) => ({ energyJ, state, sync, readyAt: null, shocks: 0, lastShock: null });
  it('the selected energy always, then CHARGING or READY (and SYNC), in the words the monitor header uses', () => {
    expect(defibReadout(null)).toBe('');
    expect(defibReadout(st(120, 'idle'))).toBe('120 J');
    expect(defibReadout(st(120, 'charging'))).toBe('120 J CHARGING');
    expect(defibReadout(st(360, 'ready', true))).toBe('360 J READY SYNC');
  });
});

describe('R5d: a refused press in the device\'s words', () => {
  it('the engine\'s "not charged" reads "Not charged"; another reason as the host wrote it, capitalised', () => {
    expect(defibWords('defibrillator is not charged')).toBe('Not charged');
    expect(defibWords('the simulation is fast-forwarding; try again when it ends')).toBe('The simulation is fast-forwarding; try again when it ends');
    expect(defibWords(undefined)).toBe('Not taken');
  });
});
