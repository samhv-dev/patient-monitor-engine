// Compile-time contract for the Stage 3 public types (brief §7.2–§7.3, R27): `pnpm typecheck` fails if a variant
// is missing from the unions; the runtime assertions only keep Vitest honest.
import { describe, expect, it } from 'vitest';
import type { RespClinicalEvent, VentFrame } from '../src/types-resp.ts';
import type { Command, EngineEvent, PatientProfile } from '../src/types.ts';

describe('Stage 3 public types', () => {
  it('Command, EngineEvent and PatientProfile carry the Stage 3 variants', () => {
    const frame: VentFrame = { pawCmH2O: 18, flowLps: 0.4, volumeMl: 250, fio2: 0.4, peepCmH2O: 5, phase: 'insp' };
    const airway: RespClinicalEvent = { kind: 'airway', state: 'bronchospasm', severity: 0.5 };
    const cmds: Command[] = [
      { id: '1', issuedBy: 't', type: 'applyEvent', event: airway },
      { id: '2', issuedBy: 't', type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.4, peep: 5, fico2: 0, effort: 0 } },
      { id: '3', issuedBy: 't', type: 'applyEvent', event: { kind: 'preoxygenate', fio2: 1, durationS: 180 } },
      { id: '4', issuedBy: 't', type: 'applyEvent', event: { kind: 'condition', id: 'mh', severity: 1 } },
      { id: '5', issuedBy: 't', type: 'applyEvent', event: { kind: 'thermal', anaesthesia: 'general', warming: true, ambientC: 20 } },
      { id: '6', issuedBy: 't', type: 'externalDrive', source: 'ventilator', frame },
      { id: '7', issuedBy: 't', type: 'attachSensor', sensor: 'co2', state: 'on', sampling: 'mainstream' },
    ];
    const events: EngineEvent[] = [
      { type: 'breath', t: 1, seq: 0, kind: 'mech', tiS: 1.6, teS: 3.4, vtMl: 500, etco2True: 36 },
      { type: 'lungState', t: 0, complianceMlPerCmH2O: 50, resistanceCmH2OPerLps: 10, effort: 1, autoPeepTendency: 0, shunt: 0.04, deadSpaceMl: 154, frcMl: 2100 },
    ];
    const profile: PatientProfile = { ageY: 4, weightKg: 16, heightCm: 102, sex: 'F' };
    expect(cmds).toHaveLength(7);
    expect(events.map((e) => e.type)).toEqual(['breath', 'lungState']);
    expect(profile.weightKg).toBe(16);
  });
});
