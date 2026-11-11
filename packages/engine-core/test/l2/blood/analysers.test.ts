// L10a (plan docs/plans/learner-action-remote.md §L10a; owner's ruling LQ2): the analyser rows, the laboratory row, the
// panels derived from them and their sourced turnarounds.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ANALYSER_IDS, ANALYSERS, DEFAULT_ANALYSER, LABORATORY, panelValues, sectionFor, turnaroundFor } from '../../../src/l2/blood/analysers.ts';
import { createBloodCore, stepBloodCore } from '../../../src/l2/blood/core.ts';
import { labSample } from '../../../src/l2/blood/labs.ts';
import { applyBloodCommand, createBloodState, validateBloodCommand } from '../../../src/l2/blood/pipeline.ts';
import { createL1State } from '../../../src/l1/state.ts';
import { createRespState } from '../../../src/l2/resp/pipeline.ts';
import type { LabPanelId } from '../../../src/types-blood.ts';
import type { Command } from '../../../src/types.ts';

const MAN = { ageY: 40, sex: 'M' as const, weightKg: 70, heightCm: 175 };
const X = { paco2: 40, pao2: 95, tempC: 37, vco2: 200, coLpm: 5.25 };
const core = () => {
  const bc = createBloodCore(MAN, 5.25, 40);
  stepBloodCore(bc, { t: 0, coLpm: 5.25, paco2: 40, pao2: 95, tempC: 37, vo2Demand: 245 }, 0.1);
  return bc;
};
const ev = (event: Record<string, unknown>) => ({ id: 'x', issuedBy: 't', type: 'applyEvent', event }) as Command;
function bloodCtx() {
  const l1 = createL1State(MAN);
  return { rs: createRespState(MAN, l1, 1), bs: createBloodState(MAN) };
}
const GAS = ['ph', 'pco2', 'po2', 'hco3', 'be', 'so2', 'cohb', 'methb', 'lactate', 'na', 'k', 'cl', 'iCa', 'hb', 'glucose', 'ag', 'osm'];

describe('analyser rows (L10a)', () => {
  it('the default analyser is an ABL800 FLEX row; every POC row serves the gas panels, the laboratory the chem and coag panels', () => {
    expect(ANALYSER_IDS).toContain(DEFAULT_ANALYSER);
    expect(ANALYSERS[DEFAULT_ANALYSER].name).toMatch(/^Radiometer ABL8\d\d FLEX/);
    for (const id of ANALYSER_IDS) expect(ANALYSERS[id].sections.flatMap((s) => s.panels).sort()).toEqual(['abg', 'vbg']);
    expect(LABORATORY.sections.flatMap((s) => s.panels).sort()).toEqual(['chem', 'coag']);
  });
  it('each turnaround is the source\'s number: ABL825 80 s, ABL837 100 s (Radiometer 928-544), laboratory K 46.1 min and PT 45.5 min (Hawkins 2007 Table 6)', () => {
    expect(turnaroundFor('abg', 'abl825')).toBe(80);
    expect(turnaroundFor('vbg', 'abl825')).toBe(80);
    expect(turnaroundFor('abg', 'abl837')).toBe(100);
    expect(turnaroundFor('chem')).toBe(2766);
    expect(turnaroundFor('coag')).toBe(2730);
    expect(turnaroundFor('abg')).toBe(turnaroundFor('abg', DEFAULT_ANALYSER));
  });
  it('every row and section names its source; no [ENG] marker remains on a turnaround', () => {
    for (const row of [...ANALYSER_IDS.map((id) => ANALYSERS[id]), LABORATORY]) {
      expect(row.src.length, row.id).toBeGreaterThan(20);
      expect(row.analytesSrc.length, row.id).toBeGreaterThan(20);
      for (const s of row.sections) {
        expect(s.turnaroundSrc, row.id).toMatch(/928-544|Hawkins/);
        expect(s.turnaroundSrc).not.toMatch(/\[ENG/);
      }
    }
    for (const f of ['analysers.ts', 'labs.ts']) {
      const text = readFileSync(new URL(`../../../src/l2/blood/${f}`, import.meta.url), 'utf8');
      for (const line of text.split('\n')) if (/turnaround/i.test(line)) expect(line, `${f}: ${line}`).not.toMatch(/\[ENG/);
      expect(text, f).not.toMatch(/LAB_TURNAROUND_S/);
    }
  });
  it('a panel returns only its row\'s analytes that the engine computes: the gas panel has no Mg; chem has no gas and no Hb; coag is INR', () => {
    const all = labSample(core(), X, 'abg', { inr: 1 });
    const abg = panelValues(all, sectionFor('abg', 'abl825').section);
    expect(Object.keys(abg).sort()).toEqual([...GAS].sort());
    expect(abg).not.toHaveProperty('mg');
    const abg837 = panelValues(all, sectionFor('abg', 'abl837').section);
    expect(Object.keys(abg837).sort()).toEqual([...GAS].sort()); // creatinine, bilirubin, HbF: measured by the ABL837, not computed yet
    const chem = panelValues(all, sectionFor('chem').section);
    expect(Object.keys(chem).sort()).toEqual(['cl', 'glucose', 'k', 'mg', 'na']); // total calcium: not computed (the engine has iCa only)
    const coag = panelValues(all, sectionFor('coag').section);
    expect(coag).toEqual({ inr: 1 });
    for (const v of [abg, chem, coag]) for (const x of Object.values(v)) expect(Number.isFinite(x)).toBe(true);
  });
  it('an analyte the row names but the engine does not compute is absent, never a blank: L10b–L10d add one key to the sample', () => {
    const row = sectionFor('chem').section;
    expect(row.analytes).toEqual(expect.arrayContaining(['creatinine', 'ck', 'caTotal']));
    const chem = panelValues(labSample(core(), X, 'abg', { inr: 1 }), row);
    for (const a of ['creatinine', 'ck', 'caTotal']) expect(chem).not.toHaveProperty(a);
    expect(panelValues({ na: 140, creatinine: 80 }, row)).toEqual({ na: 140, creatinine: 80 });
  });
});

describe('the lab event on the blood pipeline (L10a)', () => {
  const run = (panel: LabPanelId, turnaroundS?: number) => {
    const { bs, rs } = bloodCtx();
    const e = ev({ kind: 'lab', panel, ...(turnaroundS === undefined ? {} : { turnaroundS }) });
    expect(validateBloodCommand(e)).toBeUndefined();
    expect(applyBloodCommand(bs, e, 10, rs, { inr: 1.2 })).toBe(true);
    return bs.labs[0];
  };
  it('each panel is due after its row\'s turnaround, with the row id and only its analytes, frozen at the draw', () => {
    const g = run('abg');
    expect(g?.due).toBe(10 + turnaroundFor('abg'));
    expect(g?.analyser).toBe(DEFAULT_ANALYSER);
    expect(g?.values).not.toHaveProperty('mg');
    const c = run('chem');
    expect(c?.due).toBe(10 + 2766);
    expect(c?.analyser).toBe(LABORATORY.id);
    expect(c?.values).not.toHaveProperty('ph');
    const k = run('coag');
    expect(k?.due).toBe(10 + 2730);
    expect(k?.values).toEqual({ inr: 1.2 });
  });
  it('a card\'s turnaroundS still overrides the row within 30–3600 s', () => {
    expect(run('chem', 60)?.due).toBe(70);
    expect(run('abg', 300)?.due).toBe(310);
    expect(validateBloodCommand(ev({ kind: 'lab', panel: 'chem', turnaroundS: 20 }))).toMatch(/turnaroundS/);
    expect(validateBloodCommand(ev({ kind: 'lab', panel: 'coag', turnaroundS: 4000 }))).toMatch(/turnaroundS/);
  });
  it('refuses a panel no row serves', () => {
    expect(validateBloodCommand(ev({ kind: 'lab', panel: 'csf' }))).toMatch(/panel/);
  });
  it('the room\'s analyser is the blood state\'s setting (absent: the default); a pending sample keeps the row it was drawn on', () => {
    const { bs, rs } = bloodCtx();
    expect(createBloodState(MAN)).not.toHaveProperty('analyser'); // a fresh state (and so a snapshot) is unchanged
    bs.analyser = 'abl825';
    applyBloodCommand(bs, ev({ kind: 'lab', panel: 'abg' }), 0, rs);
    bs.analyser = 'abl837';
    expect(bs.labs[0]?.analyser).toBe('abl825');
    expect(bs.labs[0]?.due).toBe(80);
  });
});
