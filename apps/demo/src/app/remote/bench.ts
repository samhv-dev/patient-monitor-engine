// Plan learner-action-remote.md L7 (§4 D2, D3; LQ3, LQ7, LQ11): the preparation bench on the learner remote's Drugs tab.
// A resident does here what they do at the bedside: find a drug (the library's names, drugs.ts; only drugs with a
// formulary file, §5 rule 5), choose its stocked product (the vial: strength and form, from the formulary), how much of
// it, the diluent and its volume, the container, and, for a mix, another drug into the same syringe. The bench then
// shows what the syringe holds and how long it takes to prepare (the product's sourced time, or "no source": LQ7, never
// an invented one), and "Put on the tray" hands the CHOICE to the tray, which sends it as `prep stage`. The phone's
// arithmetic is the host's own pure step (prepare.ts) run here as a PREVIEW, labelled so: the host recomputes everything
// and its answer is what the tray shows (D3). The listed diluents come first and every other diluent is offered too:
// choosing it is the learner's act, which the format grades (LQ11); nothing here warns before the instructor's notice
// (LQ3), so the bench never shows a finding.
import { prepare, type Formulary, type Product, type Source, type Stability } from '@pme/controller';
import { drugName } from '../glossary.ts';
import { findDrugs, unitText } from '../drugs.ts';
import { button, h, select, setText, stepper, type Stepper } from '../ui.ts';

/** One drug drawn into the preparation, as the bench chose it (the wire's `prep.components[]` item). */
export interface BenchComponent {
  productId: string;
  amount: number;
  /** 'vial' for a vial reconstituted from powder, 'mL' drawn from a solution (prepare.ts PrepComponent units). */
  unit: 'vial' | 'mL';
}
/** What "Put on the tray" hands the tray: the learner's choice, nothing computed. */
export interface BenchChoice {
  components: BenchComponent[];
  diluent?: { id: string; volumeMl: number };
  container: Stability['container'];
}

/** The containers a preparation may be made in, as the bench names them (the host's PREP_CONTAINERS). */
export const CONTAINER_WORDS: Readonly<Record<Stability['container'], string>> = {
  'syringe-pp': 'Syringe (polypropylene)',
  'bag-pvc': 'Bag (PVC)',
  'bag-polyolefin': 'Bag (polyolefin)',
  vial: 'In the vial',
};
/** The diluent value for "none" (a solution drawn as it is). */
export const NO_DILUENT = '';

/**
 * How much may be drawn [ENG: ui; bounds of the steppers, not doses: 40 vials is more than a 10 mg/kg dantrolene dose
 * for a 70 kg adult in 20 mg vials (35), 100 mL is two 50 mL syringes; the diluent's 1000 mL is the largest bag the
 * formulary's diluents come in]. The host's formulary step is the judge of the preparation, not these bounds.
 */
export const BENCH_LIMITS = { vials: 40, drawnMl: 100, diluentMl: 1000 } as const;

const fmt = (x: number): string => (x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x >= 1 ? x.toFixed(2) : x.toPrecision(2)).replace(/\.0+$|(\.\d*?)0+$/, '$1');
/** "1:30" for 90 s. */
export const mmss = (s: number): string => {
  const n = Math.max(0, Math.ceil(s));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
};
/** "6 mg/mL" (µg for mcg). */
export const perMlText = (amount: number, unit: string): string => `${fmt(amount)} ${unitText(unit)}/mL`;

/** A source as the phone names it (the finding after the notice, a product's label). */
export function sourceText(s: Source | undefined, key: string): string {
  if (!s) return key;
  if (s.kind === 'stabilis') return `Stabilis ${s.id}`;
  if (s.kind === 'trissel') return `Trissel ${s.edition}, p. ${s.page}`;
  if (s.kind === 'monograph') return `${s.product} (${s.issuer})`;
  return s.citation;
}

/** A product as the bench names it: the label's product name when the strength's source is a label, then its strength and form. */
export function productWords(f: Formulary, p: Product): { name: string; detail: string } {
  const s = f.sources[p.strength.src];
  const name = s?.kind === 'monograph' ? s.product : p.id;
  const strength = p.strength.perVial ? `${fmt(p.strength.amount)} ${unitText(p.strength.unit)} per vial` : perMlText(p.strength.amount, p.strength.unit);
  const rc = p.reconstitute ? `, reconstituted with ${fmt(p.reconstitute.volumeMl)} mL` : '';
  return { name, detail: `${strength} · ${p.form}${rc}` };
}

/** The bench's words, step by step (English chrome: the owner rules the words). */
export const BENCH_WORDS = {
  title: 'Prepare a drug',
  search: 'Find a drug',
  searchHint: 'Drugs in this computer’s formulary.',
  noMatch: (q: string) => `No drug in the formulary matches “${q}”.`,
  product: 'Vial',
  vials: 'Vials',
  drawn: 'Drawn from the vial',
  diluent: 'Diluent',
  listed: 'Listed in the label',
  others: 'Other diluents',
  none: 'None: drawn as it is',
  volume: 'Diluent added',
  onTop: (ml: number) => `Added on top of the label’s ${fmt(ml)} mL for reconstitution.`,
  container: 'Container',
  another: 'Add another drug to this syringe',
  remove: 'Remove',
  change: 'Choose another drug',
  holds: 'The syringe then holds',
  preview: 'Preview on this phone. The instructor’s computer gives the concentration when it is on the tray.',
  takes: (s: number) => `Takes ${mmss(s)} to prepare`,
  noSource: 'Preparation time: no source',
  cannot: (why: string) => `Cannot be prepared: ${why}`,
  stage: 'Put on the tray',
} as const;

export interface BenchOptions {
  formulary: Formulary;
  /** "Put on the tray": the tray sends it. */
  onStage(choice: BenchChoice): void;
}

export interface Bench {
  el: HTMLElement;
  /** The drug being chosen now (null: the search). */
  readonly drug: string | null;
  /** Start again from the search, the bench emptied. */
  reset(): void;
}

interface Drawn {
  drugId: string;
  productId: string;
  amount: Stepper;
  unit: 'vial' | 'mL';
  el: HTMLElement;
}

/** The bench: the search, then the product and its amount, the diluent and volume, the container, the preview, "Put on the tray". */
export function benchView(o: BenchOptions): Bench {
  const f = o.formulary;
  const offered = (q: string) => findDrugs(q).filter((d) => f.drugs[d.id]);
  const searchIn = h('input', { class: 'input lr-search', type: 'search', autocomplete: 'off', 'aria-describedby': 'lr-search-hint' });
  const searchId = `lr-s${Math.random().toString(36).slice(2, 8)}`;
  searchIn.id = searchId;
  const results = h('ul', { class: 'lr-results', 'aria-label': 'Drugs' });
  const noMatch = h('p', { class: 'hint lr-nomatch', role: 'status' });
  const search = h('div', { class: 'lr-step lr-find' },
    h('label', { for: searchId }, BENCH_WORDS.search), searchIn, h('p', { class: 'hint', id: 'lr-search-hint' }, BENCH_WORDS.searchHint), noMatch, results);
  const drawnList = h('div', { class: 'lr-drawn' });
  const products = h('div', { class: 'lr-step lr-products', role: 'group', 'aria-label': BENCH_WORDS.product });
  const dil = select(BENCH_WORDS.diluent, [], NO_DILUENT, () => draw());
  const vol = stepper({ label: BENCH_WORDS.volume, unit: 'mL', min: 0, max: BENCH_LIMITS.diluentMl, step: 1, value: 0, onchange: () => draw() });
  const onTop = h('p', { class: 'hint lr-ontop' });
  const box = select(BENCH_WORDS.container, Object.entries(CONTAINER_WORDS) as Array<[string, string]>, 'syringe-pp', () => draw());
  const holds = h('p', { class: 'lr-holds', role: 'status', 'aria-live': 'polite' });
  const time = h('p', { class: 'lr-time' });
  const said = h('p', { class: 'lr-cannot', role: 'alert' });
  const stageBtn = button(BENCH_WORDS.stage, () => stage(), 'primary lr-stage');
  const another = button(BENCH_WORDS.another, () => toSearch(), 'lr-another');
  const fill = h('div', { class: 'lr-step lr-fill' },
    drawnList, products,
    h('div', { class: 'lr-diluent' }, dil.el, h('div', { class: 'field' }, h('span', { class: 'lr-label' }, `${BENCH_WORDS.volume} (mL)`), vol.el), onTop),
    box.el,
    h('div', { class: 'lr-result' }, h('p', { class: 'lr-sub' }, BENCH_WORDS.holds), holds, h('p', { class: 'hint lr-preview' }, BENCH_WORDS.preview), time, said),
    h('div', { class: 'lr-actions' }, stageBtn, another));
  const el = h('section', { class: 'lr-bench', 'aria-label': BENCH_WORDS.title }, h('h2', { class: 'lr-h2' }, BENCH_WORDS.title), search, fill);

  let drawn: Drawn[] = [];
  let picking: string | null = null; // the drug whose product is being chosen

  function list(): void {
    const q = searchIn.value;
    const ds = offered(q);
    results.replaceChildren(...ds.map((d) => h('li', {}, button(d.name, () => pickDrug(d.id), 'lr-pick', { 'data-drug': d.id }))));
    setText(noMatch, ds.length ? '' : BENCH_WORDS.noMatch(q.trim()));
  }
  searchIn.addEventListener('input', list);

  function toSearch(): void {
    picking = null;
    searchIn.value = '';
    list();
    search.hidden = false;
    fill.hidden = drawn.length === 0;
    products.replaceChildren();
    searchIn.focus();
  }

  function pickDrug(drugId: string): void {
    picking = drugId;
    search.hidden = true;
    fill.hidden = false;
    const entry = f.drugs[drugId]!;
    products.replaceChildren(
      h('p', { class: 'lr-sub' }, `${drugName(drugId)} · ${BENCH_WORDS.product}`),
      ...entry.products.map((p) => {
        const w = productWords(f, p);
        return h('button', { type: 'button', class: 'btn lr-product', 'data-product': p.id, onclick: () => pickProduct(drugId, p) },
          h('span', { class: 'lr-pname' }, w.name), h('span', { class: 'lr-pdetail' }, w.detail));
      }),
      button(BENCH_WORDS.change, () => toSearch(), 'small lr-change-drug'),
    );
    products.querySelector<HTMLButtonElement>('.lr-product')?.focus();
    draw();
  }

  function pickProduct(drugId: string, p: Product): void {
    const unit: 'vial' | 'mL' = p.strength.perVial && p.reconstitute ? 'vial' : 'mL';
    const amount = unit === 'vial'
      ? stepper({ label: `${drugName(drugId)} ${BENCH_WORDS.vials}`, unit: 'vials', min: 1, max: BENCH_LIMITS.vials, step: 1, value: 1, onchange: () => draw() })
      : stepper({ label: `${drugName(drugId)} ${BENCH_WORDS.drawn}`, unit: 'mL', min: 0.1, max: BENCH_LIMITS.drawnMl, step: 0.1, value: 1, onchange: () => draw() });
    const w = productWords(f, p);
    const row: Drawn = { drugId, productId: p.id, amount, unit, el: h('div', { class: 'lr-drawn-row', 'data-product': p.id }) };
    row.el.append(
      h('p', { class: 'lr-dname' }, h('b', {}, drugName(drugId)), ` · ${w.name}`),
      h('p', { class: 'hint' }, w.detail),
      h('div', { class: 'field' }, h('span', { class: 'lr-label' }, unit === 'vial' ? `${BENCH_WORDS.vials}` : `${BENCH_WORDS.drawn} (mL)`), amount.el),
      button(BENCH_WORDS.remove, () => {
        drawn = drawn.filter((x) => x !== row);
        row.el.remove();
        if (drawn.length === 0) toSearch();
        else draw();
      }, 'small lr-remove', { 'aria-label': `${BENCH_WORDS.remove} ${drugName(drugId)}` }),
    );
    drawn.push(row);
    drawnList.append(row.el);
    picking = null;
    products.replaceChildren();
    fillDiluents();
    draw();
    dil.sel.focus();
  }

  /** The diluents: the label's listed ones first (for every drug drawn), then every other diluent (LQ11: the learner's act). */
  function fillDiluents(): void {
    const keep = dil.sel.value;
    const listedFor = (id: string) => drawn.every((d) => {
      const e = f.drugs[d.drugId]!;
      const p = e.products.find((x) => x.id === d.productId);
      return e.diluents.some((x) => x.id === id && x.listed) && (!p?.reconstitute || p.reconstitute.diluents.includes(id));
    });
    const all = Object.values(f.diluents).map((d) => [d.diluentId, d.name] as [string, string]).sort((a, b) => a[1].localeCompare(b[1]));
    const listed = all.filter(([id]) => listedFor(id));
    const others = all.filter(([id]) => !listedFor(id));
    const powder = drawn.some((d) => d.unit === 'vial');
    dil.sel.replaceChildren(
      ...(powder ? [] : [h('option', { value: NO_DILUENT }, BENCH_WORDS.none)]),
      ...(listed.length ? [h('optgroup', { label: BENCH_WORDS.listed }, ...listed.map(([v, t]) => h('option', { value: v }, t)))] : []),
      h('optgroup', { label: BENCH_WORDS.others }, ...others.map(([v, t]) => h('option', { value: v }, t))),
    );
    const values = [...dil.sel.options].map((x) => x.value);
    dil.sel.value = values.includes(keep) && (keep !== NO_DILUENT || !powder) ? keep : (listed[0]?.[0] ?? values[0] ?? NO_DILUENT);
  }

  function choice(): BenchChoice {
    const d = dil.sel.value;
    return {
      components: drawn.map((x) => ({ productId: x.productId, amount: x.amount.value, unit: x.unit })),
      ...(d !== NO_DILUENT ? { diluent: { id: d, volumeMl: vol.value } } : {}),
      container: box.sel.value as Stability['container'],
    };
  }

  /** The preview (the host's pure step on this phone) and the preparation time, or why it cannot be made. */
  function draw(): void {
    const powder = drawn.find((x) => x.unit === 'vial');
    const rc = powder ? f.drugs[powder.drugId]!.products.find((p) => p.id === powder.productId)?.reconstitute : undefined;
    setText(onTop, rc ? BENCH_WORDS.onTop(rc.volumeMl) : '');
    another.hidden = drawn.length === 0 || picking !== null;
    stageBtn.hidden = picking !== null;
    if (drawn.length === 0) {
      setText(holds, '');
      setText(time, '');
      setText(said, '');
      stageBtn.disabled = true;
      return;
    }
    const c = choice();
    const made = prepare(drawn.map((x, i) => ({ drugId: x.drugId, ...c.components[i]! })), c.diluent, f, 0, c.container);
    if (!made.ok) {
      setText(holds, '');
      setText(time, '');
      setText(said, BENCH_WORDS.cannot(made.why));
      stageBtn.disabled = true;
      return;
    }
    setText(said, '');
    stageBtn.disabled = false;
    setText(holds, `${made.actives.map((a) => `${drugName(a.drugId)} ${perMlText(a.perMl, a.unit)}`).join(' + ')} · ${fmt(made.volumeMl)} mL`);
    setText(time, made.ready.gap ? BENCH_WORDS.noSource : BENCH_WORDS.takes(made.ready.atS));
    time.dataset.gap = String(made.ready.gap !== null);
  }

  function stage(): void {
    if (stageBtn.disabled || drawn.length === 0) return;
    o.onStage(choice());
    reset();
  }

  function reset(): void {
    drawn = [];
    drawnList.replaceChildren();
    dil.sel.replaceChildren();
    vol.set(0);
    box.sel.value = 'syringe-pp';
    toSearch();
    draw();
  }

  list();
  fill.hidden = true;
  draw();
  return { el, get drug() { return picking; }, reset };
}
