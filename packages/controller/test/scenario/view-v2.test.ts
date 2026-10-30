// Plan F2: ScenarioView reads a pme-scenario/2 card's phases (the follower's and the Remote's label) and says when a run
// has ended, for both formats: /1 when the current state has no transitions, /2 when the current phase has no `next`.
import { describe, expect, it } from 'vitest';
import type { WireEvent } from '../../src/protocol.ts';
import { ScenarioView } from '../../src/scenario/view.ts';
import { doc } from './fixtures.ts';
import { minimalV2 } from './fixtures-v2.ts';

const loaded = (d: unknown): WireEvent =>
  ({ type: 'commandApplied', commandId: 'c1', tick: 50, resolved: { command: { id: 'c1', issuedBy: 'host', type: 'scenario', action: 'load', doc: d } } }) as WireEvent;
const phase = (t: number, stateId: string): WireEvent => ({ type: 'scenario', t, stateId, transitionId: `enter:${stateId}` });

describe('ScenarioView and a pme-scenario/2 card', () => {
  it('the current phase is the initial one on load and the published one after; its label is the phase\'s', () => {
    const sv = new ScenarioView();
    sv.onEvent(loaded(minimalV2()));
    expect(sv.stateId).toBe('baseline');
    expect(sv.stateLabel()).toBe('Baseline');
    expect(sv.phase()?.id).toBe('baseline');
    sv.onEvent(phase(30, 'early'));
    expect(sv.stateLabel()).toBe('Early signs');
    expect(sv.stateLabel('treated')).toBe('Treated');
    expect(sv.stateLabel('nowhere')).toBe('nowhere');
    expect(sv.phase()?.notes).toBe('EtCO₂ is climbing.');
    expect(sv.timeInState(42)).toBe(12);
    // a /2 card has no states and no transitions: the /1 readers keep their empty answer
    expect(sv.current()).toBeNull();
    expect(sv.next()).toEqual([]);
  });

  it('ended(): false while the current phase has a next, true in a phase without one', () => {
    const sv = new ScenarioView();
    expect(sv.ended()).toBe(false); // no scenario
    sv.onEvent(loaded(minimalV2()));
    expect(sv.ended()).toBe(false);
    sv.onEvent(phase(30, 'early'));
    expect(sv.ended()).toBe(false);
    sv.onEvent(phase(90, 'treated')); // treated has no next
    expect(sv.ended()).toBe(true);
  });
});

describe('ScenarioView.ended() on a /1 card (today\'s rule)', () => {
  it('true only when the current state has no transitions', () => {
    const d = doc([{ id: 'go', to: 'b', when: { manual: { label: 'Go' } } }]);
    const sv = new ScenarioView();
    sv.onEvent(loaded(d));
    expect(sv.stateId).toBe('a');
    expect(sv.ended()).toBe(false);
    sv.onEvent({ type: 'scenario', t: 5, stateId: 'b', transitionId: 'go' });
    expect(sv.current()?.id).toBe('b');
    expect(sv.ended()).toBe(true);
    sv.onEvent({ type: 'scenario', t: 6, stateId: 'gone' });
    expect(sv.ended()).toBe(false); // no such state: not an end
    sv.reset();
    expect(sv.ended()).toBe(false);
  });
});
