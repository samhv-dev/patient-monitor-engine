// Plan F1: every reader of a card learns that a card may have no states. Given a pme-scenario/2 document, each /1
// reader in the controller gives the empty answer and does not throw; its /1 path is unchanged (the existing tests).
import { describe, expect, it } from 'vitest';
import type { WireEvent } from '../../src/protocol.ts';
import { ScenarioView } from '../../src/scenario/view.ts';
import { engineOptionsOf } from '../../src/scenario/patient.ts';
import { asV1, isV2, type AnyScenarioDoc } from '../../src/scenario/types.ts';
import { minimalV2 } from './fixtures-v2.ts';

const V2 = minimalV2() as unknown as AnyScenarioDoc;
const loaded = (doc: unknown): WireEvent =>
  ({ type: 'commandApplied', commandId: 'c1', tick: 50, resolved: { command: { id: 'c1', issuedBy: 'host', type: 'scenario', action: 'load', doc } } }) as WireEvent;

describe('the controller readers and a pme-scenario/2 document', () => {
  it('isV2 and asV1 tell the formats apart', () => {
    expect(isV2(V2)).toBe(true);
    expect(asV1(V2)).toBeNull();
    expect(asV1(null)).toBeNull();
  });

  it('ScenarioView: the doc is kept; no state, no current state, no transitions; a state label is its id', () => {
    const sv = new ScenarioView();
    expect(sv.onEvent(loaded(V2))).toBe(true);
    expect(sv.doc).toBe(V2);
    expect(sv.docVersion).toBe(1);
    expect(sv.stateId).toBeNull();
    expect(sv.current()).toBeNull();
    expect(sv.next()).toEqual([]);
    expect(sv.stateLabel()).toBe('—');
    // the phase id F2 will publish: no state of that name, so the id is shown (F2 gives it the phase's label)
    expect(sv.onEvent({ type: 'scenario', t: 12, stateId: 'early', transitionId: 'enter:early' } as WireEvent)).toBe(true);
    expect(sv.current()).toBeNull();
    expect(sv.stateLabel()).toBe('early');
  });

  it('engineOptionsOf reads the /1 header that /2 keeps whole', () => {
    const doc = { ...minimalV2(), patient: { ageY: 30, weightKg: 80, sex: 'M', neuro: { mhSusceptible: true } }, device: { skin: 'philips' } } as unknown as AnyScenarioDoc;
    expect(engineOptionsOf(doc, 7)).toEqual({ seed: 7, patient: { ageY: 30, weightKg: 80, sex: 'M', neuro: { mhSusceptible: true } }, device: { skin: 'philips' } });
  });
});
