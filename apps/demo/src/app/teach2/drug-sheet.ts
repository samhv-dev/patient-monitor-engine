// Instructor v2, the Drug sheet (design §4.1, board "Proposal v11"; plan IP7; answers 10, 11, 16). Groups MH kit,
// Vasoactive, Induction, Arrest, Fluids and All. Left (read): the search (drugs.ts `findDrugs`), the card's open steps
// that give a drug, pinned at the top ("card step n", "due" while a timer runs), the group's items, the running
// infusions, the recent gives. Right (set): the chosen item, its dose per kg and the total for the patient's weight
// (`perKg`), how long it is given over, the presets, a line on what the model will do (only where the model docs give a
// measured figure), and "Add to the cache for staged delivery". Footer: Deliver bottom left (sheets.ts), Give bottom
// right.
//
// What each press sends is today's (plan's hard constraint): Give for a drug, a fluid, the vaporiser and the bleed
// sends exactly the command today's Drugs & fluids tab (panel/drugs.ts `drugsTab`) sends for it, with its toast; a
// pinned card step presses the step (teach2/press.ts `pressStep`, the card's own dose and route: answer 10's
// uncontested half). A typed dose that differs from the pinned step's is ruled by `pinnedGiveRule` below (INTERIM).
import type { ClinicalEvent, CommandInput, ScenarioDoc } from '@pme/controller';
import { bleed, fluid, infusion, vaporiser } from '../../physiology-console/actions.ts';
import { describeCommand } from '../describe.ts';
import { DRUG_LIST, doseUnits, findDrugs, perKg, rateUnits, unitText, type DrugItem } from '../drugs.ts';
import { drugName } from '../glossary.ts';
import type { Link } from '../link.ts';
import { clock, h, seg, setText, stepper, toast } from '../ui.ts';
import type { Cache } from './cache.ts';
import { pressStep } from './press.ts';
import { classify } from './rows.ts';
import type { SheetFrame } from './sheet.ts';

export const DRUG_GROUPS: ReadonlyArray<[Group, string]> = [['mh', 'MH kit'], ['vaso', 'Vasoactive'], ['induction', 'Induction'], ['arrest', 'Arrest'], ['fluids', 'Fluids'], ['all', 'All']];
type Group = 'mh' | 'vaso' | 'induction' | 'arrest' | 'fluids' | 'all';

// Group membership: the MH kit as the MHAUS cart lists it (dantrolene, bicarbonate, calcium, insulin with dextrose,
// furosemide, an antiarrhythmic); the classes that move the pressure; induction and its reversal (plus the vaporiser);
// the ALS arrest drugs. A drug of no group is under All (and found by the search).
const MH_KIT = ['dantrolene', 'sodiumBicarbonate', 'calciumChloride', 'insulinDextrose', 'furosemide', 'amiodarone'];
const VASO = new Set(['alpha1', 'mixedAdrenergic', 'betaAgonist', 'vasopressin', 'pde3', 'vasodilator', 'betaBlocker']);
const INDUCTION = new Set(['hypnotic', 'opioid', 'benzodiazepine', 'ketamine', 'alpha2', 'nmb', 'depolariser', 'nmbReversal', 'anticholinesterase', 'anticholinergic']);
const ARREST = ['epinephrine', 'amiodarone', 'lidocaine', 'calciumChloride', 'magnesium', 'sodiumBicarbonate', 'atropine', 'adenosine', 'vasopressin', 'lipidEmulsion'];
const AGENTS: ReadonlyArray<[string, string]> = [['sevoflurane', 'Sevoflurane'], ['isoflurane', 'Isoflurane'], ['desflurane', 'Desflurane']];
const FLUIDS: ReadonlyArray<[string, string]> = [['crystalloid', 'Crystalloid'], ['colloid', 'Colloid'], ['blood', 'Blood']];

/**
 * "What the model will do", ONLY where the model docs give a measured figure for the drug (never an invented one).
 * Dantrolene: docs/model/endocrine-thermal.md, measured on the showcase-mh run.
 */
const MODEL_LINE: Readonly<Record<string, string>> = {
  dantrolene: 'Measured on the MH card (docs/model/endocrine-thermal.md): after dantrolene and doubled ventilation the heart rate falls from a peak of 169 to 114 at +20 min; dantrolene\'s own EtCO₂ effect at 10 min is −4.6 mmHg.',
};

/** A card step that gives a drug: an open step of the current stage whose target's onEnter gives this drug. */
export interface PinnedStep {
  /** The step's number in the ACTION list. */
  n: number;
  /** The step's manual label (what `pressStep` presses). */
  label: string;
  /** The state the step leads to, as the card names it. */
  toLabel: string;
  drugId: string;
  /** The card's own dose, unit and route for this drug. */
  dose: number;
  unit: string;
  route: string;
  /** A linked objective's timer runs ("due in m:ss" / "overdue m:ss"), else ''. */
  due: string;
}

export type Item =
  | { kind: 'drug'; key: string; drug: DrugItem }
  | { kind: 'step'; key: string; step: PinnedStep }
  | { kind: 'fluid'; key: string; fluid: string; name: string }
  | { kind: 'bleed'; key: string }
  | { kind: 'vaporiser'; key: string; agent: string; name: string };

const drugItem = (d: DrugItem): Item => ({ kind: 'drug', key: `drug:${d.id}`, drug: d });
const fluidItems = (): Item[] => [...FLUIDS.map(([f, name]): Item => ({ kind: 'fluid', key: `fluid:${f}`, fluid: f, name })), { kind: 'bleed', key: 'bleed' }];
const vapItems = (): Item[] => AGENTS.map(([agent, name]): Item => ({ kind: 'vaporiser', key: `vap:${agent}`, agent, name: `${name} vaporiser` }));
const DRUGS_ONLY = () => DRUG_LIST.filter((d) => d.cls !== 'volatile');
const byIds = (ids: readonly string[]) => ids.flatMap((id) => DRUG_LIST.filter((d) => d.id === id)).map(drugItem);

/** The items of a group, in the group's order (All: every drug by name, then the vaporisers and the fluids). */
export function itemsOf(g: Group): Item[] {
  if (g === 'mh') return byIds(MH_KIT);
  if (g === 'vaso') return DRUGS_ONLY().filter((d) => VASO.has(d.cls) && d.id !== 'salbutamol').map(drugItem);
  if (g === 'induction') return [...DRUGS_ONLY().filter((d) => INDUCTION.has(d.cls)).map(drugItem), ...vapItems()];
  if (g === 'arrest') return byIds(ARREST);
  if (g === 'fluids') return fluidItems();
  return [...DRUGS_ONLY().map(drugItem), ...vapItems(), ...fluidItems()];
}

const nameOf = (it: Item): string =>
  it.kind === 'drug' ? it.drug.name : it.kind === 'step' ? drugName(it.step.drugId) : it.kind === 'bleed' ? 'Blood loss (bleeding)' : it.name;

/** The card's open steps that give a drug, in the ACTION list's numbering (one entry per drug the step gives). */
export function pinnedSteps(link: Link): PinnedStep[] {
  const sv = link.ctl.scenario;
  const doc = sv.doc as ScenarioDoc | null;
  if (!doc || !sv.stateId) return [];
  const board = classify({
    doc, stateId: sv.stateId, history: sv.history, enteredT: sv.enteredT, simT: link.simT, inState: sv.timeInState(link.simT),
    paused: link.ctl.hostPaused, log: link.log, record: link.host?.record.data ?? null,
    values: link.ctl.state?.values as Partial<Record<string, number>> | undefined, holds: null, base: new Map(),
  });
  const out: PinnedStep[] = [];
  for (const live of board.list) {
    const r = live.row;
    if (r.kind !== 'step') continue;
    const to = doc.states.find((s) => s.id === r.tr.to);
    for (const c of to?.onEnter ?? []) {
      if (c.type !== 'applyEvent') continue;
      const e = c.event as { kind?: string; drugId?: unknown; dose?: unknown; unit?: unknown; route?: unknown };
      if (e.kind !== 'drug' || typeof e.drugId !== 'string' || typeof e.dose !== 'number') continue;
      const due = live.overdue !== null || live.right.startsWith('due') ? live.right : '';
      out.push({ n: r.n, label: r.label, toLabel: to?.label ?? 'the next state', drugId: e.drugId, dose: e.dose, unit: String(e.unit ?? ''), route: String(e.route ?? 'iv'), due });
    }
  }
  return out;
}

/** What the footer offers for a pinned card step: its buttons, the line beside them, and what Enter does. */
export interface PinnedGive {
  buttons: ReadonlyArray<{ label: string; does: 'step' | 'bolus' }>;
  line: string;
  /** What Enter gives: null when two buttons are offered (Enter never picks between them). */
  enter: 'step' | null;
}

/**
 * INTERIM RULE (the owner's ruling on a typed dose that differs from a pinned card step's dose is pending; answer
 * 10's contested half). Everything that decides it is in this one function, so the owner's rule replaces it here:
 * - the typed dose equals the card's: one Give, which presses the step (the card gives its own dose);
 * - it differs: the primary Give is replaced by two explicit buttons, "Give the card's step (<card dose>)" (presses the
 *   step) and "Give <typed dose> off the card" (today's bolus; the card does not move), with the line "the card's dose
 *   is <card dose>".
 */
export function pinnedGiveRule(step: PinnedStep, typed: { dose: number; unit: string }): PinnedGive {
  const card = `${step.dose} ${unitText(step.unit)}`;
  if (Math.abs(typed.dose - step.dose) < 1e-9 && typed.unit === step.unit) {
    return { buttons: [{ label: `Give ${drugName(step.drugId)} ${card} now`, does: 'step' }], line: `card step ${step.n}: Give also moves the card to “${step.toLabel}”`, enter: 'step' };
  }
  return {
    buttons: [{ label: `Give the card's step (${card})`, does: 'step' }, { label: `Give ${typed.dose} ${unitText(typed.unit)} off the card`, does: 'bolus' }],
    line: `the card's dose is ${card}`,
    enter: null,
  };
}

export interface DrugSheet {
  refresh(): void;
  /** Enter: give the chosen item now (nothing while two Give buttons are offered). */
  give(): void;
  /** S: add the chosen item to the cache (a card step: refused with its note). */
  stage(): void;
  /** Focus the search (on open). */
  focus(): void;
  /** Enter in the search box: choose the first match. */
  readonly search: HTMLInputElement;
}

/** The Drug sheet in `frame`, giving through `link` and staging into the view's `cache`. */
export function drugSheet(frame: SheetFrame, o: { link: Link; weightKg(): number; cache: Cache }): DrugSheet {
  const { link, cache } = o;
  let group: Group = 'mh';
  let chosen: Item | null = null;
  let route: 'bolus' | 'infusion' = 'bolus';
  const running = new Map<string, { name: string; rate: number; unit: string }>();
  const recent: string[] = [];
  let pinned: PinnedStep[] = [];

  // ---- left: search, pinned card steps, the group, running, recent ----
  const search = h('input', { type: 'search', class: 'ip2-input ip2-drug-search', 'aria-label': 'Search drugs', placeholder: 'Search drugs', autocomplete: 'off' });
  search.addEventListener('input', () => drawList());
  const pinNote = h('p', { class: 'ip2-sheet-note' });
  const pinList = h('div', { class: 'ip2-pick-list', role: 'list', 'aria-label': 'Card steps' });
  const list = h('div', { class: 'ip2-pick-list', role: 'list', 'aria-label': 'Drugs' });
  const runList = h('div', { class: 'ip2-pick-list', role: 'list', 'aria-label': 'Running infusions' });
  const recentLine = h('p', { class: 'ip2-sheet-note ip2-recent' });
  frame.left.replaceChildren(h('label', { class: 'ip2-search' }, search), pinNote, pinList, list, runList, recentLine);

  /** A list's buttons kept by item key across redraws (the pinned steps' timers tick every second: a focused button,
   *  or one under the pointer, is never replaced by a redraw); the tag and the lit state are updated in place. */
  const fill = (into: HTMLElement, rows: ReadonlyArray<[Item, string, string]>) => {
    const old = new Map([...into.querySelectorAll<HTMLButtonElement>('.ip2-pick')].map((b) => [b.dataset.key as string, b]));
    const want = rows.map(([it, tag, cls]) => {
      let b = old.get(it.key);
      if (!b) {
        b = h('button', { type: 'button', role: 'listitem', class: `ip2-pick ${cls}`.trim(), 'data-key': it.key }, h('span', { class: 'ip2-pick-name' }, nameOf(it)), h('span', { class: 'ip2-pick-tag' }));
        b.addEventListener('click', () => choose(items.get(b?.dataset.key ?? '') ?? it));
      }
      items.set(it.key, it);
      setText(b.lastElementChild as HTMLElement, tag);
      b.setAttribute('aria-pressed', String(chosen?.key === it.key));
      return b;
    });
    const kids = [...into.children];
    if (kids.length !== want.length || kids.some((k, i) => k !== want[i])) into.replaceChildren(...want);
  };
  /** The latest item behind each key (a pinned step's timer changes; its button stays). */
  const items = new Map<string, Item>();

  const stepKey = (p: PinnedStep) => `step:${p.n}:${p.drugId}`;
  const matches = (q: string): Item[] => {
    const ids = new Set(findDrugs(q).map((d) => d.id));
    const s = q.trim().toLowerCase();
    return itemsOf('all').filter((it) => (it.kind === 'drug' ? ids.has(it.drug.id) : nameOf(it).toLowerCase().includes(s)));
  };
  const noMatch = h('p', { class: 'ip2-sheet-note' }, 'Nothing matches.');
  const drawList = () => {
    const q = search.value;
    const shown = q.trim() ? matches(q) : itemsOf(group);
    setText(pinNote, pinned.length ? 'The card\'s open steps are pinned at the top while they are open; keys 1–9 stay on the ACTION list behind.' : '');
    fill(pinList, pinned.map((p): [Item, string, string] => [{ kind: 'step', key: stepKey(p), step: p }, `card step ${p.n}${p.due ? ` · ${p.due}` : ''}`, 'ip2-pick-step']));
    fill(list, shown.map((it): [Item, string, string] => [it, '', '']));
    if (!shown.length) list.replaceChildren(noMatch);
    fill(runList, [...running.entries()].flatMap(([id, r]): Array<[Item, string, string]> => {
      const d = DRUG_LIST.find((x) => x.id === id);
      return d ? [[drugItem(d), `running ${r.rate} ${unitText(r.unit)}`, '']] : [];
    }));
    setText(recentLine, recent.length ? `Recent: ${recent.join(' · ')}` : '');
  };

  // ---- right: the chosen item ----
  const title = h('span', { class: 'ip2-drug-name' });
  const sub = h('span', { class: 'ip2-drug-sub' });
  const cardLine = h('span', { class: 'ip2-drug-card' });
  const routeSeg = seg<'bolus' | 'infusion'>('Route', [['bolus', 'IV bolus'], ['infusion', 'Infusion']], 'bolus', (v) => ((route = v), drawDose(true)));
  routeSeg.className = 'ip2-seg'; // own class (plan's selector rule)
  const dose = stepper({ label: 'Dose', unit: '', min: 0, max: 100000, step: 1, value: 0, digits: 2, onchange: () => drawLive() });
  dose.input.addEventListener('input', () => drawLive());
  const unitSel = h('select', { class: 'ip2-input ip2-unitsel', 'aria-label': 'Dose unit', onchange: () => drawLive() });
  const total = h('output', { class: 'ip2-total' });
  const over = h('span', { class: 'ip2-over' });
  const vol = stepper({ label: 'Volume', unit: 'mL', min: 50, max: 5000, step: 50, value: 500, onchange: () => drawLive() });
  const overMin = stepper({ label: 'Given over', unit: 'min', min: 1, max: 120, step: 1, value: 10, onchange: () => drawLive() });
  const dial = stepper({ label: 'Dial', unit: '%', min: 0, max: 18, step: 0.5, value: 2, digits: 1, onchange: () => drawLive() });
  const fgf = stepper({ label: 'Fresh gas flow', unit: 'L/min', min: 0.2, max: 15, step: 0.5, value: 2, digits: 1, onchange: () => drawLive() });
  for (const s of [vol, overMin, dial, fgf]) s.input.addEventListener('input', () => drawLive());
  for (const s of [dose, vol, overMin, dial, fgf]) s.el.className = 'ip2-stepper'; // own class (plan's selector rule)
  const field = (label: string | HTMLElement, ...kids: Array<Node | null>) => h('div', { class: 'ip2-field' }, typeof label === 'string' ? h('span', { class: 'ip2-field-label' }, label) : label, ...kids);
  const totalLabel = h('span', { class: 'ip2-field-label' });
  const doseRow = h('div', { class: 'ip2-dose-row' }, field('Dose', h('span', { class: 'ip2-dose' }, dose.el, unitSel)), field(totalLabel, total), field('Given over', over));
  const fluidRow = h('div', { class: 'ip2-dose-row' }, field('Volume (mL)', vol.el), field('Given over (min)', overMin.el));
  const vapRow = h('div', { class: 'ip2-dose-row' }, field('Dial (%)', dial.el), field('Fresh gas (L/min)', fgf.el));
  const presets = h('div', { class: 'ip2-presets', role: 'group', 'aria-label': 'Presets' });
  const model = h('div', { class: 'ip2-model' }, h('span', { class: 'ip2-field-label' }, 'What the model will do'), h('span', {}));
  const addBtn = h('button', { type: 'button', class: 'ip2-add', onclick: () => stage() }, 'Add to the cache for staged delivery ↓');
  addBtn.setAttribute('aria-keyshortcuts', 's');
  const addNote = h('span', { class: 'ip2-sheet-note' });
  const stopBtn = h('button', { type: 'button', class: 'ip2-btn', onclick: () => void stopInfusion() }, 'Stop infusion');
  const empty = h('p', { class: 'ip2-sheet-note' }, 'Choose a drug, a fluid or a card step on the left.');
  const chosenEl = h('div', { class: 'ip2-chosen', hidden: true },
    h('div', { class: 'ip2-chosen-head' }, title, sub, h('span', { class: 'ip2-spacer' }), cardLine),
    routeSeg, doseRow, fluidRow, vapRow, presets, model, stopBtn,
    h('div', { class: 'ip2-add-wrap' }, addBtn, addNote));
  frame.right.replaceChildren(empty, chosenEl);

  // ---- footer (right): Give, or the interim rule's two buttons ----
  const footLine = h('span', { class: 'ip2-sheet-hint ip2-foot-line' });
  const gives = h('span', { class: 'ip2-gives' });
  frame.primary.replaceChildren(footLine, gives);

  /** The command Give or the cache sends for the chosen item (today's commands, panel/drugs.ts). */
  const build = (): CommandInput | null => {
    const it = chosen;
    if (!it) return null;
    if (it.kind === 'fluid') return fluid(it.fluid, vol.value, overMin.value * 60) as CommandInput;
    if (it.kind === 'bleed') return bleed(vol.value, overMin.value * 60) as CommandInput;
    if (it.kind === 'vaporiser') return vaporiser(it.agent, dial.value, fgf.value) as CommandInput;
    const drugId = it.kind === 'drug' ? it.drug.id : it.step.drugId;
    if (!(dose.value > 0)) return null;
    return (route === 'bolus' || it.kind === 'step'
      ? { type: 'applyEvent', event: { kind: 'drug', drugId, dose: dose.value, unit: unitSel.value, route: 'iv' } as unknown as ClinicalEvent }
      : infusion(drugId, dose.value, unitSel.value)) as CommandInput;
  };
  const cacheKey = (it: Item): string =>
    it.kind === 'drug' ? `drug-${it.drug.id}-${route}` : it.kind === 'fluid' ? `fluid-${it.fluid}` : it.kind === 'bleed' ? 'bleed' : it.kind === 'vaporiser' ? 'vaporiser' : '';

  const remember = () => {
    if (!chosen) return;
    recent.unshift(`${nameOf(chosen).toLowerCase()} ${clock(link.simT)}`);
    recent.splice(4);
  };
  /** Today's Give for the chosen item: `link.send` of today's command, today's toast. */
  const giveNow = async () => {
    const it = chosen;
    const cmd = build();
    if (!it || !cmd) return;
    const r = await link.send(cmd);
    if (it.kind === 'fluid') toast(r.accepted ? describeCommand(cmd as Record<string, unknown>) : 'Fluid not given (see the log)');
    else toast(r.accepted ? describeCommand(cmd as Record<string, unknown>) : `${nameOf(it)}: not given (${r.reason ?? 'refused'})`);
    if (!r.accepted) return;
    remember();
    if (it.kind === 'drug' && route === 'infusion') running.set(it.drug.id, { name: it.drug.name, rate: dose.value, unit: unitSel.value });
    drawList();
    drawLive();
  };
  const giveStep = async (p: PinnedStep) => {
    await pressStep(link, p.label);
    remember();
    drawList();
  };
  const stopInfusion = async () => {
    const it = chosen;
    if (it?.kind !== 'drug') return;
    const r = running.get(it.drug.id);
    if (!r) return;
    // today's Stop (panel/drugs.ts): the infusion at rate 0 in its unit
    const a = await link.send(infusion(it.drug.id, 0, r.unit) as never);
    if (a.accepted) {
      running.delete(it.drug.id);
      toast(`${r.name} infusion stopped`);
      drawList();
      drawLive();
    }
  };

  let rule: PinnedGive | null = null;
  const drawFooter = () => {
    const it = chosen;
    const kids: HTMLElement[] = [];
    rule = null;
    if (it?.kind === 'step') {
      rule = pinnedGiveRule(it.step, { dose: dose.value, unit: unitSel.value });
      setText(cardLine, rule.line); // beside the chosen step's name (board v11), so the footer keeps room for two buttons
      setText(footLine, '');
      for (const b of rule.buttons) kids.push(h('button', { type: 'button', class: 'ip2-give', 'data-does': b.does, onclick: () => void (b.does === 'step' ? giveStep(it.step) : giveNow()) }, b.label));
    } else if (it) {
      setText(footLine, 'Enter gives now · S adds to the cache');
      const n = nameOf(it);
      const label = it.kind === 'fluid' ? `Give ${n.toLowerCase()} ${vol.value} mL over ${overMin.value} min`
        : it.kind === 'bleed' ? `Start the blood loss: ${vol.value} mL over ${overMin.value} min`
          : it.kind === 'vaporiser' ? `Set ${n.replace(' vaporiser', '').toLowerCase()} ${dial.value} % at ${fgf.value} L/min`
            : route === 'infusion' ? `Start ${n.toLowerCase()} ${dose.value} ${unitText(unitSel.value)}` : `Give ${n.toLowerCase()} ${dose.value} ${unitText(unitSel.value)} now`;
      const b = h('button', { type: 'button', class: 'ip2-give', 'data-does': 'give', onclick: () => void giveNow() }, label);
      b.setAttribute('aria-keyshortcuts', 'Enter');
      b.disabled = !build();
      kids.push(b);
    } else setText(footLine, '');
    gives.replaceChildren(...kids);
  };

  const ensureUnit = (u: string) => {
    if (![...unitSel.options].some((x) => x.value === u)) unitSel.append(h('option', { value: u }, unitText(u)));
    unitSel.value = u;
  };
  /** The dose part for the chosen drug or card step: its units, presets and starting dose (`reset`: a new choice). */
  const drawDose = (reset: boolean) => {
    const it = chosen;
    if (!it || (it.kind !== 'drug' && it.kind !== 'step')) return;
    const d = it.kind === 'drug' ? it.drug : DRUG_LIST.find((x) => x.id === it.step.drugId);
    const units: string[] = d ? (route === 'bolus' ? doseUnits(d) : rateUnits(d)) : [];
    unitSel.replaceChildren(...units.map((u) => h('option', { value: u }, unitText(u))));
    const list = d ? ((route === 'bolus' ? d.preset.bolus : d.preset.infusion) ?? []) : [];
    const all: Array<[number, string, string]> = [
      ...(it.kind === 'step' ? [[it.step.dose, it.step.unit, `card: ${it.step.dose} ${unitText(it.step.unit)}`] as [number, string, string]] : []),
      ...list.map(([v, u]) => [v, u, `${v} ${unitText(u)}`] as [number, string, string]),
    ];
    presets.replaceChildren(h('span', { class: 'ip2-field-label' }, 'Presets'), ...all.map(([v, u, text]) => h('button', { type: 'button', class: 'ip2-preset', onclick: () => {
      ensureUnit(u);
      dose.set(v);
      drawLive();
    } }, text)));
    presets.hidden = !all.length;
    if (reset) {
      const first = all[0];
      if (first) {
        ensureUnit(first[1]);
        dose.set(first[0]);
      } else dose.set(0);
    }
    drawLive();
  };
  /** The live parts: the total, the presets lit, the cache button, the footer. */
  const drawLive = () => {
    const it = chosen;
    if (!it) return drawFooter();
    if (it.kind === 'drug' || it.kind === 'step') {
      setText(totalLabel, `Total for ${o.weightKg()} kg`);
      setText(total, perKg(dose.value, unitSel.value, o.weightKg()) || `${dose.value} ${unitText(unitSel.value)} (not per kg) for ${o.weightKg()} kg`);
      for (const b of presets.querySelectorAll<HTMLButtonElement>('.ip2-preset')) b.setAttribute('aria-pressed', String(b.textContent?.replace(/^card: /, '') === `${dose.value} ${unitText(unitSel.value)}`));
    }
    const isStep = it.kind === 'step';
    addBtn.disabled = isStep || !build();
    setText(addNote, isStep ? 'card steps are given from ACTION' : cache.has(cacheKey(it)) ? 'In the cache: adding again replaces it.' : 'Given drugs appear in the Log and on the Debrief timeline with the dose you typed.');
    stopBtn.hidden = !(it.kind === 'drug' && running.has(it.drug.id));
    drawFooter();
  };

  const choose = (it: Item) => {
    chosen = it;
    empty.hidden = true;
    chosenEl.hidden = false;
    const isDrug = it.kind === 'drug' || it.kind === 'step';
    if (it.kind === 'drug') route = running.has(it.drug.id) || (!it.drug.preset.bolus && it.drug.preset.infusion) ? 'infusion' : 'bolus';
    else if (it.kind === 'step') route = 'bolus';
    routeSeg.set(route);
    routeSeg.hidden = it.kind !== 'drug';
    doseRow.hidden = !isDrug;
    fluidRow.hidden = it.kind !== 'fluid' && it.kind !== 'bleed';
    vapRow.hidden = it.kind !== 'vaporiser';
    if (!isDrug) presets.hidden = true;
    setText(title, nameOf(it));
    const where = DRUG_GROUPS.find(([g]) => g === group)?.[1] ?? '';
    setText(sub, it.kind === 'step' ? `IV bolus · card step ${it.step.n}` : it.kind === 'drug' ? `${route === 'bolus' ? 'IV bolus' : 'Infusion'} · ${where}` : it.kind === 'vaporiser' ? 'Vaporiser' : 'Fluids');
    setText(cardLine, ''); // a card step's line: drawFooter (the rule's)
    const drugId = it.kind === 'drug' ? it.drug.id : it.kind === 'step' ? it.step.drugId : '';
    const line = MODEL_LINE[drugId];
    model.hidden = !line;
    setText(model.lastElementChild as HTMLElement, line ?? '');
    setText(over, 'at once (IV bolus)');
    if (isDrug) drawDose(true);
    else drawLive();
    drawList();
  };
  routeSeg.addEventListener('click', () => {
    setText(over, route === 'bolus' ? 'at once (IV bolus)' : 'runs until stopped');
    if (chosen?.kind === 'drug') setText(sub, `${route === 'bolus' ? 'IV bolus' : 'Infusion'} · ${DRUG_GROUPS.find(([g]) => g === group)?.[1] ?? ''}`);
  });

  const stage = () => {
    const it = chosen;
    if (!it) return;
    if (it.kind === 'step') return toast('Card steps are given from ACTION');
    const cmd = build();
    if (!cmd) return;
    cache.submit(cmd, cacheKey(it), describeCommand(cmd as Record<string, unknown>));
    drawLive();
  };

  const selectGroup = (g: string) => {
    group = g as Group;
    search.value = '';
    frame.groups(DRUG_GROUPS, group, selectGroup);
    drawList();
  };
  frame.groups(DRUG_GROUPS, group, selectGroup);
  search.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const first = search.value.trim() ? matches(search.value)[0] : undefined;
    if (first) choose(first);
  });
  cache.onChange(() => drawLive());

  return {
    search,
    refresh: () => {
      pinned = pinnedSteps(link);
      // a chosen card step follows the card (its timer); one no longer open stays chosen: pressing it then says why
      if (chosen?.kind === 'step') {
        const key = chosen.key;
        const now = pinned.find((p) => stepKey(p) === key);
        if (now) chosen = { kind: 'step', key, step: now };
      }
      drawList();
    },
    give: () => {
      if (!chosen) return;
      if (chosen.kind === 'step') {
        if (rule?.enter === 'step') void giveStep(chosen.step);
        return;
      }
      void giveNow();
    },
    stage,
    focus: () => search.focus(),
  };
}
