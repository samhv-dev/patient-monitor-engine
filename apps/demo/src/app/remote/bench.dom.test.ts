// @vitest-environment happy-dom
// Plan learner-action-remote.md L7 ("Tests first", dom): the bench's words at each step, on the shipped formulary. Find a
// drug (only drugs with a formulary file), its products (the label's name, strength, form, reconstitution), the amount,
// the diluent (the label's listed diluents first, every other one offered too; LQ11), the volume, the container, what
// the syringe then holds (a preview, labelled so) and the preparation time (sourced, or "no source": LQ7); "Put on the
// tray" hands the CHOICE on, nothing computed. Nothing warns of a wrong diluent or a mix before the notice (LQ3).
import type { Formulary } from '@pme/controller';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadShippedFormulary } from '../formulary.ts';
import { benchView, BENCH_WORDS, type BenchChoice } from './bench.ts';

let f: Formulary;
beforeAll(async () => void (f = (await loadShippedFormulary()) as Formulary));

function mount() {
  const staged: BenchChoice[] = [];
  const b = benchView({ formulary: f, onStage: (c) => staged.push(c) });
  document.body.replaceChildren(b.el);
  const q = <T extends Element = HTMLElement>(s: string) => b.el.querySelector(s) as T;
  const qa = (s: string) => [...b.el.querySelectorAll<HTMLElement>(s)];
  const search = (text: string) => {
    const i = q<HTMLInputElement>('.lr-search');
    i.value = text;
    i.dispatchEvent(new Event('input'));
  };
  const pick = (drugId: string) => q<HTMLButtonElement>(`.lr-pick[data-drug="${drugId}"]`).click();
  const product = (id: string) => q<HTMLButtonElement>(`.lr-product[data-product="${id}"]`).click();
  const diluent = () => q<HTMLSelectElement>('.lr-diluent select');
  const setDiluent = (id: string) => {
    diluent().value = id;
    diluent().dispatchEvent(new Event('change'));
  };
  const text = (s: string) => q(s)?.textContent ?? null;
  return { b, q, qa, staged, search, pick, product, diluent, setDiluent, text };
}

describe('the bench (L7)', () => {
  it('finds a drug by name among the formulary\'s drugs only, and says when none matches', () => {
    const m = mount();
    expect(m.text('.lr-h2')).toBe(BENCH_WORDS.title);
    expect(m.text('.lr-find label')).toBe(BENCH_WORDS.search);
    const all = m.qa('.lr-pick').map((x) => x.dataset.drug as string);
    expect(all.length).toBeGreaterThan(0);
    for (const d of all) expect(f.drugs[d], d).toBeDefined(); // §5 rule 5: the bench offers only drugs with a file
    expect(all).not.toContain('ketamine'); // in the library, no formulary file yet
    m.search('dant');
    expect(m.qa('.lr-pick').map((x) => x.textContent)).toEqual(['Dantrolene']);
    m.search('adrenaline'); // the other name finds epinephrine (drugs.ts aka)
    expect(m.qa('.lr-pick').map((x) => x.dataset.drug)).toEqual(['epinephrine']);
    m.search('zzz');
    expect(m.qa('.lr-pick')).toHaveLength(0);
    expect(m.text('.lr-nomatch')).toBe(BENCH_WORDS.noMatch('zzz'));
  });

  it('a powder: its products in the label\'s words, vials, the listed diluent first, the reconstitution volume, the syringe\'s preview and the sourced time', () => {
    const m = mount();
    m.search('dantrolene');
    m.pick('dantrolene');
    expect(m.text('.lr-products .lr-sub')).toBe(`Dantrolene · ${BENCH_WORDS.product}`);
    expect(m.qa('.lr-product').map((x) => [x.querySelector('.lr-pname')?.textContent, x.querySelector('.lr-pdetail')?.textContent])).toEqual([
      ['Dantrium IV 20 mg powder for solution for injection', '20 mg per vial · powder, reconstituted with 60 mL'],
      [expect.stringMatching(/Agilus/), '120 mg per vial · powder, reconstituted with 20 mL'],
    ]);
    m.product('agilus-120mg');
    expect(m.text('.lr-drawn-row .lr-label')).toBe(BENCH_WORDS.vials);
    const groups = [...m.diluent().querySelectorAll('optgroup')].map((g) => [g.label, [...g.querySelectorAll('option')].map((o) => o.value)]);
    expect(groups[0]).toEqual([BENCH_WORDS.listed, ['water']]);
    expect(groups[1]?.[0]).toBe(BENCH_WORDS.others);
    expect(groups[1]?.[1]).toEqual(expect.arrayContaining(['saline', 'dextrose5', 'ringerLactate']));
    expect([...m.diluent().options].map((o) => o.textContent)).not.toContain(BENCH_WORDS.none); // a powder needs a diluent
    expect(m.diluent().value).toBe('water');
    expect(m.text('.lr-ontop')).toBe(BENCH_WORDS.onTop(20));
    expect(m.text('.lr-result .lr-sub')).toBe(BENCH_WORDS.holds);
    // N73: the label states 22.6 mL after the 20 mL added (emc-15912), so 120 mg is 5.31 mg/mL, not 6
    expect(m.text('.lr-holds')).toBe('Dantrolene 5.31 mg/mL · 22.6 mL');
    expect(m.q('.lr-powder').hidden).toBe(true);
    expect(m.text('.lr-preview')).toBe(BENCH_WORDS.preview);
    expect(m.text('.lr-time')).toBe(BENCH_WORDS.takes(50)); // emc-15912: 50 s
    expect(m.text('.lr-time')).toBe('Takes 0:50 to prepare');
    expect(m.text('.lr-stage')).toBe(BENCH_WORDS.stage);
  });

  it('N73: a powder whose label states no volume after reconstitution: the added volume only, and the bench says so', () => {
    const m = mount();
    m.search('dantrolene');
    m.pick('dantrolene');
    m.product('dantrium-iv-20mg');
    expect(m.text('.lr-holds')).toBe('Dantrolene 0.33 mg/mL · 60 mL'); // 20 mg in the 60 mL added (emc-1097 states no final volume)
    expect(m.q('.lr-powder').hidden).toBe(false);
    expect(m.text('.lr-powder')).toBe(BENCH_WORDS.powderIgnored);
  });

  it('a solution with no sourced preparation time says "no source" (LQ7); "none" is offered, and the volume added changes the preview', () => {
    const m = mount();
    m.search('fentanyl');
    m.pick('fentanyl');
    m.product('fentanyl-50mcg-ml');
    expect(m.text('.lr-drawn-row .lr-label')).toBe(`${BENCH_WORDS.drawn} (mL)`);
    expect(m.diluent().options[0]?.textContent).toBe(BENCH_WORDS.none);
    expect([...m.diluent().querySelector('optgroup')!.querySelectorAll('option')].map((o) => o.value).sort()).toEqual(['dextrose5', 'saline']);
    expect(m.text('.lr-time')).toBe(BENCH_WORDS.noSource);
    m.setDiluent('saline');
    const vol = m.q<HTMLInputElement>('.lr-diluent .stepper input');
    vol.value = '9';
    vol.dispatchEvent(new Event('change'));
    // 1 mL of 50 µg/mL with 9 mL saline: 50 µg in 10 mL
    expect(m.text('.lr-holds')).toBe('Fentanyl 5 µg/mL · 10 mL');
  });

  it('any other diluent may be chosen, and nothing on the bench warns (LQ3, LQ11): the choice goes on the tray as chosen', () => {
    const m = mount();
    m.search('dantrolene');
    m.pick('dantrolene');
    m.product('agilus-120mg');
    m.setDiluent('saline'); // not listed in the label: the learner's act
    expect(m.diluent().value).toBe('saline');
    expect(m.text('.lr-cannot')).toBe('');
    expect(m.b.el.textContent).not.toMatch(/wrong|not listed|incompatib/i);
    expect(m.q<HTMLButtonElement>('.lr-stage').disabled).toBe(false);
    m.q<HTMLButtonElement>('.lr-stage').click();
    expect(m.staged).toEqual([{ components: [{ productId: 'agilus-120mg', amount: 1, unit: 'vial' }], diluent: { id: 'saline', volumeMl: 0 }, container: 'syringe-pp' }]);
    // the bench starts again from the search
    expect(m.q<HTMLElement>('.lr-find').hidden).toBe(false);
    expect(m.q<HTMLElement>('.lr-fill').hidden).toBe(true);
  });

  it('two drugs into one syringe (an admixture), in the container chosen; "Remove" takes one out', () => {
    const m = mount();
    m.search('sodium bic');
    m.pick('sodiumBicarbonate');
    m.product('sodium-bicarbonate-84mg-ml');
    expect(m.text('.lr-another')).toBe(BENCH_WORDS.another);
    m.q<HTMLButtonElement>('.lr-another').click();
    m.search('epinephrine');
    m.pick('epinephrine');
    m.product('adrenalin-1mg-ml');
    expect(m.qa('.lr-drawn-row')).toHaveLength(2);
    expect(m.text('.lr-holds')).toBe('Sodium bicarbonate 8.4 % 0.5 mmol/mL + Epinephrine 0.5 mg/mL · 2 mL');
    const box = m.q<HTMLSelectElement>('.lr-fill > .field select');
    expect([...box.options].map((o) => o.textContent)).toEqual(['Syringe (polypropylene)', 'Bag (PVC)', 'Bag (polyolefin)', 'In the vial']);
    m.setDiluent('');
    m.q<HTMLButtonElement>('.lr-stage').click();
    expect(m.staged[0]).toEqual({ components: [{ productId: 'sodium-bicarbonate-84mg-ml', amount: 1, unit: 'mL' }, { productId: 'adrenalin-1mg-ml', amount: 1, unit: 'mL' }], container: 'syringe-pp' });
    // Remove
    m.search('fentanyl');
    m.pick('fentanyl');
    m.product('fentanyl-50mcg-ml');
    m.q<HTMLButtonElement>('.lr-remove').click();
    expect(m.qa('.lr-drawn-row')).toHaveLength(0);
    expect(m.q<HTMLElement>('.lr-find').hidden).toBe(false);
  });
});
