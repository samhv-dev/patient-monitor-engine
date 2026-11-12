// Plan vent-skin-edp-ts.md V1, test (4) and the knob's windows (research/57 H-10, H-22, H-25, O-01 to O-16), headless on
// a fake WALL clock (brief 154 ruling: the 15 s are the resident's, not the patient's): a value turned is not in cfg
// until the knob press; unconfirmed, it returns at 15 s; the mode window, its confirmation and a draft changed before the
// start; Menu pressed one to four times; Ctrl's steps; Esc.
import { createVentDriver } from '@pme/ventilator';
import { describe, expect, it } from 'vitest';
import { createCockpit } from '../../core/cockpit.ts';
import { REVERT_MS } from '../../core/pending.ts';
import { createKnob } from './knob.ts';
import { EDP_SPEC } from './modes.ts';

const setup = () => {
  const c = createCockpit(createVentDriver(null), EDP_SPEC, { linked: false });
  const clock = { ms: 0 };
  return { c, clock, k: createKnob(c, () => clock.ms) };
};

describe('select, turn, press (test 4)', () => {
  it('PEEP turned is not in cfg until the knob press', () => {
    const { c, k } = setup();
    expect(c.cfg.peep).toBe(5);
    k.press('key:peep');
    k.turn(3);
    expect(k.pending.value).toBe(8);
    expect(c.cfg.peep).toBe(5);
    k.push();
    expect(c.cfg.peep).toBe(8);
    expect(k.pending.key).toBeNull();
  });

  it('an unconfirmed change returns to the old value at 15 s of wall clock, counted from the last turn', () => {
    const { c, clock, k } = setup();
    k.press('key:peep');
    k.turn(2);
    clock.ms = 10_000;
    k.turn(1); // a turn is a change: the 15 s start again
    clock.ms = 10_000 + REVERT_MS - 1;
    expect(k.pending.value).toBe(8);
    clock.ms = 10_000 + REVERT_MS;
    expect(k.pending.key).toBeNull();
    k.push(); // nothing selected: the press does nothing
    expect(c.cfg.peep).toBe(5);
  });

  it('a selection with no change is dropped at 15 s', () => {
    const { clock, k } = setup();
    k.press('key:vt');
    clock.ms = REVERT_MS - 1;
    expect(k.pending.key).toBe('key:vt');
    clock.ms = REVERT_MS;
    expect(k.pending.key).toBeNull();
  });

  it('Esc cancels the turned value', () => {
    const { c, k } = setup();
    k.press('key:oxygen');
    k.turn(5);
    k.press('under:esc');
    k.push();
    expect(c.cfg.fio2).toBe(50);
  });

  it('Ctrl + Oxygen steps by 10 (H-22); Ctrl on VT keeps the step and says why (O-05)', () => {
    const { c, k } = setup();
    k.press('under:ctrl');
    expect(k.ctrl()).toBe(true);
    k.press('key:oxygen');
    k.turn(2);
    k.push();
    expect(c.cfg.fio2).toBe(70);
    expect(k.ctrl()).toBe(false); // the press ends Ctrl
    k.press('under:ctrl');
    k.press('key:vt');
    k.turn(1);
    expect(k.note()).toBe('ctrlGap');
    k.push();
    expect(c.cfg.vt).toBe(410); // 0.402 → 0.41 L on the 0.01 L step (T-02)
  });

  it('f stops at the model\'s 4 bpm with its reason (plan GP4)', () => {
    const { c, k } = setup();
    k.press('key:f');
    k.turn(-20);
    expect(k.pending.value).toBe(4);
    expect(k.note()).toBe('rate4');
    k.push();
    expect(c.cfg.rate).toBe(4);
  });

  it('Sens touched twice switches to pressure triggering (O-06)', () => {
    const { c, k } = setup();
    k.press('key:sens');
    k.press('key:sens');
    expect(c.cfg.trigType).toBe('pressure');
    expect(k.pending.value).toBe(-1.5);
    k.turn(-1);
    k.push();
    expect(c.cfg.presTrig).toBe(-2);
  });

  it('I:E is shown, not set, outside PCV (T-16)', () => {
    const { k } = setup();
    k.press('key:ie');
    expect(k.pending.key).toBeNull();
  });

  it('an unavailable key says why and changes nothing', () => {
    const { c, k } = setup();
    const before = JSON.stringify(c.cfg);
    k.press('right:standby');
    expect(k.note()).toBe('standby'); // VF: one resident reason per control (brief 159, R20); V1 said 'v5'
    expect(JSON.stringify(c.cfg)).toBe(before);
  });
});

describe('the mode window (research/57 O-09, O-10, O-14, O-15)', () => {
  it('Mode, knob to PCV, press, confirmation, press: PCV runs with the device name', () => {
    const { c, k } = setup();
    k.press('side:mode');
    expect(k.windows().map((w) => w.id)).toEqual(['modes']);
    k.turn(1); // VCV → PCV
    k.push();
    expect(k.confirming()).toBe('PCV');
    expect(c.cfg.mode).toBe('VC'); // not yet: the knob press starts it
    k.push();
    expect(c.cfg.mode).toBe('PC');
    expect(c.cfg.modeLabel).toBe('PCV');
    expect(k.windows()).toEqual([]);
  });

  it('the knob skips the modes not built yet; Other ventilation Modes holds PRVC', () => {
    const { c, k } = setup();
    k.press('side:mode');
    k.turn(5); // VCV, PCV, then the Other row (PSV/CPAP, SIMV(PCV)+PSV, NIV are not stops)
    k.push();
    expect(k.windows().map((w) => w.id)).toEqual(['modes', 'otherModes']);
    k.push(); // the only stop before the last row: PRVC
    k.push();
    expect(c.cfg.mode).toBe('PRVC');
    expect(c.cfg.prvcTarget).toBe(402); // VT carried (one setting on this device)
  });

  it('settings changed in the confirmation start with the mode (O-15); Esc leaves the old mode running', () => {
    const { c, k } = setup();
    k.press('side:mode');
    k.turn(1);
    k.push();
    expect(k.rowMode()).toBe('PCV');
    k.press('key:pcv');
    k.turn(5);
    k.push();
    expect(c.cfg.pc).toBe(15); // in the draft only
    k.push(); // start
    expect(c.cfg.mode).toBe('PC');
    expect(c.cfg.pc).toBe(20);
    k.press('side:mode');
    k.push();
    k.press('under:esc');
    k.press('under:esc');
    expect(c.cfg.mode).toBe('PC');
    expect(k.windows()).toEqual([]);
  });
});

describe('Menu and Alarm Limits (research/57 H-10, A-21)', () => {
  it('Menu pressed 1 to 4 times: main menu, Ventilatory adjuncts, Tools, main menu', () => {
    const { k } = setup();
    const ids = () => k.windows().map((w) => w.id).join('>');
    k.press('side:menu');
    expect(ids()).toBe('menu');
    k.press('side:menu');
    expect(ids()).toBe('menu>adjuncts');
    k.press('side:menu');
    expect(ids()).toBe('menu>tools');
    k.press('side:menu');
    expect(ids()).toBe('menu');
  });

  it('Inspiratory pause in Ventilatory adjuncts, VCV only (T-28)', () => {
    const { c, k } = setup();
    k.press('side:menu');
    k.press('side:menu');
    k.push(); // its one live row
    k.turn(2);
    k.push();
    expect(c.cfg.pause).toBe(0.5);
  });

  it('Alarm Limits: the knob reaches each limit cell and edits it', () => {
    const { c, k } = setup();
    k.press('side:alarmLimits');
    k.turn(1); // pmax → vtHi
    k.push();
    expect(k.pending.key).toBe('tag:vtHi');
    k.turn(-5);
    k.push();
    expect(c.cfg.almVThi).toBe(550);
  });
});
