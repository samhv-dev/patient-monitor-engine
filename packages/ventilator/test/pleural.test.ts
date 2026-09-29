// Stage V.1 (G7b ruling 5): the ventilator's single compartment sees the pleural pressure. A tension pneumothorax
// collapses the lung at end-expiration once the pleural pressure passes PEEP; every breath must re-open it first.
import { describe, expect, it } from 'vitest';
import { advanceVent, createVent, LUNG_PATHOLOGIES, pleuralOpening, PPL_REST_CMH2O, referenceRun, toVentFrame } from '../src/index.ts';
import { P_PL0 } from '../../engine-core/src/l2/circ/params.ts';
import { CMH2O_TO_MMHG } from '../../engine-core/src/l2/gas/params.ts';

describe('pleural opening pressure (Stage V.1, G7b ruling 5)', () => {
  it('rests on 7a\'s P_PL0 (−4 mmHg): the lung collapses only when the pleural pressure passes PEEP', () => {
    expect(PPL_REST_CMH2O).toBeCloseTo(-P_PL0 / CMH2O_TO_MMHG, 9);
    const c = createVent({ pleural: 27.2, peep: 5 }).cfg;
    expect(pleuralOpening(c, 0)).toBe(0); // end-expiration: the expiratory hold reads set PEEP
    expect(pleuralOpening(c, 150)).toBeCloseTo(27.2 - PPL_REST_CMH2O - 5, 6);
    expect(pleuralOpening({ ...c, peep: 15 }, 400)).toBeCloseTo(27.2 - PPL_REST_CMH2O - 15, 6);
    expect(pleuralOpening({ ...c, pleural: 4.1 }, 400)).toBe(0); // haemothorax 1.5 L: volume loss only
    // a large haemothorax (severity 1, 3 L: pPtx 6 mmHg = 8.2 cmH2O) passes a LOW PEEP: 2.76 at ZEEP, 0.76 at PEEP 2 [ENG]
    expect(pleuralOpening({ ...c, pleural: 8.2, peep: 0 }, 400)).toBeCloseTo(2.76, 2);
    expect(pleuralOpening({ ...c, pleural: 8.2, peep: 2 }, 400)).toBeCloseTo(0.76, 2);
    expect(pleuralOpening({ ...c, pleural: 0 }, 400)).toBe(0);
  });
  it('VC 490 mL, C 35.5: plateau = PEEP + opening + VT/C, auto-PEEP ≈ 0; the frame leaves the opening out of Palv', () => {
    const vs = createVent({ mode: 'VC', vt: 490, rate: 14, peep: 5, vcFlow: 60, pause: 0.3, flowPattern: 'square', pmax: 120, compliance: 35.5, resistance: 9.8, pleural: 27.2 });
    advanceVent(vs, 60);
    const m = vs.p.measured;
    expect(m.PLAT).toBeCloseTo(5 + (27.2 - PPL_REST_CMH2O - 5) + 490 / 35.5, 0);
    expect(m.autoPEEP).toBeLessThan(0.5);
    // the engine adds the pleural pressure to the heart itself (respPleural): T_IT·Palv must not carry it twice
    const f = toVentFrame(vs, 'VC');
    expect(f.palvCmH2O).toBeCloseTo(vs.p.Palv - pleuralOpening(vs.cfg, vs.p.V), 9);
  });
});

// Orchestrator ruling (V.1 review 1): tables H6 "Ppeak +10–20" is [TXT] and governs over the catalogue §16 [ENG] tag.
// The opening pressure on top of 7b's tension crs ×0.5 (chosen before the ventilator saw the pleural pressure, as a
// stand-in for this very Ppeak rise) overshoots by 1.6 → calibration-queue row "tension Ppeak vs crs ×0.5" (R45).
describe('tension pneumothorax Ppeak rise (tables H6 [TXT], catalogue §16)', () => {
  it.fails('reference run: Ppeak rises 10–20 cmH2O over the normal row (measured +21.6: 45.4 vs 23.8)', () => {
    const peak = (id: string) => { const { sig } = referenceRun(LUNG_PATHOLOGIES.find((r) => r.id === id)!); return sig.plateau + sig.peakMinusPlateau; };
    const d = peak('pneumothorax-tension') - peak('normal');
    if (process.env.PRINT) console.log(`R36 tension Ppeak rise ${d.toFixed(1)} (${peak('pneumothorax-tension').toFixed(1)} vs ${peak('normal').toFixed(1)})`);
    expect(d).toBeGreaterThanOrEqual(10);
    expect(d).toBeLessThanOrEqual(20);
  });
});
