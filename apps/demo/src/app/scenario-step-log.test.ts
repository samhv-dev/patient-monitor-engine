// The clinical Log's line for a card step pressed (owner, 2026-10-30: "Instructor · Scenario event" said nothing about
// which event): it names the step by its button label, read from the state the press was made in.
import { ScenarioView, type ScenarioDoc } from '@pme/controller';
import { describe, expect, it } from 'vitest';
import { describeCommand } from './describe.ts';
import { scenarioStep } from './link.ts';
import { showcaseDoc } from './showcase/harness.ts';

const trigger = (target: string) => ({ type: 'scenario', action: 'trigger', target });

describe('the Log names the scenario step pressed', () => {
  it('a trigger reads "Scenario event: <the step\'s label>"; without a label, as before', () => {
    expect(describeCommand(trigger('bicarb-recovering'), 'Sodium bicarbonate 1 mmol/kg')).toBe('Scenario event: Sodium bicarbonate 1 mmol/kg');
    expect(describeCommand(trigger('bicarb-recovering'))).toBe('Scenario event');
    expect(describeCommand({ type: 'scenario', action: 'pause' }, 'ignored')).toBe('Scenario timer held');
  });

  it('the step is the button label of the transition in the state the press is made in (the MH card)', () => {
    const view = new ScenarioView();
    view.doc = showcaseDoc('showcase-mh') as ScenarioDoc;
    view.stateId = 'recovering';
    expect(scenarioStep(view, trigger('bicarb-recovering'))).toBe('Sodium bicarbonate 1 mmol/kg');
    expect(scenarioStep(view, trigger('cool-recovering'))).toBe('Cool: refrigerated saline 20 mL/kg (1.6 L)');
    view.stateId = 'treating';
    expect(scenarioStep(view, trigger('recover'))).toBe('EtCO₂ below 45 for a minute'); // a forced rule: its label
    expect(scenarioStep(view, trigger('nope'))).toBeUndefined();
    expect(scenarioStep(view, { type: 'time', action: 'pause' })).toBeUndefined();
  });
});
