import { describe, expect, it } from 'vitest';
import { advancePk, applyPkCommand, createPkState, NEUTRAL_PK_CTX } from '../../../src/l2/pk/pipeline.ts';
import { createHookState, rhythmRequest } from '../../../src/l2/pk/hooks.ts';
import type { Command } from '../../../src/types.ts';

const ev = (event: Record<string, unknown>) => ({ type: 'applyEvent', event }) as unknown as Command;

function adenosine(doseMg: number, rhythm: string) {
  const pk = createPkState();
  const hs = createHookState();
  applyPkCommand(pk, ev({ kind: 'drug', drugId: 'adenosine', dose: doseMg, unit: 'mg', route: 'iv' }), 0);
  const seen: { t: number; id: string }[] = [];
  let cur = rhythm;
  for (let t = 0.1; t <= 60; t = Math.round((t + 0.1) * 10) / 10) {
    advancePk(pk, NEUTRAL_PK_CTX, t);
    const r = rhythmRequest(pk, hs, { id: cur as never, pinned: false }, t);
    if (r) {
      seen.push({ t, id: r.id });
      cur = r.id;
    }
  }
  return seen;
}

describe('rhythm hooks', () => {
  it('adenosine 6 mg on AVNRT: transient complete block 10–30 s after the push, then sinus', () => {
    const s = adenosine(6, 'svtAvnrt');
    expect(s[0]!.id).toBe('avb3Narrow');
    expect(s[0]!.t).toBeGreaterThan(5);
    expect(s[0]!.t).toBeLessThan(30);
    expect(s[1]!.id).toBe('sinus');
    expect(s[1]!.t - s[0]!.t).toBeGreaterThan(3);
    expect(s[1]!.t - s[0]!.t).toBeLessThan(15);
  });
  it('adenosine 3 mg: block but no conversion (SVT resumes); flutter always resumes', () => {
    const s = adenosine(3, 'svtAvnrt');
    expect(s.at(-1)!.id).toBe('svtAvnrt');
    expect(adenosine(12, 'aflutter').at(-1)!.id).toBe('aflutter');
  });
  it('LAST: bupivacaine 225 mg intravenously → bradycardia, then VF; seizure flag', () => {
    const pk = createPkState();
    const hs = createHookState();
    applyPkCommand(pk, ev({ kind: 'drug', drugId: 'bupivacaine', dose: 225, unit: 'mg', route: 'iv' }), 0);
    const ids: string[] = [];
    let cur = 'sinus';
    for (let t = 1; t <= 180; t++) {
      advancePk(pk, NEUTRAL_PK_CTX, t);
      const r = rhythmRequest(pk, hs, { id: cur as never, pinned: false }, t);
      if (r) ids.push((cur = r.id));
    }
    expect(ids.indexOf('sinusBrady')).toBeGreaterThanOrEqual(0);
    expect(ids.indexOf('vfCoarse')).toBeGreaterThan(ids.indexOf('sinusBrady'));
    expect(Math.max(...Object.values(pk.lastC))).toBeGreaterThan(3); // above the seizure threshold on the way
  });
});
