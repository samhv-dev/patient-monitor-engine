import { describe, expect, expectTypeOf, it } from 'vitest';
import type { ChannelId, Command, EngineEvent, NumericId, PatientProfile } from '../../../src/types.ts';
import type { OrgansEvent } from '../../../src/types-organs.ts';

describe('Stage 7d public types', () => {
  it('commands, channel, numerics and event are in the public unions', () => {
    const cmds: Command[] = [
      { id: '1', issuedBy: 't', type: 'applyEvent', event: { kind: 'brain', massRateMlPerMin: 1 } },
      { id: '2', issuedBy: 't', type: 'applyEvent', event: { kind: 'position', headUpDeg: 30 } },
      { id: '3', issuedBy: 't', type: 'applyEvent', event: { kind: 'renal', catheter: 'foley', emptyBag: true } },
      { id: '4', issuedBy: 't', type: 'applyEvent', event: { kind: 'condition', id: 'tbi', severity: 1 } },
      { id: '5', issuedBy: 't', type: 'attachSensor', sensor: 'icp', state: 'on' },
      { id: '6', issuedBy: 't', type: 'applyEvent', event: { kind: 'renal', timeScale: 12 } },
    ];
    expect(cmds).toHaveLength(6);
    expectTypeOf<'icp'>().toMatchTypeOf<ChannelId>();
    expectTypeOf<'icpMean' | 'cpp' | 'pbto2' | 'uop'>().toMatchTypeOf<NumericId>();
    expectTypeOf<OrgansEvent>().toMatchTypeOf<EngineEvent>();
    const p: PatientProfile = { conditions: [{ id: 'htn' }, { id: 'tbi', severity: 1 }] };
    expect(p.conditions).toHaveLength(2);
  });
});
