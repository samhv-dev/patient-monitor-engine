// Small documents for the runner tests.
import type { ScenarioDoc, ScenarioState, Transition, When } from '../../src/scenario/types.ts';

/** A document whose state `a` has the given transitions; every other named state is empty. */
export function doc(transitions: Array<Partial<Transition> & { when: When }>, extra: ScenarioState[] = []): ScenarioDoc {
  const ts = transitions.map((t, i) => ({ id: t.id ?? `t${i}`, to: t.to ?? 'b', ...t })) as Transition[];
  const names = new Set(['b', 'c', ...ts.flatMap((t) => [t.to, t.else ?? 'b'])]);
  names.delete('a');
  for (const s of extra) names.delete(s.id);
  return {
    schema: 'pme-scenario/1', id: 'test', title: 'test', seed: 1, initialState: 'a',
    states: [{ id: 'a', onEnter: [{ type: 'setTarget', variable: 'hr', value: 80 }], onExit: [{ type: 'setTarget', variable: 'hr', value: 81 }], transitions: ts },
      ...[...names].map((id) => ({ id, onEnter: [{ type: 'setRhythm' as const, rhythm: id === 'b' ? 'sinusTachy' : 'asystole' }] })), ...extra],
  };
}

export const shock = (energyJ = 200) => ({ kind: 'clinical' as const, event: { kind: 'defib' as const, action: 'shock' as const, energyJ } });
export const drug = (drugId: string, dose = 1) => ({ kind: 'clinical' as const, event: { kind: 'drug' as const, drugId, dose, unit: 'mg' as const, route: 'iv' as const } });
export const vals = (values: Record<string, number>, rank: 1 | 2 | 3 = 2) => ({ kind: 'values' as const, rank, values });
