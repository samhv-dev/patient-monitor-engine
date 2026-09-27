import { describe, expect, it } from 'vitest';
import { advancePk, applyPkCommand, createPkState, NEUTRAL_PK_CTX } from '../../../src/l2/pk/pipeline.ts';
import type { Command, EngineEvent } from '../../../src/types.ts';

const ev = (event: Record<string, unknown>) => ({ type: 'applyEvent', event }) as unknown as Command;

describe('drugs panel event', () => {
  it('one event per second with Cp/Ce, rate, TCI and a decrement time for running infusions', () => {
    const pk = createPkState();
    applyPkCommand(pk, ev({ kind: 'tci', drugId: 'propofol', mode: 'effect', target: 3 }), 0);
    applyPkCommand(pk, ev({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 1, fgfLpm: 2 }), 0);
    advancePk(pk, NEUTRAL_PK_CTX, 30);
    const d = pk.out.filter((e): e is Extract<EngineEvent, { type: 'drugs' }> => e.type === 'drugs');
    expect(d.length).toBe(30);
    const last = d.at(-1)!;
    const p = last.drugs.find((r) => r.id === 'propofol')!;
    expect(p.unit).toBe('µg/mL');
    expect(p.tci?.target).toBe(3);
    expect(p.cp).toBeGreaterThan(p.ce);
    expect(p.decrement50Min).not.toBeNull();
    expect(last.volatile?.agent).toBe('sevoflurane');
  });
});
