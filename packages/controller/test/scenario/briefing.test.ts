// The card's learner-facing Case briefing (owner's board Orientation 7b, 30 October): an optional `briefing` block —
// `{ text, estimatedMinutes?, durationS? (60), lang? ('en' | 'fa') }` — that every learner screen shows over the running
// monitor when the card loads. Not the instructor's story: it says who the learner is, the patient, what has happened,
// what is connected and what to do.
import { describe, expect, it } from 'vitest';
import { briefingOf } from '../../src/scenario/briefing.ts';
import { validateScenario } from '../../src/scenario/validate.ts';
import type { ScenarioDoc } from '../../src/scenario/types.ts';

const base = () => ({
  schema: 'pme-scenario/1', id: 'x', title: 'X', initialState: 'a', states: [{ id: 'a', label: 'A' }],
}) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const errs = (d: unknown) => {
  const r = validateScenario(d);
  if (r.ok) throw new Error('expected invalid');
  return r.errors;
};

describe('the card field `briefing`', () => {
  it('is accepted in full and in its smallest form', () => {
    const full = { ...base(), briefing: { text: 'You are the resident.\n\nWatch the monitor.', estimatedMinutes: 25, durationS: 60, lang: 'en' } };
    expect(validateScenario(full)).toMatchObject({ ok: true, warnings: [] });
    expect(validateScenario({ ...base(), briefing: { text: 'شما رزیدنت بیهوشی هستید.', lang: 'fa' } }).ok).toBe(true);
    expect(validateScenario({ ...base(), briefing: { text: 'Watch.' } }).ok).toBe(true);
  });

  it.each([
    ['no text', { lang: 'en' }, '/briefing: missing required property "text"'],
    ['empty text', { text: '' }, '/briefing/text: must NOT have fewer than 1 characters'],
    ['text not a string', { text: 42 }, '/briefing/text: must be string'],
    ['an unknown key', { text: 'x', ring: true }, '/briefing: unexpected property "ring"'],
    ['a language the app has no chrome for', { text: 'x', lang: 'de' }, '/briefing/lang: must be one of "en", "fa"'],
    ['a zero duration', { text: 'x', durationS: 0 }, '/briefing/durationS: must be > 0'],
    ['a duration over 10 minutes', { text: 'x', durationS: 601 }, '/briefing/durationS: must be <= 600'],
    ['a duration as a string', { text: 'x', durationS: '60' }, '/briefing/durationS: must be number'],
    ['a zero estimated time', { text: 'x', estimatedMinutes: 0 }, '/briefing/estimatedMinutes: must be > 0'],
  ])('refuses %s with a path-level message', (_name, briefing, message) => {
    const e = errs({ ...base(), briefing });
    expect(e.some((x) => x.startsWith(message)), e.join('\n')).toBe(true);
  });

  it('refuses a briefing that is not an object', () => {
    expect(errs({ ...base(), briefing: 'Watch the monitor.' }).some((x) => x.startsWith('/briefing: must be object'))).toBe(true);
  });

  it('reads with its defaults: 60 s, English; a card without one has none', () => {
    const doc = (b?: unknown) => ({ ...base(), ...(b ? { briefing: b } : {}) }) as unknown as ScenarioDoc;
    expect(briefingOf(doc({ text: 'Watch.' }))).toEqual({ text: 'Watch.', durationS: 60, lang: 'en' });
    expect(briefingOf(doc({ text: 'Watch.', estimatedMinutes: 25, durationS: 45, lang: 'fa' }))).toEqual({ text: 'Watch.', estimatedMinutes: 25, durationS: 45, lang: 'fa' });
    expect(briefingOf(doc())).toBeNull();
  });
});
