// The listed diluents of the shipped entries read again from their labels: a fluid the label states the drug is
// compatible with, or stable in, is listed; a fluid named only for a running line is not. Each case names the label's
// section and the source key its rows carry.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { findings } from '../../src/formulary/findings.ts';
import { loadFormulary } from '../../src/formulary/load.ts';
import type { Formulary, FormularyFiles } from '../../src/formulary/types.ts';

const FOLDER = join(resolve(fileURLToPath(new URL('../..', import.meta.url))), 'formulary');
const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)]));
const files: FormularyFiles = Object.fromEntries(walk(FOLDER).filter((f) => f.endsWith('.json')).map((f) => [relative(FOLDER, f).split('\\').join('/'), JSON.parse(readFileSync(f, 'utf8')) as unknown]));
const loaded = loadFormulary(files);
if (!loaded.ok) throw new Error(`the shipped layer breaks §5: ${JSON.stringify(loaded.problems)}`);
const F: Formulary = loaded.formulary;

const listed = (drugId: string) => F.drugs[drugId]!.diluents.filter((d) => d.listed).map((d) => d.id).sort();
const sources = (drugId: string) => [...new Set(F.drugs[drugId]!.diluents.map((d) => d.src))];
const graded = (drugId: string, diluent: string) => findings([{ drugId, productIds: F.drugs[drugId]!.products.map((p) => p.id) }], diluent, F).map((f) => f.kind);

describe('listed diluents, as each label states them', () => {
  it('esmolol, Brevibloc 2.4 "Compatibility with Commonly Used Intravenous Fluids": saline, glucose 5 %, glucose 5 % in saline, lactated Ringer\'s', () => {
    expect(listed('esmolol')).toEqual(['dextrose5', 'dextrose5Saline', 'ringerLactate', 'saline']);
    expect(sources('esmolol')).toEqual(['dailymed-brevibloc']);
    expect(graded('esmolol', 'saline')).toEqual([]);
    expect(graded('esmolol', 'water')).toEqual(['wrongDiluent', 'notTested']);
    expect(F.drugs.esmolol!.products[0]!.inUse).toEqual([expect.objectContaining({ h: 24, src: 'dailymed-brevibloc' })]);
  });

  it('lidocaine, the intravenous Ansyr syringe label (Description, Dosage and Administration): names no diluent', () => {
    expect(listed('lidocaine')).toEqual([]);
    expect(sources('lidocaine')).toEqual(['dailymed-lidocaine-ansyr']);
    expect(F.drugs.lidocaine!.products.map((p) => [p.id, p.strength.amount, p.strength.src])).toEqual([
      ['lidocaine-10mg-ml', 10, 'dailymed-lidocaine-ansyr'], ['lidocaine-20mg-ml', 20, 'dailymed-lidocaine-ansyr'],
    ]);
  });

  it('bupivacaine, Hospira 3 and 16 (0.25 %) and Sensorcaine-MPF How Supplied (0.5 %): names no diluent', () => {
    expect(listed('bupivacaine')).toEqual([]);
    expect(sources('bupivacaine')).toEqual(['dailymed-bupivacaine']);
    expect(F.drugs.bupivacaine!.products.map((p) => [p.id, p.strength.amount, p.strength.src])).toEqual([
      ['bupivacaine-0-25pct', 2.5, 'dailymed-bupivacaine'], ['bupivacaine-0-5pct', 5, 'dailymed-sensorcaine-mpf'],
    ]);
  });

  it('remifentanil, Ultiva 2.12 "Compatibility and Stability": water, glucose 5 %, glucose 5 % in saline, saline (24 h) and lactated Ringer\'s (4 h)', () => {
    expect(listed('remifentanil')).toEqual(['dextrose5', 'dextrose5Saline', 'ringerLactate', 'saline', 'water']);
    expect(sources('remifentanil')).toEqual(['dailymed-ultiva']);
    for (const p of F.drugs.remifentanil!.products) {
      expect(p.reconstitute!.diluents.slice().sort()).toEqual(listed('remifentanil'));
      expect(p.inUse!.map((u) => [u.h, u.src])).toEqual([[24, 'dailymed-ultiva'], [4, 'dailymed-ultiva']]);
    }
  });

  it('vecuronium, Hikma "Compatibility": saline, glucose 5 %, water, glucose 5 % in saline, lactated Ringer\'s; 1 mg/mL in a final 10 mL', () => {
    expect(listed('vecuronium')).toEqual(['dextrose5', 'dextrose5Saline', 'ringerLactate', 'saline', 'water']);
    expect(sources('vecuronium')).toEqual(['dailymed-vecuronium']);
    expect(F.drugs.vecuronium!.products[0]!.reconstitute!.final).toEqual({ volumeMl: 10, src: 'dailymed-vecuronium' });
    expect(F.sources['dailymed-vecuronium']).toMatchObject({ product: expect.stringContaining('Vecuronium Bromide for Injection') });
  });

  it('a fluid named only for a running line is not listed: sugammadex 2.3, dexmedetomidine 2.5', () => {
    expect(listed('sugammadex')).toEqual(['saline']);
    expect(listed('dexmedetomidine')).toEqual(['saline']);
  });
});
