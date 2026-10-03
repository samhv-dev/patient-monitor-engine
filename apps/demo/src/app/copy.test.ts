// The UX-copy rules as tests: scenario cards, trigger text and log lines never show an engine id, a build-stage or a
// ruling number (research/13 brief; R56).
import { describe, expect, it } from 'vitest';
import type { ScenarioDoc } from '@pme/controller';
import { describeCommand } from './describe.ts';
import { LIBRARY } from './scenarios.ts';
import { SCENARIO_META } from './scenario-meta.ts';
import { transitionText } from './triggers.ts';
import { LEARNER_ACTIONS } from '../stage6b/actions.ts';
import { drugWords } from './glossary.ts';

/** camelCase or dotted engine ids ("etco2", "vfCoarse", "mon.hr"), build stages and rulings. */
const LEAK = /\b(?!(?:mmHg|cmH|pH|mEq|kPa|iCa|mOsm|mL|dL|mA|awRR)\b)[a-z]+[A-Z][A-Za-z]*\b|\b[a-z]+\.[a-z]+\b|\bStage \d|\b7[a-k]\b|\bR\d{2}\b|\b(etco2|spo2|fio2|sbp|dbp|hr|rosc|vf)\b/;

describe('clinical copy', () => {
  it('the library holds every scenario document and every card has meta written for learners', () => {
    expect(LIBRARY.length).toBeGreaterThanOrEqual(11);
    for (const c of LIBRARY) {
      expect(SCENARIO_META[c.id], `${c.id} has card meta`).toBeDefined();
      expect(`${c.title} ${c.story} ${c.objectives.join(' ')}`).not.toMatch(LEAK);
      expect(c.title).not.toMatch(/^\[draft\]/i);
    }
  });
  it('every transition of every scenario reads in clinical words', () => {
    for (const c of LIBRARY) {
      const doc = c.doc as ScenarioDoc;
      for (const s of doc.states) for (const t of s.transitions ?? []) expect(transitionText(t, doc), `${c.id}/${t.id}`).not.toMatch(LEAK);
    }
  });
  it('log lines name drugs, targets, rhythms and devices clinically', () => {
    const cmds: Array<Record<string, unknown>> = [
      { type: 'setTarget', variable: 'hr', value: 110, ramp: { durationS: 30 } },
      { type: 'pin', variable: 'spo2', value: 85 },
      { type: 'release', variable: 'spo2' },
      { type: 'setRhythm', rhythm: 'vfCoarse' },
      { type: 'setMode', mode: 'modeled' },
      { type: 'applyEvent', event: { kind: 'drug', drugId: 'phenylephrine', dose: 100, unit: 'mcg', route: 'iv' } },
      { type: 'applyEvent', event: { kind: 'infusion', drugId: 'norepinephrine', rate: 0.1, unit: 'mcg/kg/min' } },
      { type: 'applyEvent', event: { kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2, fgfLpm: 2 } },
      { type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, peep: 5, fio2: 0.5 } },
      { type: 'applyEvent', event: { kind: 'lungCondition', id: 'ptxTension', severity: 1, side: 'R' } },
      { type: 'applyEvent', event: { kind: 'defib', action: 'charge', energyJ: 200 } },
      { type: 'applyEvent', event: { kind: 'cpr', active: true, rate: 110 } },
      { type: 'attachSensor', sensor: 'spo2', state: 'off' },
      { type: 'device', action: { device: 'alarm', action: 'silence' } },
      { type: 'scenario', action: 'load', doc: { title: '[draft] Witnessed VF in PACU' } },
    ];
    const lines = cmds.map((c) => describeCommand(c));
    for (const l of lines) expect(l).not.toMatch(LEAK);
    expect(lines).toContain('HR target 110 bpm over 30 s');
    expect(lines).toContain('Norepinephrine 0.1 µg/kg/min infusion started');
    expect(lines).toContain('Rhythm: Coarse VF');
  });
  it('learner controls read clinically in either drug-name set (rulings 4 and 5)', () => {
    for (const a of LEARNER_ACTIONS) expect(drugWords(a.label), a.id).not.toMatch(LEAK);
    expect(LEARNER_ACTIONS.map((a) => a.label)).toContain('Epinephrine 1 mg');
  });
});
