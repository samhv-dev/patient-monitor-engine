import { describe, expect, it } from 'vitest';
import { FENT_EEG_POT, FENT_VENT_POT, KET_NG_PER_REF, MIDAZ_NG_PER_REF, newDoses, pcheOf, readBus } from '../../../src/l2/neuro/bus.ts';
import { busFixture, dose, nmbAgent, opioid, vol } from '../../helpers/neuro-bus.ts';

describe('7f reads 7g\'s DrugBus (R51)', () => {
  it('the neutral bus reads as no drug', () => {
    const x = readBus(busFixture());
    expect(x.brain).toEqual({ propofol: 0, remifentanil: 0, fentanyl: 0, midazolam: 0, ketamine: 0 });
    expect(x.vent.opioid).toBe(0);
    expect(x.nmj.rocuronium).toBe(0);
    expect([x.macPotent, x.macN2o, x.macEt, x.suxCumMgPerKg, x.achGain, x.opioidAntag]).toEqual([0, 0, 0, 0, 1, 1]);
  });
  it('units: propofol µg/mL → ng/mL; gamma rows (midazolam, ketamine) → ng/mL-equivalents', () => {
    const x = readBus(busFixture({ cns: { propCe: 3, benzoCeMidazEq: 1, ketamineCe: 0.5 } }));
    expect(x.brain.propofol).toBe(3000);
    expect(x.brain.midazolam).toBe(MIDAZ_NG_PER_REF);
    expect(x.brain.ketamine).toBe(0.5 * KET_NG_PER_REF);
    expect(x.vent.propofol).toBe(3000);
  });
  it('opioids: brain from the per-agent sites, other opioids as remifentanil-equivalents; the ventilatory site is separate', () => {
    const x = readBus(busFixture({
      cns: { opioidCeRemiEq: 2 + FENT_EEG_POT * 1 + 1.2 },
      agents: { remifentanil: opioid(2, 2.5), fentanyl: opioid(1, 1.1) },
    }));
    expect(x.brain.remifentanil).toBeCloseTo(3.2, 9);
    expect(x.brain.fentanyl).toBe(1);
    expect(x.vent.opioid).toBeCloseTo(2.5 + FENT_VENT_POT * 1.1 + 1.2, 9);
  });
  it('naloxone (F2): 7g\'s antagonist multiplier divides the per-agent opioid sites; the remainder uses 7g\'s antagonised total', () => {
    // 7g's cns.opioidCeRemiEq is already divided by the multiplier (combine.ts); its per-agent totals are not
    const x = readBus(busFixture({ antagonist: { opioid: 8 }, cns: { opioidCeRemiEq: 8 / 8 }, agents: { remifentanil: opioid(8, 10) } }));
    expect(x.opioidAntag).toBe(8);
    expect(x.brain.remifentanil).toBeCloseTo(1, 9);
    expect(x.vent.opioid).toBeCloseTo(10 / 8, 9);
  });
  it('NMB sites (nmj, dia), the succinylcholine cumulative dose and the neostigmine gain', () => {
    const x = readBus(busFixture({
      nmb: { achGain: 2.5 },
      agents: { rocuronium: nmbAgent(900, 700, 0.6), succinylcholine: nmbAgent(10, 12, 4) },
    }));
    expect(x.nmj.rocuronium).toBe(900);
    expect(x.dia.rocuronium).toBe(700);
    expect(x.suxCumMgPerKg).toBe(4);
    expect(x.achGain).toBe(2.5);
  });
  it('volatiles incl. N2O (R51 addendum 9): brain MAC from each agent\'s macFrac; end-tidal MAC = Σ fet/macAge', () => {
    const x = readBus(busFixture({
      volatiles: { sevoflurane: { fet: 1.8, brain: 1.44, macAge: 1.8, macFrac: 0.8 }, n2o: vol(0.4, 104) },
    }));
    expect(x.macPotent).toBeCloseTo(0.8, 9);
    expect(x.macN2o).toBeCloseTo(0.4, 9);
    expect(x.macEt).toBeCloseTo(1 + 0.4, 9);
    expect(x.et.n2o?.fet).toBeCloseTo(41.6, 9);
  });
  it('doses are observed once each; the cholinesterase phenotype maps to 7g\'s patient field', () => {
    const bus = busFixture({ doses: [dose('succinylcholine', 1, 10)] });
    const a = newDoses(bus, -1);
    expect(a.doses).toHaveLength(1);
    expect(newDoses(bus, a.seenT).doses).toHaveLength(0);
    expect([pcheOf(undefined), pcheOf({ neuro: { cholinesterase: 'heterozygous' } }), pcheOf({ neuro: { cholinesterase: 'homozygous' } })]).toEqual(['normal', 'het', 'hom']);
  });
});
