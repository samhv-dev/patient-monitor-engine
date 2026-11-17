// The listed diluents of the shipped entries read again from their labels: a fluid the label states the drug is
// compatible with, or stable in, is listed; a fluid named only for a running line is not. Each unlisted fluid carries
// the label's reason, and the grade follows it: advised against is a wrong diluent, a running line or a silent label is
// not. Each case names the label's section and the source key its rows carry.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { findings } from '../../src/formulary/findings.ts';
import { loadFormulary } from '../../src/formulary/load.ts';
import type { Formulary, FormularyFiles } from '../../src/formulary/types.ts';
import { grade } from '../../src/scenario/grade.ts';
import type { Administration, ScenarioDocV2, StagedPrep } from '../../src/scenario/types-v2.ts';
import { minimalV2 } from '../scenario/fixtures-v2.ts';

const FOLDER = join(resolve(fileURLToPath(new URL('../..', import.meta.url))), 'formulary');
const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)]));
const files: FormularyFiles = Object.fromEntries(walk(FOLDER).filter((f) => f.endsWith('.json')).map((f) => [relative(FOLDER, f).split('\\').join('/'), JSON.parse(readFileSync(f, 'utf8')) as unknown]));
const loaded = loadFormulary(files);
if (!loaded.ok) throw new Error(`the shipped layer breaks §5: ${JSON.stringify(loaded.problems)}`);
const F: Formulary = loaded.formulary;

const listed = (drugId: string) => F.drugs[drugId]!.diluents.filter((d) => d.listed).map((d) => d.id).sort();
const sources = (drugId: string) => [...new Set(F.drugs[drugId]!.diluents.map((d) => d.src))];
const found = (drugId: string, diluent: string) => findings([{ drugId, productIds: F.drugs[drugId]!.products.map((p) => p.id) }], diluent, F);
const graded = (drugId: string, diluent: string) => found(drugId, diluent).map((f) => f.kind);
const reason = (drugId: string, diluent: string) => F.drugs[drugId]!.diluents.find((d) => d.id === diluent)!.notListed;
/** The entries whose only source is their label. */
const LABEL_ONLY = Object.values(F.drugs).filter((e) => e.has.monograph && !e.has.stabilis && !e.has.trissel);

describe('listed diluents, as each label states them', () => {
  it('esmolol, Brevibloc 2.4 "Compatibility with Commonly Used Intravenous Fluids": saline, glucose 5 %, glucose 5 % in saline, lactated Ringer\'s', () => {
    expect(listed('esmolol')).toEqual(['dextrose5', 'dextrose5Saline', 'ringerLactate', 'saline']);
    expect(sources('esmolol')).toEqual(['dailymed-brevibloc']);
    expect(graded('esmolol', 'saline')).toEqual([]);
    expect(graded('esmolol', 'water')).toEqual(['labelSilent', 'notTested']);
    expect(F.drugs.esmolol!.products[0]!.inUse).toEqual([expect.objectContaining({ h: 24, src: 'dailymed-brevibloc' })]);
  });

  it('lidocaine: glucose 5 % listed on the premixed label (Dosage and Administration, How Supplied: 4 and 8 mg/mL in 5 % dextrose); the Ansyr syringe label names no diluent', () => {
    expect(listed('lidocaine')).toEqual(['dextrose5']);
    expect(F.drugs.lidocaine!.diluents.find((d) => d.id === 'dextrose5')!.src).toBe('dailymed-lidocaine-d5w');
    expect(F.sources['dailymed-lidocaine-d5w']).toMatchObject({ kind: 'monograph', issuer: 'DailyMed', product: expect.stringContaining('4 mg/mL (500 mL) and 8 mg/mL (250 mL)') });
    expect(sources('lidocaine').sort()).toEqual(['dailymed-lidocaine-ansyr', 'dailymed-lidocaine-d5w']);
    expect(graded('lidocaine', 'dextrose5')).toEqual([]);
    expect(reason('lidocaine', 'saline')).toEqual({ reason: 'silent' });
    expect(graded('lidocaine', 'saline')).toEqual(['labelSilent', 'notTested']);
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

describe("an unlisted fluid's reason, as each label gives it", () => {
  it('every unlisted fluid of an entry read from its label alone has a reason; advised against and running line carry the section and words', () => {
    expect(LABEL_ONLY).toHaveLength(26);
    for (const e of LABEL_ONLY) {
      for (const d of e.diluents.filter((x) => !x.listed)) {
        expect(d.notListed, `${e.drugId} in ${d.id}`).toBeDefined();
        if (d.notListed!.reason !== 'silent') expect([d.notListed!.section.length > 0, d.notListed!.words.length > 0], `${e.drugId} in ${d.id}`).toEqual([true, true]);
      }
    }
  });

  it('advised against: Levophed 2.3 (saline alone), atracurium Dosage and Administration and cisatracurium 2.7 (lactated Ringer\'s); no other', () => {
    const rows = LABEL_ONLY.flatMap((e) => e.diluents.filter((d) => d.notListed?.reason === 'advisedAgainst').map((d) => `${e.drugId}:${d.id}`));
    expect(rows).toEqual(['atracurium:ringerLactate', 'cisatracurium:ringerLactate', 'norepinephrine:saline']);
    expect(reason('norepinephrine', 'saline')).toEqual({ reason: 'advisedAgainst', section: '2.3 Preparation of Diluted Solution', words: 'Administration in saline solution alone is not recommended.' });
    expect(found('norepinephrine', 'saline')[0]).toEqual({ kind: 'advisedAgainst', drugId: 'norepinephrine', against: 'diluent', other: 'saline', statement: '"Administration in saline solution alone is not recommended." (2.3 Preparation of Diluted Solution)', src: 'dailymed-levophed' });
    expect(graded('atracurium', 'ringerLactate')).toEqual(['advisedAgainst', 'notTested']);
    expect(graded('cisatracurium', 'ringerLactate')).toEqual(['advisedAgainst', 'notTested']);
  });

  it('running line only: sugammadex 2.3, dexmedetomidine 2.5, adenosine Dosage and Administration (the saline flush); no other', () => {
    const rows = LABEL_ONLY.flatMap((e) => e.diluents.filter((d) => d.notListed?.reason === 'runningLine').map((d) => `${e.drugId}:${d.id}`));
    expect(rows).toEqual(['adenosine:saline', 'dexmedetomidine:dextrose5', 'dexmedetomidine:ringerLactate', 'sugammadex:dextrose5', 'sugammadex:ringerLactate', 'sugammadex:dextrose5Saline']);
    expect(graded('sugammadex', 'dextrose5')).toEqual(['runningLine', 'notTested']);
    expect(found('dexmedetomidine', 'ringerLactate')[0]).toMatchObject({ kind: 'runningLine', src: 'dailymed-precedex', statement: expect.stringContaining('(2.5 Administration with Other Fluids)') });
  });

  it('a powder whose reconstitution list leaves out a silent fluid: remifentanil 2.12 in glucose 4 % with 0.18 % saline is silent', () => {
    expect(graded('remifentanil', 'dextrose4Saline018')).toEqual(['labelSilent', 'notTested']);
  });
});

describe('the grade follows the reason, on the record the instructor and the Debrief read', () => {
  const DOC = minimalV2() as unknown as ScenarioDocV2;
  const KEY = 'bed2remote01';
  let seq = 0;
  const staged = (drugId: string, diluent: string, f = found(drugId, diluent)): StagedPrep => ({
    id: `p${drugId.slice(0, 7)}`, by: KEY, t: 10, drugId, productId: F.drugs[drugId]!.products[0]!.id, diluent,
    concentration: { amount: 1, unit: 'mg', perMl: 0.1 }, volumeMl: 10, findings: f, notice: null,
  });
  const give = (s: StagedPrep): Administration => {
    const { t: _t, by: _by, ...rest } = s;
    return { seq: ++seq, t: 20, source: 'learner', by: KEY, kind: 'drug', drugId: s.drugId, dose: 1, unit: 'mg', route: 'iv', result: { accepted: true }, prep: { ...rest, remaining: 1, activeAmount: 1, unit: 'mg' } };
  };
  const run = (s: StagedPrep, delivered: boolean) => grade(DOC, [], delivered ? [give(s)] : [], [], 30, { preparations: [s] });

  it('advised against (Levophed 2.3, saline alone): staged a deviation, delivered a formulary violation in the label\'s words', () => {
    const s = staged('norepinephrine', 'saline');
    expect(run(s, false).preparations![0]!.grade).toBe('deviation');
    const g = run(s, true);
    expect(g.preparations![0]!.grade).toBe('violation');
    expect(g.violations.map((v) => [v.text, v.source])).toEqual([[
      'norepinephrine prepared in saline, a diluent its label advises against: "Administration in saline solution alone is not recommended." (2.3 Preparation of Diluted Solution)', 'formulary',
    ]]);
  });

  it('silent (lidocaine Ansyr and premixed labels, saline): "ok", staged or delivered, and no violation', () => {
    const s = staged('lidocaine', 'saline');
    for (const delivered of [false, true]) {
      const g = run(s, delivered);
      expect(g.preparations![0]!.grade).toBe('ok');
      expect(g.violations).toEqual([]);
    }
  });

  it('running line only (sugammadex 2.3, glucose 5 %): "ok", staged or delivered, and no violation', () => {
    const s = staged('sugammadex', 'dextrose5');
    expect(run(s, false).preparations![0]!.grade).toBe('ok');
    expect(run(s, true).violations).toEqual([]);
  });

  it('a record made before the reason was read keeps its stored finding: lidocaine in saline stored "not listed" is still graded wrong', () => {
    const old = staged('lidocaine', 'saline', [
      { kind: 'wrongDiluent', drugId: 'lidocaine', against: 'diluent', other: 'saline', statement: null, src: 'dailymed-lidocaine-ansyr' },
      { kind: 'notTested', drugId: 'lidocaine', against: 'diluent', other: 'saline', statement: null, src: null },
    ]);
    expect(run(old, false).preparations![0]!.grade).toBe('deviation');
    expect(run(old, true).violations.map((v) => v.text)).toEqual(['lidocaine prepared in saline, a diluent its label does not list']);
  });
});
