// Plan learner-action-remote.md L11 (§4 D2 item 5, D6; LQ2, LQ13 ruled 9 November): the learner remote's Labs tab. A
// learner sends an arterial or venous blood gas, a chemistry or a coagulation sample (`applyEvent lab` with the panel
// only: the host sets the analyser, a card the turnaround). The host's ack names the tick it applied the draw at; the
// sample is then a row "Arterial blood gas drawn 04:02 · Result expected 05:22 (Radiometer ABL825 FLEX, analyser time
// only)", the time read from the engine's own rows (engine-core analysers.ts `turnaroundFor`, the host's analyser when its
// commandApplied names one), never typed here. The result is this phone's OWN engine's `labResult` (every follower's
// engine freezes the same panel at the same tick and returns it after the same turnaround: no result crosses the wire),
// matched to this phone's draw by its panel and draw tick; it is shown at the event, by the renderer's `mountLabPanel`,
// flagged against its sourced ranges and marked at the Kost list's critical limits. A sample another phone or the
// instructor drew is never shown (LQ13, B); the engine's 1 Hz `labs` truth is never read. Earlier results stay listed,
// the latest draw first. A restart or a bookmark restore (the host's `timeline` event) clears the list.
import type { WireMessage } from '@pme/controller';
import { ANALYSER_IDS, sectionFor, TICK_S, turnaroundFor, type AnalyserId, type EngineEvent, type LabPanelId, type LabValues } from '@pme/engine-core';
import { mountLabPanel } from '@pme/renderer';
import { button, clock, h, setText } from '../ui.ts';
import type { Follower, FollowerCommand } from '../views/follower.ts';

/** The panels a learner may send (controller protocol.ts LEARNER_LAB_PANELS), with the words on their buttons. */
export const LAB_SENDS: ReadonlyArray<{ panel: LabPanelId; label: string }> = [
  { panel: 'abg', label: 'Arterial blood gas' },
  { panel: 'vbg', label: 'Venous blood gas' },
  { panel: 'chem', label: 'Chemistry' },
  { panel: 'coag', label: 'Coagulation' },
];
const nameOf = (p: LabPanelId) => LAB_SENDS.find((s) => s.panel === p)?.label ?? p;
/** The host's analyser row id, if it is one of the engine's rows (else the engine's default, as the engine reads it). */
const rowId = (x: string | undefined): AnalyserId | undefined => ((ANALYSER_IDS as readonly string[]).includes(x ?? '') ? (x as AnalyserId) : undefined);

export const LABS_WORDS = {
  sendTitle: 'Send a sample',
  samplesTitle: 'Samples from this phone',
  empty: 'No sample sent from this phone yet.',
  sending: 'Sent to the instructor’s computer…',
  sent: (what: string) => `${what}: drawn`,
  notSent: (why: string) => `Not sent: ${why}`,
  drawn: (what: string, t: number) => `${what} drawn ${clock(t)}`,
  /** The turnaround is the machine's or the laboratory's own time: the walk or the transport has no source and is not added (L10a). */
  expected: (t: number, where: string, kind: 'poc' | 'laboratory') => `Result expected ${clock(t)} (${where}, ${kind === 'poc' ? 'analyser time only' : 'laboratory time only, transport not included'})`,
  resulted: (t: number) => `Resulted ${clock(t)}`,
  noValues: 'The simulator computes none of this panel’s tests yet.',
  ranges: 'Ranges: adult reference ranges from the app’s glossary; “critical” at the limits of the Kost list (Shah et al. 2025). A dash: no sourced range, so not flagged.',
} as const;

/** The follower's side the tab needs: its command path, its messages (acks, commandApplied, timeline), its engine's events. */
export interface LabsLink {
  command(body: FollowerCommand): string;
  onMessage(fn: (m: WireMessage) => void): () => void;
  /** This phone's engine events (its `labResult`; its `labs` truth is never read). */
  onEngine(fn: (e: EngineEvent) => void): () => void;
  peerId: string;
  device: string;
}

/** The link of a granted learner follower. */
export function labsLink(f: Follower, device: string): LabsLink | null {
  if (!f.command) return null;
  const command = f.command;
  return { command, peerId: f.peerId, device, onMessage: (fn) => f.transport.onMessage(fn), onEngine: (fn) => f.monitor.on(fn) };
}

interface Sample {
  id: string;
  panel: LabPanelId;
  drawnAt: number;
  analyser: string | undefined;
  turnaroundS: number | undefined;
  result: { t: number; values: LabValues; analyser: string } | null;
  el: HTMLElement;
  title: HTMLElement;
  state: HTMLElement;
  table: HTMLElement;
  none: HTMLElement;
}

export interface Labs {
  el: HTMLElement;
  attach(link: LabsLink): () => void;
  /** This phone's samples, the latest draw first (a test's view). */
  readonly samples: ReadonlyArray<{ panel: LabPanelId; drawnAt: number; resulted: boolean }>;
}

/** The Labs tab: four Send buttons over this phone's samples. */
export function labsView(): Labs {
  /** A sent command's id → its panel, until the host answers. */
  const pending = new Map<string, LabPanelId>();
  const samples: Sample[] = [];
  let link: LabsLink | null = null;

  const said = h('p', { class: 'lr-said lr-lab-said', role: 'status' });
  const list = h('ul', { class: 'lr-tray-list lr-lab-list', 'aria-label': LABS_WORDS.samplesTitle });
  const empty = h('p', { class: 'hint lr-lab-empty' }, LABS_WORDS.empty);
  const sends = LAB_SENDS.map((s) => button(s.label, () => send(s.panel), 'primary lr-lab-send', { 'data-panel': s.panel }));
  const el = h('div', { class: 'lr-labs' },
    h('section', { class: 'lr-inf-section', 'aria-label': LABS_WORDS.sendTitle }, h('h2', { class: 'lr-h2' }, LABS_WORDS.sendTitle), h('div', { class: 'lr-lab-sends' }, ...sends), said),
    h('section', { class: 'lr-inf-section', 'aria-label': LABS_WORDS.samplesTitle }, h('h2', { class: 'lr-h2' }, LABS_WORDS.samplesTitle), empty, list, h('p', { class: 'hint lr-lab-ranges' }, LABS_WORDS.ranges)));

  function send(panel: LabPanelId): void {
    if (!link) return;
    pending.set(link.command({ type: 'applyEvent', event: { kind: 'lab', panel } }), panel);
    setText(said, LABS_WORDS.sending);
  }

  function draw(s: Sample): void {
    setText(s.title, LABS_WORDS.drawn(nameOf(s.panel), s.drawnAt));
    if (s.result) {
      setText(s.state, LABS_WORDS.resulted(s.result.t));
      s.state.dataset.state = 'resulted';
      mountLabPanel(s.table)(s.result.values, `${nameOf(s.panel)}, ${clock(s.drawnAt)}`, s.panel);
      s.table.hidden = Object.keys(s.result.values).length === 0;
      s.none.hidden = !s.table.hidden;
      return;
    }
    const { row } = sectionFor(s.panel, rowId(s.analyser));
    const due = s.drawnAt + (s.turnaroundS ?? turnaroundFor(s.panel, rowId(s.analyser)));
    setText(s.state, LABS_WORDS.expected(due, row.name, row.kind));
    s.state.dataset.state = 'pending';
  }

  function add(id: string, panel: LabPanelId, tick: number): Sample {
    const s: Sample = {
      id, panel, drawnAt: tick * TICK_S, analyser: undefined, turnaroundS: undefined, result: null,
      el: h('li', { class: 'lr-item lr-lab', 'data-panel': panel }),
      title: h('p', { class: 'lr-item-title lr-lab-title' }),
      state: h('p', { class: 'lr-state lr-lab-state' }),
      table: h('div', { class: 'lr-lab-result' }),
      none: h('p', { class: 'hint lr-lab-none' }, LABS_WORDS.noValues),
    };
    s.table.hidden = true;
    s.none.hidden = true;
    s.el.append(s.title, s.state, s.table, s.none);
    samples.push(s);
    samples.sort((a, b) => b.drawnAt - a.drawnAt);
    list.replaceChildren(...samples.map((x) => x.el));
    empty.hidden = true;
    draw(s);
    return s;
  }

  function onAck(commandId: string, accepted: boolean, tick: number, reason: string | undefined): void {
    const panel = pending.get(commandId);
    if (panel === undefined) return;
    pending.delete(commandId);
    said.dataset.ok = String(accepted);
    if (!accepted) return setText(said, LABS_WORDS.notSent(reason ?? ''));
    setText(said, LABS_WORDS.sent(nameOf(panel)));
    if (!samples.some((s) => s.id === commandId)) add(commandId, panel, tick);
  }

  /** The host's own applied draw of this phone's command: the analyser and turnaround it put on the event, if any. */
  function onApplied(commandId: string, resolved: unknown): void {
    const s = samples.find((x) => x.id === commandId);
    const ev = (resolved as { command?: { event?: { kind?: string; analyser?: unknown; turnaroundS?: unknown } } } | null)?.command?.event;
    if (!s || ev?.kind !== 'lab') return;
    s.analyser = typeof ev.analyser === 'string' ? ev.analyser : undefined;
    s.turnaroundS = typeof ev.turnaroundS === 'number' ? ev.turnaroundS : undefined;
    draw(s);
  }

  /** This phone's engine's result: shown only for a sample this phone drew (same panel, same draw tick). */
  function onResult(e: Extract<EngineEvent, { type: 'labResult' }>): void {
    const s = samples.find((x) => !x.result && x.panel === e.panel && Math.abs(x.drawnAt - e.drawnAt) < TICK_S / 2);
    if (!s) return;
    s.result = { t: e.t, values: e.values, analyser: e.analyser };
    draw(s);
  }

  function clear(): void {
    samples.length = 0;
    pending.clear();
    list.replaceChildren();
    empty.hidden = false;
    setText(said, '');
  }

  function attach(l: LabsLink): () => void {
    link = l;
    const offMsg = l.onMessage((m) => {
      if (m.kind === 'ack') return onAck(m.commandId, m.accepted, m.tick, m.reason);
      if (m.kind !== 'event') return;
      for (const e of m.body) {
        if (e.type === 'timeline') clear();
        if (e.type === 'commandApplied') onApplied(e.commandId, e.resolved);
      }
    });
    const offEngine = l.onEngine((e) => void (e.type === 'labResult' && onResult(e)));
    return () => {
      offMsg();
      offEngine();
      if (link === l) link = null;
    };
  }

  return { el, attach, get samples() { return samples.map((s) => ({ panel: s.panel, drawnAt: s.drawnAt, resulted: s.result !== null })); } };
}
