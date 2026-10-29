// @vitest-environment happy-dom
// Instructor v2's cue box (plan IP5; answers 4, 14, 18, 21): the stage's name, the time in it, how it was entered (from
// the debrief record's `by` when the host has it, else "entered" and the time), the stage line (the state's label), the
// Say line (the state's notes, which today's panel never shows), the held values, Swap to the Monitor view, and the
// paused banner with "frozen" on the in-stage clock.
import { beforeEach, describe, expect, it } from 'vitest';
import { ScenarioView, type ScenarioDoc } from '@pme/controller';
import type { Link } from '../link.ts';
import { showcaseDoc } from '../showcase/harness.ts';
import type { Teach2Ctx } from './ctx.ts';
import { enteredWords, mount } from './cue.ts';

const MH = showcaseDoc('showcase-mh');
const HAEM = showcaseDoc('showcase-haemorrhage');

function rig(doc: ScenarioDoc, stateId: string, history: Array<{ t: number; stateId: string; transitionId?: string }>, simT: number, o: { rows?: unknown[]; state?: unknown; host?: boolean } = {}) {
  const sv = new ScenarioView();
  sv.doc = doc;
  sv.docVersion = 1;
  sv.stateId = stateId;
  sv.enteredT = history.at(-1)?.t ?? 0;
  sv.history = history;
  const ctl = { scenario: sv, simT, hostPaused: false, state: o.state ?? null };
  const host = o.host === false ? null : { record: { data: { rows: o.rows ?? [] } } };
  const link = { ctl, host, ramps: new Map(), get simT() { return ctl.simT; } } as unknown as Link;
  const ctx = { link } as unknown as Teach2Ctx;
  const el = document.createElement('div');
  document.body.append(el);
  const slot = mount(el, ctx);
  const text = (s: string) => (el.querySelector(s) as HTMLElement).textContent;
  const shown = (s: string) => !(el.querySelector(s) as HTMLElement).hidden;
  return { sv, ctl, el, slot, text, shown };
}

beforeEach(() => document.body.replaceChildren());

describe('cue box', () => {
  it('the stage name, the time in it, the stage line and the Say line (the state\'s notes, in italics)', () => {
    const r = rig(MH, 'induced', [{ t: 0, stateId: 'awake' }, { t: 240, stateId: 'induced', transitionId: 'induce' }], 250);
    expect(r.text('.ip2-cue-name')).toBe('Induced');
    expect(r.text('.ip2-cue-clock')).toBe('00:10 in stage');
    expect(r.text('.ip2-cue-line')).toBe(MH.states.find((s) => s.id === 'induced')?.label);
    expect(r.shown('.ip2-say')).toBe(true);
    // the card's notes begin "Say it: …": no second "Say:" in front
    expect(r.text('.ip2-say')).toMatch(/^Say it: the jaw is hard to open/);
    // a state without notes: no Say line; one whose notes do not begin with "Say": prefixed
    r.sv.stateId = 'intubated';
    r.sv.history = [...r.sv.history, { t: 300, stateId: 'intubated', transitionId: 'intubate' }];
    r.sv.enteredT = 300;
    r.slot.refresh();
    expect(r.shown('.ip2-say')).toBe(false);
    const p = rig(HAEM, 'pea', [{ t: 0, stateId: 'bleeding' }, { t: 290, stateId: 'pea', transitionId: 'pea' }], 300);
    expect(p.text('.ip2-say')).toMatch(/^Say: The model's PEA/);
  });

  it('time in stage runs from the stage\'s entry across its hops (treating, entered by the dantrolene hop)', () => {
    const hist = [{ t: 496, stateId: 'triggerOff', transitionId: 'crisis-established' }, { t: 520, stateId: 'dantrolene', transitionId: 'dant' }, { t: 522, stateId: 'treating', transitionId: 'back' }];
    const r = rig(MH, 'treating', hist, 580);
    expect(r.text('.ip2-cue-name')).toBe('MH treatment under way');
    expect(r.text('.ip2-cue-clock')).toBe('01:00 in stage');
    expect(r.text('.ip2-cue-how')).toBe('entered at 08:40');
  });

  it('how it was entered: by your button, by its rule, by a jump (IP8\'s `by`), else "entered" and the time', () => {
    expect(enteredWords('press', 496, null)).toBe('entered by your button at 08:16');
    expect(enteredWords('rule', 420, 'EtCO₂ above 45 for 20 s')).toBe('entered by its rule at 07:00 (EtCO₂ above 45 for 20 s)');
    expect(enteredWords('goto', 60, null)).toBe('entered by a jump at 01:00');
    expect(enteredWords(undefined, 60, null)).toBe('entered at 01:00');
    const hist = [{ t: 360, stateId: 'surgery', transitionId: 'surgery' }, { t: 420, stateId: 'earlySigns', transitionId: 'early' }];
    const row = (by?: string) => ({ t: 420, kind: 'scenario', text: 'Scenario state: Early signs', ev: 'state:earlySigns', ...(by ? { by } : {}) });
    // the host's record with IP8's field
    expect(rig(MH, 'earlySigns', hist, 430, { rows: [row('rule')] }).text('.ip2-cue-how')).toMatch(/^entered by its rule at 07:00 \(.+\)$/);
    expect(rig(MH, 'earlySigns', hist, 430, { rows: [row('press')] }).text('.ip2-cue-how')).toBe('entered by your button at 07:00');
    expect(rig(MH, 'earlySigns', hist, 430, { rows: [row('goto')] }).text('.ip2-cue-how')).toBe('entered by a jump at 07:00');
    // a row undone by a restore is not read; a record before IP8, or a follower (no host): "entered" and the time
    expect(rig(MH, 'earlySigns', hist, 430, { rows: [{ ...row('press'), undone: 1 }] }).text('.ip2-cue-how')).toBe('entered at 07:00');
    expect(rig(MH, 'earlySigns', hist, 430, { rows: [row()] }).text('.ip2-cue-how')).toBe('entered at 07:00');
    expect(rig(MH, 'earlySigns', hist, 430, { host: false }).text('.ip2-cue-how')).toBe('entered at 07:00');
  });

  it('paused: the banner under the strip, "frozen" on the in-stage clock; resumed: both gone', () => {
    const r = rig(MH, 'induced', [{ t: 240, stateId: 'induced', transitionId: 'induce' }], 500);
    expect(r.shown('.ip2-paused')).toBe(false);
    r.ctl.hostPaused = true;
    r.slot.refresh();
    expect(r.shown('.ip2-paused')).toBe(true);
    expect(r.el.querySelector('.ip2-paused')?.getAttribute('role')).toBe('status');
    expect(r.text('.ip2-paused')).toBe('Paused. Timers are frozen. A step pressed now is given at 08:20 and acts when you resume. The room\'s monitor shows the same mark.');
    expect(r.text('.ip2-cue-clock')).toBe('04:20 in stage · frozen');
    expect(r.el.querySelector('.ip2-cue-clock')?.classList.contains('ip2-frozen')).toBe(true);
    // the banner sits above the cue box, under the strip
    expect(r.el.firstElementChild?.className).toBe('ip2-paused');
    r.ctl.hostPaused = false;
    r.slot.refresh();
    expect(r.shown('.ip2-paused')).toBe(false);
    expect(r.text('.ip2-cue-clock')).toBe('04:20 in stage');
  });

  it('held values (answer 14) as the held-values dialog reads them, with how long; Swap opens the Monitor view', () => {
    const state = { mode: 'modeled', values: { spo2: 88, hr: 120 }, control: { spo2: 'pinned', hr: 'modeled' } };
    const r = rig(MH, 'induced', [{ t: 240, stateId: 'induced' }], 300, { state });
    expect(r.text('.ip2-held')).toBe('Held: SpO₂ 88 (0 s)');
    r.ctl.simT = 420;
    r.slot.refresh();
    expect(r.text('.ip2-held')).toBe('Held: SpO₂ 88 (2 min)');
    state.control.spo2 = 'modeled';
    r.slot.refresh();
    expect(r.shown('.ip2-held')).toBe(false);
    expect(r.el.querySelector('a.ip2-swap')?.getAttribute('href')).toBe('#/monitor');
  });

  it('no scenario: says so', () => {
    const r = rig(MH, 'induced', [], 0);
    r.sv.doc = null;
    r.slot.refresh();
    expect(r.text('.ip2-cue-name')).toBe('No scenario running');
    expect(r.shown('.ip2-say')).toBe(false);
  });
});
