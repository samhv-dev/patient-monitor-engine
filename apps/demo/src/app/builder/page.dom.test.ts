// @vitest-environment happy-dom
// The builder's page (piece B2, mock-up 01-builder-main): a /2 library card opens as a copy with an id of its own; the
// Header, Patient and Briefing sections edit the form and the card is written through docOf (an untouched field keeps
// its place, an emptied optional field is gone); the validator's refusal shows on the field it names, a take-home line's
// on that row, with the checks column's count and Export waiting; the builder refuses a library card's id; every
// change is saved in this browser and a new page over the same browser (a reload) finds it; a snapshot restores and the
// draft it replaced is kept; Export writes exactly docOf's bytes; Import refuses a file the validator refuses.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { asFactory, MemoryIDB } from '../memory-idb.ts';
import { MemoryStorage } from '../memory-storage.ts';
import mh from '../showcase/showcase-mh-v2.json';
import { cardFileText } from './card-file.ts';
import { CHECK_DELAY_MS } from './checks.ts';
import { Drafts } from './drafts.ts';
import { builderPage, SAVE_DELAY_MS } from './page.ts';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const settled = () => wait(Math.max(CHECK_DELAY_MS, SAVE_DELAY_MS) + 60);

function downloads() {
  const got: Array<{ name: string; blob: Blob }> = [];
  const blobs = new Map<string, Blob>();
  vi.spyOn(URL, 'createObjectURL').mockImplementation((b) => {
    const u = `blob:test/${blobs.size}`;
    blobs.set(u, b as Blob);
    return u;
  });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    got.push({ name: this.download, blob: blobs.get(this.getAttribute('href') ?? '') as Blob });
  });
  return got;
}

describe('the scenario builder page (B2)', () => {
  let b: { idb: MemoryIDB; ls: MemoryStorage };
  const store = () => new Drafts(() => b.ls, () => asFactory(b.idb));
  beforeEach(() => {
    b = { idb: new MemoryIDB(), ls: new MemoryStorage() };
  });
  afterEach(() => {
    document.body.replaceChildren();
    location.hash = '';
    vi.restoreAllMocks();
  });
  const mount = async (s = store(), sub = '') => {
    const p = builderPage(s);
    document.body.append(p.el);
    await p.enter(sub);
    const q = <T extends Element = HTMLElement>(sel: string) => p.el.querySelector<T>(sel);
    const field = (label: string) => [...p.el.querySelectorAll<HTMLElement>('.sb-page .field')].find((f) => f.querySelector('label, span')?.textContent === label)!;
    const control = (label: string) => field(label).querySelector<HTMLInputElement>('input, select, textarea')!;
    const type = (label: string, v: string) => {
      const c = control(label);
      c.value = v;
      c.dispatchEvent(new Event(c.tagName === 'SELECT' ? 'change' : 'input'));
    };
    const outline = (name: string) => [...p.el.querySelectorAll<HTMLButtonElement>('.sb-out')].find((x) => x.textContent?.startsWith(name))!;
    return { p, s, q, field, control, type, outline };
  };
  /** Open a copy of a library card from the start page; returns the draft's id. */
  const copy = async (title: RegExp) => {
    const { p, s } = await mount();
    const btn = [...p.el.querySelectorAll<HTMLButtonElement>('.sb-start button')].find((x) => title.test(x.getAttribute('aria-label') ?? ''))!;
    btn.click();
    for (let i = 0; i < 20 && !location.hash.startsWith('#/scenarios/builder/'); i++) await wait(5);
    const id = location.hash.split('/').at(-1)!;
    p.el.remove();
    return { id, s };
  };

  it('the start page: no drafts yet, the /2 library cards to copy, Import; a copy gets its own id and opens', async () => {
    const { p, q } = await mount();
    expect(q('.sb-drafts')?.textContent).toContain('No drafts in this browser yet');
    expect([...p.el.querySelectorAll('.sb-start button')].map((x) => x.getAttribute('aria-label'))).toEqual(['Open a copy of Malignant hyperthermia (phases)', 'Open a copy of Class IV haemorrhage, PEA and resuscitation (phases)']);
    p.el.remove();
    const { id, s } = await copy(/Malignant/);
    expect(s.get(id)).toMatchObject({ cardId: 'showcase-mh-v2-copy', title: 'Malignant hyperthermia (phases)', from: 'a copy of the library card showcase-mh-v2' });
    const e = await mount(s, id);
    expect(e.q('#scen-edit-h')?.textContent).toBe('Scenario builder');
    expect(e.p.headingId()).toBe('scen-edit-h');
    expect(e.q('.sb-card')?.textContent).toBe('Malignant hyperthermia (phases) · showcase-mh-v2-copy · a copy of the library card showcase-mh-v2 · draft, not signed');
    expect(e.control('Card id').value).toBe('showcase-mh-v2-copy');
    expect(e.q('.sb-save')?.textContent).toMatch(/^This browser · saved \d\d:\d\d:\d\d$/);
    // B3 edits the phases, B5 the script, outcomes, debrief hints and handout questions: each a section of the outline,
    // a list with its count, and no block is left "kept as the card has it"
    expect(e.outline('Phases')?.textContent).toBe(`Phases${mh.phases.length}`);
    expect(['Script', 'Outcomes', 'Debrief hints', 'Handout questions'].map((n) => e.outline(n)?.textContent)).toEqual([`Script${mh.script.length}`, 'Outcomes0', 'Debrief hints', 'Handout questions0']);
    expect([...e.p.el.querySelectorAll('.sb-outline h2')].map((x) => x.textContent)).toEqual(['Card', 'Course', 'The team', 'Debrief']);
    expect(e.q('.sb-checks li')?.textContent).toMatch(/^The validator accepts this draft/);
    expect((e.q<HTMLButtonElement>('.sb-acts button'))?.disabled).toBe(false);
  });

  it('an edit is written through docOf in place and saved; a new page over the same browser (a reload) finds it', async () => {
    const { id, s } = await copy(/Malignant/);
    const e = await mount(s, id);
    e.type('Title', 'MH, my version');
    e.outline('Patient and sensors').click();
    e.type('Age, years', '52');
    e.type('Capnograph', '');
    await settled();
    expect(e.q('.sb-save')?.textContent).toMatch(/saved \d\d:\d\d:\d\d$/);
    const want = { ...mh, id: 'showcase-mh-v2-copy', title: 'MH, my version', patient: { ...mh.patient, ageY: 52, sensors: { ...mh.patient.sensors } } } as typeof mh;
    delete (want.patient.sensors as Record<string, string>).co2;
    expect(JSON.stringify(await s.body(id))).toBe(JSON.stringify(want)); // same keys, same order: only the edits moved
    e.p.el.remove();
    const again = await mount(store(), id); // the reload: a new store and a new page over this browser
    expect(again.control('Title').value).toBe('MH, my version');
    again.outline('Patient and sensors').click();
    expect(again.control('Age, years').value).toBe('52');
    expect(again.control('Capnograph').value).toBe('');
  });

  it('a refusal shows on its field, a take-home line\'s on its row; the checks count them and Export waits; the builder refuses a library id', async () => {
    const { id, s } = await copy(/Malignant/);
    const e = await mount(s, id);
    e.type('Title', '');
    const line = e.p.el.querySelectorAll<HTMLInputElement>('.sb-takehome input')[2]!;
    line.value = '';
    line.dispatchEvent(new Event('input'));
    e.type('Card id', 'showcase-mh-v2');
    await settled();
    expect(e.field('Title').querySelector('.sb-refuse')?.textContent).toBe('The validator refuses: /title: must NOT have fewer than 1 characters');
    expect(e.control('Title').getAttribute('aria-invalid')).toBe('true');
    expect(e.field('Card id').querySelector('.sb-refuse')?.textContent).toBe('The builder refuses: /id: a library card has the id "showcase-mh-v2"; a copy needs an id of its own (Instructor v2 does not open a card file with a library card’s id)');
    const rows = [...e.p.el.querySelectorAll<HTMLInputElement>('.sb-takehome input')];
    expect(rows.map((r) => r.getAttribute('aria-invalid'))).toEqual([null, null, 'true', null]);
    expect(e.q('.sb-takehome .sb-refuse')?.textContent).toBe('The validator refuses: /takeHome/2: must NOT have fewer than 1 characters');
    expect(e.q('.sb-checks li')?.textContent).toMatch(/^The validator refuses this draft: 3 refusals/);
    expect(e.outline('Header and story').querySelector('.sb-dot')?.className).toBe('sb-dot bad');
    const exp = e.q<HTMLButtonElement>('.sb-acts button')!;
    expect(exp.disabled).toBe(true);
    // the take-home list stops at the schema's four lines; the add button is back once a line goes
    expect([...e.p.el.querySelectorAll<HTMLButtonElement>('.sb-takehome button')].at(-1)?.disabled).toBe(true);
    // fixed again: no refusal left
    e.type('Title', 'MH');
    e.type('Card id', 'mh-mine');
    rows[2]!.value = 'Line three';
    rows[2]!.dispatchEvent(new Event('input'));
    await settled();
    expect(e.p.el.querySelectorAll('.sb-edit .sb-refuse')).toHaveLength(0);
    expect(exp.disabled).toBe(false);
  });

  it('a card with no briefing: writing one makes the block, emptying it takes the block away', async () => {
    const { id, s } = await copy(/haemorrhage/);
    const e = await mount(s, id);
    e.outline('Case briefing').click();
    expect(e.control('Briefing').value).toBe('');
    e.type('Briefing', 'You are the resident in theatre.');
    await settled();
    expect((await s.body(id))?.briefing).toEqual({ text: 'You are the resident in theatre.' });
    expect(e.q('.sb-count')?.textContent).toBe('32 of 4000 characters');
    e.type('Briefing', '');
    await settled();
    expect(await s.body(id)).not.toHaveProperty('briefing');
  });

  it('a snapshot restores; the draft it replaced is kept as the newest snapshot', async () => {
    const { id, s } = await copy(/Malignant/);
    const e = await mount(s, id);
    e.type('Title', 'Changed');
    await settled();
    const restore = e.p.el.querySelector<HTMLButtonElement>('button[aria-label="Restore snapshot 1"]')!;
    expect(restore.closest('li')?.textContent).toMatch(/^Snapshot 1 · \d\d:\d\d · a copy of the library card showcase-mh-v2/);
    restore.click();
    for (let i = 0; i < 40 && e.control('Title').value !== 'Malignant hyperthermia (phases)'; i++) await wait(5);
    expect(e.control('Title').value).toBe('Malignant hyperthermia (phases)');
    expect((await s.body(id))?.title).toBe('Malignant hyperthermia (phases)');
    expect(s.get(id)?.snapshots.map((x) => x.why)).toEqual(['opened', 'before restoring 1']);
    expect((await s.snapshotBody(id, 2))?.title).toBe('Changed');
    expect(e.p.el.querySelector('.sb-checks ul[aria-label="Snapshots in this browser"] li:nth-child(2)')?.textContent).toMatch(/^Snapshot 2 · \d\d:\d\d · before snapshot 1 was restored/);
  });

  it('Export writes exactly the bytes docOf produces, as <id>.json, and keeps a snapshot', async () => {
    const got = downloads();
    const { id, s } = await copy(/Malignant/);
    const e = await mount(s, id);
    e.type('Title', 'Exported');
    e.q<HTMLButtonElement>('.sb-acts button')!.click();
    for (let i = 0; i < 40 && !got.length; i++) await wait(5);
    expect(got.map((g) => g.name)).toEqual(['showcase-mh-v2-copy.json']);
    const text = await got[0]!.blob.text();
    expect(text).toBe(cardFileText({ ...mh, id: 'showcase-mh-v2-copy', title: 'Exported' }));
    for (let i = 0; i < 40 && (s.get(id)?.snapshots.length ?? 0) < 2; i++) await wait(5);
    expect(s.get(id)?.snapshots.map((x) => x.why)).toEqual(['opened', 'export']);
  });

  it('Import: a file the validator refuses is not opened and says why; a good one becomes a draft', async () => {
    const { p, q } = await mount();
    const input = q<HTMLInputElement>('#sb-import')!;
    const give = async (name: string, text: string) => {
      Object.defineProperty(input, 'files', { value: [new File([text], name, { type: 'application/json' })], configurable: true });
      input.dispatchEvent(new Event('change'));
      for (let i = 0; i < 40; i++) await wait(5);
    };
    await give('bad.json', JSON.stringify({ ...mh, title: '' }));
    expect(q('.sb-import-err')?.textContent).toBe('bad.json was not opened: the validator refuses it./title: must NOT have fewer than 1 characters');
    expect(location.hash).toBe('');
    await give('mine.json', cardFileText({ ...mh, id: 'mine' }));
    expect(location.hash).toMatch(/^#\/scenarios\/builder\/d/);
    p.el.remove();
  });
});
