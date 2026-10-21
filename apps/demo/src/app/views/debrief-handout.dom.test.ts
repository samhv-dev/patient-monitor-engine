// @vitest-environment happy-dom
// The learner handout's take-home section prints the three showcase-2 cards' takeHome lines exactly as the owner
// confirmed them (2026-10-21), one list item each; a card without takeHome keeps the blank lines (Decision 6).
import { describe, expect, it } from 'vitest';
import { showcaseDoc } from '../showcase/harness.ts';
import { takeHomeSection } from './debrief.ts';

const OWNER: Record<string, string[]> = {
  'showcase-tamponade': [
    'Tachycardia, a narrow pulse pressure and a raised CVP after a chest wound: think of tamponade.',
    'Drainage is the treatment: plan it before the pressure falls.',
    'In PEA from tamponade, CPR alone cannot bring the pulse back; drainage during CPR can.',
  ],
  'showcase-mh': [
    'A rising EtCO₂ at the same ventilation with a rising heart rate: think of MH early.',
    'Trigger off, 100 % oxygen at high flow, hyperventilation, and dantrolene 2.5 mg/kg.',
    'Keep hyperventilating until the EtCO₂ has stayed down, and treat the potassium.',
  ],
  'showcase-bronchospasm': [
    'High peak pressure, a shark-fin capnogram and auto-PEEP: think of bronchospasm.',
    'Treat with a bronchodilator.',
    'Watch the delivered tidal volume and minute volume recover as air trapping eases.',
  ],
};

describe('learner handout: take-home points', () => {
  it.each(Object.keys(OWNER))('%s: the card carries the owner-confirmed lines and the handout prints them', (id) => {
    const take = showcaseDoc(id).takeHome;
    expect(take).toEqual(OWNER[id]);
    const sec = takeHomeSection(take);
    expect(sec.querySelector('h3')?.textContent).toBe('Take-home points');
    expect([...sec.querySelectorAll('ol.db-take > li')].map((li) => li.textContent)).toEqual(OWNER[id]);
    expect(sec.querySelector('.db-ruled')).toBeNull();
    expect(sec.textContent).not.toContain('Your take-home points');
  });

  it('a card without takeHome prints "Your take-home points" over three blank lines', () => {
    const sec = takeHomeSection(showcaseDoc('showcase-anaphylaxis').takeHome);
    expect(sec.querySelector('ol')).toBeNull();
    expect(sec.querySelector('.db-subhead')?.textContent).toBe('Your take-home points');
    expect(sec.querySelectorAll('.db-ruled')).toHaveLength(3);
  });
});
