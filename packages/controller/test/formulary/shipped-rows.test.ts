// Brief 152: the three rows of the SHIPPED formulary (packages/controller/formulary/) that made the preparation bench say
// something untrue. N60: Trissel's insulin loss in 0.9 % NaCl was measured in PVC bags (17th ed., p. 1213, note a), so
// it is a finding for a PVC bag and not for a syringe. N61: sodium bicarbonate's strength is in mmol and Stabilis's rows
// in mg/mL; the label's 84 mg per mEq (DailyMed, Hospira 8.4 %; HCO3- is univalent) joins them. N73: the Agilus 120 mg
// label states 22.6 mL after 20 mL of water (EMC 15912, sections 4.2 and 6.6), so the vial holds 5.31 mg/mL, not 6;
// the Dantrium IV label states no final volume (EMC 1097), so its vial stays at the 60 mL added and says so.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadFormulary } from '../../src/formulary/load.ts';
import { findings } from '../../src/formulary/findings.ts';
import { prepare } from '../../src/formulary/prepare.ts';
import { remaining, whyNoRow } from '../../src/formulary/remaining.ts';
import type { Container, Formulary, FormularyFiles } from '../../src/formulary/types.ts';

const FOLDER = join(resolve(fileURLToPath(new URL('../..', import.meta.url))), 'formulary');
const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)]));
const files: FormularyFiles = Object.fromEntries(walk(FOLDER).filter((f) => f.endsWith('.json')).map((f) => [relative(FOLDER, f).split('\\').join('/'), JSON.parse(readFileSync(f, 'utf8')) as unknown]));
const loaded = loadFormulary(files);
if (!loaded.ok) throw new Error(`the shipped layer breaks §5: ${JSON.stringify(loaded.problems)}`);
const F: Formulary = loaded.formulary;
const CONTAINERS: Container[] = ['vial', 'syringe-pp', 'bag-pvc', 'bag-polyolefin'];
const H = 3600;

describe('N60: the insulin statement holds for a PVC bag only', () => {
  const insulin = (volumeMl: number, container: Container) =>
    prepare([{ drugId: 'insulinDextrose', productId: 'actrapid-100iu-ml', amount: 1, unit: 'mL' }], { id: 'saline', volumeMl }, F, 0, container);
  it('fires on 100 units in a PVC bag of saline, with its Trissel source', () => {
    const p = insulin(99, 'bag-pvc');
    expect(p.ok && p.findings.map((f) => [f.kind, f.src])).toEqual([['incompatible', 'trissel-insulin-p1213']]);
  });
  it('does not fire in a syringe or a polyolefin bag; the syringe reads its Stabilis rows', () => {
    for (const c of ['syringe-pp', 'bag-polyolefin'] as const) expect(insulin(99, c)).toMatchObject({ ok: true, findings: [] });
    const p = insulin(99, 'syringe-pp');
    expect(p.ok && p.actives[0]).toMatchObject({ perMl: 1, rows: [0, 1] });
  });
  it('every other statement of the layer behaves as before, in every container', () => {
    const before = structuredClone(F);
    for (const e of Object.values(before.drugs)) {
      for (const d of e.diluents) if (d.compat) delete d.compat.containers;
      for (const a of e.admixtures) delete a.containers;
    }
    const changed: string[] = [];
    for (const e of Object.values(F.drugs)) {
      const items = [{ drugId: e.drugId, productIds: e.products.map((p) => p.id) }];
      for (const dil of Object.keys(F.diluents)) {
        for (const c of [...CONTAINERS, undefined]) {
          if (JSON.stringify(findings(items, dil, F, c)) !== JSON.stringify(findings(items, dil, before, c))) changed.push(`${e.drugId} ${dil} ${c ?? 'none'}`);
        }
      }
      for (const a of e.admixtures) {
        if (!F.drugs[a.with]) continue;
        const pair = [{ drugId: e.drugId, productIds: [] }, { drugId: a.with, productIds: [] }];
        for (const c of [...CONTAINERS, undefined]) if (JSON.stringify(findings(pair, null, F, c)) !== JSON.stringify(findings(pair, null, before, c))) changed.push(`${e.drugId}+${a.with} ${c ?? 'none'}`);
      }
    }
    expect(changed).toEqual(['insulinDextrose saline vial', 'insulinDextrose saline syringe-pp', 'insulinDextrose saline bag-polyolefin', 'insulinDextrose saline none']);
  });
});

describe('N61: sodium bicarbonate finds its stability row through its sourced molar mass', () => {
  const bicarb = (f: Formulary) => prepare([{ drugId: 'sodiumBicarbonate', productId: 'sodium-bicarbonate-84mg-ml', amount: 10, unit: 'mL' }], { id: 'dextrose5', volumeMl: 90 }, f, 0, 'bag-polyolefin');
  it('10 mL of 8.4 % in 90 mL of 5 % glucose (0.1 mmol/mL = 8.4 mg/mL) meets the 8.4 mg/mL row and the 7.6-11.45 mg/mL range', () => {
    expect(F.drugs.sodiumBicarbonate?.molarMass).toEqual({ mgPerMmol: 84, src: 'dailymed-sodiumbicarbonate-hospira' });
    const p = bicarb(F);
    expect(p.ok && p.actives).toEqual([{ drugId: 'sodiumBicarbonate', amount: 10, unit: 'mmol', perMl: 0.1, rows: [4, 6] }]);
    const r = remaining(F.drugs.sodiumBicarbonate!, 'dextrose5', 'bag-polyolefin', 25, 24 * H, { concentration: { perMl: 0.1, unit: 'mmol' } });
    expect(r).toMatchObject({ r: 1, basis: 'stable', beyondData: false, src: 'stabilis-sodiumbicarbonate-3329' });
  });
  it('without the molar mass it finds none, and says why', () => {
    const f = structuredClone(F);
    delete f.drugs.sodiumBicarbonate!.molarMass;
    const p = bicarb(f);
    expect(p.ok && p.actives[0]?.rows).toEqual([]);
    expect(whyNoRow(f.drugs.sodiumBicarbonate!, 'dextrose5', 'bag-polyolefin', { perMl: 0.1, unit: 'mmol' }))
      .toBe('sodiumBicarbonate is in mmol/mL and its stability rows here in mg/mL: the formulary holds no molar mass for sodiumBicarbonate');
  });
});

describe('N73: a reconstituted dantrolene vial holds what its label states', () => {
  const vial = (productId: string, amount: number, unit = 'vial') => prepare([{ drugId: 'dantrolene', productId, amount, unit }], { id: 'water', volumeMl: 0 }, F, 0, 'syringe-pp');
  it('Agilus 120 mg + 20 mL of water: 22.6 mL at 5.31 mg/mL (the label states 5.3), not 20 mL at 6', () => {
    const p = vial('agilus-120mg', 1);
    expect(p.ok && p.volumeMl).toBe(22.6);
    expect(p.ok && p.actives[0]?.perMl).toBeCloseTo(120 / 22.6, 12);
    expect(p.ok && +p.actives[0]!.perMl.toFixed(1)).toBe(5.3);
  });
  it('2.5 mg/kg for 70 kg (175 mg) from two Agilus vials is 32.96 mL drawn, where 6 mg/mL made it 29.17 mL', () => {
    const p = vial('agilus-120mg', 175, 'mg');
    expect(p.ok && p.volumeMl).toBeCloseTo(32.958, 3);
    expect(175 / 6).toBeCloseTo(29.167, 3); // the old figure: 29.17 mL of a 5.31 mg/mL solution holds 154.9 mg
  });
  it('Dantrium IV 20 mg: its label states no final volume, so the vial stays at the 60 mL added (0.33 mg/mL)', () => {
    expect(F.drugs.dantrolene?.products.find((p) => p.id === 'dantrium-iv-20mg')?.reconstitute?.final).toEqual({ stated: false, src: 'emc-1097' });
    const p = vial('dantrium-iv-20mg', 1);
    expect(p.ok && p.volumeMl).toBe(60);
    expect(p.ok && p.actives[0]).toMatchObject({ perMl: 20 / 60, rows: [] });
  });
  it('every reconstituted product of the layer says what its label states after reconstitution', () => {
    const powders = Object.values(F.drugs).flatMap((e) => e.products.filter((p) => p.reconstitute).map((p) => [p.id, p.reconstitute!.final] as const));
    expect(powders).toEqual([['dantrium-iv-20mg', { stated: false, src: 'emc-1097' }], ['agilus-120mg', { volumeMl: 22.6, src: 'emc-15912' }]]);
  });
});
