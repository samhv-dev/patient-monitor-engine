// @vitest-environment happy-dom
// The builder's Actions section (piece B4, mock-up 03-action-editor) on the MH card: every action opened and read, nothing
// changed, is the card's own bytes in the store and in Export; dantrolene's criteria, window, conditional repeat,
// violation and press are read back from the controls, with Instructor v2's row and grade()'s examples beside them; an
// edit changes only its own number; a number the schema refuses is not written; a new violation, a new press command (the
// Drug sheet's own command, proved against the sheet), a precondition and a new action are written only complete; a
// change of kind asks for the new kind's criteria; the validator's lines show at the field they name.
import { ScenarioView, type AckResult, type CommandInput } from '@pme/controller';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bolus, infusion } from '../../physiology-console/actions.ts';
import type { Link } from '../link.ts';
import { asFactory, MemoryIDB } from '../memory-idb.ts';
import { MemoryStorage } from '../memory-storage.ts';
import mhCard from '../showcase/showcase-mh-v2.json';
import { Cache } from '../teach2/cache.ts';
import { drugSheet } from '../teach2/drug-sheet.ts';
import { sheetFrame } from '../teach2/sheet.ts';
import { cardFileText } from './card-file.ts';
import { CHECK_DELAY_MS } from './checks.ts';
import { Drafts, type Body } from './drafts.ts';
import { builderPage, SAVE_DELAY_MS } from './page.ts';

type Rec = Record<string, unknown>;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const settled = () => wait(Math.max(CHECK_DELAY_MS, SAVE_DELAY_MS) + 60);
const MH: Rec = { ...(mhCard as unknown as Rec), id: 'mh-mine' };
const copy = (): Rec => JSON.parse(JSON.stringify(MH)) as Rec;
const act = (d: Rec, id: string) => (d.actions as Rec[]).find((a) => a.id === id)!;
const DAN = (MH.actions as Rec[]).findIndex((a) => a.id === 'dantrolene');

describe('the action editor (B4)', () => {
  let b: { idb: MemoryIDB; ls: MemoryStorage };
  beforeEach(() => {
    b = { idb: new MemoryIDB(), ls: new MemoryStorage() };
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });
  afterEach(() => {
    document.body.replaceChildren();
    location.hash = '';
    vi.restoreAllMocks();
  });
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
    all<HTMLButtonElement>('.sb-out').find((x) => x.textContent?.startsWith('Actions'))!.click();
    const action = (label: string) => all<HTMLButtonElement>('.sb-actions .sb-out').find((x) => x.querySelector('.sb-pl')?.textContent === label)!.click();
    const byLabel = <T extends HTMLElement = HTMLInputElement>(label: string) => q<T>(`[aria-label="${label}"]`);
    const set = (el: HTMLInputElement | HTMLSelectElement, v: string) => {
      el.value = v;
      el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input'));
    };
    const tick = (el: HTMLInputElement) => el.click();
    const press = (text: string) => all<HTMLButtonElement>('button').find((x) => x.textContent === text)!.click();
    const body = async () => (await s.body(m.id)) as unknown as Rec;
    const flush = async () => {
      await wait(0);
      await settled();
    };
    return { p, s, id: m.id, all, q, action, byLabel, set, tick, press, body, flush };
  };

  it('every action opened and read, nothing changed: the stored draft and Export are the card\'s own bytes', async () => {
    const got: string[] = [];
    vi.spyOn(URL, 'createObjectURL').mockImplementation((x) => (void (x as Blob).text().then((t) => got.push(t)), 'blob:test/0'));
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const e = await open();
    expect(e.all('.sb-out').find((x) => x.textContent?.startsWith('Actions'))!.textContent).toBe(`Actions${(MH.actions as unknown[]).length} (warning)`); // the calcium press (below)
    for (const a of MH.actions as Rec[]) {
      e.action(String(a.label));
      expect(e.q('#sb-action-h').textContent).toContain(String(a.label));
    }
    await e.flush();
    expect(JSON.stringify(await e.body())).toBe(JSON.stringify(MH));
    expect(e.q('.sb-checks li').textContent).toMatch(/^The validator accepts this draft/);
    e.all<HTMLButtonElement>('.sb-acts button').find((x) => x.textContent === 'Export file')!.click();
    for (let i = 0; i < 40 && !got.length; i++) await wait(5);
    expect(got).toEqual([cardFileText(MH)]);
  });

  it('dantrolene read back: identity, dose, cumulative, routes with their modelled state, the window, the repeat, the violation, the press, the row and grade()\'s examples', async () => {
    const e = await open();
    e.action('Dantrolene 2.5 mg/kg');
    expect(e.byLabel<HTMLSelectElement>('Kind').value).toBe('drug');
    expect(e.byLabel<HTMLSelectElement>('Drug: identified by').value).toBe('id');
    expect(e.byLabel<HTMLSelectElement>('Drug: which drug').value).toBe('dantrolene');
    expect(['the value', 'the lowest accepted', 'the highest accepted'].map((x) => e.byLabel(`Dose: ${x}`).value)).toEqual(['2.5', '2', '3']);
    expect(e.byLabel<HTMLSelectElement>('Dose: unit').value).toBe('mg/kg');
    expect(e.byLabel('Cumulative: the highest accepted').value).toBe('10');
    const routes = e.all('.sb-route').map((x) => `${x.querySelector('input')!.checked ? '✓' : '·'} ${x.textContent}`);
    expect(routes.slice(0, 4)).toEqual(['✓ IVmodelled', '· IOmodelled', '· IMmodelled: no systemic effect', '· inhalednot modelled']);
    expect(routes[7]).toBe('✓ central linemodelled');
    expect(e.byLabel<HTMLSelectElement>('Route: preferred').value).toBe('iv');
    expect(e.byLabel<HTMLSelectElement>('Window: opens at').value).toBe('action');
    expect(e.byLabel<HTMLSelectElement>('Window: which').value).toBe('callCrisis');
    expect(e.byLabel('Window: within how many seconds').value).toBe('300');
    expect(e.byLabel<HTMLSelectElement>('Repeat: how').value).toBe('repeatWhile');
    expect(e.q('[data-rule="/actions/8/repeatWhile/rule"] .sb-says').textContent).toBe('Instructor v2 reads: after Recrudescence');
    expect(e.byLabel('Violation 1: what it says').value).toMatch(/^Dantrolene IM: no effect on the MH/);
    expect(e.byLabel<HTMLInputElement>('Violation 1: by the route IM').checked).toBe(true);
    expect(e.byLabel('Press, command 1: the dose of Dantrolene').value).toBe('2.5');
    const pv = e.q('.sb-preview').textContent!;
    expect(pv).toContain('Dantrolene 2.5 mg/kg2–3 mg/kg · IV/CENTRAL · within 5 min of the "callCrisis" action · again every 5–10 min while after recrudescence');
    expect(pv).toContain('reads “due 5:00” when it opens');
    const ex = e.all('.sb-ex').map((x) => x.textContent);
    expect(ex).toHaveLength(7);
    expect(ex[3]).toBe('The same dose central line (allowed, not preferred) · 1:00 after it openeddeviation: route central, iv preferred');
    expect(ex[4]).toBe('The same dose IM (outside the route set) · 1:00 after it openeddue 3:59route im not allowedViolation: Dantrolene IM: no effect on the MH, and the solution (pH about 9.5) injures the tissue (harm not modelled)');
  });

  it('edits in place: the highest dose tightened and central taken out change only those; a refused number is not written', async () => {
    const e = await open();
    e.action('Dantrolene 2.5 mg/kg');
    e.set(e.byLabel('Dose: the highest accepted'), '2.8');
    e.tick(e.q<HTMLInputElement>('[data-route="central"]'));
    await e.flush();
    const want = copy();
    const d = act(want, 'dantrolene').drug as Rec;
    (d.dose as Rec).max = 2.8;
    (d.route as Rec).set = ['iv'];
    expect(JSON.stringify(await e.body())).toBe(JSON.stringify(want));
    // a dose of 0, a tolerance with no value left, a fail-after time inside the window: not written, each says why
    e.set(e.byLabel('Dose: the value'), '0');
    expect(e.byLabel('Dose: the value').getAttribute('aria-invalid')).toBe('true');
    expect(e.q('[data-section="actions"]').textContent).toContain('a dose is more than 0: not written, the card keeps 2.5 mg/kg, accepted 2–2.8');
    e.set(e.byLabel('Window: failed after how many seconds (optional)'), '200');
    expect(e.q('[data-section="actions"]').textContent).toContain('more than the window, 300 s');
    await e.flush();
    expect(JSON.stringify(await e.body())).toBe(JSON.stringify(want));
    // grade()'s example follows the edit: central is now outside the route set
    expect(e.all('.sb-ex').map((x) => x.textContent).find((x) => x?.startsWith('The same dose'))).toMatch(/^The same dose IM \(outside the route set\)/);
  });

  it('a violation and a press command are added only complete; the command is the Drug sheet\'s own', async () => {
    const e = await open();
    e.action('Dantrolene 2.5 mg/kg');
    e.press('Add a violation');
    const add = () => e.all<HTMLButtonElement>('button').find((x) => x.textContent === 'Add the violation')!;
    expect(add().disabled).toBe(true);
    e.set(e.byLabel('New violation: what the line says'), 'Dantrolene by a central line given too fast');
    expect(add().disabled).toBe(false); // the drug is the action's
    add().click();
    e.press('Add from the Drug sheet');
    expect(e.byLabel<HTMLSelectElement>('New command: what').value).toBe('drug:dantrolene');
    e.all<HTMLButtonElement>('button').find((x) => x.textContent === '2.5 mg/kg')!.click();
    e.press('Add to the press');
    e.press('Add from the Drug sheet');
    e.set(e.byLabel<HTMLSelectElement>('New command: what'), 'drug:propofol');
    e.set(e.byLabel<HTMLSelectElement>('New command: given as'), 'infusion');
    e.set(e.byLabel('New command: the rate'), '120');
    e.press('Add to the press');
    await e.flush();
    const a = act(await e.body(), 'dantrolene');
    expect((a.contraindications as Rec[])[1]).toEqual({ text: 'Dantrolene by a central line given too fast', match: { drugId: 'dantrolene' } });
    expect((a.give as Rec[]).slice(1)).toEqual([bolus('dantrolene', 2.5, 'mg/kg'), infusion('propofol', 120, 'mcg/kg/min')]);
    expect(e.q('.sb-checks li').textContent).toMatch(/^The validator accepts this draft/);

    // the Drug sheet itself, on a stand-in link: its Give sends exactly these commands
    const sent: CommandInput[] = [];
    const OK: AckResult = { accepted: true, tick: 0, commandId: 'c', rttMs: 0 };
    const sv = new ScenarioView();
    const link = { ctl: { scenario: sv, bookmarks: [], simT: 0, send: async () => OK, state: null, hostPaused: false }, host: null, simT: 0, log: [], send: async (c: CommandInput) => (sent.push(structuredClone(c)), OK), note: () => undefined } as unknown as Link;
    const frame = sheetFrame({ id: 'drug', name: 'Drug', hint: '', onClose: () => undefined });
    const sheet = drugSheet(frame, { link, weightKg: () => 80, cache: new Cache(link) });
    frame.open();
    document.body.append(frame.el);
    const pick = (id: string) => {
      frame.el.querySelector<HTMLButtonElement>('[data-group="all"]')?.click();
      frame.left.querySelector<HTMLButtonElement>(`.ip2-pick[data-key="drug:${id}"]`)!.click();
    };
    pick('dantrolene');
    sheet.give();
    pick('propofol');
    frame.right.querySelector<HTMLButtonElement>('[role="radio"][data-v="infusion"], .ip2-seg button:nth-child(2)')!.click();
    const dose = frame.right.querySelector<HTMLInputElement>('.ip2-stepper input')!;
    dose.value = '120';
    dose.dispatchEvent(new Event('input'));
    sheet.give();
    await wait(0);
    expect(sent).toEqual([bolus('dantrolene', 2.5, 'mg/kg'), infusion('propofol', 120, 'mcg/kg/min')]);
  });

  it('a precondition, a repeat and a window are written only complete', async () => {
    const e = await open();
    e.action('Potassium: insulin 10 U with dextrose');
    e.press('Add a precondition');
    const use = () => e.all<HTMLButtonElement>('button').find((x) => x.textContent === 'Add')!;
    expect(use().disabled).toBe(true);
    e.set(e.byLabel('The precondition: threshold'), '5.5');
    e.set(e.byLabel<HTMLSelectElement>('The precondition: what it reads'), 'k');
    use().click();
    e.set(e.byLabel<HTMLSelectElement>('Repeat: how'), 'repeat');
    const setR = () => e.all<HTMLButtonElement>('button').find((x) => x.textContent === 'Set the repeat')!;
    expect(setR().disabled).toBe(true);
    e.set(e.byLabel('New repeat: interval, seconds: the highest accepted'), '900'); // a highest alone: a repeat needs its shortest
    expect(setR().disabled).toBe(true);
    e.set(e.byLabel('New repeat: interval, seconds: the lowest accepted'), '600');
    setR().click();
    await e.flush();
    const a = act(await e.body(), 'insulin');
    expect(a.precondition).toEqual({ value: { var: 'k', op: '>', value: 5.5 } });
    expect(a.repeat).toEqual({ intervalS: { max: 900, min: 600 } });
    expect(Object.keys(a).slice(-2)).toEqual(['precondition', 'repeat']);
    expect(e.q('.sb-checks li').textContent).toMatch(/^The validator accepts this draft/);
    // the window removed: recorded, not timed; added back from its form
    e.press('Remove the window');
    e.press('Add a window');
    e.set(e.byLabel<HTMLSelectElement>('New window: opens at'), 'phase');
    e.set(e.byLabel<HTMLSelectElement>('New window: which'), 'established');
    const addW = () => e.all<HTMLButtonElement>('button').find((x) => x.textContent === 'Add the window')!;
    expect(addW().disabled).toBe(true);
    e.set(e.byLabel('New window: within how many seconds'), '240');
    addW().click();
    await e.flush();
    expect(act(await e.body(), 'insulin').window).toEqual({ anchor: 'phase:established', withinS: 240 });
  });

  it('a new action waits for its title, its id and its kind\'s criteria; a change of kind asks for the new criteria', async () => {
    const e = await open();
    e.press('Add an action');
    const add = () => e.all<HTMLButtonElement>('button').find((x) => x.textContent === 'Add the action')!;
    expect(add().disabled).toBe(true);
    e.set(e.q<HTMLInputElement>('.sb-phase .sb-row input'), 'Furosemide');
    expect(add().disabled).toBe(true); // no drug yet
    e.set(e.byLabel<HTMLSelectElement>('New action: the drug'), 'furosemide');
    e.set(e.byLabel<HTMLSelectElement>('New action: open in'), 'treated');
    add().click();
    await e.flush();
    expect((await e.body()).actions as Rec[]).toContainEqual({ id: 'furosemide', label: 'Furosemide', kind: 'drug', phases: ['treated'], drug: { id: 'furosemide' } });
    expect(e.q('#sb-action-h').textContent).toContain('Furosemide');
    // a communication made a device: the device and its setting first
    e.action('Name malignant hyperthermia from the monitor: EtCO₂ rising at unchanged ventilation when it should be falling (42 → 45; without MH it settles 36–39) with a rising heart rate (64 → 80, blunted by fentanyl) (instructor-assessed)');
    e.set(e.byLabel<HTMLSelectElement>('Kind'), 'device');
    await wait(0);
    const ch = () => e.all<HTMLButtonElement>('button').find((x) => x.textContent === 'Change the kind')!;
    expect(ch().disabled).toBe(true);
    e.set(e.byLabel('The new kind’s criteria: the setting’s value'), '12');
    ch().click();
    await e.flush();
    const a = act(await e.body(), 'nameMh');
    expect([a.kind, a.device]).toEqual(['device', { kind: 'ventilation', settings: { rr: { value: 12 } } }]);
    expect(e.q('.sb-checks li').textContent).toMatch(/^The validator accepts this draft/);
  });

  it('the validator\'s lines show at the field they name; the builder\'s warning on the calcium press at its press', async () => {
    const bad = copy();
    (act(bad, 'dantrolene').drug as Rec).route = { set: ['iv', 'inh'] };
    act(bad, 'calcium').window = { anchor: 'action:nobody', withinS: 300 };
    // a planted refusal cannot be imported, so the draft is made valid first and broken through the store's own body
    const e = await open(bad);
    await e.flush();
    e.action('Dantrolene 2.5 mg/kg');
    await e.flush();
    void DAN;
    const route = e.q('[data-section="actions"]').textContent!;
    expect(route).toContain('The validator warns: /actions/8/drug/route/set/1: dantrolene: route inh is judged; the engine does not model it');
    expect(e.all('.sb-checks li.bad').map((x) => x.textContent)).toContain('/actions/11/window/anchor: no action "nobody"Show');
    e.all<HTMLButtonElement>('.sb-checks li.bad button').find((x) => x.getAttribute('aria-label')?.startsWith('Show /actions/11'))!.click();
    expect(e.q('#sb-action-h').textContent).toContain('Potassium: calcium chloride 10 mg/kg');
    expect(e.byLabel<HTMLSelectElement>('Window: which').getAttribute('aria-invalid')).toBe('true');
    // the builder's own warnings read grade(), which reads only a card the validator accepts: the anchor mended first
    e.set(e.byLabel<HTMLSelectElement>('Window: which'), 'callCrisis');
    await e.flush();
    expect(e.all('.sb-checks li.bad')).toHaveLength(0);
    expect(e.q('[data-section="actions"]').textContent).toContain('The builder warns: /actions/11/give: the press as written is graded deviation by grade(), not met: route iv, central preferred');
  });
});
