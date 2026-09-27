// Compile-time contract for the Stage 7a public types: `pnpm typecheck` fails if a variant is missing.
import { describe, expect, it } from 'vitest';
import type { CircClinicalEvent, CircEvent, TeachingChannel } from '../src/types-circ.ts';
import type { ChannelId, Command, EngineEvent, PatientProfile } from '../src/types.ts';

describe('Stage 7a public types', () => {
  it('Command, EngineEvent, ChannelId and PatientProfile carry the Stage 7a variants', () => {
    const drug: CircClinicalEvent = { kind: 'drug', drugId: 'phenylephrine', dose: 100, unit: 'mcg', route: 'iv' };
    const cmds: Command[] = [
      { id: '1', issuedBy: 't', type: 'applyEvent', event: drug },
      { id: '2', issuedBy: 't', type: 'applyEvent', event: { kind: 'bleed', volumeMl: 500, overS: 300 } },
      { id: '3', issuedBy: 't', type: 'applyEvent', event: { kind: 'fluid', fluid: 'crystalloid', volumeMl: 500, overS: 300 } },
      { id: '4', issuedBy: 't', type: 'applyEvent', event: { kind: 'condition', id: 'tamponade', severity: 0.8 } },
      { id: '5', issuedBy: 't', type: 'device', action: { device: 'iabp', action: 'start', ratio: 2 } },
      { id: '6', issuedBy: 't', type: 'device', action: { device: 'lvad', action: 'set', rpm: 5400 } },
      { id: '7', issuedBy: 't', type: 'attachSensor', sensor: 'pv', state: 'on' },
      { id: '8', issuedBy: 't', type: 'setMode', mode: 'modeled' },
    ];
    const ev: CircEvent = { type: 'circ', t: 1, co: 5, sv: 70, svRv: 70, ef: 0.6, lvedv: 120, lvesv: 50, lvedp: 8, lvsp: 120, pmsf: 9, pvr: 0.1, svr: 1, cpp: 70, supplyDemand: 1.4, kIsch: 1 };
    const events: EngineEvent[] = [ev];
    const chans: ChannelId[] = ['lvp', 'lvv', 'lap', 'rap', 'rvp', 'pat'] satisfies TeachingChannel[];
    const p: PatientProfile = { ageY: 75, sex: 'M', weightKg: 75, conditions: [{ id: 'as', grade: 'severe' }] };
    expect(cmds.length + events.length + chans.length + (p.conditions?.length ?? 0)).toBe(16);
  });
});
