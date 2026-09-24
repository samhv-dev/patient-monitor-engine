// Built-in scenarios: valid against the schema, marked [draft], and every rhythm is either on this engine or has
// a stand-in; the BP steps that need Stage 2 live in $comment, never in commands.
import { RHYTHM_IDS } from '@pme/engine-core';
import { describe, expect, it } from 'vitest';
import { BUILTIN_CATALOGUE, BUILTIN_SCENARIOS } from '../../src/scenario/builtins.ts';
import { RHYTHM_STAND_INS } from '../../src/scenario/standins.ts';
import type { DocCommand, ScenarioDoc } from '../../src/scenario/types.ts';
import { validateScenario } from '../../src/scenario/validate.ts';

const all = (d: ScenarioDoc): DocCommand[] => d.states.flatMap((s) => [...(s.onEnter ?? []), ...(s.onExit ?? [])]);

describe('built-in scenarios', () => {
  it('lists the five Stage 6b scenarios', () => {
    expect(BUILTIN_CATALOGUE.map((c) => c.id)).toEqual(['acls-vf-witnessed', 'acls-pea-hypovolaemia', 'acls-bradycardia-unstable', 'svt-adenosine', 'or-induction-hypotension']);
  });

  it.each(Object.keys(BUILTIN_SCENARIOS))('%s is valid, [draft], and runnable on this engine', (id) => {
    const r = validateScenario(BUILTIN_SCENARIOS[id], { rhythms: RHYTHM_IDS });
    expect(r.ok, JSON.stringify(r)).toBe(true);
    const d = BUILTIN_SCENARIOS[id] as ScenarioDoc;
    expect(d.title.startsWith('[draft]')).toBe(true);
    for (const c of all(d)) {
      if (c.type === 'setRhythm') expect((RHYTHM_IDS as readonly string[]).includes(c.rhythm) || c.rhythm in RHYTHM_STAND_INS, c.rhythm).toBe(true);
      if (c.type === 'setTarget') expect(c.variable, 'only hr takes targets before Stage 2').toBe('hr');
    }
  });
});
