// The scenario builder's page (docs/plans/scenario-builder.md §5, §8, mock-up 01-builder-main; piece B2), in place of
// the stub that explained the /1 format. `#/scenarios/builder` lists this browser's drafts, opens a /2 library card as a
// copy and imports a card file; `#/scenarios/builder/<draft>` is the editor: the card's outline, one section (Header and
// story, Patient and sensors, Case briefing; B3's Phases, phase-editor.ts; B4's Actions, action-editor.ts), and the checks with the draft's local history. Every change is written
// through `docOf`, checked by the controller's validator 300 ms after the last keystroke (`checker`), each line shown on
// its field (`fieldOf`), and saved in this browser 300 ms after the last change (layer 1, drafts.ts). Export writes
// the card file (Export waits while the validator refuses, unless this browser could not save the draft: then a file is
// the only copy). The blocks the next pieces edit (script, outcomes, debrief) are kept as the card has
// them and counted in the outline.
import { HOME_VERSION, REPO } from '../about.ts';
import { hhmm } from '../archive.ts';
import { hrefOf } from '../router.ts';
import { LIBRARY } from '../scenarios.ts';
import { button, confirmDialog, download, h, toast } from '../ui.ts';
import { cardFileName, cardFileText, readCardFile } from './card-file.ts';
import { checker, type Placed } from './checks.ts';
import { drafts as defaultDrafts, draftRefusalText, type Body, type DraftMeta, type Drafts, type SnapshotMeta } from './drafts.ts';
import { fieldOf } from './fields.ts';
import { docOf, formOf, type CardForm } from './form.ts';
import { actionSection } from './action-editor.ts';
import { actionWarnings } from './actions.ts';
import { phaseSection, phaseWarnings, type PhaseSectionView } from './phase-editor.ts';
import { sections, type SectionId, type SectionView, type Slot } from './sections.ts';
import './builder.css';

/** The pause after the last change before the draft is saved in this browser: the plan's 300 ms (§8). [ENG: ui] */
export const SAVE_DELAY_MS = 300;

/** A line in the checks: the validator's, or the builder's own (a library card's id). */
type Line = Placed & { by: 'validator' | 'builder' };

const hms = (ms: number): string => {
  const d = new Date(ms);
  return `${hhmm(ms)}:${String(d.getSeconds()).padStart(2, '0')}`;
};
const when = (ms: number, now = Date.now()): string =>
  new Date(ms).toDateString() === new Date(now).toDateString() ? hhmm(ms) : `${new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${hhmm(ms)}`;
const whyWords = (s: SnapshotMeta, m: DraftMeta): string =>
  s.why === 'opened' ? m.from : s.why === 'editing' ? 'after 2 min of editing' : s.why === 'export' ? 'exported' : s.why.replace(/^before restoring (\d+)$/, 'before snapshot $1 was restored');
const LIBRARY_V2 = () => LIBRARY.filter((c) => (c.doc as { schema?: string }).schema === 'pme-scenario/2');
const BLOCK_WORDS: ReadonlyArray<[key: string, label: string]> = [['script', 'Script (card-set)'], ['outcomes', 'Outcomes'], ['debriefHints', 'Debrief hints']];
const SECTION_OF_SLOT: Record<string, SectionId> = { header: 'header', patient: 'patient', briefing: 'briefing', phases: 'phases', actions: 'actions' };
/** The outline's groups (mock-up 01): the card's own sections, then its course. */
const OUTLINE: ReadonlyArray<[heading: string, ids: readonly SectionId[]]> = [['Card', ['header', 'patient', 'briefing']], ['Course', ['phases']], ['The team', ['actions']]];
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

export function builderPage(store: Drafts = defaultDrafts): BuilderPage {
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
    const m = await store.create({ ...(c.doc as unknown as Body), id: `${c.id}-copy` }, `a copy of the library card ${c.id}`);
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
        if (!(await confirmDialog('Delete this draft?', `“${m.title || m.cardId}” and its ${m.snapshots.length} snapshots are deleted from this browser. An exported file is not affected.`, 'Delete draft', true, 'Keep the draft'))) return;
        await store.remove(m.id);
        drawDrafts();
      })(), 'ghost', { 'aria-label': `Delete the draft ${m.title || m.cardId}` }),
      h('a', { class: 'btn', href: hrefOf('scenarios', `builder/${m.id}`), 'aria-label': `Open the draft ${m.title || m.cardId}` }, 'Open'),
    )) : [h('p', { class: 'hint' }, 'No drafts in this browser yet: open a library card as a copy, or import a card file.')]));
    holds.textContent = `${store.holdsLine()}, ${store.whereLine()}.`;
  };
  const start = h('div', { class: 'console-page sb-start' },
    h('a', { class: 'console-back', href: hrefOf('scenarios') }, '← Scenarios'),
    h('h1', { id: 'scen-build-h' }, 'Scenario builder'),
    h('p', { class: 'console-sub' }, 'Edit a card in this browser: open a library card as a copy, or import a card file. Every change is kept in this browser as you type, with snapshots you can go back to; Export file is the way to take a card elsewhere.'),
    startErr,
    h('section', { class: 'sb-block', 'aria-labelledby': 'sb-drafts-h' }, h('h2', { id: 'sb-drafts-h', class: 'scen-h3' }, 'Your drafts'), draftList, holds),
    h('section', { class: 'sb-block', 'aria-labelledby': 'sb-copy-h' }, h('h2', { id: 'sb-copy-h', class: 'scen-h3' }, 'Open a library card as a copy'),
      h('div', { class: 'scen-list' }, ...LIBRARY_V2().map((c) => h('div', { class: 'scen-item' },
        h('div', {}, h('p', { class: 't' }, c.title, ' ', h('code', {}, c.id)), h('p', { class: 'd' }, 'The copy gets its own id; the library card is not changed.')),
        h('span', {}),
        button('Open a copy', () => void openCopy(c.id), '', { 'aria-label': `Open a copy of ${c.title}` })))),
      h('p', { class: 'sb-hint' }, 'The library’s pme-scenario/1 cards open here once each is ported to pme-scenario/2.')),
    h('section', { class: 'sb-block', 'aria-labelledby': 'sb-import-h' }, h('h2', { id: 'sb-import-h', class: 'scen-h3' }, 'Import a card file'),
      h('p', { class: 'sb-hint' }, 'A pme-scenario/2 card file (an exported draft, a library card). The validator checks it first; a file it refuses is not opened.'),
      h('div', { class: 'scen-row' }, h('label', { class: 'btn', for: 'sb-import' }, 'Import a card file'), file,
        h('a', { class: 'btn', href: `https://${REPO}/blob/main/docs/guides/scenario-authoring.md`, target: '_blank', rel: 'noopener' }, 'Card documentation')),
      importErr));

  // ---------------------------------------------------------------------------------------------------- the editor
  const editor = h('div', { class: 'console-page sb-page' });
  let open: { meta: DraftMeta; form: CardForm; secs: SectionView[]; cur: SectionId; lines: Line[]; refused: string | null } | null = null;
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  /** A change not written yet. */
  let dirty = false;
  const chip = h('b', {});
  const saveChip = h('span', { class: 'sb-save' }, h('i', { 'aria-hidden': 'true' }), 'This browser · ', chip);
  const refusal = h('p', { class: 'sb-refuse sb-store-refuse', role: 'alert', hidden: true });
  const exportBtn = button('Export file', () => void doExport());
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
    const s = l.at.section;
    return s === 'header' || s === 'patient' || s === 'briefing' || s === 'phases' || s === 'actions' ? SECTION_OF_SLOT[s] ?? null : null;
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
    const count = (k: string) => (Array.isArray(F[k]) ? String((F[k] as unknown[]).length) : F[k] !== undefined ? '·' : '—');
    outline.replaceChildren(
      ...OUTLINE.flatMap(([heading, ids]) => [h('h2', {}, heading), ...o.secs.filter((s) => ids.includes(s.id)).map((s) => {
        const d = dot(s.id);
        return h('button', { type: 'button', class: 'sb-out', 'aria-current': o.cur === s.id ? 'true' : undefined, onclick: () => show(s.id) },
          h('span', { class: `sb-dot ${d}`, 'aria-hidden': 'true' }), s.title, s.id === 'phases' || s.id === 'actions' ? h('small', {}, count(s.id)) : null,
          d ? h('span', { class: 'sr-only' }, d === 'bad' ? ' (refused)' : ' (warning)') : null);
      })]),
      h('h2', {}, 'Kept as the card has them'),
      h('ul', { class: 'sb-kept' }, ...BLOCK_WORDS.map(([k, label]) => h('li', {}, label, h('small', {}, count(k))))),
      h('p', { class: 'sb-hint' }, 'Their editors are not built yet: these blocks are saved and exported exactly as the card has them.'),
    );
  };
  const show = (id: SectionId, focus?: HTMLElement) => {
    if (!open) return;
    open.cur = id;
    const sec = open.secs.find((s) => s.id === id)!;
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
      const words = `The ${l.by} ${l.kind === 'refusal' ? 'refuses' : 'warns'}: `;
      slot.msgs.append(h('p', { class: l.kind === 'refusal' ? 'sb-refuse' : 'sb-warnline' }, h('span', {}, words, lineOf(l.line))));
      if (l.kind === 'refusal') slot.el.classList.add('bad');
      const ctls = l.at.row !== undefined && slot.controls[l.at.row] ? [slot.controls[l.at.row]!] : slot.controls;
      for (const c of ctls) {
        if (l.kind === 'refusal') c.setAttribute('aria-invalid', 'true');
        c.setAttribute('aria-describedby', `${slot.msgs.id} ${c.dataset.describedby ?? ''}`.trim());
      }
    }
    for (const s of open.secs) if (hasSlotFor(s)) s.placed(lines);
    // the checks column: the count, each line linked to its field, the facts
    const refusals = lines.filter((l) => l.kind === 'refusal');
    const warnings = lines.filter((l) => l.kind === 'warning');
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
      }, 'small ghost', { 'aria-label': `Show ${l.line.split(':')[0]} at its field` }) : h('small', {}, 'In a block whose editor is not built yet: fix it in the card file.');
      return h('li', { class: l.kind === 'refusal' ? 'bad' : 'warn' }, l.by === 'builder' ? 'The builder: ' : '', lineOf(l.line), go);
    };
    checksList.replaceChildren(
      refusals.length
        ? h('li', { class: 'bad' }, `The validator refuses this draft: ${refusals.length} ${refusals.length === 1 ? 'refusal' : 'refusals'}`, h('small', {}, 'Each is shown at its field; Export waits for 0.'))
        : h('li', {}, 'The validator accepts this draft', h('small', {}, warnings.length ? `${warnings.length} ${warnings.length === 1 ? 'warning' : 'warnings'}: they do not block a draft.` : 'No warnings.')),
      ...refusals.map(item), ...warnings.map(item),
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
    storeLine.textContent = `${store.holdsLine()}, ${store.whereLine()}.`;
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
    place([...builder, ...placed.map((p) => ({ ...p, by: 'validator' as const }))]);
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
    open = { meta, form, secs: [], cur, lines: [], refused: null };
    const placeAgain = () => {
      if (open?.form === form) place(open.lines);
    };
    open.secs = [...sections(form, changed), phaseSection(form, changed, placeAgain), actionSection(form, changed, placeAgain)];
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
      h('div', { class: 'sb-topr' }, h('div', { class: 'sb-saves', role: 'status', 'aria-label': 'Where this draft is saved' }, saveChip), h('div', { class: 'sb-acts' }, exportBtn))),
    refusal,
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
  return {
    el,
    headingId: () => (showing === 'editor' ? 'scen-edit-h' : showing === 'missing' ? 'scen-miss-h' : 'scen-build-h'),
    enter(sub) {
      return (async () => {
        await store.ready();
        if (!sub) {
          if (open) await saveNow();
          open = null;
          check.cancel();
          startErr.hidden = true;
          drawDrafts();
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
    },
  };
}
