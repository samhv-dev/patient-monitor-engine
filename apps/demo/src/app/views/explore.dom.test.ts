// @vitest-environment happy-dom
// The Explore rows the talk's look-inside stops read (kit round A, rc.4): each prints the engine's value in the engine's
// unit. The states are the MH demo path's at stop 2 (13:52), headless on this build.
import type { EngineEvent } from '@pme/engine-core';
import { describe, expect, it } from 'vitest';
import { ConsoleModel } from '../../physiology-console/model.ts';
import { sectionRows } from './explore.ts';

const model = (...events: Array<Record<string, unknown>>): ConsoleModel => {
  const m = new ConsoleModel();
  for (const e of events) m.ingest({ t: 832, ...e } as unknown as EngineEvent);
  return m;
};
const rows = (m: ConsoleModel, section: string, label: RegExp) =>
  sectionRows(m, section).cells.filter((c) => label.test(c.label)).map((c) => `${c.label} | ${c.value} | ${c.unit}`);

describe('Explore rows print the engine value in its own unit', () => {
  it('glucose: the endocrine row is the engine mmol/L value, the lab panel row its mg/dL value', () => {
    const m = model({ type: 'endo', glucoseMgDl: 109, glucoseMmolL: 6, stressIndex: 87 }, { type: 'labs', values: { glucose: 109 } });
    expect(rows(m, 'endocrine', /^Glucose/)).toEqual(['Glucose | 6.0 | mmol/L']); // was "109 | mmol/L" (the mg/dL copy)
    expect(rows(m, 'blood', /^Glucose/)).toEqual(['Glucose | 109 | mg/dL']); // was "109 | mmol/L and mg/dL"
    expect(rows(m, 'labs', /^Glucose/)).toEqual(['Glucose | 109 | mg/dL']);
  });

  it('stress response: the engine index is 0–100, printed as an integer on that scale', () => {
    const m = model({ type: 'endo', glucoseMgDl: 109, glucoseMmolL: 6, stressIndex: 87 });
    expect(rows(m, 'endocrine', /^Stress response/)).toEqual(['Stress response | 87 | 0–100']); // was "87.0 | 0–1"
  });

  it('VO₂: the actual whole-body consumption on both pages; the awake resting reference labelled as such', () => {
    const m = model({ type: 'truth', leaves: 2, dropped: 0, truncated: false, tree: { resp: { pat: { vo2: 269.7436 } }, blood: { core: { o2: { vo2: 427.55 } } } } });
    expect(rows(m, 'gas', /^VO₂/)).toEqual(['VO₂ at rest (awake) | 270 | mL/min', 'VO₂ | 428 | mL/min']); // was one "VO₂ 270"
    expect(rows(m, 'blood', /^VO₂/)).toEqual(['VO₂ | 428 | mL/min']);
  });

  it("drug totals: each in that drug's amount unit", () => {
    const row = (id: string, totalAmount: number, amountUnit: string) => ({ id, name: id, unit: 'µg/mL', cp: 0, ce: 0, rate: null, rateUnit: null, tci: null, totalAmount, amountUnit, decrement50Min: null });
    const m = model({ type: 'drugs', drugs: [row('rocuronium', 48000, 'mcg'), row('dantrolene', 200, 'mg'), row('sevoflurane', 12.5, 'mL')], volatile: null, macTotal: 0 });
    expect(rows(m, 'drugs', /^Total/)).toEqual(['Total (Dantrolene) | 200 | mg', 'Total (Rocuronium) | 48000 | µg', 'Total (Sevoflurane) | 12.5 | mL']); // was "mg, µg" on each
  });

  // The drugs event's rows as the engine writes them (engine-core l2/pk/pipeline.ts): `unit` is the row's concentration
  // unit (concUnit), `rateUnit` `${amountUnit}/min` while a pump runs, `tci` an object while a TCI runs.
  type Panel = { id: string; unit: string; amountUnit: string; cp?: number; ce?: number; rate?: number | null; tci?: { mode: string; target: number; model: string } | null; dec?: number | null };
  const drugs = (...rows: Panel[]) => model({ type: 'drugs', volatile: null, macTotal: 0, drugs: rows.map((r) => ({
    id: r.id, name: r.id, unit: r.unit, cp: r.cp ?? 0, ce: r.ce ?? 0, rate: r.rate ?? null, rateUnit: r.rate ? `${r.amountUnit}/min` : null,
    tci: r.tci ?? null, totalAmount: 0, amountUnit: r.amountUnit, decrement50Min: r.dec ?? null,
  })) });
  const ROC = { id: 'rocuronium', unit: 'ng/mL', amountUnit: 'mcg' } as const; // nmb row, amount in mcg
  const DAN = { id: 'dantrolene', unit: '× ref dose', amountUnit: 'mg' } as const; // curve (gamma) row without an infusion reference
  const PRO = { id: 'propofol', unit: 'µg/mL', amountUnit: 'mg' } as const; // Eleveld model row: TCI and infusion

  it("Cp and Ce: in the drug's concentration unit", () => {
    const m = drugs({ ...ROC, cp: 1234, ce: 987 }, { ...DAN, cp: 0.892, ce: 0.892 });
    expect(rows(m, 'drugs', /^C[pe] \((Rocuronium|Dantrolene)/)).toEqual([
      'Ce (Dantrolene) | 0.892 | × ref dose', 'Cp (Dantrolene) | 0.892 | × ref dose', 'Ce (Rocuronium) | 987 | ng/mL', 'Cp (Rocuronium) | 1234 | ng/mL',
    ]); // was "drug unit" on each
  });

  it("site-specific Ce (NMJ, diaphragm, ventilatory): in the bus agent's concentration unit", () => {
    const m = model({ type: 'truth', leaves: 3, dropped: 0, truncated: false, tree: { pk: { bus: { agents: { rocuronium: { unit: 'ng/mL', nmj: 3841, dia: 4368 } } } } } });
    expect(rows(m, 'drugs', /^Ce (NMJ|diaphragm)/)).toEqual(['Ce diaphragm (Rocuronium) | 4368 | ng/mL', 'Ce NMJ (Rocuronium) | 3841 | ng/mL']); // was "drug unit"
  });

  it('infusion rate: the amount unit per minute as the engine defines it; a drug without an infusion model keeps the placeholder', () => {
    const m = drugs({ ...PRO, rate: 8 }, ROC, DAN);
    expect(rows(m, 'drugs', /^Infusion rate/)).toEqual([
      'Infusion rate (Dantrolene) | — | per row', // dantrolene has no infusion model: no rate unit
      'Infusion rate (Propofol) | 8.00 | mg/min', 'Infusion rate (Rocuronium) | — | µg/min',
    ]); // was "per row" on each
  });

  it("TCI target: the drug's concentration unit while a TCI runs or not; a drug without a TCI model keeps the placeholder", () => {
    const on = drugs({ ...PRO, tci: { mode: 'effect', target: 3, model: 'eleveld' } }, ROC);
    expect(rows(on, 'drugs', /^TCI target/)).toEqual(['TCI target (Propofol) | 3.00 | µg/mL', 'TCI target (Rocuronium) | — | per row']);
    expect(rows(drugs(PRO), 'drugs', /^TCI target/)).toEqual(['TCI target (Propofol) | — | µg/mL']);
  });

  it("CSHT: a time in min, never the drug's unit", () => {
    const m = drugs({ ...PRO, rate: 8, dec: 12.4 }, { ...ROC, dec: null });
    expect(rows(m, 'drugs', /^CSHT/)).toEqual(['CSHT (Propofol) | 12.4 | min', 'CSHT (Rocuronium) | — | min']);
  });
});
