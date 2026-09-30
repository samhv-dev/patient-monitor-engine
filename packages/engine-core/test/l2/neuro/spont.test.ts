import { describe, expect, it } from 'vitest';
import { createSpontDrive, paco2SetPoint, stepSpontDrive, winterPaco2, type SpontInputs } from '../../../src/l2/neuro/spont.ts';
import { neuroResp } from '../../../src/l2/neuro/drive.ts';

const X: SpontInputs = { t: 0, paco2: 40, pao2: 100, hco3: 24, rr0: 12, vt0: 500, co2SlopeMult: 1, pMaxMult: 1, evlwi: 7, complianceMl: 55, resistance: 3 };
const V0 = { opioid: 0, propofol: 0, midazolam: 0, ketamine: 0 };
const nr = (v: Partial<typeof V0>, diaBlock = 0) => neuroResp({ vent: { ...V0, ...v }, macVolatile: 0, diaBlock, tofr: 1, di: 93, naturalAirway: false, wasApnoeic: false });

describe('MODELED spontaneous drive (7b drive/pti/fatigue + Winter\'s, G7b ruling 8)', () => {
  it('Winter\'s: 1.5·HCO3 + 8; the set point falls only in metabolic acidosis', () => {
    expect(winterPaco2(15)).toBeCloseTo(30.5, 9);
    expect(paco2SetPoint(40, 24)).toBe(40); // Winter's 44 > resting: no shift
    expect(paco2SetPoint(40, 15)).toBeCloseTo(30.5, 9);
  });
  it('at the resting PaCO2 the drive returns the resting pattern; the set point is captured on the first evaluation', () => {
    const s = createSpontDrive();
    stepSpontDrive(s, X);
    expect(s.paco2Rest).toBe(40);
    expect(s.rr).toBeCloseTo(12, 6);
    expect(s.vt).toBeCloseTo(500, 6);
  });
  it('re-evaluates at 1 Hz only; hypercapnia raises VE (CO2 slope 1.5 L/min/mmHg)', () => {
    const s = createSpontDrive();
    stepSpontDrive(s, X);
    stepSpontDrive(s, { ...X, t: 0.5, paco2: 50 });
    expect(s.ve).toBeCloseTo(6, 6);
    // FU-6 R3(a) (E-FU6-7): the drive reads 0.3·PaCO2 + 0.7·central PCO2 (τ 90 s) — the step answers 30 % at once and
    // the full CO2 slope at steady state (the band 6 + 1.5·4 is unchanged)
    stepSpontDrive(s, { ...X, t: 1, paco2: 44 });
    expect(s.ve).toBeCloseTo(6 + 1.5 * 4 * (0.3 + 0.7 * (1 - Math.exp(-1 / 90))), 6);
    for (let t = 2; t <= 1800; t++) stepSpontDrive(s, { ...X, t, paco2: 44 });
    expect(s.ve).toBeCloseTo(6 + 1.5 * 4, 6);
  });
  it('metabolic acidosis (HCO3 15): at PaCO2 40 the drive is ≈ 2.4× resting VE (set point 30.5)', () => {
    const s = createSpontDrive();
    s.paco2Rest = 40;
    stepSpontDrive(s, { ...X, hco3: 15 });
    expect(s.paco2Set).toBeCloseTo(30.5, 9);
    expect(s.ve / 6).toBeCloseTo((6 + 1.5 * 9.5) / 6, 6);
  });
  it('7f on top: opioid slows the rate; a blocked diaphragm (< 5 % strength) stops breathing; weakness shrinks VT', () => {
    const a = createSpontDrive();
    stepSpontDrive(a, { ...X, neuro: nr({ opioid: 2 }) });
    expect(a.rr).toBeLessThan(0.6 * 12);
    const b = createSpontDrive();
    stepSpontDrive(b, { ...X, neuro: nr({}, 0.97) });
    expect([b.rr, b.vt]).toEqual([0, 0]);
    const c = createSpontDrive();
    stepSpontDrive(c, { ...X, neuro: nr({}, 0.85) });
    expect(c.vt).toBeCloseTo(500 * 0.5, 6); // strength 0.15 / DIAPH_WEAK 0.3
  });
  it('fatigue: a high pressure–time index (stiff lungs, weak diaphragm) lowers F over minutes', () => {
    const s = createSpontDrive();
    for (let t = 0; t <= 1800; t++) stepSpontDrive(s, { ...X, t, complianceMl: 15, resistance: 20, pMaxMult: 0.5 });
    expect(s.fatigue).toBeLessThan(0.9);
  });
});
