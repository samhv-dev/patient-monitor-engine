// Stage 7e public types: the union members compile, 7e has no drug event (R51 §3).
import { describe, expectTypeOf, it } from 'vitest';
import type { EndoClinicalEvent, EndoEvent, EngineEvent, PatientProfile } from '../src/index.ts';

describe('Stage 7e types', () => {
  it('events, profile and the engine unions', () => {
    expectTypeOf<EndoClinicalEvent['kind']>().toEqualTypeOf<'stimulus' | 'condition' | 'meal' | 'thermal7e'>();
    expectTypeOf<Extract<EngineEvent, { type: 'endo' }>>().toEqualTypeOf<EndoEvent>();
    expectTypeOf<NonNullable<PatientProfile['endo']>['diabetes']>().toEqualTypeOf<'none' | 'type1' | 'type2' | undefined>();
  });
});
