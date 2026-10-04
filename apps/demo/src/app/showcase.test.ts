// Task 26: the five showcase cases are valid pme-scenario/1 documents with their own card fields, not drafts, and lead
// the library under "Showcase".
import { validateScenario } from '@pme/controller/scenario';
import { describe, expect, it } from 'vitest';
import { LIBRARY } from './scenarios.ts';

describe('showcase cases (Task 26)', () => {
  it('lead the library, carry their card fields, are not drafts, and validate', () => {
    const show = LIBRARY.filter((c) => c.category === 'Showcase');
    expect(show.map((c) => c.id).sort()).toEqual(['showcase-anaphylaxis', 'showcase-bronchospasm', 'showcase-haemorrhage', 'showcase-induction', 'showcase-tamponade']);
    expect(LIBRARY.slice(0, 5).every((c) => c.category === 'Showcase')).toBe(true);
    for (const c of show) {
      expect(c.draft, c.id).toBe(false);
      expect(c.story.length, c.id).toBeGreaterThan(40);
      expect(c.objectives.length, c.id).toBeGreaterThanOrEqual(2);
      expect(c.minutes, c.id).toBeGreaterThan(0);
      const v = validateScenario(c.doc);
      expect(v.ok ? [] : v.errors, `${c.id}: ${JSON.stringify(v.ok ? [] : v.errors)}`).toEqual([]);
    }
  });

  it('bronchospasm says what the learner sees: pressure-limited, so ventilation recovers rather than pressures falling', () => {
    const c = LIBRARY.find((x) => x.id === 'showcase-bronchospasm');
    const words = [c?.story ?? '', ...(c?.objectives ?? []), ...(c?.doc.states ?? []).map((s) => s.label ?? '')].join(' | ');
    expect(words).not.toMatch(/pressures? (fall|falling)|auto-PEEP fall/i);
    expect(c?.story).toMatch(/tidal volume/);
    expect(c?.doc.states.find((s) => s.id === 'treated')?.label).toBe('Salbutamol given: ventilation recovering');
  });
});
