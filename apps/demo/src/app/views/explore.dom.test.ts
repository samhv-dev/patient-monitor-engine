// @vitest-environment happy-dom
// The Explore rows the talk's look-inside stops read (kit round A, rc.4): each prints the engine's value in the engine's
// unit. The states are the MH demo path's at stop 2 (13:52), headless on this build.
import { createEngine, type Command, type EngineEvent } from '@pme/engine-core';
import { describe, expect, it, vi } from 'vitest';
import { ConsoleModel } from '../../physiology-console/model.ts';
import { DRUG_LIST } from '../drugs.ts';
import type { AppSession } from '../session.ts';
import type { SiteProfile } from '../site.ts';
import { exploreView, sectionRows } from './explore.ts';

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
  const MID = { id: 'midazolam', unit: '× ref dose', amountUnit: 'mg' } as const; // curve row with an infusion reference: infusion, no TCI
  const SUX = { id: 'succinylcholine', unit: 'ng/mL', amountUnit: 'mcg' } as const; // nmb row: infusion, no TCI

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

  it('infusion rate: the amount unit per minute as the engine defines it; a drug without an infusion model has no rate row', () => {
    const m = drugs({ ...PRO, rate: 8 }, ROC, DAN, MID, SUX);
    expect(rows(m, 'drugs', /^Infusion rate/)).toEqual([
      'Infusion rate (Midazolam) | — | mg/min', 'Infusion rate (Propofol) | 8.00 | mg/min', 'Infusion rate (Rocuronium) | — | µg/min',
      'Infusion rate (Succinylcholine) | — | µg/min',
    ]); // dantrolene (a curve row without an infusion reference: the engine refuses its infusion) printed "— | per row"
  });

  it("TCI target: the drug's concentration unit while a TCI runs or not; a drug without a compartment model has no TCI row", () => {
    const on = drugs({ ...PRO, tci: { mode: 'effect', target: 3, model: 'eleveld' } }, ROC, DAN, MID, SUX);
    expect(rows(on, 'drugs', /^TCI target/)).toEqual(['TCI target (Propofol) | 3.00 | µg/mL']); // the other four printed "— | per row"
    expect(rows(drugs(PRO, ROC, DAN, MID, SUX), 'drugs', /^TCI target/)).toEqual(['TCI target (Propofol) | — | µg/mL']);
    expect(sectionRows(on, 'drugs').rest.map((r) => r.path).filter((p) => /\.(tci|rate)$/.test(p) && !p.includes('.propofol.'))).toEqual([]); // nor as a model internal
  });

  it("CSHT: a time in min, never the drug's unit", () => {
    const m = drugs({ ...PRO, rate: 8, dec: 12.4 }, { ...ROC, dec: null });
    expect(rows(m, 'drugs', /^CSHT/)).toEqual(['CSHT (Propofol) | 12.4 | min', 'CSHT (Rocuronium) | — | min']);
  });

  // The rendered page, from the engine itself: every library drug the engine accepts from the dose picker's first preset
  // (a bolus, else an infusion; the volatiles through the vaporiser, as the dose sheet leaves them out) and a propofol
  // TCI, then the Drugs page's table and every row's tooltip scanned for the glossary's placeholder. The drugs go in
  // groups of 12: the console drops an event array longer than 16 (physiology-console/flatten.ts MAX_EVENT_ARRAY).
  const drugsPage = async (ids: readonly string[]) => {
    const e = createEngine({ seed: 7, mode: 'modeled', patient: { ageY: 40, weightKg: 70, heightCm: 175, sex: 'M', sensors: { spo2: 'on', co2: 'on' } } });
    let feed: (x: EngineEvent) => void = () => {};
    const view = exploreView({ onEvent: (f: typeof feed) => (feed = f), onMount: () => {} } as unknown as AppSession, { gasUnit: 'mmHg' } as SiteProfile);
    e.on((x: EngineEvent) => feed(x));
    e.advanceTo(60);
    const send = (event: Record<string, unknown>) => e.dispatch({ id: `c${event.drugId as string}`, issuedBy: 'test', type: 'applyEvent', event } as unknown as Command).accepted;
    const given = ids.filter((id) => {
      const d = DRUG_LIST.find((x) => x.id === id)!;
      const [dose, unit] = d.preset.bolus?.[0] ?? d.preset.infusion?.[0] ?? [1, d.amountUnit];
      return send({ kind: 'drug', drugId: id, dose, unit, route: 'iv', ...(!d.preset.bolus && d.preset.infusion ? { infusion: true } : {}) });
    });
    expect(send({ kind: 'tci', drugId: 'propofol', model: 'eleveld', mode: 'effect', target: 3 })).toBe(true);
    expect(send({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2, fgfLpm: 2 })).toBe(true);
    e.advanceTo(90);
    view.enter?.('drugs');
    const table = view.el.querySelector('table.values') as HTMLTableElement;
    await vi.waitFor(() => expect(table.textContent).toContain('TCI target (Propofol)'), { timeout: 5_000 });
    const tips = [...table.querySelectorAll<HTMLButtonElement>('button.tip')].map((b) => (b.click(), document.getElementById('tipbubble')?.textContent ?? ''));
    const units = [...table.querySelectorAll('td.u')].map((td) => td.textContent ?? '');
    view.leave?.();
    return { given, text: table.textContent ?? '', tips, units };
  };

  it('the rendered Drugs page, every library drug given, never prints "per row", in a row or a tooltip', { timeout: 120_000 }, async () => {
    const ids = DRUG_LIST.filter((d) => d.cls !== 'volatile' && d.id !== 'propofol').map((d) => d.id);
    const given: string[] = [];
    for (let i = 0; i < ids.length; i += 12) {
      const page = await drugsPage(ids.slice(i, i + 12));
      given.push(...page.given);
      for (const id of page.given) expect(page.text, id).toContain(`Total (${DRUG_LIST.find((d) => d.id === id)!.name})`); // each given drug is on the page
      expect(page.tips.length).toBeGreaterThan(page.given.length * 4); // every row carries its tooltip
      expect(page.units.filter((u) => u === '')).toEqual([]); // every row prints a unit
      expect(`${page.text}\n${page.tips.join('\n')}`).not.toContain('per row');
      for (const id of ['Dantrolene', 'Midazolam', 'Rocuronium', 'Succinylcholine']) expect(page.text).not.toContain(`TCI target (${id})`);
      expect(page.text).not.toContain('Infusion rate (Dantrolene)');
    }
    expect(given).toEqual(expect.arrayContaining(['dantrolene', 'midazolam', 'rocuronium', 'succinylcholine']));
    expect(given.length).toBeGreaterThan(50);
  });
});
