// A volatile agent is given through the vaporiser. An IV `drug` (or `infusion`) command for one used to be accepted
// and then threw in pkSystem on the next tick (a volatile row has no compartment model): it is refused with the reason.
import { describe, expect, it } from 'vitest';
import { createPkState, validatePkCommand } from '../../../src/l2/pk/pipeline.ts';
import { createEngine, type Command } from '../../../src/index.ts';

const VOLATILES = ['sevoflurane', 'isoflurane', 'desflurane', 'n2o'];
const eng = () => createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, sex: 'M', weightKg: 70 } });
const ev = (event: Record<string, unknown>) => ({ id: `v${Math.random()}`, issuedBy: 'test', type: 'applyEvent', event }) as unknown as Command;

describe('an IV command for a volatile agent is refused, not accepted and then thrown on', () => {
  it.each(VOLATILES)('%s: validatePkCommand refuses an IV bolus and an infusion with the vaporiser as the reason', (id) => {
    const pk = createPkState();
    expect(validatePkCommand(ev({ kind: 'drug', drugId: id, dose: 1, unit: 'mL', route: 'iv' }), pk)).toMatch(/given through the vaporiser/);
    expect(validatePkCommand(ev({ kind: 'drug', drugId: id, dose: 1, unit: 'mL' }), pk)).toMatch(/given through the vaporiser/); // no route = IV
    expect(validatePkCommand(ev({ kind: 'infusion', drugId: id, rate: 1, unit: 'mL/h' }), pk)).toMatch(/given through the vaporiser/);
  });
  it.each(VOLATILES)('%s: the engine acks the refusal with the reason and keeps ticking', (id) => {
    const e = eng();
    const ack = e.dispatch(ev({ kind: 'drug', drugId: id, dose: 1, unit: 'mL', route: 'iv' }));
    expect(ack).toMatchObject({ accepted: false, reason: expect.stringMatching(new RegExp(`^${id}: .*given through the vaporiser`)) });
    expect(() => e.advanceTo(10)).not.toThrow();
  });
  it('the vaporiser path for the same agents still works (N₂O through its fraction)', () => {
    for (const agent of ['sevoflurane', 'isoflurane', 'desflurane']) {
      const e = eng();
      expect(e.dispatch(ev({ kind: 'vaporiser', agent, dialPct: 2, fgfLpm: 6 })).accepted).toBe(true);
      expect(() => e.advanceTo(10)).not.toThrow();
    }
    const e = eng();
    expect(e.dispatch(ev({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 0, fgfLpm: 6, n2oFrac: 0.5 })).accepted).toBe(true);
    expect(() => e.advanceTo(10)).not.toThrow();
  });
});
