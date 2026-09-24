// Compile-time contract for the Stage 2 public types (brief §7.2–§7.3): `pnpm typecheck` fails if a variant
// is missing from the unions; the runtime assertions only keep Vitest honest.
import { describe, expect, it } from 'vitest';
import type { HemoClinicalEvent, LineSensorState } from '../src/types-hemo.ts';
import type { Command, EngineEvent, PatientProfile } from '../src/types.ts';

describe('Stage 2 public types', () => {
  it('Command, EngineEvent and PatientProfile carry the Stage 2 variants', () => {
    const line: HemoClinicalEvent = { kind: 'line', line: 'abp', action: 'damp', value: 0.2, fnHz: 10 };
    const state: LineSensorState = 'connected';
    const cmds: Command[] = [
      { id: '1', issuedBy: 't', type: 'pin', variable: 'sbp', value: 90, ramp: { durationS: 10 } },
      { id: '2', issuedBy: 't', type: 'release', variable: 'all' },
      { id: '3', issuedBy: 't', type: 'setMode', mode: 'manual' },
      { id: '4', issuedBy: 't', type: 'applyEvent', event: line },
      { id: '5', issuedBy: 't', type: 'applyEvent', event: { kind: 'cpr', active: true, rate: 110, quality: 1 } },
      { id: '6', issuedBy: 't', type: 'attachSensor', sensor: 'abp', state, site: 'leftRadial' },
      { id: '7', issuedBy: 't', type: 'device', action: { device: 'nibp', action: 'auto', intervalMin: 5 } },
    ];
    const events: EngineEvent[] = [
      { type: 'nibp', t: 1, phase: 'deflating', cuffMmHg: 141 },
      { type: 'state', t: 1, tick: 50, mode: 'manual', values: { sbp: 120 }, control: { sbp: 'ramping' } },
      { type: 'alarm', t: 1, id: 'nibp-failed', priority: 'low', category: 'technical', state: 'raised', text: 'NBP measurement failed' },
    ];
    const profile: PatientProfile = { baseline: { hr: 80, sbp: 130 }, sensors: { abp: 'connected', spo2: 'on' } };
    expect(cmds.map((c) => c.type)).toEqual(['pin', 'release', 'setMode', 'applyEvent', 'applyEvent', 'attachSensor', 'device']);
    expect(events.map((e) => e.type)).toEqual(['nibp', 'state', 'alarm']);
    expect(profile.baseline?.sbp).toBe(130);
  });
});
