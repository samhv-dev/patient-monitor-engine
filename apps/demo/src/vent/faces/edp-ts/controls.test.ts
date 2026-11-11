// Plan vent-skin-edp-ts.md V1, tests (1), (3) and (5), headless on the model (the A1 test: a face that pretends is the
// risk R2). Test (1) walks the control table and every window row: a live setting, pressed, turned and confirmed with
// the knob, changes the delivered breath; a limit changed with the knob raises its alarm; a face action changes the
// knob's state; an unavailable control changes nothing and says why. Test (3): PCV with I:E 1:2.0 at f 12 gives an
// inspiratory time of 1.67 s. Test (5): the frame's mode is the device's name, after a scenario and a link patch too.
import { createVentDriver, modeName, toVentFrame, type VentDriver } from '@pme/ventilator';
import { describe, expect, it } from 'vitest';
import { createCockpit, type Cockpit } from '../../core/cockpit.ts';
import { CONTROLS, ROWS, SETTINGS, settingState, WINDOWS } from './controls.ts';
import { createKnob, type Knob } from './knob.ts';
import { EDP_SPEC } from './modes.ts';

const setup = () => {
  const d = createVentDriver(null);
  const c = createCockpit(d, EDP_SPEC, { linked: false });
  return { d, c, k: createKnob(c) };
};
/** Run the unlinked driver for `s` seconds of sim time (100 ms frames, its own clamp). */
const run = (d: VentDriver, s: number) => {
  const t0 = (d as unknown as { _ms?: number })._ms ?? 0;
  let ms = t0;
  d.frame(ms);
  for (let i = 0; i < s * 10; i++) d.frame((ms += 100));
  (d as unknown as { _ms?: number })._ms = ms + 1000; // a later run starts after a gap the driver clamps
};
const choose = (k: Knob, name: 'VCV' | 'PCV' | 'PRVC') => {
  k.press('side:mode');
  const at = name === 'PRVC' ? null : name === 'VCV' ? 0 : 1;
  if (at === null) { k.turn(10); k.push(); k.push(); } else { k.turn(at); k.push(); }
  k.push();
};
const knobSet = (k: Knob, id: string, steps: number) => { k.press(id); k.turn(steps); k.push(); };

/** What each live setting must change in the delivered breath, measured over the last breaths. */
type Probe = { mode: 'VCV' | 'PCV' | 'PRVC'; steps: number; measure(c: Cockpit, d: VentDriver): number; prep?(c: Cockpit): void };
const ti = (c: Cockpit) => c.record()?.ti ?? NaN;
const PROBES: Record<string, Probe> = {
  vt: { mode: 'VCV', steps: 10, measure: (c) => c.measured().VTE },
  ti: { mode: 'VCV', steps: 20, measure: ti },
  ie: { mode: 'PCV', steps: -10, measure: ti },
  f: { mode: 'VCV', steps: 6, measure: (c) => c.measured().RR },
  pcv: { mode: 'PCV', steps: 5, measure: (c) => c.measured().PIP },
  peep: { mode: 'VCV', steps: 5, measure: (c) => c.record()?.peepEnd ?? NaN },
  // the patient's own efforts trigger fewer breaths at a less sensitive trigger (research/57 T-19)
  sens: { mode: 'VCV', steps: 120, measure: (c) => c.p.markers.filter((m) => m.type === 'pt' && m.t > c.p.t - 20).length, prep: (c) => c.write({ spont: true, pmus: 2, spontRate: 24 }, 'tool') },
  oxygen: { mode: 'VCV', steps: 20, measure: (_c, d) => toVentFrame(d.vs, '').fio2 },
  riseTime: { mode: 'PCV', steps: 2, measure: (c) => c.record()?.peakFlowLpm ?? NaN },
  pause: { mode: 'VCV', steps: 2, measure: ti },
};

describe('test (1): every control on the face writes the model or says why it cannot', () => {
  const settingCtls = CONTROLS.filter((c) => c.kind === 'setting');
  it('the table holds every setting of every bottom row', () => {
    for (const row of Object.values(ROWS)) for (const id of row) expect(settingCtls.map((c) => c.kind === 'setting' && c.setting)).toContain(id);
  });

  for (const [id, pr] of Object.entries(PROBES)) {
    it(`${id}: the knob's change reaches the delivered breath (${pr.mode})`, () => {
      const { d, c, k } = setup();
      choose(k, pr.mode);
      pr.prep?.(c);
      run(d, 25);
      const before = pr.measure(c, d);
      const cfgBefore = JSON.stringify(c.cfg);
      if (id === 'pause') { k.press('side:menu'); k.press('side:menu'); k.push(); k.turn(pr.steps); k.push(); } else knobSet(k, `key:${id}`, pr.steps);
      expect(JSON.stringify(c.cfg), 'a cfg key was written').not.toBe(cfgBefore);
      run(d, 25);
      const after = pr.measure(c, d);
      expect(Number.isFinite(before) && Number.isFinite(after), `${before} → ${after}`).toBe(true);
      expect(Math.abs(after - before), `${id}: ${before} → ${after}`).toBeGreaterThan(1e-6);
    });
  }

  it('flowWaveform: one live choice, Constant (plan GP12): its binding is what the delivered breath runs on; Descending stops the knob with its reason (GP13)', () => {
    const { d, c, k } = setup();
    expect(SETTINGS.flowWaveform!.write(0, c.cfg)).toEqual({ flowPattern: 'square' });
    c.write({ flowPattern: 'decel' }, 'tool');
    run(d, 15);
    const decel = c.record()!.peakFlowLpm;
    c.write(SETTINGS.flowWaveform!.write(0, c.cfg));
    run(d, 15);
    expect(c.record()!.peakFlowLpm).not.toBeCloseTo(decel, 1);
    k.press('key:flowWaveform');
    k.turn(1);
    expect(k.note()).toBe('descending');
  });

  it('psv and expSens are drawn only in a scenario\'s PSV row, unavailable (they belong to PSV/CPAP, V2)', () => {
    const { c } = setup();
    for (const id of ['psv', 'expSens']) for (const mode of ['VC', 'PC', 'PRVC', 'PSV'] as const) expect(settingState(id, { ...c.cfg, mode })).not.toBe('live');
  });

  const ALARM: Record<string, [number, string]> = { pmax: [-25, 'pmax'], vtHi: [-25, 'vtHigh'], vtLo: [30, 'vtLow'], mvHi: [-500, 'mvHigh'], mvLo: [500, 'mvLow'], fHi: [-25, 'fHigh'] };
  for (const [lim, [steps, alarm]] of Object.entries(ALARM)) {
    it(`limit ${lim}: changed with the knob, the model raises ${alarm}`, () => {
      const { d, c, k } = setup();
      run(d, 20);
      expect(c.alarms().active.map((a) => a.id)).not.toContain(alarm);
      knobSet(k, `tag:${lim}`, steps);
      run(d, 10);
      expect(c.alarms().active.map((a) => a.id)).toContain(alarm);
    });
  }

  it('the face actions move the knob: Mode, Menu, Alarm Limits open their windows; Ctrl lights; Esc closes', () => {
    const { k } = setup();
    for (const [id, win] of [['side:mode', 'modes'], ['side:menu', 'menu'], ['side:alarmLimits', 'alarms']] as const) {
      k.press(id);
      expect(k.windows().map((w) => w.id)).toEqual([win]);
      k.press('under:esc');
      expect(k.windows()).toEqual([]);
    }
    k.press('under:ctrl');
    expect(k.ctrl()).toBe(true);
  });

  for (const ctl of CONTROLS.filter((x) => x.kind === 'unavailable')) {
    it(`${ctl.id}: unavailable, changes nothing, says "${ctl.kind === 'unavailable' ? ctl.reason : ''}"`, () => {
      const { d, c, k } = setup();
      run(d, 2);
      const before = JSON.stringify(c.cfg);
      k.press(ctl.id);
      expect(JSON.stringify(c.cfg)).toBe(before);
      expect(k.note()).toBe(ctl.kind === 'unavailable' ? ctl.reason : null);
    });
  }

  it('every window row: a mode row starts its mode; an open row opens its window; a row not honoured is never a knob stop', () => {
    for (const [wid, w] of Object.entries(WINDOWS)) {
      const { k } = setup();
      const stops = k.items(wid as keyof typeof WINDOWS).map((i) => i.row);
      w.rows.forEach((r, i) => {
        if (r.kind === 'off' || r.kind === 'mode-off' || (r.kind === 'limits' && r.off)) expect(stops, `${wid} row ${i}`).not.toContain(i);
        else expect(stops, `${wid} row ${i}`).toContain(i);
      });
    }
    for (const name of ['VCV', 'PCV', 'PRVC'] as const) {
      const { c, k } = setup();
      if (name === 'VCV') c.chooseMode('PCV');
      choose(k, name);
      expect(c.cfg.modeLabel).toBe(name);
    }
  });
});

describe('test (3): PCV with I:E 1:2.0 at f 12', () => {
  it('gives an inspiratory time of 1.67 s, delivered', () => {
    const { d, c, k } = setup();
    choose(k, 'PCV');
    expect(c.cfg.rate).toBe(12);
    k.press('key:ie');
    // from Ti 1.00 at f 12 (1:4.0, u = −3.0) to 1:2.0 (u = −1.0): 20 steps of 0.1
    k.turn(20);
    k.push();
    expect(c.cfg.itime).toBe(1.67);
    run(d, 20);
    // delivered within the model's 5 ms step (its phase ends on the first step at or past the set time)
    expect(Math.abs(c.record()!.ti - 1.67)).toBeLessThanOrEqual(0.005 + 1e-9);
  });
});

describe('test (5): the frame carries the device\'s name', () => {
  it('VCV at start, PCV after the mode window, and again after a scenario and a remote patch', () => {
    const { c, k } = setup();
    expect(modeName(c.cfg)).toBe('VCV');
    choose(k, 'PCV');
    expect(toVentFrame(c.vs as never, modeName(c.cfg)).mode).toBe('PCV');
    c.scenario('earlyCycle'); // a PSV scenario: the simulator's state words
    expect(modeName(c.cfg)).toBe('PSV (simulator scenario)');
    // a link patch as the host's hand-over sends it (views/vent.ts cockpitPatch): VC with no label
    Object.assign(c.vs.cfg, { mode: 'VC', modeLabel: null, vt: 450 });
    c.d.onControl?.();
    expect(modeName(c.cfg)).toBe('VCV');
  });

  it('a VT patch from the link keeps the set Ti: the flow follows (plan GM1)', () => {
    const { c } = setup();
    c.write({ itime: 1.4 });
    Object.assign(c.vs.cfg, { vt: 500 });
    c.d.onControl?.();
    expect(c.cfg.vcFlow).toBeCloseTo((60 * 0.5) / 1.4, 9);
  });

  it('a flow set from elsewhere (the Hamilton face handed over) becomes the set Ti it means', () => {
    const { c } = setup();
    Object.assign(c.vs.cfg, { vt: 500, vcFlow: 30 });
    c.d.onControl?.();
    expect(c.cfg.itime).toBeCloseTo(1.0, 9);
    expect(c.cfg.vcFlow).toBeCloseTo(30, 9);
  });
});
