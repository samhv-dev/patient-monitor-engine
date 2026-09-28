// FU-4 G7/F10 (Task 18f): the repeat-succinylcholine bradyarrhythmia is a seeded RISK on the `outcome` stream, not a
// certainty — commoner in children (SUX_REPEAT_P_CHILD 0.7 vs SUX_REPEAT_P 0.35 [ENG]; Miller ch. 23), none when an
// anticholinergic already occupies the muscarinic receptors, one draw per repeat dose. Three seeds (the scenario
// suite) cannot tell 0.35 from 0.7, so the RATE is asserted here over 40 seeds.
import { describe, expect, it } from 'vitest';
import { createHookState, rhythmRequest, SUX_BRADY_RATE_BPM, SUX_MUSC_BLOCK_PROTECT } from '../../../src/l2/pk/hooks.ts';
import { createPkState, type DrugInst } from '../../../src/l2/pk/pipeline.ts';
import { seedStream } from '../../../src/rng/sfc32.ts';

function fires(ageY: number, seed: number, muscBlock = 0, gapS = 300): boolean {
  const pk = createPkState({ ageY, weightKg: ageY < 12 ? 16 : 70, heightCm: ageY < 12 ? 100 : 175, sex: 'm' });
  pk.drugs['succinylcholine'] = { bolusTimes: [100, 100 + gapS] } as unknown as DrugInst;
  pk.fx.muscBlock = muscBlock;
  const req = rhythmRequest(pk, createHookState(), { id: 'sinus', pinned: false }, 101 + gapS, seedStream(seed, 'outcome'));
  return req?.id === 'junctionalEscape';
}
const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);

describe('FU-4 G7: the repeat-succinylcholine draw', () => {
  it('the paediatric rate exceeds the adult rate over 40 seeds (and each lies near its probability)', () => {
    const adult = SEEDS.filter((s) => fires(40, s)).length / SEEDS.length;
    const child = SEEDS.filter((s) => fires(4, s)).length / SEEDS.length;
    console.log(`repeat sux over ${SEEDS.length} seeds: adult ${adult.toFixed(2)}, child ${child.toFixed(2)}`);
    expect(child).toBeGreaterThan(adult);
    expect(adult).toBeGreaterThan(0.15);
    expect(adult).toBeLessThan(0.55);
    expect(child).toBeGreaterThan(0.5);
  });
  it('an anticholinergic already on board (occupancy ≥ SUX_MUSC_BLOCK_PROTECT) abolishes it on every seed', () => {
    expect(SEEDS.filter((s) => fires(4, s, SUX_MUSC_BLOCK_PROTECT)).length).toBe(0);
  });
  it('outside the 90–1200 s window it is one dose (rapid sequence) or the sensitisation has gone', () => {
    expect(SEEDS.filter((s) => fires(4, s, 0, 30) || fires(4, s, 0, 1500)).length).toBe(0);
  });
  it('one draw per repeat dose; the request is the node rate, held, then the rhythm it came from after 60 s', () => {
    const pk = createPkState({ ageY: 4, weightKg: 16, heightCm: 100, sex: 'm' });
    pk.drugs['succinylcholine'] = { bolusTimes: [100, 400] } as unknown as DrugInst;
    const seed = SEEDS.find((s) => fires(4, s)) as number;
    const hs = createHookState();
    const rng = seedStream(seed, 'outcome');
    const r1 = rhythmRequest(pk, hs, { id: 'sinus', pinned: false }, 401, rng);
    expect(r1).toEqual({ id: 'junctionalEscape', opts: { rateBpm: SUX_BRADY_RATE_BPM }, hold: true });
    expect(rhythmRequest(pk, hs, { id: 'junctionalEscape', pinned: false }, 430, rng)).toBeNull();
    expect(rhythmRequest(pk, hs, { id: 'junctionalEscape', pinned: false }, 461, rng)).toEqual({ id: 'sinus', opts: {} });
    expect(rhythmRequest(pk, hs, { id: 'sinus', pinned: false }, 470, rng)).toBeNull(); // the same dose is never redrawn
  });
});
