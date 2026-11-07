// @vitest-environment happy-dom
// The imported cards (brief 22): a card read from a file is kept in this browser's storage beside the library, found by
// its id like a built-in card, removable; an id a built-in card already has is refused with the reason; a storage that
// does not keep it says so; a stored list that is not one reads as none.
import type { AnyScenarioDoc } from '@pme/controller';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { importedCards, keepImported, LIBRARY, removeImported, scenarioById } from './scenarios.ts';

const MH2 = LIBRARY.find((c) => c.id === 'showcase-mh-v2')?.doc as unknown as AnyScenarioDoc;
const copy = (id: string, title = 'My MH (pme-scenario/2)'): AnyScenarioDoc => ({ ...structuredClone(MH2), id, title });

let m: Map<string, string>;
beforeEach(() => {
  m = new Map();
  vi.stubGlobal('localStorage', { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), clear: () => m.clear() });
});
afterEach(() => vi.unstubAllGlobals());

describe('imported cards (brief 22)', () => {
  it('the library holds the /2 MH card the copies are made from', () => {
    expect(MH2?.schema).toBe('pme-scenario/2');
  });

  it('round-trip: a kept card comes back from storage with its document unchanged, and is found by its id', () => {
    expect(importedCards()).toEqual([]);
    const doc = copy('my-mh-v2');
    const r = keepImported(doc);
    expect(r).toMatchObject({ ok: true, replaced: false });
    expect(m.has('pme.imported-cards')).toBe(true);
    const back = importedCards();
    expect(back.map((c) => c.id)).toEqual(['my-mh-v2']);
    expect(back[0]?.doc).toEqual(doc);
    expect(back[0]?.title).toBe('My MH (pme-scenario/2)');
    expect(scenarioById('my-mh-v2')?.doc).toEqual(doc);
    expect(LIBRARY.some((c) => c.id === 'my-mh-v2')).toBe(false); // the built-in library is unchanged
  });

  it('the same id again replaces the earlier import; two ids are two cards in the order they came', () => {
    keepImported(copy('a-card', 'First'));
    keepImported(copy('b-card', 'Second'));
    const r = keepImported(copy('a-card', 'First, edited'));
    expect(r).toMatchObject({ ok: true, replaced: true });
    expect(importedCards().map((c) => [c.id, c.title])).toEqual([['b-card', 'Second'], ['a-card', 'First, edited']]);
  });

  it('removal: the card leaves storage and is no longer found; removing an id not kept is a no-op', () => {
    keepImported(copy('a-card'));
    keepImported(copy('b-card'));
    expect(removeImported('a-card')).toBe(true);
    expect(importedCards().map((c) => c.id)).toEqual(['b-card']);
    expect(scenarioById('a-card')).toBeUndefined();
    expect(removeImported('a-card')).toBe(false);
    expect(removeImported('showcase-mh-v2')).toBe(false); // a built-in card is never removed
    expect(scenarioById('showcase-mh-v2')).toBeDefined();
  });

  it('id collision: a built-in id is refused with the reason, and nothing is kept', () => {
    for (const id of ['showcase-mh-v2', 'showcase-mh', LIBRARY[LIBRARY.length - 1]?.id as string]) {
      const r = keepImported(copy(id));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe(`its id “${id}” is a built-in card's; give the card an id of its own`);
    }
    expect(importedCards()).toEqual([]);
    expect(m.has('pme.imported-cards')).toBe(false);
    expect(scenarioById('showcase-mh-v2')?.doc).toBe(MH2); // the built-in card is the one found
  });

  it('a storage that does not keep the card (a private window, a full storage) is said, not hidden', () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } });
    const r = keepImported(copy('my-mh-v2'));
    expect(r).toEqual({ ok: false, reason: 'this browser did not keep it (its storage is off or full)' });
    expect(importedCards()).toEqual([]);
  });

  it('a stored value that is not a list of cards reads as none', () => {
    m.set('pme.imported-cards', '{not json');
    expect(importedCards()).toEqual([]);
    m.set('pme.imported-cards', JSON.stringify([{ title: 'no id' }, 7, null, copy('ok-card')]));
    expect(importedCards().map((c) => c.id)).toEqual(['ok-card']);
  });
});
