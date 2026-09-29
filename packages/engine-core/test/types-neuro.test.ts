import { describe, expect, expectTypeOf, it } from 'vitest';
import type { Command, EngineEvent, NumericId, PatientProfile } from '../src/types.ts';
import type { NeuroClinicalEvent, NeuroEvent, StimulusEvent, VagalSite } from '../src/types-neuro.ts';

describe('Stage 7f public types', () => {
  it('commands, events, numerics and the profile accept the neuro members; drug/vaporiser events stay 7g\'s', () => {
    const c: Command = { id: '1', issuedBy: 't', type: 'applyEvent', event: { kind: 'airwayDevice', device: 'none' } };
    const s: Command = { id: '3', issuedBy: 't', type: 'applyEvent', event: { kind: 'stimulus', intensity: 1.5 } };
    const d: Command = { id: '2', issuedBy: 't', type: 'device', action: { device: 'tof', action: 'start', intervalS: 15 } };
    const n: NumericId[] = ['tofCount', 'tofRatio', 'ptc', 'di', 'sr', 'mac', 'etAa'];
    const p: PatientProfile = { neuro: { nm: 'myasthenia', cholinesterase: 'heterozygous', mhSusceptible: true, mgMmolL: 1.2 } };
    const e: EngineEvent = { type: 'neuroMark', t: 1, kind: 'awareness' };
    expect([c.type, s.type, d.type, n.length, p.neuro?.nm, e.type]).toEqual(['applyEvent', 'applyEvent', 'device', 7, 'myasthenia', 'neuroMark']);
    expectTypeOf<Extract<NeuroEvent, { type: 'tof' }>['ratio']>().toEqualTypeOf<number | null>();
    expectTypeOf<Extract<NeuroEvent, { type: 'anaesthesia' }>['block']>().toEqualTypeOf<{ thumb: number; dia: number }>();
    expectTypeOf<NeuroClinicalEvent['kind']>().toEqualTypeOf<'stimulus' | 'airwayDevice' | 'neuroProfile'>();
    expectTypeOf<StimulusEvent>().toEqualTypeOf<{ kind: 'stimulus'; intensity: number; site?: VagalSite }>(); // 7e's shape (R51 addenda 12, 17); FU-4 G7 (Task 12): + the optional vagal site
  });
});
