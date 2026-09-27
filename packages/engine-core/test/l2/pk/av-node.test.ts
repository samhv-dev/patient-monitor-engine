// FU-2 (AF rate control, E-FU2-6/E-FU2-7): the β-blocker rows feed the drug bus's AV-nodal block; the adenosine hook
// reads adenosine's own block, so rate-control drugs never fire the adenosine pause or conversion.
import { describe, expect, it } from 'vitest';
import { combine, type PdContext } from '../../../src/l2/pk/combine.ts';
import { DRUGS } from '../../../src/l2/pk/data/drugs.ts';
import { createHookState, rhythmRequest } from '../../../src/l2/pk/hooks.ts';
import { advancePk, applyPkCommand, createPkState, NEUTRAL_PK_CTX } from '../../../src/l2/pk/pipeline.ts';
import type { DrugRow } from '../../../src/l2/pk/row.ts';
import type { Command } from '../../../src/types.ts';

const CTX: PdContext = { ph: 7.4, betaBlockC: 0, vasoResp: 1, ageY: 40, macBrain: 0 };
const block = (id: string, c: number) => combine([{ row: DRUGS[id] as DrugRow, c }], CTX).bus.avNodeBlock;
const give = (event: Record<string, unknown>) => ({ type: 'applyEvent', event }) as unknown as Command;

describe('AV-nodal block on the drug bus (FU-2 AF rate control)', () => {
  it('esmolol 150 µg/kg/min 0.25, metoprolol 5 mg 0.25, labetalol 20 mg 0.2, amiodarone 150 mg 0.15 (its 7g entry)', () => {
    expect(block('esmolol', 150)).toBeCloseTo(0.25, 9);
    expect(block('metoprolol', 2)).toBeCloseTo(0.25, 9);
    expect(block('labetalol', 2)).toBeCloseTo(0.2, 9);
    expect(block('amiodarone', 1)).toBeCloseTo(0.15, 9);
  });
  it('stacked rate control (esmolol 300 + metoprolol 10 mg + amiodarone 300 mg) blocks ≥ 0.5 but never fires the adenosine hook', () => {
    const pk = createPkState();
    applyPkCommand(pk, give({ kind: 'infusion', drugId: 'esmolol', rate: 300, unit: 'mcg/kg/min' }), 0);
    applyPkCommand(pk, give({ kind: 'drug', drugId: 'metoprolol', dose: 10, unit: 'mg', route: 'iv' }), 0);
    applyPkCommand(pk, give({ kind: 'drug', drugId: 'amiodarone', dose: 300, unit: 'mg', route: 'iv' }), 0);
    advancePk(pk, NEUTRAL_PK_CTX, 900);
    expect(pk.bus.avNodeBlock).toBeGreaterThanOrEqual(0.5);
    for (const id of ['sinus', 'afib', 'svtAvnrt'] as const) expect(rhythmRequest(pk, createHookState(), { id, pinned: false }, 900), id).toBeNull();
  });
});
