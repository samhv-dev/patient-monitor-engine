// Plan vent-skin-edp-ts.md V3, tests first: the EDP-TS face's alarm scheme on the model, headless, on the driver's
// clock. Each delay of §2.10 (research/57 A-31 to A-50) through the device's own profile; a High lamp steady after its
// cause ends until Esc (A-15, A-16, H-25); one press of the silence key 30 s, two 60 s (A-20); the Hamilton-style banner
// unchanged; the controls V1 marked "needs piece V3" (the O2, High PEEP and Pressure Limits min tags, their Alarm
// settings rows, the silence key, Tools → Settings → Sound, Ctrl + Alarm Limits) walked; the tones' pulse counts.
import { createVentDriver, setCircuit, toggleHold, type VentAlarm, type VentConfig, type VentDriver } from '@pme/ventilator';
import { describe, expect, it } from 'vitest';
import { createAlarmView, type AlarmSignals } from '../../core/alarms-view.ts';
import { createCockpit } from '../../core/cockpit.ts';
import { HAMILTON_SPEC } from '../hamilton/face.ts';
import { CONTROLS, WINDOWS } from './controls.ts';
import { DATA, num } from './data.ts';
import { createKnob } from './knob.ts';
import { ALARM_PROFILE, EDP_SPEC } from './modes.ts';
import { createAlarmSound, gainOf, train, type Pulse } from './tones.ts';

const setup = () => {
  const d = createVentDriver(null);
  const c = createCockpit(d, EDP_SPEC, { linked: false });
  let wall = 0;
  return { d, c, k: createKnob(c, () => wall), tick: (ms: number) => void (wall += ms) };
};
const clocks = new WeakMap<VentDriver, number>();
/** Run the unlinked driver for `s` seconds of sim time (100 ms frames). */
const run = (d: VentDriver, s: number) => {
  let ms = clocks.get(d) ?? 0;
  d.frame(ms);
  for (let i = 0; i < Math.round(s * 10); i++) d.frame((ms += 100));
  clocks.set(d, ms);
};
const sig = (c: ReturnType<typeof setup>['c']): AlarmSignals => c.alarms().signals!;

describe('each delay of §2.10, through the device\'s profile', () => {
  // research/57: A-31 15 s, A-34 5 s, A-40 10 s, A-41 10 s, A-42 20 s, A-44 30 s, A-49 at most 5 s (5), A-50 30 s;
  // A-32, A-35, A-45: none stated (A-45's condition is the set apnoea time itself)
  const DELAYS: Record<string, number> = {
    contHighPressure: 15, pmax: 0, disconnection: 5, lowPressure: 0, mvHigh: 10, mvLow: 10, vtHigh: 10, vtLow: 20,
    o2High: 30, o2Low: 30, apnea: 0, highPeep: 5, fHigh: 30,
  };
  it('the profile holds exactly these, every one latching, silence 30 s and 60 s', () => {
    expect(ALARM_PROFILE.delayS).toEqual(DELAYS);
    expect([...(ALARM_PROFILE.latch ?? [])].sort()).toEqual(Object.keys(DELAYS).sort());
    expect(ALARM_PROFILE.silenceS).toEqual([30, 60]);
  });
  for (const [id, delay] of Object.entries(DELAYS)) {
    it(`${id}: signalled after ${delay} s of its condition, not before`, () => {
      const v = createAlarmView(ALARM_PROFILE);
      const raw: VentAlarm[] = [{ id: id as VentAlarm['id'], text: '', priority: 'high' }];
      const cfg = { mode: 'VC', ps: 0 } as VentConfig;
      for (let t = 0; t < delay - 0.01; t += 0.005) v.step(t, raw, cfg);
      if (delay > 0) expect(v.signals(delay - 0.01).message).toBeNull();
      for (let t = Math.max(0, delay - 0.005); t <= delay + 0.01; t += 0.005) v.step(t, raw, cfg);
      expect(v.signals(delay).message?.id).toBe(id);
      expect(v.signals(delay).message?.priority).toBe((DATA.alarms as Record<string, { priority: { v: string } }>)[id]!.priority.v);
    });
  }
  it('the VT alarms are not raised in CPAP (A-41, A-42: PSV with no support), and are in PSV with support', () => {
    for (const [ps, raised] of [[0, false], [8, true]] as const) {
      const v = createAlarmView(ALARM_PROFILE);
      const cfg = { mode: 'PSV', ps } as VentConfig;
      for (let t = 0; t <= 21; t += 0.005) v.step(t, [{ id: 'vtLow', text: '', priority: 'medium' }], cfg);
      expect(v.signals(21).message !== null).toBe(raised);
    }
  });
});

describe('on the running model', () => {
  it('a disconnection: Low pressure at once, Disconnection after 5 s (the earlier in the tables, so the message); reconnected, the High lamp stays steady until Esc', () => {
    const { d, c, k } = setup();
    run(d, 10);
    expect(sig(c).message).toBeNull();
    setCircuit(c.vs, 'disconnected');
    run(d, 4);
    expect(sig(c).message, 'the first breath under the minimum pressure (A-35; no delay stated)').toEqual({ id: 'lowPressure', priority: 'high' });
    expect(sig(c).signals.map((x) => x.id), 'within the 5 s delay (A-34)').not.toContain('disconnection');
    run(d, 6);
    expect(sig(c).message).toEqual({ id: 'disconnection', priority: 'high' });
    expect(sig(c).lamps.high).toBe('fast');
    setCircuit(c.vs, 'connected');
    run(d, 30);
    const s = sig(c);
    expect(s.message, 'the message goes at once with the cause (A-19)').toBeNull();
    expect(s.lamps.high, 'the High lamp: lit, steady (A-16)').toBe('steady');
    expect(s.signals.every((x) => !x.active)).toBe(true);
    run(d, 120);
    expect(sig(c).lamps.high, 'two minutes later, still lit').toBe('steady');
    k.press('under:esc');
    expect(sig(c).lamps).toEqual({ high: 'off', medLow: 'off' });
  });

  it('continuous high pressure: an inspiratory hold over PEEP + 5 is signalled after 15 s, a normal breath never (A-31)', () => {
    const { d, c } = setup();
    run(d, 60);
    expect(sig(c).signals.map((x) => x.id)).not.toContain('contHighPressure');
    toggleHold(c.vs, 'insp');
    for (let i = 0; i < 80 && c.vs.hold !== 'insp'; i++) run(d, 0.1);
    expect(c.vs.hold).toBe('insp');
    run(d, 13);
    expect(sig(c).signals.map((x) => x.id)).not.toContain('contHighPressure');
    run(d, 3);
    expect(sig(c).message?.id).toBe('contHighPressure');
  });

  it('the silence key: one press 30 s of silence, a second 60 s from the first; audio only (A-20)', () => {
    const { d, c, k } = setup();
    run(d, 5);
    setCircuit(c.vs, 'disconnected');
    run(d, 8);
    expect(sig(c).sounding).toBe('high');
    k.press('side:silence');
    expect(sig(c).silencedS).toBeCloseTo(30, 6);
    expect(c.vs.silenceUntil - c.p.t).toBeCloseTo(30, 6);
    run(d, 10);
    k.press('side:silence');
    expect(sig(c).silencedS).toBeCloseTo(50, 1);
    expect(sig(c).message?.id, 'the message stays').toBe('disconnection');
    expect(sig(c).lamps.high, 'the lamp stays').toBe('fast');
    run(d, 51);
    expect(sig(c).silencedS).toBe(0);
  });

  it('the Hamilton-style face: no profile, no signals, the banner and v1.9\'s 120 s silence', () => {
    const d = createVentDriver(null);
    const c = createCockpit(d, HAMILTON_SPEC, { linked: false });
    run(d, 5);
    setCircuit(c.vs, 'disconnected');
    run(d, 10);
    const a = c.alarms();
    expect(a.signals).toBeUndefined();
    expect(a.active.map((x) => x.id)).toContain('disconnection');
    expect(a.banner.cls).toBe('armed');
    for (const id of ['lowPressure', 'contHighPressure', 'highPeep', 'o2High', 'o2Low']) expect(a.active.map((x) => x.id)).not.toContain(id);
    c.silence();
    expect(c.vs.silenceUntil - c.p.t).toBeCloseTo(120, 9);
    expect(c.alarms().banner.cls).toBe('silenced');
  });
});

describe('the controls V1 marked "needs piece V3", turned on', () => {
  it('none is left unavailable for V3', () => {
    for (const x of CONTROLS) if (x.kind === 'unavailable') expect(x.reason).not.toBe('v3');
    for (const w of Object.values(WINDOWS)) for (const r of w.rows) {
      if ('reason' in r) expect(r.reason).not.toBe('v3');
      if (r.kind === 'limits') expect(r.off).toBeUndefined();
    }
  });

  // tag: [knob steps, the alarm the model raises] — the minimum pressure above the breath's peak; High PEEP under the
  // measured PEEP; the O2 limits across the set Oxygen (50 %; no sensor: plan GA11, said when the tag is selected)
  const TAGS: Record<string, [number, string, string | null]> = {
    pLo: [25, 'lowPressure', null], peepHi: [-17, 'highPeep', 'peepModel'], o2Hi: [-15, 'o2High', 'o2Set'], o2Lo: [15, 'o2Low', 'o2Set'],
  };
  for (const [tag, [steps, alarm, note]] of Object.entries(TAGS)) {
    it(`tag:${tag}: changed with the knob, the model raises ${alarm}, and the face signals it after its delay`, () => {
      const { d, c, k } = setup();
      run(d, 15);
      expect(c.alarms().active.map((a) => a.id)).not.toContain(alarm);
      k.press(`tag:${tag}`);
      expect(k.note()).toBe(note);
      k.turn(steps);
      k.push();
      run(d, 10);
      expect(c.alarms().active.map((a) => a.id)).toContain(alarm);
      run(d, 30);
      expect(sig(c).signals.map((s) => s.id)).toContain(alarm);
    });
  }

  it('the Alarm settings window edits the same limits: Inspiratory pressure max and min, Oxygen high and low, the PEEP row', () => {
    const { c, k } = setup();
    k.press('side:alarmLimits');
    const cells = k.items('alarms').filter((i) => i.cell).map((i) => i.cell);
    expect(cells).toEqual(['pmax', 'pLo', 'vtHi', 'vtLo', 'mvHi', 'mvLo', 'o2Hi', 'o2Lo', 'fHi', 'peepHi']);
    k.turn(1); // to pLo
    k.push();
    k.turn(2);
    k.push();
    expect(c.cfg.almPlo).toBe(7);
  });

  it('Tools → Settings → Sound: 25 to 100 % in steps of 25, the tones\' gain follows it (E-10)', () => {
    const { c, k } = setup();
    for (let i = 0; i < 3; i++) k.press('side:menu');
    expect(k.windows().map((w) => w.id)).toEqual(['menu', 'tools']);
    k.turn(WINDOWS.tools.rows.findIndex((r) => r.word === 'settings') - 1); // Autoscale is not a stop
    k.push();
    expect(k.windows().at(-1)?.id).toBe('settings');
    k.push(); // Sound, the window's one stop
    expect(c.cfg.alarmVolume).toBe(50);
    k.turn(5);
    k.push();
    expect(c.cfg.alarmVolume).toBe(100);
    expect(gainOf(100)).toBeCloseTo(2 * gainOf(50), 12);
    k.press('side:menu'); k.press('side:menu'); k.press('side:menu');
    k.turn(1); k.push(); k.push();
    k.turn(-9);
    k.push();
    expect(c.cfg.alarmVolume, 'never off').toBe(25);
  });

  it('Ctrl + Alarm Limits: with no alarm active, the alarm test (each priority\'s lamp and tone in turn); with one, its help (H-21)', () => {
    const { d, c, k, tick } = setup();
    run(d, 5);
    k.press('under:ctrl');
    k.press('side:alarmLimits');
    expect(k.windows(), 'the test, not the window').toEqual([]);
    const step = num(DATA.layout.alarmTestStepS) * 1000;
    const seen: Array<string | null> = [];
    for (let i = 0; i < 4; i++) { seen.push(k.alarmTest()); tick(step); }
    expect(seen).toEqual(['high', 'medium', 'low', null]);
    setCircuit(c.vs, 'disconnected');
    run(d, 8);
    k.press('under:ctrl');
    k.press('side:alarmLimits');
    expect(k.note()).toBe('alarmHelp');
    expect(k.alarmTest()).toBeNull();
  });
});

describe('the tones (research/57 A-09, A-10, A-18; pitch eng, VQ6)', () => {
  it('pulses: high 10 in two groups of 5, medium 3, low 1; when the cause ends 5, 3 and none', () => {
    expect([train('high', 'active').length, train('medium', 'active').length, train('low', 'active').length]).toEqual([10, 3, 1]);
    expect([train('high', 'ended').length, train('medium', 'ended').length, train('low', 'ended').length]).toEqual([5, 3, 0]);
    const h = train('high', 'active');
    const gaps = h.slice(1).map((p, i) => p.atMs - h[i]!.atMs);
    expect(new Set(gaps).size).toBe(2);
    expect(gaps[4]).toBeGreaterThan(gaps[0]!); // the gap between the two groups of five
  });

  it('only the highest priority sounds; silence plays nothing; an ending alarm plays its end train unless a higher one sounds', () => {
    const played: Array<[Pulse[], number]> = [];
    const snd = createAlarmSound((p, g) => played.push([p, g]));
    const S = (sounding: AlarmSignals['sounding'], silencedS = 0): AlarmSignals => ({ message: null, sounding, lamps: { high: 'off', medLow: 'off' }, signals: [], silencedS });
    snd.update(S('high'), 50, 0);
    expect(played).toHaveLength(1);
    expect(played[0]![0]).toHaveLength(10);
    snd.update(S('high'), 50, 1000);
    expect(played, 'not again before its repeat').toHaveLength(1);
    snd.update(S('high'), 50, num(DATA.tones.high.repeatS) * 1000);
    expect(played).toHaveLength(2);
    snd.update(S('high', 20), 50, 1e6);
    expect(played, 'silenced').toHaveLength(2);
    snd.event({ t: 0, id: 'mvLow', priority: 'medium', kind: 'ended' }, S('high'), 50);
    expect(played, 'a higher tone sounds').toHaveLength(2);
    snd.event({ t: 0, id: 'disconnection', priority: 'high', kind: 'ended' }, S(null), 100);
    expect(played.at(-1)![0]).toHaveLength(5);
    expect(played.at(-1)![1]).toBeCloseTo(gainOf(100), 12);
  });
});
