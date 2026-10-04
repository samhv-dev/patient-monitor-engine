// Task 26: acute events — every row is a command the engine accepts in both modes, staging keeps one entry per event
// and sends no onset with it, the log and the session bar read clinically; the lung catalogue has short names.
import { createEngine, LUNG_CONDITIONS } from '@pme/engine-core';
import type { AckResult, CommandInput } from '@pme/controller';
import { describe, expect, it } from 'vitest';
import { describeCommand } from './describe.ts';
import { ACUTE_EVENTS, activeText, conditionCommand, severityWord } from './events.ts';
import { lungLabel } from './glossary.ts';
import { Staging } from './staging.ts';

describe('acute events (Task 26)', () => {
  it('covers the showcase conditions, and the engine accepts every row in MODELED and in MANUAL', () => {
    const ids = ACUTE_EVENTS.map((e) => e.id);
    for (const id of ['tamponade', 'tensionPtx', 'pe', 'anaphylaxis', 'sepsis', 'mh']) expect(ids).toContain(id);
    for (const mode of ['modeled', 'manual'] as const) {
      const e = createEngine({ seed: 7, mode });
      for (const id of ids) {
        const c = { ...conditionCommand(id, 0.67), id: `t-${mode}-${id}`, issuedBy: 'test' } as never;
        expect(e.dispatch(c).accepted, `${id} in ${mode}`).toBe(true);
        expect(e.dispatch({ ...conditionCommand(id, 0), id: `s-${mode}-${id}`, issuedBy: 'test' } as never).accepted, `stop ${id}`).toBe(true);
      }
    }
  });

  it('stages one entry per event with no onset, and logs it in clinical words', async () => {
    const sent: CommandInput[] = [];
    const s = new Staging('t', (c) => {
      sent.push(c);
      return Promise.resolve({ accepted: true, tick: 1, commandId: c.id ?? 'x', rttMs: 0 } satisfies AckResult);
    });
    s.transitionS = 30;
    s.submit(conditionCommand('tamponade', 0.33), 'event-tamponade', 'x');
    s.submit(conditionCommand('tamponade', 1), 'event-tamponade', 'x'); // a later choice replaces the earlier one
    await s.commit();
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ type: 'applyEvent', event: { kind: 'condition', id: 'tamponade', severity: 1 } });
    expect(sent[0]).not.toHaveProperty('ramp');
    expect(describeCommand(conditionCommand('tamponade', 1) as Record<string, unknown>)).toBe('Cardiac tamponade: severe');
    expect(describeCommand(conditionCommand('pe', 0) as Record<string, unknown>)).toBe('Pulmonary embolism: removed');
    expect(activeText(new Map([['tamponade', 1], ['anaphylaxis', 0.33]]))).toEqual(['Cardiac tamponade (severe)', 'Anaphylaxis (mild)']);
    expect(severityWord(0.67)).toBe('moderate');
  });

  it('gives every lung condition a short name (no grading notes on the button)', () => {
    for (const c of LUNG_CONDITIONS) {
      const l = lungLabel(c.id, c.label);
      expect(l.length, c.id).toBeLessThanOrEqual(28);
      expect(l, c.id).not.toMatch(/[(/]/);
    }
    expect(lungLabel('ph', 'Pulmonary hypertension (group 1 default) / RV failure under PPV')).toBe('Pulmonary hypertension');
  });
});
