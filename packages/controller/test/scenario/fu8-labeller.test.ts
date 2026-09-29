// FU-8 (Stage 9 R-S9-2): the describers print the host's clinical words for engine ids; without a labeller, the ids.
import { describe, expect, it } from 'vitest';
import { describeTransition, describeWhen } from '../../src/scenario/describe.ts';

const lx = { vital: (v: string) => ({ etco2: 'EtCO₂', map: 'MAP' })[v] ?? v, value: (k: string, v: string) => (k === 'drugId' && v === 'epinephrine' ? 'adrenaline' : v), sensor: (s: string) => (s === 'spo2' ? 'SpO₂ probe' : s), state: (s: string) => (s === 'rosc' ? 'ROSC' : s) };

describe('FU-8 R-S9-2: the Labeller hook', () => {
  it('prints clinical words through the hook and engine ids without it', () => {
    const t = { id: 't', to: 'rosc', when: { any: [{ vital: { var: 'etco2', op: '>=', value: 20, forS: 30 } }, { event: { kind: 'drug', drugId: 'epinephrine' } }, { sensor: { sensor: 'spo2', state: 'off' } }] } } as never;
    expect(describeTransition(t, lx)).toBe('any of (EtCO₂ ≥ 20 for 30 s; drug adrenaline; SpO₂ probe off) → ROSC');
    expect(describeTransition(t)).toBe('any of (etco2 ≥ 20 for 30 s; drug epinephrine; spo2 off) → rosc');
    expect(describeWhen({ vital: { var: 'map', op: '<', value: 65 } } as never, lx)).toBe('MAP < 65');
  });
});
