// FU-8 Task A14 (research/19 C12): setRhythm refuses option keys the rhythm engine does not read.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/index.ts';

describe('FU-8 A14: RhythmOpts are validated', () => {
  it('a pacemaker fault at the top level of opts is refused with the known keys; under opts.pacer it is accepted', () => {
    const e = createEngine({ seed: 7 });
    const top = e.dispatch({ id: 'a', issuedBy: 'test', type: 'setRhythm', rhythm: 'pacedVVI', opts: { fault: 'failureToCapture', faultRate: 1 } } as never);
    expect(top.accepted).toBe(false);
    expect(top.reason).toMatch(/^opts: unknown keys fault, faultRate \(known: .*pacer/);
    expect(e.dispatch({ id: 'b', issuedBy: 'test', type: 'setRhythm', rhythm: 'pacedVVI', opts: { pacer: { fault: 'failureToCapture', faultRate: 1 } } } as never).accepted).toBe(true);
    const inner = e.dispatch({ id: 'c', issuedBy: 'test', type: 'setRhythm', rhythm: 'pacedVVI', opts: { pacer: { rate: 70 } } } as never);
    expect(inner).toMatchObject({ accepted: false, reason: expect.stringMatching(/^opts\.pacer: unknown key rate/) });
  });
});
