// @vitest-environment happy-dom
// The builder's Phases section (piece B3, mock-up 02-phase-editor) on the MH card: every phase opened and read, nothing
// changed, is the card's own bytes in the store and in Export; the rule is a tree (ALL OF with four leaves on Early
// signs) with Instructor v2's words beside it; a threshold edited is written in place and the words follow; a number
// the schema refuses is not written; a condition (a drug concentration, DC1) is added only when complete; the `next`
// list reorders; the validator's refusal shows at the rule node and the `next` row it names; a phase nothing leads to is
// the builder's warning; a rename follows every mention; a new phase is added only when complete.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { asFactory, MemoryIDB } from '../memory-idb.ts';
import { MemoryStorage } from '../memory-storage.ts';
import mhCard from '../showcase/showcase-mh-v2.json';
import { cardFileText } from './card-file.ts';
import { CHECK_DELAY_MS } from './checks.ts';
import { Drafts, type Body } from './drafts.ts';
import { builderPage, SAVE_DELAY_MS } from './page.ts';

type Rec = Record<string, unknown>;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const settled = () => wait(Math.max(CHECK_DELAY_MS, SAVE_DELAY_MS) + 60);
const MH = { ...(mhCard as unknown as Rec), id: 'mh-mine' };
const copy = (): Rec => JSON.parse(JSON.stringify(MH)) as Rec;
const ph = (d: Rec, id: string) => (d.phases as Rec[]).find((p) => p.id === id)!;

describe('the phase editor (B3)', () => {
  let b: { idb: MemoryIDB; ls: MemoryStorage };
  beforeEach(() => {
    b = { idb: new MemoryIDB(), ls: new MemoryStorage() };
  });
  afterEach(() => {
    document.body.replaceChildren();
    location.hash = '';
    vi.restoreAllMocks();
  });
  /** A draft of `doc` opened at its Phases section. */
  const open = async (doc: Rec = MH) => {
    const s = new Drafts(() => b.ls, () => asFactory(b.idb));
    await s.ready();
    const m = await s.create(doc as unknown as Body, 'a test card');
    if ('refused' in m) throw new Error(m.refused);
    const p = builderPage(s);
    document.body.append(p.el);
    await p.enter(m.id);
    const all = <T extends Element = HTMLElement>(sel: string) => [...p.el.querySelectorAll<T>(sel)];
    const q = <T extends Element = HTMLElement>(sel: string) => p.el.querySelector<T>(sel)!;
    all<HTMLButtonElement>('.sb-out').find((x) => x.textContent?.startsWith('Phases'))!.click();
    const phase = (label: string) => all<HTMLButtonElement>('.sb-phases .sb-out').find((x) => x.querySelector('.sb-pl')?.textContent === label)!.click();
    const byLabel = <T extends HTMLElement = HTMLInputElement>(label: string) => q<T>(`[aria-label="${label}"]`);
    const set = (el: HTMLInputElement | HTMLSelectElement, v: string) => {
      el.value = v;
      el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input'));
    };
    const body = async () => (await s.body(m.id)) as unknown as Rec;
    const flush = async () => {
      await wait(0);
      await settled();
    };
    return { p, s, id: m.id, all, q, phase, byLabel, set, body, flush };
  };

  it('every phase opened and read, nothing changed: the stored draft and Export are the card\'s own bytes', async () => {
    const got: string[] = [];
    vi.spyOn(URL, 'createObjectURL').mockImplementation((x) => (void (x as Blob).text().then((t) => got.push(t)), 'blob:test/0'));
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const e = await open();
    for (const p of MH.phases as Rec[]) {
      e.phase(String(p.label));
      expect(e.q('#sb-phase-h').textContent).toContain(String(p.label));
    }
    await e.flush();
    expect(JSON.stringify(await e.body())).toBe(JSON.stringify(MH));
    expect(e.q('.sb-checks li').textContent).toMatch(/^The validator accepts this draft/);
    e.all<HTMLButtonElement>('.sb-acts button').find((x) => x.textContent === 'Export file')!.click();
    for (let i = 0; i < 40 && !got.length; i++) await wait(5);
    expect(got).toEqual([cardFileText(MH)]);
  });

  it('Early signs: its place in the course, its rule as a tree, Instructor v2\'s words beside it', async () => {
    const e = await open();
    e.phase('Early signs');
    expect([...e.q('.sb-flow').querySelectorAll('.sb-ph')].map((x) => x.textContent)).toEqual(['Latent', 'Early signs', 'Established', 'Treated', 'Arrest']);
    const root = e.q('.sb-rule > li');
    expect(root.getAttribute('aria-label')).toBe('the rule: All of 4 conditions');
    expect(root.querySelector<HTMLSelectElement>('select')!.value).toBe('all');
    expect([...root.querySelectorAll(':scope > .sb-kids > li')].map((x) => x.getAttribute('aria-label'))).toEqual([
      'condition 1: A measured value against a threshold', 'condition 2: A value rising or falling', 'condition 3: A value held unchanged', 'condition 4: A value rising or falling',
    ]);
    expect(root.querySelector(':scope > .sb-says')?.textContent).toBe('Instructor v2 reads: EtCO₂ > 45 and EtCO₂ rising and set minute ventilation unchanged and HR rising');
    expect(e.q('.sb-preview').textContent).toContain('Early signs EtCO₂ climbing, HR up · when EtCO₂ > 45 and EtCO₂ rising and set minute ventilation unchanged and HR rising, held 20 sIn ACTION, under Latent');
    // the leaf reads its variable in words, its format name only in <code>
    const leaf = root.querySelector('[data-node="/all/2"]')!;
    expect(leaf.querySelector<HTMLSelectElement>('select')!.selectedOptions[0]!.textContent).toBe('Set minute ventilation (the ventilator’s) (L/min)');
    expect(leaf.querySelector('code')?.textContent).toBe('setMinuteVentilationLMin');
  });

  it('a threshold edited is written in place (only that number moves), the words follow; a refused number is not written', async () => {
    const e = await open();
    e.phase('Early signs');
    e.set(e.byLabel('condition 1: threshold'), '50');
    await e.flush();
    const want = copy();
    ((ph(want, 'earlySigns').enter as { all: Array<{ value: Rec }> }).all[0]!.value).value = 50;
    expect(JSON.stringify(await e.body())).toBe(JSON.stringify(want));
    expect(e.q('.sb-rule > li > .sb-says').textContent).toBe('Instructor v2 reads: EtCO₂ > 50 and EtCO₂ rising and set minute ventilation unchanged and HR rising');
    expect(e.q('.sb-preview').textContent).toContain('when EtCO₂ > 50 and');
    // a window of 0 s: the schema wants more than 0; not written, and the field says what the card keeps
    const over = e.byLabel('condition 2: over how many seconds');
    e.set(over, '0');
    await e.flush();
    expect(over.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById(over.dataset.describedby!)?.textContent).toBe('more than 0: not written, the card keeps 120');
    expect(JSON.stringify(await e.body())).toBe(JSON.stringify(want));
    expect(e.q('.sb-checks li').textContent).toMatch(/^The validator accepts this draft/);
  });

  it('a condition is added only when complete: a plasma concentration (DC1), with its unit and its words', async () => {
    const e = await open();
    e.phase('Early signs');
    e.byLabel<HTMLButtonElement>('Add a condition to the rule').click();
    await wait(0);
    const add = e.all<HTMLButtonElement>('.sb-adder button').find((x) => x.textContent === 'Add the condition')!;
    expect(add.disabled).toBe(true);
    e.set(e.byLabel<HTMLSelectElement>('New condition in the rule: what it reads'), 'cp:propofol');
    expect(e.q('.sb-adder .sb-leafrow code').textContent).toBe('cp:propofol');
    expect(e.q('.sb-adder').textContent).toContain('µg/mL');
    e.set(e.byLabel('New condition in the rule: threshold'), '4');
    expect(add.disabled).toBe(false);
    add.click();
    await e.flush();
    const want = copy();
    (ph(want, 'earlySigns').enter as { all: Rec[] }).all.push({ value: { var: 'cp:propofol', op: '>', value: 4 } });
    expect(JSON.stringify(await e.body())).toBe(JSON.stringify(want));
    expect(e.q('[data-node="/all/4"] .sb-says').textContent).toBe('Instructor v2 reads: plasma propofol > 4 µg/mL');
  });

  it('the tree by its buttons: NOT around a leaf and off again, a group of its own and ungrouped, a leaf removed', async () => {
    const e = await open();
    e.phase('Early signs');
    e.byLabel<HTMLButtonElement>('Negate condition 4: wrap it in NOT').click();
    await e.flush();
    expect(e.q('.sb-rule > li > .sb-says').textContent).toBe('Instructor v2 reads: EtCO₂ > 45 and EtCO₂ rising and set minute ventilation unchanged and not (HR rising)');
    e.byLabel<HTMLButtonElement>('Remove the NOT around condition 4').click();
    e.byLabel<HTMLButtonElement>('Put condition 2 in a group of its own (ALL OF)').click();
    e.byLabel<HTMLButtonElement>('Ungroup condition 2: its one condition in its place').click();
    await e.flush();
    expect(JSON.stringify(await e.body())).toBe(JSON.stringify(MH)); // every edit undone: the card's own text
    e.byLabel<HTMLButtonElement>('Remove condition 4').click();
    await e.flush();
    const want = copy();
    (ph(want, 'earlySigns').enter as { all: Rec[] }).all.pop();
    expect(JSON.stringify(await e.body())).toBe(JSON.stringify(want));
    expect(document.activeElement?.closest('[data-node]')?.getAttribute('data-node')).toBe('/all/2');
  });

  it('where a phase leads: reordered, removed, added; a phase nothing leads to is the builder\'s warning on it', async () => {
    const e = await open();
    e.phase('Early signs');
    e.byLabel<HTMLButtonElement>('Move Treated up').click();
    await e.flush();
    expect(ph(await e.body(), 'earlySigns').next).toEqual(['treated', 'established', 'arrest']);
    e.phase('Treated');
    e.byLabel<HTMLButtonElement>('Remove Recovering from the list').click();
    await e.flush();
    expect(ph(await e.body(), 'treated').next).toEqual(['arrest']);
    const rec = (MH.phases as Rec[]).findIndex((p) => p.id === 'recovering');
    const warn = `The builder warns: /phases/${rec}: no phase leads to Recovering: the case never enters it`;
    expect(e.all('.sb-phases li').find((x) => x.textContent?.startsWith('Recovering'))?.querySelector('.sb-warnline')?.textContent).toBe(warn);
    expect(e.all('.sb-checks li.warn').map((x) => x.textContent)).toContain(`The builder: /phases/${rec}: no phase leads to Recovering: the case never enters itShow`);
    e.set(e.byLabel<HTMLSelectElement>('Add a phase it may lead to'), 'recovering');
    e.all<HTMLButtonElement>('button').find((x) => x.textContent === 'Add to the list')!.click();
    await e.flush();
    expect(ph(await e.body(), 'treated').next).toEqual(['arrest', 'recovering']);
    expect(e.all('.sb-checks li.warn')).toHaveLength(0);
  });

  it('the validator\'s refusals show at the rule node and the next row they name, and Show opens the phase', async () => {
    const bad = copy();
    ((ph(bad, 'earlySigns').enter as { all: Array<{ value: Rec }> }).all[0]!.value).var = 'cp:midazolam';
    ph(bad, 'earlySigns').next = ['establshed', 'treated', 'arrest'];
    const e = await open(bad);
    await e.flush();
    expect(e.q('.sb-checks li').textContent).toMatch(/^The validator refuses this draft: 2 refusals/);
    // the phase opened is Latent: Early signs' entry in the list carries both lines
    const entry = e.all('.sb-phases li').find((x) => x.textContent?.startsWith('Early signs'))!;
    expect(entry.querySelector('.sb-dot')?.className).toBe('sb-dot bad');
    expect(entry.querySelectorAll('.sb-refuse')).toHaveLength(2);
    e.all<HTMLButtonElement>('.sb-checks li.bad button')[0]!.click();
    await wait(0);
    expect(e.q('#sb-phase-h').textContent).toContain('Early signs');
    const leaf = e.q('[data-node="/all/0"]');
    expect(leaf.querySelector('.sb-refuse')?.textContent).toMatch(/^The validator refuses: \/phases\/2\/enter\/all\/0\/value\/var: cp:midazolam: the engine models midazolam only as an effect curve/);
    expect(leaf.querySelector('select')?.getAttribute('aria-invalid')).toBe('true');
    expect(leaf.querySelector<HTMLSelectElement>('select')!.selectedOptions[0]!.textContent).toBe('not in this list');
    const rows = e.all<HTMLSelectElement>('.sb-next select');
    expect(rows.map((r) => r.getAttribute('aria-invalid'))).toEqual(['true', null, null]);
    expect(e.q('.sb-next li').textContent).toContain('establshed');
    // fixed from the lists: no refusal left
    e.set(rows[0]!, 'established');
    await e.flush();
    e.set(e.q<HTMLSelectElement>('[data-node="/all/0"] select'), 'cp:propofol');
    await e.flush();
    expect(e.q('.sb-checks li').textContent).toMatch(/^The validator accepts this draft/);
  });

  it('a rename follows every mention; a taken id is not applied', async () => {
    const e = await open();
    e.phase('Treated');
    const id = e.all<HTMLInputElement>('.sb-phase input').find((x) => x.value === 'treated')!;
    e.set(id, 'latent');
    id.dispatchEvent(new Event('change'));
    expect(e.q('.sb-idwhy').textContent).toBe('Not renamed: another phase has this id. The phase keeps its id.');
    e.set(id, 'onDantrolene');
    id.dispatchEvent(new Event('change'));
    await e.flush();
    const got = JSON.stringify(await e.body());
    expect(got).not.toContain('"treated"');
    expect(got).not.toContain('phase:treated');
    const ids = (t: string, id: string) => t.match(new RegExp(`"(phase:)?${id}"`, 'g'))?.length ?? 0;
    expect(ids(got, 'onDantrolene')).toBe(ids(JSON.stringify(MH), 'treated'));
    expect(e.q('.sb-checks li').textContent).toMatch(/^The validator accepts this draft/);
  });

  it('a new phase: Add waits for a label, an id of its own and its condition\'s numbers; then it is the card\'s, reached from the phase open', async () => {
    const e = await open();
    e.phase('Established');
    e.byLabel<HTMLButtonElement>('Add a phase').click();
    const ok = e.all<HTMLButtonElement>('.sb-phase button').find((x) => x.textContent === 'Add the phase')!;
    expect(ok.disabled).toBe(true);
    const label = e.q<HTMLInputElement>('.sb-phase input[type="text"]');
    e.set(label, 'Hyperkalaemia');
    expect(e.all<HTMLInputElement>('.sb-phase input[type="text"]')[1]!.value).toBe('hyperkalaemia');
    e.set(e.byLabel<HTMLSelectElement>('The new phase’s first condition: what it reads'), 'k');
    expect(ok.disabled).toBe(true);
    e.set(e.byLabel('The new phase’s first condition: threshold'), '6');
    expect(ok.disabled).toBe(false);
    ok.click();
    await e.flush();
    const d = await e.body();
    expect((d.phases as Rec[]).at(-1)).toEqual({ id: 'hyperkalaemia', label: 'Hyperkalaemia', enter: { value: { var: 'k', op: '>', value: 6 } } });
    expect(ph(d, 'established').next).toEqual(['treated', 'arrest', 'hyperkalaemia']);
    expect(e.q('#sb-phase-h').textContent).toContain('Hyperkalaemia');
    expect(e.q('.sb-checks li').textContent).toMatch(/^The validator accepts this draft/);
  });
});
