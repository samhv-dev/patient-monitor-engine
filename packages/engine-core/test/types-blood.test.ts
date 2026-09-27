import { describe, expect, it } from 'vitest';
import type { BloodClinicalEvent, Command, EngineEvent, LabPanel, PatientProfile } from '../src/index.ts';

describe('Stage 7c public types', () => {
  it('blood events are Commands, labs are EngineEvents, the profile carries blood chemistry', () => {
    const ev: BloodClinicalEvent = { kind: 'transfusion', product: 'rbc', units: 2, storageDays: 35 };
    const c: Command = { id: 'x', issuedBy: 't', type: 'applyEvent', event: ev };
    const keys: (keyof LabPanel)[] = ['ph', 'pco2', 'po2', 'hco3', 'be', 'lactate', 'na', 'k', 'cl', 'iCa', 'hb', 'glucose'];
    const e: EngineEvent['type'] = 'labResult';
    const p: PatientProfile = { ageY: 40, blood: { hb: 9, cohb: 0.06, burns: 0.5 } };
    expect(c.type).toBe('applyEvent');
    expect(keys).toHaveLength(12);
    expect(e).toBe('labResult');
    expect(p.blood?.hb).toBe(9);
  });
});
