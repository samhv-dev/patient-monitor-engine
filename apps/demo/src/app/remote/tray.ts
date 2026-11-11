// Plan learner-action-remote.md L7 (§4 D2, D3, D7; LQ3, LQ7): the tray on the learner remote's Drugs tab. "Put on the
// tray" sends the bench's choice as `prep stage`; the host makes the preparation from the formulary and answers with its
// `prep` event (LearnerPrepNews: made, delivered, infusing, discarded, notice) addressed to this remote only. The tray
// shows the HOST's answer as the concentration (the phone's own arithmetic is a preview, labelled so, until it comes),
// each preparation's state on the case clock (preparing with its countdown, ready; "no source" for a time the formulary
// does not give: LQ7) and what is left. "Give" sends `prep deliver` (a volume or all, a route, over s); "Deliver the
// tray" sends every ready preparation in one stage group, one batch. A refusal is the host's own words, shown as they
// are ("given 4 s ago from the laptop", "not ready yet (0:42)"). When the instructor shows the incompatibility notice
// (LQ3: the host's `notice` news), the remote sounds it once, as an aide raising a concern in the room, and shows the
// finding with its source inside the preparation; before it nothing on the phone warns. A restart or a bookmark restore
// clears the host's preparation table, so the tray clears on the host's `timeline` event.
import { prepare, type Finding, type Formulary, type LearnerPrepNews, type LearnerPrepView, type Preparation, type WireMessage } from '@pme/controller';
import type { PkRoute } from '@pme/engine-core';
import { drugName } from '../glossary.ts';
import { button, clock, h, seg, select, setText, stepper, type Stepper } from '../ui.ts';
import type { FollowerCommand } from '../views/follower.ts';
import { hostPause } from '../views/follower-status.ts';
import { CONTAINER_WORDS, mmss, perMlText, sourceText, type BenchChoice } from './bench.ts';

/** The routes a bolus from a syringe takes on the bench [ENG: ui; the engine's injection routes, PkRoute, without the inhaled, nebulised and perineural ones a syringe on this tray is not given by]. */
export const TRAY_ROUTES: ReadonlyArray<[Extract<PkRoute, 'iv' | 'io' | 'im' | 'sc'>, string]> = [['iv', 'IV'], ['io', 'IO'], ['im', 'IM'], ['sc', 'SC']];
/** The longest "over" the tray offers, s [ENG: ui; ten minutes, the slowest push the library's bolus rows describe; longer is an infusion, L8]. */
export const TRAY_OVER_MAX_S = 600;
/** How often the countdowns redraw, ms [ENG: ui; four times a second keeps an m:ss countdown on the right second]. */
export const TRAY_REDRAW_MS = 250;
/** The notice's sound: two short tones [ENG: ui; 880 Hz, 150 ms each, 100 ms apart, at a fifth of full scale: a call for attention under the monitor's alarms, not one of them]. */
export const NOTICE_TONE = { hz: 880, ms: 150, gapMs: 100, gain: 0.2 } as const;

/** The finding's kind, as the phone says it after the notice. */
import { FINDING_WORDS } from '../prep-words.ts';
export { FINDING_WORDS }; // L13: one DOM-free place for a finding's words

export const TRAY_WORDS = {
  title: 'Tray',
  empty: 'The tray is empty. Prepare a drug and put it on the tray.',
  sending: 'Sent to the instructor’s computer…',
  preview: 'Preview on this phone, until the instructor’s computer answers',
  host: 'From the instructor’s computer',
  preparing: (left: number) => `Preparing · ready in ${mmss(left)}`,
  ready: 'Ready',
  readyNoSource: 'Ready · preparation time: no source',
  left: (ml: number) => `${+ml.toFixed(2)} mL left`,
  emptied: 'Empty',
  notMade: (why: string) => `Not made: ${why}`,
  notGiven: (why: string) => `Not given: ${why}`,
  notDiscarded: (why: string) => `Not discarded: ${why}`,
  given: (what: string, at: number) => `Given ${what} at ${clock(at)}`,
  all: 'All',
  part: 'Part',
  amount: 'Volume to give',
  route: 'Route',
  over: 'Over',
  overHint: '0 s: a push.',
  give: 'Give',
  discard: 'Discard',
  remove: 'Remove',
  deliver: 'Deliver the tray',
  deliverHint: 'Gives every ready syringe at once. A syringe of two drugs is given on its own.',
  cleared: 'The case started again on the instructor’s computer: the tray was cleared.',
  /** L14 (N117 ruled B): the host gives no learner's drug while the case is paused. */
  paused: 'The case is paused: nothing can be given until it resumes. You can still prepare.',
  notice: 'A concern about this preparation',
  noticeAt: (t: number) => `Raised at ${clock(t)}`,
} as const;

/** The follower's side the tray needs: its command path, its transport's messages, its peer id. */
export interface TrayLink {
  command(body: FollowerCommand): string;
  onMessage(fn: (m: WireMessage) => void): () => void;
  peerId: string;
}

export interface TrayOptions {
  formulary: Formulary;
  /** The case clock as this phone's engine runs it, s (null: not yet). */
  now(): number | null;
  /** The notice's sound (default: the tone, NOTICE_TONE). */
  tone?: () => void;
  /** A new preparation id ([a-z0-9]{8}, §4 D2), unique on this device (default: random). */
  newId?: () => string;
}

interface Item {
  id: string;
  choice: BenchChoice;
  preview: Preparation | null;
  view: LearnerPrepView | null;
  /** The stage command's id while the host has not answered. */
  staging: string | null;
  refused: boolean;
  noticed: boolean;
  el: HTMLElement;
  title: HTMLElement;
  conc: HTMLElement;
  source: HTMLElement;
  state: HTMLElement;
  said: HTMLElement;
  finding: HTMLElement;
  give: { box: HTMLElement; part: HTMLElement & { value: 'all' | 'part' }; ml: Stepper; route: HTMLSelectElement; over: Stepper; btn: HTMLButtonElement; discard: HTMLButtonElement };
}

export interface Tray {
  el: HTMLElement;
  /** Send the bench's choice as `prep stage` (nothing when no follower is attached). */
  stage(choice: BenchChoice): void;
  /** Take a granted follower: its acks and its `prep` and `timeline` events; returns the detach. */
  attach(link: TrayLink): () => void;
  /** The preparations on the tray, by id, with what the host said of each (a test's view). */
  readonly ids: string[];
  /** How many times the notice has sounded on this phone. */
  readonly sounded: number;
}

const randomId = (): string => {
  const a = new Uint8Array(8);
  crypto.getRandomValues(a);
  return [...a].map((x) => 'abcdefghijklmnopqrstuvwxyz0123456789'[x % 36]).join('');
};

/** The notice's two tones, from the page's own audio (no file); unlocked by a tap on the tray (a phone plays no sound before one). */
function noticeTone(): { unlock(): void; play(): void } {
  let ctx: AudioContext | null = null;
  return {
    unlock() {
      const AC = (globalThis as { AudioContext?: typeof AudioContext }).AudioContext;
      if (!ctx && AC) ctx = new AC();
      void ctx?.resume().catch(() => undefined);
    },
    play() {
      if (!ctx) return;
      const t0 = ctx.currentTime;
      for (const k of [0, 1]) {
        const at = t0 + (k * (NOTICE_TONE.ms + NOTICE_TONE.gapMs)) / 1000;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = NOTICE_TONE.hz;
        gain.gain.value = NOTICE_TONE.gain;
        osc.connect(gain).connect(ctx.destination);
        osc.start(at);
        osc.stop(at + NOTICE_TONE.ms / 1000);
      }
    },
  };
}

/** The tray: its preparations, each with its state and Give, and "Deliver the tray". */
export function trayView(o: TrayOptions): Tray {
  const f = o.formulary;
  const sound = noticeTone();
  const tone = o.tone ?? (() => sound.play());
  const newId = o.newId ?? randomId;
  const items = new Map<string, Item>();
  /** A give's (or a discard's) command id → the preparation and what it asked for. */
  const pending = new Map<string, { item: Item; what: 'give' | 'discard'; label: string }>();
  let link: TrayLink | null = null;
  let pause = hostPause(); // L14: the host's pause as this phone follows it (its "(paused)" mark reads the same)
  let sounded = 0;
  const listEl = h('ul', { class: 'lr-tray-list', 'aria-label': TRAY_WORDS.title });
  const emptyEl = h('p', { class: 'hint lr-tray-empty' }, TRAY_WORDS.empty);
  const cleared = h('p', { class: 'hint lr-tray-cleared', role: 'status' });
  const pausedNote = h('p', { class: 'lr-paused', role: 'status', hidden: true }, TRAY_WORDS.paused);
  const deliverBtn = button(TRAY_WORDS.deliver, () => deliverTray(), 'primary lr-deliver');
  const deliverHint = h('p', { class: 'hint' }, TRAY_WORDS.deliverHint);
  const el = h('section', { class: 'lr-tray', 'aria-label': TRAY_WORDS.title }, h('h2', { class: 'lr-h2' }, TRAY_WORDS.title), cleared, pausedNote, emptyEl, listEl, h('div', { class: 'lr-actions' }, deliverBtn), deliverHint);
  el.addEventListener('pointerdown', () => sound.unlock(), { capture: true });

  const names = (c: BenchChoice) => c.components.map((x) => {
    const d = Object.values(f.drugs).find((e) => e.products.some((p) => p.id === x.productId));
    return d ? drugName(d.drugId) : x.productId;
  }).join(' + ');
  const concText = (actives: Preparation['actives'], volumeMl: number) =>
    `${actives.map((a) => `${drugName(a.drugId)} ${perMlText(a.perMl, a.unit)}`).join(' + ')} · ${+volumeMl.toFixed(2)} mL`;
  const where = (x: Finding) => x.against === 'admixture' ? `with ${drugName(x.other)}` : `in ${f.diluents[x.other]?.name ?? x.other}`;

  function add(choice: BenchChoice): Item {
    const id = newId();
    const made = prepare(choice.components.map((c) => ({ ...c, drugId: Object.values(f.drugs).find((e) => e.products.some((p) => p.id === c.productId))?.drugId ?? '' })), choice.diluent, f, 0, choice.container);
    const ml = stepper({ label: TRAY_WORDS.amount, unit: 'mL', min: 0.1, max: 1000, step: 0.1, value: 1 });
    const part = seg<'all' | 'part'>(TRAY_WORDS.amount, [['all', TRAY_WORDS.all], ['part', TRAY_WORDS.part]], 'all', (v) => void (ml.el.hidden = v !== 'part'));
    ml.el.hidden = true;
    const route = select(TRAY_WORDS.route, TRAY_ROUTES as Array<[string, string]>, 'iv');
    const over = stepper({ label: TRAY_WORDS.over, unit: 's', min: 0, max: TRAY_OVER_MAX_S, step: 5, value: 0 });
    const it: Item = {
      id, choice, preview: made.ok ? made : null, view: null, staging: null, refused: false, noticed: false,
      el: h('li', { class: 'lr-item', 'data-prep': id }),
      title: h('p', { class: 'lr-item-title' }),
      conc: h('p', { class: 'lr-conc' }),
      source: h('p', { class: 'hint lr-conc-source' }),
      state: h('p', { class: 'lr-state', 'aria-live': 'polite' }),
      said: h('p', { class: 'lr-said', role: 'status' }),
      finding: h('div', { class: 'lr-finding', role: 'alert', hidden: true }),
      give: {
        box: h('div', { class: 'lr-give' }),
        part, ml, route: route.sel, over,
        btn: button(TRAY_WORDS.give, () => give(it), 'primary lr-give-btn'),
        discard: button(TRAY_WORDS.discard, () => discard(it), 'lr-discard'),
      },
    };
    setText(it.title, `${names(choice)} · ${CONTAINER_WORDS[choice.container]}`);
    it.give.box.append(
      h('div', { class: 'field' }, h('span', { class: 'lr-label' }, TRAY_WORDS.amount), part, ml.el),
      route.el,
      h('div', { class: 'field' }, h('span', { class: 'lr-label' }, `${TRAY_WORDS.over} (s)`), over.el, h('p', { class: 'hint' }, TRAY_WORDS.overHint)),
      h('div', { class: 'lr-actions' }, it.give.btn, it.give.discard),
    );
    it.el.append(it.title, it.conc, it.source, it.state, it.finding, it.said, it.give.box);
    items.set(id, it);
    listEl.append(it.el);
    return it;
  }

  function stage(choice: BenchChoice): void {
    if (!link) return;
    setText(cleared, '');
    const it = add(choice);
    it.staging = link.command({
      type: 'prep', action: 'stage',
      prep: { id: it.id, components: choice.components, ...(choice.diluent ? { diluent: choice.diluent } : {}), container: choice.container },
    });
    setText(it.said, TRAY_WORDS.sending);
    draw();
  }

  function give(it: Item, group?: { id: string; n: number }): void {
    if (!link || !it.view || pause.paused) return;
    const v = it.give.part.value === 'all' ? 'all' : it.give.ml.value;
    const over = it.give.over.value;
    const id = link.command({
      type: 'prep', action: 'deliver', prepId: it.id, volumeMl: v, route: it.give.route.value, ...(over > 0 ? { overS: over } : {}),
      ...(group ? { stageGroup: group.id, batch: group } : {}),
    });
    pending.set(id, { item: it, what: 'give', label: v === 'all' ? `${+it.view.leftMl.toFixed(2)} mL` : `${v} mL` });
    setText(it.said, TRAY_WORDS.sending);
  }

  function discard(it: Item): void {
    if (!it.view || !link) {
      // never made (refused) or no host: nothing on the host to discard
      items.delete(it.id);
      it.el.remove();
      return draw();
    }
    pending.set(link.command({ type: 'prep', action: 'discard', prepId: it.id }), { item: it, what: 'discard', label: '' });
  }

  /** The ready, single-drug preparations with something left: what "Deliver the tray" gives. */
  const trayable = (): Item[] => [...items.values()].filter((it) => it.view && it.view.actives.length === 1 && it.view.leftMl > 0 && isReady(it));
  const isReady = (it: Item) => !!it.view && (o.now() ?? -Infinity) >= it.view.ready.atS;

  function deliverTray(): void {
    const ready = trayable();
    if (ready.length === 0) return;
    const group = { id: `tray-${newId()}`, n: ready.length };
    for (const it of ready) give(it, group);
  }

  function drawItem(it: Item): void {
    const v = it.view;
    if (v) {
      setText(it.conc, concText(v.actives, v.volumeMl));
      setText(it.source, TRAY_WORDS.host);
      it.conc.dataset.from = 'host';
      const now = o.now();
      const left = now === null ? null : v.ready.atS - now;
      setText(it.state, v.leftMl <= 0 ? TRAY_WORDS.emptied : left !== null && left > 0 ? TRAY_WORDS.preparing(left) : v.ready.gap ? TRAY_WORDS.readyNoSource : `${TRAY_WORDS.ready} · ${TRAY_WORDS.left(v.leftMl)}`);
      it.state.dataset.state = v.leftMl <= 0 ? 'empty' : left !== null && left > 0 ? 'preparing' : 'ready';
    } else if (it.preview && !it.refused) {
      setText(it.conc, concText(it.preview.actives, it.preview.volumeMl));
      setText(it.source, TRAY_WORDS.preview);
      it.conc.dataset.from = 'preview';
      setText(it.state, '');
      it.state.dataset.state = 'sent';
    } else {
      setText(it.conc, '');
      setText(it.source, '');
      setText(it.state, '');
      it.state.dataset.state = it.refused ? 'refused' : 'sent';
    }
    it.give.btn.disabled = !v || v.leftMl <= 0 || pause.paused;
    it.give.box.hidden = !v && !it.refused;
    it.give.btn.hidden = it.refused;
    for (const x of [it.give.part, it.give.route.parentElement as HTMLElement, it.give.over.el.parentElement as HTMLElement]) x.hidden = it.refused;
    setText(it.give.discard, it.refused ? TRAY_WORDS.remove : TRAY_WORDS.discard);
  }

  function draw(): void {
    for (const it of items.values()) drawItem(it);
    emptyEl.hidden = items.size > 0;
    const n = trayable().length;
    deliverBtn.disabled = n === 0 || pause.paused;
    pausedNote.hidden = !pause.paused;
    deliverBtn.hidden = deliverHint.hidden = items.size === 0;
  }

  function showNotice(it: Item, n: NonNullable<LearnerPrepView['notice']>): void {
    it.finding.replaceChildren(
      h('p', { class: 'lr-finding-head' }, h('b', {}, TRAY_WORDS.notice), ` · ${TRAY_WORDS.noticeAt(n.shownAt)}`),
      ...n.findings.map((x) => h('p', { class: 'lr-finding-row', 'data-kind': x.kind },
        h('b', {}, `${FINDING_WORDS[x.kind]}: `), `${drugName(x.drugId)} ${where(x)}.`,
        ...(x.statement ? [` ${x.statement}`] : []),
        ...(x.src ? [h('span', { class: 'lr-finding-src' }, ` (${sourceText(f.sources[x.src], x.src)})`)] : []))),
    );
    it.finding.hidden = false;
    if (it.noticed) return;
    it.noticed = true;
    sounded++;
    el.dataset.sounded = String(sounded);
    tone();
  }

  function onNews(n: LearnerPrepNews, t: number): void {
    const it = items.get(n.prep.id);
    if (!it) return;
    it.view = n.prep;
    it.staging = null;
    if (n.news === 'made') setText(it.said, '');
    if (n.news === 'discarded') {
      items.delete(it.id);
      it.el.remove();
    }
    if (n.news === 'delivered') {
      const p = [...pending].find(([, x]) => x.item === it && x.what === 'give');
      if (p) pending.delete(p[0]);
      setText(it.said, TRAY_WORDS.given(p?.[1].label ?? '', t));
    }
    if (n.prep.notice) showNotice(it, n.prep.notice);
    draw();
  }

  function onAck(commandId: string, accepted: boolean, reason: string | undefined): void {
    const base = commandId.replace(/\.\d+$/, ''); // a two-drug preparation's items are acked as <id>, <id>.2 (L4)
    const staged = [...items.values()].find((x) => x.staging === base);
    if (staged) {
      if (accepted) return;
      staged.staging = null;
      staged.refused = true;
      setText(staged.said, TRAY_WORDS.notMade(reason ?? ''));
      return draw();
    }
    const p = pending.get(base);
    if (!p || accepted) return;
    pending.delete(base);
    setText(p.item.said, p.what === 'give' ? TRAY_WORDS.notGiven(reason ?? '') : TRAY_WORDS.notDiscarded(reason ?? ''));
  }

  function clear(): void {
    for (const it of items.values()) it.el.remove();
    const had = items.size > 0;
    items.clear();
    pending.clear();
    if (had) setText(cleared, TRAY_WORDS.cleared);
    draw();
  }

  function attach(l: TrayLink): () => void {
    link = l;
    pause = hostPause();
    const off = l.onMessage((m) => {
      pause.onMessage(m);
      if (m.kind === 'ack') return onAck(m.commandId, m.accepted, m.reason);
      if (m.kind === 'snapshot') return draw(); // the end of a welcome: the host's pause as it stands
      if (m.kind !== 'event') return;
      for (const e of m.body) {
        if (e.type === 'timeline') clear();
        if (e.type === 'prep' && e.to === l.peerId) onNews(e.body as LearnerPrepNews, e.t);
      }
      draw(); // the host's frames move the case clock too: the countdowns follow them as well as the timer
    });
    const timer = setInterval(draw, TRAY_REDRAW_MS);
    return () => {
      off();
      clearInterval(timer);
      if (link === l) link = null;
    };
  }

  draw();
  return { el, stage, attach, get ids() { return [...items.keys()]; }, get sounded() { return sounded; } };
}
