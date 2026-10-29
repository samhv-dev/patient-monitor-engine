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
});
