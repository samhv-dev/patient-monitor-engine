// Plan learner-action-remote.md L15 (§4 D6; LQ13 ruled B, 9 November: a remote sees its own samples, the laptop sees every
// result): the laptop's Labs sheet in Instructor v2. It lists every sample the host's engine took, by draw time (the latest
// first, as the phone lists its own), with who drew it: the learner remote by the name Room setup gave it, the instructor,
// the instructor's phone or the scenario card. A sample still in the analyser is pending with its expected time, in the
// phone's own words (remote/labs.ts LABS_WORDS; the time from the engine's rows, analysers.ts `turnaroundFor`, or the
// turnaround the host wrote on the event); a returned one is the host engine's `labResult`, shown by the renderer's
// `mountLabPanel` with the phone's caption, so the instructor reads the table the learner read. The engine's 1 Hz `labs`
// truth is never read: the book takes `labResult` events and nothing else from the engine. There is no draw button (the
// instructor's own sample button is not ruled). The book listens from the view's mount, so a sample drawn before the
// sheet is first opened is listed; a restart clears it, a return to a bookmark keeps what was drawn before the bookmark
// and makes a result returned after it pending again (the restored engine returns it once more).
import { LEARNER_ISSUED_BY, type AppliedResolution, type WireEvent } from '@pme/controller';
import { ANALYSER_IDS, sectionFor, TICK_S, turnaroundFor, type AnalyserId, type EngineEvent, type LabPanelId, type LabValues } from '@pme/engine-core';
import { mountLabPanel } from '@pme/renderer';
import { LAB_SENDS, LABS_WORDS } from '../remote/labs.ts';
import type { AppSession } from '../session.ts';
import { clock, h, setText } from '../ui.ts';
import type { SheetFrame } from './sheet.ts';

export const LAB_SHEET_WORDS = {
  title: 'Every sample of the case',
  empty: 'No sample drawn in this case yet.',
  by: (who: string) => `Drawn by ${who}`,
  instructor: 'Instructor',
  phone: 'Instructor’s phone',
  card: 'Scenario card',
  unnamed: 'a learner remote (no name in Room setup)',
  unknown: 'no one named (the draw is not in this page’s record)',
  primary: 'Results as the analyser returns them; nothing is drawn from this sheet',
} as const;

/** What the book reads of the host: its panel transport's wire events, its engine's events, Room setup's names. */
export interface LabsSource {
  onWire(fn: (e: WireEvent) => void): () => void;
  onEngine(fn: (e: EngineEvent) => void): () => void;
  deviceName(key: string): string | null;
}

/** The host's source (the laptop's AppSession): every source's commands, in order, as the record reads them. */
export function hostLabsSource(host: Pick<AppSession, 'panelTransport' | 'onEvent' | 'deviceName'>): LabsSource {
  return {
    onWire: (fn) => host.panelTransport.onMessage((m) => void (m.kind === 'event' && m.body.forEach(fn))),
    onEngine: (fn) => host.onEvent(fn),
    deviceName: (key) => host.deviceName(key),
  };
}

export interface LabSample {
  panel: LabPanelId;
  drawnAt: number;
  who: string;
  analyser: string | undefined;
  turnaroundS: number | undefined;
  result: { t: number; values: LabValues; analyser: string } | null;
}

const nameOf = (p: LabPanelId) => LAB_SENDS.find((s) => s.panel === p)?.label ?? p;
const rowId = (x: string | undefined): AnalyserId | undefined => ((ANALYSER_IDS as readonly string[]).includes(x ?? '') ? (x as AnalyserId) : undefined);

/** Every sample of the host's engine since its last restart. */
export class LabBook {
  private list: LabSample[] = [];
  private readonly fns = new Set<() => void>();
  private readonly offs: Array<() => void>;
  private readonly src: LabsSource;

  constructor(src: LabsSource) {
    this.src = src;
    this.offs = [
      src.onWire((e) => this.wire(e)),
      src.onEngine((e) => void (e.type === 'labResult' && this.result(e))), // the type only: `labs` and `truth` are never read
    ];
  }

  /** The samples, the latest draw first. */
  get entries(): readonly LabSample[] {
    return this.list;
  }

  onChange(fn: () => void): () => void {
    this.fns.add(fn);
    return () => void this.fns.delete(fn);
  }

  destroy(): void {
    for (const off of this.offs) off();
    this.fns.clear();
  }

  private who(c: Record<string, unknown>): string {
    if (c.issuedBy === LEARNER_ISSUED_BY) return (typeof c.by === 'string' ? this.src.deviceName(c.by) : null) ?? LAB_SHEET_WORDS.unnamed;
    if (c.issuedBy === 'scenario') return LAB_SHEET_WORDS.card;
    if (c.issuedBy === 'remote') return LAB_SHEET_WORDS.phone;
    return LAB_SHEET_WORDS.instructor;
  }

  private wire(e: WireEvent): void {
    if (e.type === 'timeline') {
      if (e.cause === 'restore') {
        // the bookmark's engine holds every sample drawn before it, and returns again what it returned after it
        this.list = this.list.filter((s) => s.drawnAt <= e.t + TICK_S / 2);
        for (const s of this.list) if (s.result && s.result.t > e.t + TICK_S / 2) s.result = null;
      } else this.list = [];
      return this.changed();
    }
    if (e.type !== 'commandApplied') return;
    const r = e.resolved as AppliedResolution | undefined;
    const c = r?.command as unknown as (Record<string, unknown> & { event?: { kind?: unknown; panel?: unknown; analyser?: unknown; turnaroundS?: unknown } }) | undefined;
    if (!c || r?.replay || r?.mirror || c.type !== 'applyEvent' || c.event?.kind !== 'lab' || typeof c.event.panel !== 'string') return;
    const ev = c.event;
    this.add({
      panel: ev.panel as LabPanelId, drawnAt: e.tick * TICK_S, who: this.who(c),
      analyser: typeof ev.analyser === 'string' ? ev.analyser : undefined, turnaroundS: typeof ev.turnaroundS === 'number' ? ev.turnaroundS : undefined, result: null,
    });
  }

  private result(e: Extract<EngineEvent, { type: 'labResult' }>): void {
    const result = { t: e.t, values: e.values, analyser: e.analyser };
    const s = this.list.find((x) => !x.result && x.panel === e.panel && Math.abs(x.drawnAt - e.drawnAt) < TICK_S / 2);
    // a result whose draw this page did not see is still a result of this engine: listed, no one named
    if (!s) return this.add({ panel: e.panel, drawnAt: e.drawnAt, who: LAB_SHEET_WORDS.unknown, analyser: e.analyser, turnaroundS: undefined, result });
    s.result = result;
    this.changed();
  }

  private add(s: LabSample): void {
    this.list.push(s);
    this.list.sort((a, b) => b.drawnAt - a.drawnAt);
    this.changed();
  }

  private changed(): void {
    for (const fn of [...this.fns]) fn();
  }
}

/** The state line of a sample: the phone's words (pending: its expected time and where it runs; returned: when). */
function stateText(s: LabSample): string {
  if (s.result) return LABS_WORDS.resulted(s.result.t);
  const { row } = sectionFor(s.panel, rowId(s.analyser));
  return LABS_WORDS.expected(s.drawnAt + (s.turnaroundS ?? turnaroundFor(s.panel, rowId(s.analyser))), row.name, row.kind);
}

/** Fill `frame` (the sheets slot's frame for 'labs') from `book`; redrawn when the book changes. */
export function labsSheet(frame: SheetFrame, book: LabBook): { refresh(): void; destroy(): void } {
  frame.groups([], '', () => undefined);
  const list = h('ul', { class: 'ip2-lab-list', 'aria-label': LAB_SHEET_WORDS.title });
  const empty = h('p', { class: 'hint ip2-lab-empty' }, LAB_SHEET_WORDS.empty);
  frame.left.append(h('h3', { class: 'ip2-sheet-sub' }, LAB_SHEET_WORDS.title), empty, list, h('p', { class: 'hint ip2-lab-ranges' }, LABS_WORDS.ranges));
  setText(frame.primary, LAB_SHEET_WORDS.primary);
  frame.primary.classList.add('ip2-sheet-hint');
  // one element per sample, kept across redraws (a row under the pointer or the reader's eye stays the same element);
  // its contents are redrawn only when the sample changed
  const rows = new Map<LabSample, { el: HTMLElement; sig: string }>();
  const fill = (s: LabSample, el: HTMLElement) => {
    const table = h('div', { class: 'lr-lab-result' });
    const none = h('p', { class: 'hint lr-lab-none' }, LABS_WORDS.noValues);
    table.hidden = none.hidden = true;
    if (s.result) {
      mountLabPanel(table)(s.result.values, `${nameOf(s.panel)}, ${clock(s.drawnAt)}`, s.panel);
      table.hidden = Object.keys(s.result.values).length === 0;
      none.hidden = !table.hidden;
    }
    el.replaceChildren(
      h('p', { class: 'lr-lab-title' }, LABS_WORDS.drawn(nameOf(s.panel), s.drawnAt)),
      h('p', { class: 'ip2-lab-who' }, LAB_SHEET_WORDS.by(s.who)),
      h('p', { class: 'lr-lab-state', 'data-state': s.result ? 'resulted' : 'pending' }, stateText(s)),
      table, none);
  };
  const draw = () => {
    const all = book.entries;
    for (const k of [...rows.keys()]) if (!all.includes(k)) rows.delete(k);
    for (const s of all) {
      const sig = JSON.stringify(s);
      let r = rows.get(s);
      if (!r) rows.set(s, (r = { el: h('li', { class: 'ip2-lab', 'data-panel': s.panel }), sig: '' }));
      if (r.sig !== sig) fill(s, r.el);
      r.sig = sig;
    }
    empty.hidden = all.length > 0;
    const els = all.map((s) => (rows.get(s) as { el: HTMLElement }).el);
    if (els.length !== list.children.length || els.some((e, i) => list.children[i] !== e)) list.replaceChildren(...els);
  };
  const off = book.onChange(() => frame.isOpen && draw());
  draw();
  return { refresh: draw, destroy: off };
}
