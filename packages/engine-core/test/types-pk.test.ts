import { describe, expect, it } from 'vitest';
import { DRUG_BUS_NEUTRAL, type Command, type PkClinicalEvent } from '../src/index.ts';

describe('Stage 7g public types', () => {
  it('drug events accept the brief shape and the 7g extensions', () => {
    const evs: PkClinicalEvent[] = [
      { kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg', route: 'iv' },
      { kind: 'drug', drugId: 'phenylephrine', dose: 0.5, unit: 'mcg/kg/min', route: 'iv', infusion: true },
      { kind: 'infusion', drugId: 'norepinephrine', rate: 0.1, unit: 'mcg/kg/min' },
      { kind: 'infusion', drugId: 'propofol', rate: 20, unit: 'mL/h', concentration: { amount: 10, unit: 'mg', perMl: 1 } },
      { kind: 'tci', drugId: 'propofol', model: 'eleveld', mode: 'effect', target: 3 },
      { kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2, fgfLpm: 2, n2oFrac: 0 },
    ];
    const cmds: Command[] = evs.map((event, i) => ({ id: String(i), issuedBy: 't', type: 'applyEvent', event }));
    expect(cmds).toHaveLength(6);
  });
  it('the neutral bus changes nothing (R51: no drive values, no NMB EC50 multiplier on the bus)', () => {
    expect(DRUG_BUS_NEUTRAL.cns.macBrain).toBe(0);
    expect(DRUG_BUS_NEUTRAL.agents).toEqual({});
    expect(DRUG_BUS_NEUTRAL.volatiles).toEqual({});
    expect(DRUG_BUS_NEUTRAL.doses).toEqual([]);
    expect(DRUG_BUS_NEUTRAL.antagonist).toEqual({ opioid: 1, benzodiazepine: 1 });
    expect(DRUG_BUS_NEUTRAL.nmb).toEqual({ achGain: 1 });
    expect('resp' in DRUG_BUS_NEUTRAL).toBe(false);
  });
});
