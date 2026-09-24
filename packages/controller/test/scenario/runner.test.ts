// Trigger semantics (brief §7.4; BUILD-PLAN Stage 6 acceptance 5): every trigger type, priority, combinators,
// stay-on-else, pause, goto, manual press vs force, and independence from the polling rate.
import { describe, expect, it } from 'vitest';
import { ScenarioRunner, type RunnerEffect } from '../../src/scenario/runner.ts';
import { doc, drug, shock, vals } from './fixtures.ts';

const states = (fx: RunnerEffect[]) => fx.flatMap((f) => (f.kind === 'event' ? [f.event.stateId] : []));
const cmds = (fx: RunnerEffect[]) => fx.flatMap((f) => (f.kind === 'commands' ? f.commands : []));
/** Advance every 20 ms from t0 to t1 with no inputs; returns the first time the state changed, or null. */
function runUntilChange(r: ScenarioRunner, t0: number, t1: number, step = 0.02): number | null {
  const from = r.stateId;
  for (let t = t0; t <= t1 + 1e-9; t += step) {
    r.advance(Math.round(t * 1e6) / 1e6);
    if (r.stateId !== from) return Math.round(t * 1e6) / 1e6;
  }
  return null;
}

describe('ScenarioRunner', () => {
  it('start: one batch with patient setup and the initial onEnter, then a scenario event', () => {
    const d = doc([{ when: { afterS: 5 } }]);
    d.patient = { baseline: { hr: 88 }, rhythm: { id: 'sinus' }, sensors: { spo2: 'on' } };
    const fx = new ScenarioRunner(d).start(0);
    expect(fx.map((f) => f.kind)).toEqual(['commands', 'event']);
    expect(cmds(fx).map((c) => c.type)).toEqual(['setRhythm', 'setTarget', 'attachSensor', 'setTarget']);
    expect(fx[1]).toEqual({ kind: 'event', event: { type: 'scenario', t: 0, stateId: 'a' } });
  });

  it('afterS counts time in state; the transition batch is onExit + onEnter in one stage group', () => {
    const r = new ScenarioRunner(doc([{ id: 'go', when: { afterS: 5 } }]));
    r.start(10);
    expect(runUntilChange(r, 10.02, 20)).toBe(15);
    const last = r.log.filter((e) => e.op === 'enter').at(-1);
    expect(last).toMatchObject({ stateId: 'b', transitionId: 'go', t: 15 });
  });

  it('atScenarioS counts from start, across states', () => {
    const d = doc([{ when: { afterS: 2 } }], [{ id: 'b', transitions: [{ id: 'late', to: 'c', when: { atScenarioS: 7 } }] }]);
    const r = new ScenarioRunner(d);
    r.start(0);
    expect(runUntilChange(r, 0.02, 3)).toBe(2);
    expect(runUntilChange(r, 2.02, 10)).toBe(7);
  });

  it('vital with forS fires only after the value holds continuously; a dip resets it', () => {
    const r = new ScenarioRunner(doc([{ when: { vital: { var: 'hr', op: '>=', value: 100, forS: 10 } } }]));
    r.start(0);
    r.advance(1, [vals({ hr: 105 })]);
    r.advance(6, [vals({ hr: 95 })]); // dip after 5 s
    r.advance(7, [vals({ hr: 110 })]);
    expect(r.advance(16.9)).toEqual([]);
    expect(states(r.advance(17))).toEqual(['b']);
  });

  it('vital reads measured aliases: nibpSys counts as sbp; a higher-rank source wins until stale', () => {
    const r = new ScenarioRunner(doc([{ when: { vital: { var: 'sbp', op: '<', value: 80 } } }]));
    r.start(0);
    r.advance(1, [vals({ sbp: 120 }, 3)]); // truth (Stage 2 state)
    r.advance(2, [vals({ nibpSys: 70 })]); // measured, lower rank: ignored while truth is fresh
    expect(r.stateId).toBe('a');
    r.advance(8, [vals({ nibpSys: 70 })]); // truth silent > 5 s → measured takes over
    expect(r.stateId).toBe('b');
  });

  it('event filters: kind, exact keys, and minJ/minDose lower bounds', () => {
    const r = new ScenarioRunner(doc([{ when: { event: { kind: 'defib', action: 'shock', minJ: 150 } } }]));
    r.start(0);
    r.advance(1, [shock(100)]);
    expect(r.stateId).toBe('a');
    r.advance(2, [{ kind: 'clinical', event: { kind: 'defib', action: 'charge', energyJ: 200 } }]);
    expect(r.stateId).toBe('a');
    r.advance(3, [shock(200)]);
    expect(r.stateId).toBe('b');
    const r2 = new ScenarioRunner(doc([{ when: { event: { kind: 'drug', drugId: 'adenosine', minDose: 6 } } }]));
    r2.start(0);
    r2.advance(1, [drug('adenosine', 3)]);
    expect(r2.stateId).toBe('a');
    r2.advance(2, [drug('adenosine', 6)]);
    expect(r2.stateId).toBe('b');
  });

  it('sensor triggers are levels; the initial sensor states come from patient.sensors', () => {
    const d = doc([{ when: { sensor: { sensor: 'spo2', state: 'off' } } }]);
    d.patient = { sensors: { spo2: 'on' } };
    const r = new ScenarioRunner(d);
    r.start(0);
    r.advance(1);
    expect(r.stateId).toBe('a');
    r.advance(2, [{ kind: 'sensor', sensor: 'spo2', state: 'off' }]);
    expect(r.stateId).toBe('b');
  });

  it('all needs every child (events latch across ticks); any needs one', () => {
    const r = new ScenarioRunner(doc([{ when: { all: [{ event: { kind: 'drug', drugId: 'epinephrine' } }, { vital: { var: 'etco2', op: '>=', value: 20, forS: 30 } }] } }]));
    r.start(0);
    r.advance(5, [drug('epinephrine')]);
    r.advance(10, [vals({ etco2: 25 })]);
    expect(r.advance(39.98)).toEqual([]);
    expect(states(r.advance(40))).toEqual(['b']);
    const r2 = new ScenarioRunner(doc([{ when: { any: [{ afterS: 60 }, { event: { kind: 'cpr', active: true } }] } }]));
    r2.start(0);
    r2.advance(3, [{ kind: 'clinical', event: { kind: 'cpr', active: true } }]);
    expect(r2.stateId).toBe('b');
  });

  it('priority: document order wins when two transitions hold on the same tick; at most one fires per call', () => {
    const r = new ScenarioRunner(doc([{ id: 'first', to: 'b', when: { afterS: 1 } }, { id: 'second', to: 'c', when: { afterS: 1 } }]));
    r.start(0);
    expect(states(r.advance(1))).toEqual(['b']);
    const d = doc([{ id: 'x', to: 'b', when: { afterS: 1 } }], [{ id: 'b', transitions: [{ id: 'y', to: 'c', when: { afterS: 0 } }] }]);
    const r2 = new ScenarioRunner(d);
    r2.start(0);
    r2.advance(1);
    expect(r2.stateId).toBe('b'); // b's afterS 0 waits for the next call
    r2.advance(1.02);
    expect(r2.stateId).toBe('c');
  });

  it('events before entering a state do not count', () => {
    const d = doc([{ when: { afterS: 1 } }], [{ id: 'b', transitions: [{ id: 'y', to: 'c', when: { event: { kind: 'defib', action: 'shock' } } }] }]);
    const r = new ScenarioRunner(d);
    r.start(0);
    r.advance(0.5, [shock()]);
    r.advance(1);
    expect(r.stateId).toBe('b');
    r.advance(2);
    expect(r.stateId).toBe('b');
  });

  it('a transition to the current state stays: no commands, timers keep running, the event is consumed', () => {
    const r = new ScenarioRunner(doc([
      { id: 'shock', to: 'b', when: { event: { kind: 'defib', action: 'shock' } }, probability: 0, else: 'a' },
      { id: 'decay', to: 'c', when: { afterS: 20 } },
    ]));
    r.start(0);
    const fx = r.advance(10, [shock()]);
    expect(fx).toEqual([{ kind: 'event', event: { type: 'scenario', t: 10, stateId: 'a', transitionId: 'shock:else' } }]);
    expect(r.advance(11)).toEqual([]); // the shock was consumed
    expect(runUntilChange(r, 11.02, 30)).toBe(20); // afterS still counts from 0
  });

  it('probability without else stays on failure', () => {
    const r = new ScenarioRunner(doc([{ id: 'p0', when: { afterS: 1 }, probability: 0 }]));
    r.start(0);
    expect(r.advance(1)).toMatchObject([{ kind: 'event', event: { stateId: 'a', transitionId: 'p0:else' } }]);
  });

  it('manual: trigger presses the button; the rest of an all() must still hold', () => {
    const r = new ScenarioRunner(doc([{ id: 'm', when: { all: [{ manual: { label: 'ROSC' } }, { event: { kind: 'drug', drugId: 'epinephrine' } }] } }]));
    r.start(0);
    expect(r.trigger(1, 'm')).toEqual({ ok: true });
    r.advance(1);
    expect(r.stateId).toBe('a');
    r.advance(2, [drug('epinephrine')]);
    expect(r.stateId).toBe('b');
  });

  it('trigger on a transition without a manual leaf forces it; an unknown id is refused', () => {
    const r = new ScenarioRunner(doc([{ id: 'slow', when: { afterS: 600 } }]));
    r.start(0);
    expect(r.trigger(1, 'nope')).toEqual({ ok: false, reason: 'no transition nope in state a' });
    r.trigger(1, 'slow');
    expect(states(r.advance(1))).toEqual(['b']);
  });

  it('pause stops the scenario clock and the evaluation; inputs still latch', () => {
    const r = new ScenarioRunner(doc([{ id: 'late', when: { afterS: 10 } }, { id: 'ev', to: 'c', when: { event: { kind: 'cpr', active: true } } }]));
    r.start(0);
    r.advance(4);
    r.pause(4);
    r.advance(100, [{ kind: 'clinical', event: { kind: 'cpr', active: true } }]);
    expect(r.stateId).toBe('a');
    expect(r.stateT).toBeCloseTo(4, 9);
    r.resume(100);
    expect(states(r.advance(100.02))).toEqual(['c']);
  });

  it('goto re-enters (even the current state) and runs onExit + onEnter', () => {
    const r = new ScenarioRunner(doc([{ when: { afterS: 100 } }]));
    r.start(0);
    r.advance(30);
    const fx = r.goto(30, 'a');
    expect(cmds(fx).map((c) => (c as { value: number }).value)).toEqual([81, 80]);
    expect(r.stateT).toBe(0);
    expect(() => r.goto(31, 'zzz')).toThrow('no state zzz');
  });

  it('timers do not depend on the polling rate (per tick vs once a second vs only at inputs)', () => {
    const run = (step: number) => {
      const r = new ScenarioRunner(doc([{ when: { vital: { var: 'hr', op: '>', value: 100, forS: 7.5 } } }, { id: 't2', to: 'c', when: { afterS: 30 } }]));
      r.start(0);
      const inputs = new Map([[2, [vals({ hr: 120 })]], [4, [vals({ hr: 90 })]], [5, [vals({ hr: 130 })]]]);
      for (let k = 1; k <= 1500; k++) {
        const t = Math.round(k * 0.02 * 100) / 100;
        const inp = inputs.get(t) ?? [];
        if (inp.length || Math.abs((t / step) - Math.round(t / step)) < 1e-9) r.advance(t, inp);
        if (r.stateId !== 'a') return { state: r.stateId, t };
      }
      return null;
    };
    expect(run(0.02)).toEqual({ state: 'b', t: 12.5 });
    expect(run(0.5)).toEqual({ state: 'b', t: 12.5 });
  });

  it('getState/setState round-trips exactly (JSON-safe)', () => {
    const r = new ScenarioRunner(doc([{ when: { vital: { var: 'hr', op: '>', value: 100, forS: 5 } } }]));
    r.start(0);
    r.advance(1, [vals({ hr: 120 }), drug('x')]);
    const s = r.getState();
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
    r.advance(6);
    expect(r.stateId).toBe('b');
    r.setState(s);
    expect(r.stateId).toBe('a');
    expect(states(r.advance(6))).toEqual(['b']);
  });
});
