// The scenario builder's page (docs/plans/scenario-builder.md §5, §8, mock-up 01-builder-main; piece B2), in place of
// the stub that explained the /1 format. `#/scenarios/builder` lists this browser's drafts, opens a /2 library card as a
// copy and imports a card file; `#/scenarios/builder/<draft>` is the editor: the card's outline, one section (Header and
// story, Patient and sensors, Case briefing; B3's Phases, phase-editor.ts; B4's Actions, action-editor.ts; B5's Script,
// Outcomes, Debrief hints and Handout questions, script-editor.ts, outcome-editor.ts, debrief-editor.ts), and the checks with the draft's local history. Every change is written
// through `docOf`, checked by the controller's validator 300 ms after the last keystroke (`checker`), each line shown on
// its field (`fieldOf`), and saved in this browser 300 ms after the last change (layer 1, drafts.ts). Export writes
// the card file (Export waits while the validator refuses, unless this browser could not save the draft: then a file is
// the only copy). Layer 2 (piece B8; the owner's ruling of 10 November 2026): when the app runs from a kit on Node.js,
// the card is also kept as a version file in the kit's own user-data folder (kit-store.ts) on Ctrl+S, at Export, and
// every 2 min of an open draft that changed; the drafts page lists the cards the folder holds that this browser lacks;
// the store line says in words where the work is kept, or why the folder is not written. (B6's Run, not built yet, is
// to call `keepInKit` too, as the plan says; it does: B6.) Run in place (B6, run-panel.ts): enabled at 0 refusals, it
// saves the draft, keeps it in the kit's folder, and runs it on this computer's session beside Instructor v2. Since B5
// every block of the format has its section; a top-level key the format does not have is carried as the card has it.
import { HOME_VERSION, REPO } from '../about.ts';
import { hhmm } from '../archive.ts';
import { hrefOf } from '../router.ts';
import { LIBRARY } from '../scenarios.ts';
import { kitOffLine, kitStore as defaultKit, kitWhere, type KitCard, type KitStore } from '../kit-store.ts';
import { button, confirmDialog, download, h, toast } from '../ui.ts';
import { cardFileName, cardFileText, readCardFile } from './card-file.ts';
import { convertV1 } from './convert.ts';
import { flagLine, originFlags, portCheckLine, PORT_ROWS } from './port.ts';
import { checker, type Placed } from './checks.ts';
import { drafts as defaultDrafts, draftRefusalText, type Body, type DraftMeta, type Drafts, type SnapshotMeta } from './drafts.ts';
import { fieldOf } from './fields.ts';
import { docOf, formOf, type CardForm } from './form.ts';
import { actionSection } from './action-editor.ts';
import { actionWarnings } from './actions.ts';
import { debriefSection, handoutSection } from './debrief-editor.ts';
import { outcomeSection } from './outcome-editor.ts';
import { phaseSection, phaseWarnings, type PhaseSectionView } from './phase-editor.ts';
import { scriptSection } from './script-editor.ts';
import { sections, type SectionId, type SectionView, type Slot } from './sections.ts';
import type { ScenarioDoc } from '@pme/controller/scenario';
import './builder.css';

/** The pause after the last change before the draft is saved in this browser: the plan's 300 ms (§8). [ENG: ui] */
export const SAVE_DELAY_MS = 300;
/** How often an open draft that changed is kept in the kit's folder: the plan's "every 2 min while the kit runs on Node"
 *  (§8). [ENG: ui] */
export const KIT_EVERY_MS = 120_000;

/** A line in the checks: the validator's, the builder's own (a library card's id), or the converter's flag of a /1
 *  card's place (B7: shown in the refusal style at its field, never counted as a refusal). */
type Line = Omit<Placed, 'kind'> & { kind: Placed['kind'] | 'flag'; by: 'validator' | 'builder' | 'converter' };

const hms = (ms: number): string => {
  const d = new Date(ms);
  return `${hhmm(ms)}:${String(d.getSeconds()).padStart(2, '0')}`;
};
const when = (ms: number, now = Date.now()): string =>
  new Date(ms).toDateString() === new Date(now).toDateString() ? hhmm(ms) : `${new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${hhmm(ms)}`;
const whyWords = (s: SnapshotMeta, m: DraftMeta): string =>
  s.why === 'opened' ? m.from : s.why === 'editing' ? 'after 2 min of editing' : s.why === 'export' ? 'exported' : s.why.replace(/^before restoring (\d+)$/, 'before snapshot $1 was restored');
const LIBRARY_V2 = () => LIBRARY.filter((c) => (c.doc as { schema?: string }).schema === 'pme-scenario/2');
/** The /1 library cards to port (§7.2's sixteen): a /1 demo copy whose /2 version is in the library (`<id>-v2`) is not one. */
const LIBRARY_V1 = () => LIBRARY.filter((c) => (c.doc as { schema?: string }).schema === 'pme-scenario/1' && !LIBRARY.some((x) => x.id === `${c.id}-v2`));
const SECTION_OF_SLOT: Record<string, SectionId> = {
  header: 'header', patient: 'patient', briefing: 'briefing', phases: 'phases', actions: 'actions', script: 'script', outcomes: 'outcomes', debrief: 'debrief', handout: 'handout',
};
/** The outline's groups (mock-up 01): the card's own sections, its course, the team, the debrief. */
const OUTLINE: ReadonlyArray<[heading: string, ids: readonly SectionId[]]> = [
  ['Card', ['header', 'patient', 'briefing']], ['Course', ['phases', 'script']], ['The team', ['actions']], ['Debrief', ['outcomes', 'debrief', 'handout']],
];
/** The outline's count beside a list section: its entries (the handout's questions inside `debriefHints`). */
const COUNTED: Partial<Record<SectionId, (F: Record<string, unknown>) => unknown>> = {
  phases: (F) => F.phases, script: (F) => F.script, actions: (F) => F.actions, outcomes: (F) => F.outcomes,
  handout: (F) => (F.debriefHints as Record<string, unknown> | undefined)?.handoutQuestions,
};
const hasSlotFor = (s: SectionView): s is PhaseSectionView => 'slotFor' in s;

export interface BuilderPage {
  el: HTMLElement;
  /** The heading the Scenarios view names (its id changes with the page shown). */
  headingId(): string;
  /** `sub` after `builder`: '' (the drafts) or a draft's id; resolves when the page is drawn. */
  enter(sub: string): Promise<void>;
  /** Leaving the page: a pending save is written now. */
  leave(): void;
}

/** B6: run the draft `draftId` (its document as the form writes it) in place; the app's DraftRun.run. */
export type RunDraft = (draftId: string, doc: unknown) => { ok: true } | { ok: false; reason: string };

export function builderPage(store: Drafts = defaultDrafts, kit: KitStore = defaultKit, runner?: { run: RunDraft; live(): boolean }): BuilderPage {
  // ---------------------------------------------------------------------------------------------------- the drafts
  const draftList = h('div', { class: 'scen-list sb-drafts', 'aria-label': 'Your drafts' });
  const holds = h('p', { class: 'sb-hint sb-holds' });
  const importErr = h('div', { class: 'sb-import-err', role: 'alert' });
  const startErr = h('p', { class: 'sb-refuse', role: 'alert', hidden: true });
  const file = h('input', { type: 'file', accept: 'application/json,.json', class: 'sr-only', id: 'sb-import' });
  const say = (el: HTMLElement, why: string, errors: string[] = []) => el.replaceChildren(
    h('p', { class: 'sb-refuse' }, why),
    errors.length ? h('ul', { class: 'sb-errs' }, ...errors.map((e) => h('li', {}, lineOf(e)))) : '',
  );
  file.addEventListener('change', async () => {
    const f = file.files?.[0];
    file.value = '';
    importErr.replaceChildren();
    if (!f) return;
    const r = readCardFile(f.name, await f.text());
    if (!r.ok) return say(importErr, r.why, r.errors);
    const m = await store.create(r.doc as unknown as Body, `imported from ${f.name}`);
    if ('refused' in m) return say(importErr, draftRefusalText(m));
    location.hash = hrefOf('scenarios', `builder/${m.id}`);
  });
  const openCopy = async (id: string) => {
    const c = LIBRARY.find((x) => x.id === id);
    if (!c) return;
    const m = await store.create({ ...(c.doc as unknown as Body), id: `${c.id}-copy` }, `a copy of the library card ${c.id}`, Date.now(), { id: c.id, schema: 'pme-scenario/2' });
    if ('refused' in m) {
      startErr.hidden = false;
      startErr.textContent = draftRefusalText(m);
      return;
    }
    location.hash = hrefOf('scenarios', `builder/${m.id}`);
  };
  /** B7: a /1 library card converted (convert.ts), opened as a draft with an id of its own; its flags show in place. */
  const openConverted = async (id: string) => {
    const c = LIBRARY.find((x) => x.id === id);
    if (!c) return;
    const { draft } = convertV1(c.doc as ScenarioDoc);
    const m = await store.create({ ...(draft as unknown as Body), id: `${c.id}-copy` }, `converted from the pme-scenario/1 library card ${c.id}`, Date.now(), { id: c.id, schema: 'pme-scenario/1' });
    if ('refused' in m) {
      startErr.hidden = false;
      startErr.textContent = draftRefusalText(m);
      return;
    }
    location.hash = hrefOf('scenarios', `builder/${m.id}`);
  };
  const drawDrafts = () => {
    const xs = store.list();
    draftList.replaceChildren(...(xs.length ? xs.map((m) => h('div', { class: 'scen-item' },
      h('div', {}, h('p', { class: 't' }, m.title || 'Untitled card', ' ', h('code', {}, m.cardId)), h('p', { class: 'd' }, `${m.from[0]?.toUpperCase()}${m.from.slice(1)} · saved ${when(m.savedAt)} · ${m.snapshots.length} ${m.snapshots.length === 1 ? 'snapshot' : 'snapshots'}`)),
      button('Delete', () => void (async () => {
        if (!(await confirmDialog('Delete this draft?', `“${m.title || m.cardId}” and its ${m.snapshots.length} snapshots are deleted from this browser. An exported file is not affected${kit.state?.on ? ', and neither are its versions in this kit’s user-data folder' : ''}.`, 'Delete draft', true, 'Keep the draft'))) return;
        await store.remove(m.id);
        drawDrafts();
        void drawKit();
      })(), 'ghost', { 'aria-label': `Delete the draft ${m.title || m.cardId}` }),
      h('a', { class: 'btn', href: hrefOf('scenarios', `builder/${m.id}`), 'aria-label': `Open the draft ${m.title || m.cardId}` }, 'Open'),
    )) : [h('p', { class: 'hint' }, 'No drafts in this browser yet: open a library card as a copy, or import a card file.')]));
    holds.textContent = storeWords();
  };
  /** The store line: what this browser holds, where it is kept, and why the kit's folder is not written when it is not. */
  const storeWords = () => {
    const off = kitOffLine(kit.state);
    return `${store.holdsLine()}, ${kit.state?.on ? `kept ${kitWhere(kit.state)}` : store.whereLine()}.${off ? ` ${off}` : ''}`;
  };
  // ------------------------------------------------------------------------- what the kit's folder holds, not this browser
  const kitList = h('div', { class: 'scen-list sb-kit-cards', 'aria-label': 'Cards in this kit’s user-data folder, not in this browser' });
  const kitBlock = h('section', { class: 'sb-block', 'aria-labelledby': 'sb-kit-h', hidden: true },
    h('h2', { id: 'sb-kit-h', class: 'scen-h3' }, 'In this kit’s user-data folder, not in this browser'),
    h('p', { class: 'sb-hint' }, 'Kept by this kit (another browser of this laptop, or this one before its data was cleared). Open one to edit it here: it opens at its newest version.'),
    kitList);
  const openFromKit = async (c: KitCard) => {
    const last = c.versions.at(-1);
    const text = last ? await kit.card(c.id, last.v) : null;
    let doc: unknown = null;
    try {
      doc = text === null ? null : JSON.parse(text);
    } catch {
      /* not a card file */
    }
    if (!last || !doc || typeof doc !== 'object' || Array.isArray(doc)) {
      startErr.hidden = false;
      startErr.textContent = `${c.id} was not opened: the kit’s folder did not give back its newest version as a card file.`;
      return;
    }
    const m = await store.create(doc as Body, `from this kit’s user-data folder, version ${last.v}`);
    if ('refused' in m) {
      startErr.hidden = false;
      startErr.textContent = draftRefusalText(m);
      return;
    }
    location.hash = hrefOf('scenarios', `builder/${m.id}`);
  };
  const drawKit = async () => {
    const cards = await kit.cards();
    const mine = new Set(store.list().map((m) => m.cardId));
    const lacking = (cards ?? []).filter((c) => !mine.has(c.id));
    kitBlock.hidden = !lacking.length;
    kitList.replaceChildren(...lacking.map((c) => {
      const last = c.versions.at(-1)!;
      return h('div', { class: 'scen-item' },
        h('div', {}, h('p', { class: 't' }, c.title || 'Untitled card', ' ', h('code', {}, c.id)), h('p', { class: 'd' }, `Version ${last.v} · kept ${when(last.at)} · ${c.versions.length} ${c.versions.length === 1 ? 'version' : 'versions'} in the folder`)),
        h('span', {}),
        button('Open', () => void openFromKit(c), '', { 'aria-label': `Open ${c.title || c.id} from this kit’s folder` }));
    }));
  };
  const start = h('div', { class: 'console-page sb-start' },
    h('a', { class: 'console-back', href: hrefOf('scenarios') }, '← Scenarios'),
    h('h1', { id: 'scen-build-h' }, 'Scenario builder'),
    h('p', { class: 'console-sub' }, 'Edit a card in this browser: open a library card as a copy, or import a card file. Every change is kept in this browser as you type, with snapshots you can go back to; Export file is the way to take a card elsewhere.'),
    startErr,
    h('section', { class: 'sb-block', 'aria-labelledby': 'sb-drafts-h' }, h('h2', { id: 'sb-drafts-h', class: 'scen-h3' }, 'Your drafts'), draftList, holds),
    kitBlock,
    h('section', { class: 'sb-block', 'aria-labelledby': 'sb-copy-h' }, h('h2', { id: 'sb-copy-h', class: 'scen-h3' }, 'Open a library card as a copy'),
      h('div', { class: 'scen-list' }, ...LIBRARY_V2().map((c) => h('div', { class: 'scen-item' },
        h('div', {}, h('p', { class: 't' }, c.title, ' ', h('code', {}, c.id)), h('p', { class: 'd' }, 'The copy gets its own id; the library card is not changed.')),
        h('span', {}),
        button('Open a copy', () => void openCopy(c.id), '', { 'aria-label': `Open a copy of ${c.title}` })))),
      h('p', { class: 'sb-hint' }, 'The library’s pme-scenario/1 cards open here once each is ported to pme-scenario/2.')),
    h('section', { class: 'sb-block sb-convert', 'aria-labelledby': 'sb-convert-h' }, h('h2', { id: 'sb-convert-h', class: 'scen-h3' }, 'Convert a pme-scenario/1 library card'),
      h('p', { class: 'sb-hint' }, 'The converter carries what has an exact pme-scenario/2 form and flags the rest at its place, with nothing guessed in its place: a timer or a die becomes a truth rule only when a port proposes one with its sources and the owner signs it, or an instructor-pressed event. The library card is not changed.'),
      h('div', { class: 'scen-list' }, ...LIBRARY_V1().map((c) => {
        const n = convertV1(c.doc as ScenarioDoc).flags.length;
        return h('div', { class: 'scen-item' },
          h('div', {}, h('p', { class: 't' }, c.title, ' ', h('code', {}, c.id)), h('p', { class: 'd' }, n ? `${n} ${n === 1 ? 'place' : 'places'} flagged for a port to decide` : 'Nothing flagged: every beat has an exact pme-scenario/2 form')),
          h('span', {}),
          button('Convert', () => void openConverted(c.id), '', { 'aria-label': `Convert ${c.title} to a pme-scenario/2 draft` }));
      }))),
    h('section', { class: 'sb-block', 'aria-labelledby': 'sb-import-h' }, h('h2', { id: 'sb-import-h', class: 'scen-h3' }, 'Import a card file'),
      h('p', { class: 'sb-hint' }, 'A pme-scenario/2 card file (an exported draft, a library card). The validator checks it first; a file it refuses is not opened.'),
      h('div', { class: 'scen-row' }, h('label', { class: 'btn', for: 'sb-import' }, 'Import a card file'), file,
        h('a', { class: 'btn', href: `https://${REPO}/blob/main/docs/guides/scenario-authoring.md`, target: '_blank', rel: 'noopener' }, 'Card documentation')),
      importErr));

  // ---------------------------------------------------------------------------------------------------- the editor
  const editor = h('div', { class: 'console-page sb-page' });
  let open: { meta: DraftMeta; form: CardForm; secs: SectionView[]; cur: SectionId; lines: Line[]; refused: string | null; flags: Line[] } | null = null;
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  /** A change not written yet. */
  let dirty = false;
  const chip = h('b', {});
  const saveChip = h('span', { class: 'sb-save' }, h('i', { 'aria-hidden': 'true' }), 'This browser · ', chip);
  const kitChipText = h('b', {});
  const kitChip = h('span', { class: 'sb-kit-save', hidden: true }, h('i', { 'aria-hidden': 'true' }), 'Kit folder · ', kitChipText);
  const kitRefusal = h('p', { class: 'sb-refuse sb-kit-refuse', role: 'alert', hidden: true });
  /** The card file last kept in the kit's folder (or found there), so an unchanged draft writes nothing. */
  let kitText: string | null = null;
  let kitTimer: ReturnType<typeof setInterval> | null = null;
  const refusal = h('p', { class: 'sb-refuse sb-store-refuse', role: 'alert', hidden: true });
  const exportBtn = button('Export file', () => void doExport());
  const runBtn = button('Run in place', () => void doRun(), 'primary');
  runBtn.hidden = !runner;
  const cardLine = h('p', { class: 'sb-card' });
  const outline = h('nav', { class: 'sb-panel sb-outline', 'aria-label': 'Card outline' });
  const pane = h('div', { class: 'sb-pane' });
  const checksList = h('ul', { 'aria-label': 'What the validator says' });
  const history = h('ul', { 'aria-label': 'Snapshots in this browser' });
  const storeLine = h('p', { class: 'sb-hint' });
  const checks = h('aside', { class: 'sb-panel sb-checks', 'aria-label': 'Checks' }, h('h2', {}, 'Checks'), checksList, h('h2', {}, 'History in this browser'), history, storeLine);

  const lineOf = (line: string) => {
    const m = /^(\/\S*): ([\s\S]*)$/.exec(line);
    // a quoted id in the validator's words ("no phase \"establshed\"") is the card's own name: in <code> as the path is
    const said = (t: string) => t.split(/("[^"\s]+")/).map((x, i) => (i % 2 ? h('code', {}, x) : x));
    return m ? h('span', {}, h('code', {}, m[1]!), ': ', ...said(m[2]!)) : h('span', {}, ...said(line));
  };
  const sectionOfLine = (l: Line): SectionId | null => {
    return SECTION_OF_SLOT[l.at.section] ?? null;
  };
  const slotOf = (sec: SectionView, l: Line): Slot => {
    if (hasSlotFor(sec)) return sec.slotFor(l.at);
    const f = l.at.field;
    if (l.at.heading || !f) return sec.head;
    return sec.slots.get(l.at.section === 'header' ? f : `${l.at.block}/${f}`) ?? sec.head;
  };

  const drawTop = () => {
    if (!open) return;
    const F = open.form.fields as Record<string, unknown>;
    cardLine.replaceChildren(h('b', {}, typeof F.title === 'string' && F.title ? F.title : 'Untitled card'), ' · ', h('code', {}, typeof F.id === 'string' ? F.id : ''), ` · ${open.meta.from} · draft, not signed`);
  };
  const drawOutline = () => {
    if (!open) return;
    const o = open;
    const dot = (id: SectionId) => {
      const ls = o.lines.filter((l) => sectionOfLine(l) === id);
      return ls.some((l) => l.kind === 'refusal') ? 'bad' : ls.length ? 'warn' : '';
    };
    const F = o.form.fields as Record<string, unknown>;
    const count = (id: SectionId) => {
      const v = COUNTED[id]?.(F);
      return Array.isArray(v) ? String(v.length) : '0';
    };
    outline.replaceChildren(
      ...OUTLINE.flatMap(([heading, ids]) => [h('h2', {}, heading), ...o.secs.filter((s) => ids.includes(s.id)).map((s) => {
        const d = dot(s.id);
        return h('button', { type: 'button', class: 'sb-out', 'aria-current': o.cur === s.id ? 'true' : undefined, onclick: () => show(s.id) },
          h('span', { class: `sb-dot ${d}`, 'aria-hidden': 'true' }), s.title, COUNTED[s.id] ? h('small', {}, count(s.id)) : null,
          d ? h('span', { class: 'sr-only' }, d === 'bad' ? ' (refused)' : ' (warning)') : null);
      })]),
    );
  };
  const show = (id: SectionId, focus?: HTMLElement) => {
    if (!open) return;
    open.cur = id;
    const sec = open.secs.find((s) => s.id === id)!;
    // B5's sections are drawn again from the card as it now is (a phase or an action renamed in its own section)
    if ('shown' in sec && typeof sec.shown === 'function') (sec.shown as () => void)();
    pane.replaceChildren(sec.el);
    drawOutline();
    focus?.focus();
  };
  const place = (lines: Line[]) => {
    if (!open) return;
    open.lines = lines;
    for (const s of open.secs) {
      for (const slot of [s.head, ...s.slots.values()]) {
        slot.msgs.replaceChildren();
        slot.el.classList.remove('bad');
        for (const c of slot.controls) {
          // a field's own word (B3: a number not written) stays: data-invalid, data-describedby
          if (c.dataset.invalid) c.setAttribute('aria-invalid', 'true');
          else c.removeAttribute('aria-invalid');
          if (c.dataset.describedby) c.setAttribute('aria-describedby', c.dataset.describedby);
          else c.removeAttribute('aria-describedby');
        }
      }
    }
    for (const l of lines) {
      const id = sectionOfLine(l);
      const sec = id && open.secs.find((s) => s.id === id);
      if (!sec) continue;
      const slot = slotOf(sec, l);
      const words = `The ${l.by} ${l.kind === 'refusal' ? 'refuses' : l.kind === 'flag' ? 'flags' : 'warns'}: `;
      slot.msgs.append(h('p', { class: l.kind === 'warning' ? 'sb-warnline' : 'sb-refuse' }, h('span', {}, words, lineOf(l.line))));
      if (l.kind === 'refusal') slot.el.classList.add('bad');
      const ctls = l.at.row !== undefined && slot.controls[l.at.row] ? [slot.controls[l.at.row]!] : slot.controls;
      for (const c of ctls) {
        if (l.kind === 'refusal') c.setAttribute('aria-invalid', 'true');
        c.setAttribute('aria-describedby', `${slot.msgs.id} ${c.dataset.describedby ?? ''}`.trim());
      }
    }
    for (const s of open.secs) if (hasSlotFor(s)) s.placed(lines as Placed[]);
    // the checks column: the count, each line linked to its field, the facts
    const refusals = lines.filter((l) => l.kind === 'refusal');
    const warnings = lines.filter((l) => l.kind === 'warning');
    const flagged = lines.filter((l) => l.kind === 'flag');
    const origin = open.meta.origin;
    const F0 = open.form.fields as Record<string, unknown>;
    const ids = [typeof F0.id === 'string' ? F0.id : '', origin?.id ?? ''].filter(Boolean);
    // §7.3: the port check's last result, read from ports.json, for a converted /1 card or a card with a row there
    const port = origin?.schema === 'pme-scenario/1' || PORT_ROWS.some((r) => ids.includes(r.card)) ? portCheckLine(ids) : null;
    const item = (l: Line) => {
      const id = sectionOfLine(l);
      const go = id ? button('Show', () => {
        const sec = open!.secs.find((s) => s.id === id)!;
        if (hasSlotFor(sec)) {
          show(id);
          sec.reveal(l.at);
        }
        const slot = slotOf(sec, l);
        show(id, (l.at.row !== undefined ? slot.controls[l.at.row] : slot.controls[0]) ?? undefined);
      }, 'small ghost', { 'aria-label': `Show ${l.line.split(':')[0]} at its field` }) : h('small', {}, 'Outside the format’s sections: fix it in the card file.');
      return h('li', { class: l.kind === 'refusal' ? 'bad' : 'warn' }, l.by === 'builder' ? 'The builder: ' : l.by === 'converter' ? 'The converter: ' : '', lineOf(l.line), go);
    };
    checksList.replaceChildren(
      refusals.length
        ? h('li', { class: 'bad' }, `The validator refuses this draft: ${refusals.length} ${refusals.length === 1 ? 'refusal' : 'refusals'}`, h('small', {}, 'Each is shown at its field; Export waits for 0.'))
        : h('li', {}, 'The validator accepts this draft', h('small', {}, warnings.length ? `${warnings.length} ${warnings.length === 1 ? 'warning' : 'warnings'}: they do not block a draft.` : 'No warnings.')),
      ...refusals.map(item), ...warnings.map(item),
      ...(flagged.length ? [h('li', { class: 'warn' }, `The converter flagged ${flagged.length} ${flagged.length === 1 ? 'place' : 'places'} of the pme-scenario/1 card: each is shown at its field.`, h('small', {}, ' A port decides each (a sourced truth rule the owner signs, or an instructor-pressed event); none is a refusal.')), ...flagged.map(item)] : []),
      ...(port ? [h('li', { class: 'off sb-port' }, port)] : []),
      h('li', { class: 'off' }, 'Checked by the validator of this app', h('small', {}, HOME_VERSION)),
    );
    drawOutline();
    drawExport();
  };
  const drawExport = () => {
    if (!open) return;
    const n = open.lines.filter((l) => l.kind === 'refusal').length;
    // the file is the way out when this browser could not keep the draft (§8), refusals or not
    exportBtn.disabled = n > 0 && !open.refused;
    exportBtn.title = exportBtn.disabled ? `Export waits while the validator refuses this draft (${n})` : '';
    runBtn.disabled = n > 0; // §6: enabled at 0 refusals
    runBtn.title = n > 0 ? `Run in place waits while the validator refuses this draft (${n})` : 'Runs this draft on this computer, beside Instructor v2; not in the library';
  };
  const drawHistory = () => {
    if (!open) return;
    const m = open.meta;
    history.replaceChildren(
      h('li', {}, `Now · saved ${hms(m.savedAt)}`),
      ...[...m.snapshots].reverse().map((s) => h('li', { class: 'off' },
        h('span', {}, `Snapshot ${s.n} · ${when(s.at)} · ${whyWords(s, m)}`),
        button('Restore', () => void restore(s.n), 'small ghost', { 'aria-label': `Restore snapshot ${s.n}` }))),
    );
    storeLine.textContent = storeWords();
  };
  const drawKitChip = () => {
    kitChip.hidden = !kit.state?.on;
  };
  /** The open draft kept in the kit's folder as a new version (`why`: what asked), unless it is as last kept there. */
  const keepInKit = async (why: 'ctrl-s' | 'export' | 'timer' | 'run'): Promise<void> => {
    if (!open || !(await kit.ready()).on) return;
    const o = open;
    const doc = docOf(o.form);
    const text = cardFileText(doc);
    if (text === kitText && why === 'timer') return;
    const id = typeof doc.id === 'string' ? doc.id : '';
    const r = await kit.keepCard(id, text);
    if (open !== o) return;
    if (r.ok) {
      kitText = text;
      kitChip.classList.remove('bad');
      kitChipText.textContent = `version ${r.v} kept ${hms(r.at)}`;
      kitRefusal.hidden = true;
      if (why === 'ctrl-s') toast(r.same ? `Already kept as version ${r.v} in this kit’s user-data folder` : `Kept as version ${r.v} in this kit’s user-data folder`);
    } else {
      kitChip.classList.add('bad');
      kitChipText.textContent = 'not kept';
      kitRefusal.hidden = false;
      kitRefusal.textContent = `Not kept in this kit’s user-data folder: ${r.why}. The draft is still kept in this browser; export a file to keep it elsewhere.`;
    }
  };
  const drawSaved = (r: DraftMeta | { refused: string; detail: string }) => {
    if (!open) return;
    if ('refused' in r) {
      open.refused = draftRefusalText(r as Parameters<typeof draftRefusalText>[0]);
      chip.textContent = 'not saved';
      saveChip.classList.add('bad');
      refusal.hidden = false;
      refusal.textContent = open.refused;
    } else {
      open.meta = r;
      open.refused = null;
      chip.textContent = `saved ${hms(r.savedAt)}`;
      saveChip.classList.remove('bad');
      refusal.hidden = true;
      drawHistory();
    }
    drawExport();
  };

  const check = checker((placed, result) => {
    if (!open) return;
    const F = open.form.fields as Record<string, unknown>;
    const builder: Line[] = typeof F.id === 'string' && LIBRARY.some((c) => c.id === F.id)
      ? [{ kind: 'refusal', by: 'builder', line: `/id: a library card has the id "${F.id}"; a copy needs an id of its own (Instructor v2 does not open a card file with a library card’s id)`, text: '', at: fieldOf('/id') }]
      : [];
    // the builder's own warnings about the course (§5.3, §5.5): a phase nothing leads to; never a block
    // B4: an amount no number satisfies, a press grade() does not grade as met, an action open in no reachable phase
    // (on a card the validator accepts: grade() reads only such a card)
    for (const line of [...phaseWarnings(open.form), ...(result.ok ? actionWarnings(docOf(open.form), F) : [])]) builder.push({ kind: 'warning', by: 'builder', line, text: line.slice(line.indexOf(': ') + 2), at: fieldOf(line.slice(0, line.indexOf(': '))) });
    place([...builder, ...placed.map((p) => ({ ...p, by: 'validator' as const })), ...open.flags]);
  });
  const saveNow = async () => {
    if (saveTimer !== null) clearTimeout(saveTimer);
    saveTimer = null;
    if (!open || !dirty) return;
    dirty = false;
    const o = open;
    chip.textContent = 'saving…';
    const r = await store.save(o.meta.id, docOf(o.form) as unknown as Body);
    if (open === o) drawSaved(r);
  };
  const changed = () => {
    if (!open) return;
    drawTop();
    check.change(open.form);
    dirty = true;
    if (saveTimer !== null) clearTimeout(saveTimer);
    chip.textContent = 'editing…';
    saveTimer = setTimeout(() => void saveNow(), SAVE_DELAY_MS);
  };
  const mount = (meta: DraftMeta, doc: Body, cur: SectionId = 'header') => {
    const form = formOf(doc);
    dirty = false;
    // B7: the converter's flags of the /1 card this draft came from, each at the place it concerns
    const flags: Line[] = originFlags(meta.origin).map((f) => ({ kind: 'flag', by: 'converter', line: flagLine(f), text: flagLine(f).slice(f.at.length + 2), at: fieldOf(f.at) }));
    open = { meta, form, secs: [], cur, lines: [], refused: null, flags };
    const placeAgain = () => {
      if (open?.form === form) place(open.lines);
    };
    open.secs = [...sections(form, changed), phaseSection(form, changed, placeAgain), scriptSection(form, changed, placeAgain), actionSection(form, changed, placeAgain),
      outcomeSection(form, changed, placeAgain), debriefSection(form, changed, placeAgain), handoutSection(form, changed, placeAgain)];
    drawTop();
    show(cur);
    drawSaved(meta);
    check.change(form);
    check.flush();
  };
  const doExport = async () => {
    if (!open) return;
    check.flush();
    if (exportBtn.disabled) return;
    await saveNow();
    const doc = docOf(open.form);
    download(cardFileName(doc), cardFileText(doc), 'application/json');
    toast(`Exported ${cardFileName(doc)}`);
    const r = await store.snapshot(open.meta.id, doc as unknown as Body, 'export');
    drawSaved(r);
    await keepInKit('export');
  };
  const doRun = async () => {
    if (!open || !runner) return;
    check.flush();
    if (runBtn.disabled) return;
    await saveNow();
    await keepInKit('run');
    if (runner.live() && !(await confirmDialog('Run this draft in place?', 'The current patient is replaced by the draft’s patient. The draft runs on this computer only: it is not added to the library.', 'Run the draft', false, 'Keep the current case'))) return;
    const r = runner.run(open.meta.id, docOf(open.form));
    if (!r.ok) toast(`The draft could not run: ${r.reason}`, 'alert');
  };
  const restore = async (n: number) => {
    if (!open) return;
    await saveNow();
    const r = await store.restore(open.meta.id, n);
    if ('refused' in r) return drawSaved(r);
    mount(r.meta, r.doc, open.cur);
    toast(`Snapshot ${n} restored; the draft as it was is snapshot ${r.meta.snapshots.at(-1)?.n}`);
  };
  editor.append(
    h('div', { class: 'sb-top' },
      h('div', {}, h('a', { class: 'console-back', href: hrefOf('scenarios', 'builder') }, '← Your drafts'), h('h1', { id: 'scen-edit-h' }, 'Scenario builder'), cardLine),
      h('span', { class: 'sb-sp' }),
      h('div', { class: 'sb-topr' }, h('div', { class: 'sb-saves', role: 'status', 'aria-label': 'Where this draft is saved' }, saveChip, kitChip), h('div', { class: 'sb-acts' }, exportBtn, runBtn))),
    refusal,
    kitRefusal,
    h('div', { class: 'sb-grid' }, outline, pane, checks));
  const missing = h('div', { class: 'console-page sb-missing', hidden: true },
    h('a', { class: 'console-back', href: hrefOf('scenarios', 'builder') }, '← Your drafts'),
    h('h1', { id: 'scen-miss-h' }, 'Scenario builder'),
    h('p', { class: 'console-sub' }, 'This browser has no draft at this address. Drafts are kept per browser: one made in another browser, or before this site’s data was cleared, is not here.'));

  const el = h('div', { class: 'sb-root' }, start, editor, missing);
  let showing: 'start' | 'editor' | 'missing' = 'start';
  const showOnly = (w: typeof showing) => {
    showing = w;
    start.hidden = w !== 'start';
    editor.hidden = w !== 'editor';
    missing.hidden = w !== 'missing';
  };
  // a reload or a closed tab within the 300 ms: the change goes to the store's rescue slot synchronously (an IndexedDB
  // write started now may not land before the page is gone), and the next open takes it back
  addEventListener('pagehide', () => {
    if (open && dirty) store.rescue(open.meta.id, docOf(open.form) as unknown as Body);
  });
  // Ctrl+S (⌘S on a Mac): the draft saved in this browser now, and kept in the kit's folder
  addEventListener('keydown', (e) => {
    if (!el.isConnected || showing !== 'editor' || !open || e.key.toLowerCase() !== 's' || !(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
    e.preventDefault();
    void saveNow().then(() => keepInKit('ctrl-s'));
  });
  const kitEditing = (on: boolean) => {
    if (kitTimer !== null) clearInterval(kitTimer);
    kitTimer = on ? setInterval(() => void keepInKit('timer'), KIT_EVERY_MS) : null;
  };
  return {
    el,
    headingId: () => (showing === 'editor' ? 'scen-edit-h' : showing === 'missing' ? 'scen-miss-h' : 'scen-build-h'),
    enter(sub) {
      return (async () => {
        await Promise.all([store.ready(), kit.ready()]);
        if (!sub) {
          if (open) await saveNow();
          open = null;
          kitEditing(false);
          check.cancel();
          startErr.hidden = true;
          drawDrafts();
          await drawKit();
          return showOnly('start');
        }
        if (open?.meta.id === sub) return showOnly('editor');
        if (open) await saveNow();
        const meta = store.get(sub);
        const doc = meta ? await store.body(sub) : null;
        if (!meta || !doc) {
          open = null;
          return showOnly('missing');
        }
        const rescued = store.rescued(sub);
        mount(meta, rescued ?? doc);
        kitText = null;
        kitChip.classList.remove('bad');
        kitChipText.textContent = 'not kept yet (Ctrl+S)';
        kitRefusal.hidden = true;
        drawKitChip();
        kitEditing(!!kit.state?.on);
        showOnly('editor');
        if (rescued) {
          // the edit typed just before the page went away: written now, as any change is
          dirty = true;
          await saveNow();
        }
      })();
    },
    leave() {
      void saveNow();
      kitEditing(false);
    },
  };
}
