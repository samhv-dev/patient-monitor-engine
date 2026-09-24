// ScenarioView: what a controller rebuilds from the wire alone.
import { describe, expect, it } from 'vitest';
import { ScenarioView } from '../../src/scenario/view.ts';
import { describeTransition, describeWhen, manualLabel } from '../../src/scenario/describe.ts';
import type { WireEvent } from '../../src/protocol.ts';
import { doc } from './fixtures.ts';

const d = doc([
  { id: 'shock', label: 'Shock', to: 'b', when: { event: { kind: 'defib', action: 'shock', minJ: 150 } }, probability: 0.3, else: 'a' },
  { id: 'rosc', to: 'b', when: { manual: { label: 'ROSC now' } } },
]);
const applied = (action: string, tick: number, extra: object = {}): WireEvent => ({
  type: 'commandApplied', commandId: `c${tick}`, tick, resolved: { command: { id: `c${tick}`, issuedBy: 'p', type: 'scenario', action, ...extra } },
}) as WireEvent;
const scn = (t: number, stateId: string, transitionId?: string): WireEvent => ({ type: 'scenario', t, stateId, ...(transitionId ? { transitionId } : {}) });

describe('ScenarioView', () => {
  it('load sets the doc; scenario events move the state; a stay keeps the entry time', () => {
    const v = new ScenarioView();
    expect(v.onEvent(applied('load', 50, { doc: d }))).toBe(true);
    expect(v.doc?.id).toBe('test');
    expect(v.stateId).toBe('a');
    v.onEvent(scn(1, 'a'));
    v.onEvent(scn(30, 'a', 'shock:else'));
    expect(v.enteredT).toBe(1);
    expect(v.timeInState(41)).toBe(40);
    v.onEvent(scn(45, 'b', 'rosc'));
    expect(v.enteredT).toBe(45);
    expect(v.history.map((h) => h.stateId)).toEqual(['a', 'a', 'b']);
  });

  it('pause freezes time in state; resume subtracts the paused span', () => {
    const v = new ScenarioView();
    v.onEvent(applied('load', 0, { doc: d }));
    v.onEvent(scn(0, 'a'));
    v.onEvent(applied('pause', 500)); // 10 s
    expect(v.timeInState(99)).toBe(10);
    v.onEvent(applied('resume', 1500)); // 30 s
    expect(v.timeInState(40)).toBe(20);
  });

  it('next() lists the current transitions with text and manual labels', () => {
    const v = new ScenarioView();
    v.onEvent(applied('load', 0, { doc: d }));
    expect(v.next()).toEqual([
      { id: 'shock', to: 'b', label: 'Shock', text: 'defib shock ≥ 150 J → b · p 0.3 else → a', manual: null },
      { id: 'rosc', to: 'b', label: 'rosc', text: 'button "ROSC now" → b', manual: 'ROSC now' },
    ]);
  });

  it('describe covers every trigger kind', () => {
    expect(describeWhen({ afterS: 60 })).toBe('after 60 s in state');
    expect(describeWhen({ atScenarioS: 300 })).toBe('at scenario 300 s');
    expect(describeWhen({ vital: { var: 'etco2', op: '>=', value: 20, forS: 30 } })).toBe('etco2 ≥ 20 for 30 s');
    expect(describeWhen({ event: { kind: 'drug', drugId: 'adenosine', minDose: 6 } })).toBe('drug adenosine dose ≥ 6');
    expect(describeWhen({ sensor: { sensor: 'spo2', state: 'off' } })).toBe('spo2 off');
    expect(describeWhen({ any: [{ afterS: 1 }, { manual: { label: 'Go' } }] })).toBe('any of (after 1 s in state; button "Go")');
    expect(describeTransition({ id: 'x', to: 'y', when: { afterS: 1 }, probability: 0.5 })).toBe('after 1 s in state → y · p 0.5 else stay');
    expect(manualLabel({ all: [{ afterS: 1 }, { manual: { label: 'Go' } }] })).toBe('Go');
  });
});
