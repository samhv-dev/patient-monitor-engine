import { describe, expect, it } from 'vitest';
import { LUNG_CONDITION_IDS, type LungCommandBody } from '../src/types-lung.ts';
import type { Command, EngineEvent, PatientProfile } from '../src/types.ts';

describe('Stage 7b public types', () => {
  it('32 unique catalogue condition ids', () => {
    expect(LUNG_CONDITION_IDS.length).toBe(32);
    expect(new Set(LUNG_CONDITION_IDS).size).toBe(32);
  });
  it('commands, profile and lungState accept the additions (compile-time)', () => {
    const body: LungCommandBody = { type: 'applyEvent', event: { kind: 'lungCondition', id: 'copd', severity: 0.75 } };
    const c: Command = { id: '1', issuedBy: 't', ...body };
    const p: PatientProfile = { lungConditions: [{ id: 'ards', severity: 0.67, recruitFrac: 0.5 }] };
    const e: EngineEvent = { type: 'lungState', t: 0, complianceMlPerCmH2O: 50, resistanceCmH2OPerLps: 10, effort: 0, autoPeepTendency: 0, shunt: 0.03, deadSpaceMl: 200, frcMl: 1400, fSlow: 0 };
    expect(c.type).toBe('applyEvent');
    expect(p.lungConditions?.[0]?.id).toBe('ards');
    expect(e.type).toBe('lungState');
  });
});
