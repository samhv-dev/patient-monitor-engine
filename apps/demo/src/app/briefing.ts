// The Case briefing (the owner's board Orientation 7b and its phone and Persian twins, 30 October): when a card with a
// `briefing` loads, every learners' screen — the host's Monitor view, a second-screen learner monitor and every phone —
// shows it over the running monitor for `durationS` seconds, then fades (600 ms) into the monitor. The monitor keeps
// running underneath at 40 % behind one frost; the text is start-aligned at a 62-character measure: "Case briefing",
// the estimated scenario time, the paragraphs, then a footer over a hairline counting down to the monitor; a 3-px line
// along the bottom edge fills as the time passes. No ring, no chips, no eyebrow. A tap or click ends it on that screen;
// the instructor's "End briefing" ends it everywhere: in today's Instructor view over the panel, in Instructor v2's
// status line under the stage strip (the owner's choice of 31 October; teach2/strip.ts, `briefingStatusText`).
// ONE render function (`renderBriefing`) and one layer (`briefingLayer`) serve the host and the followers; the host
// feeds it from its session, a follower from the wire (`followBriefing`: the start time and the message's `sentAt`
// are both the host's clock, so a phone that joins late shows the remainder whatever its own clock says).
// Persian (`lang: 'fa'`): dir="rtl", lang="fa", leading 1.8, the Vazirmatn stack (no font file in the kit: a machine
// without it falls back to Segoe UI or Tahoma), Persian digits in the chrome's numbers, and the chrome strings as
// written and checked with the project's Persian tooling (owner-review/instructor-ux/empty-finish/briefing-fa.md).
import './briefing.css';
import { epochNow, type BriefingNotice, type WireMessage } from '@pme/controller';
import { EDUCATION_LINE } from './about.ts';
import type { AppSession } from './session.ts';
import { button, h, setText } from './ui.ts';

/** The fade into the monitor, ms (the board: about 600 ms). */
export const BRIEFING_FADE_MS = 600;
const TICK_MS = 250;
const ZWNJ = '‌';

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
/** Western digits as Persian ones (the chrome's numbers of a Persian briefing). */
export const faDigits = (s: string): string => s.replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)] as string);
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** The chrome around the card's text, per language: [before, the bold part, after]. */
const CHROME = {
  en: {
    title: 'Case briefing',
    est: (n: number): [string, string] => ['Estimated scenario time ', `about ${n} minute${n === 1 ? '' : 's'}`],
    count: (t: string): [string, string, string] => ['The monitor appears in ', t, ''],
    skip: (phone: boolean) => (phone ? 'Tap anywhere to continue now' : 'Tap or click anywhere to continue now'),
    num: (s: string) => s,
    edu: EDUCATION_LINE,
  },
  fa: {
    title: 'معرفی سناریو',
    est: (n: number): [string, string] => ['زمان تقریبی سناریو: ', `حدود ${faDigits(String(n))} دقیقه`],
    count: (t: string): [string, string, string] => ['مانیتور تا ', t, ` دیگر نمایش داده می${ZWNJ}شود`],
    skip: (phone: boolean) => (phone ? 'برای ادامه، هر جای صفحه را لمس کنید' : 'برای ادامه، هر جای صفحه را لمس یا کلیک کنید'),
    num: faDigits,
    edu: 'فقط برای آموزش؛ برای مراقبت از بیمار استفاده نشود.',
  },
} as const;

/** The briefing's paragraphs: its text split at blank lines. */
export const paragraphsOf = (text: string): string[] => text.split(/\n[ \t]*\n/).map((p) => p.trim()).filter(Boolean);

/**
 * THE briefing, drawn (host and followers alike): the layer element and `set(remainingS, progress)`, which writes the
 * countdown and the bottom line (progress 0 → 1).
 */
export function renderBriefing(b: Pick<BriefingNotice, 'text' | 'estimatedMinutes' | 'lang'>, phone: boolean): { el: HTMLElement; set(remainingS: number, progress: number): void } {
  const c = CHROME[b.lang] ?? CHROME.en;
  const count = h('b', { class: 'cb-count' });
  const fill = h('div', { class: 'cb-fill' });
  const [before, , after] = c.count('');
  const paras = paragraphsOf(b.text);
  const est = b.estimatedMinutes !== undefined ? c.est(b.estimatedMinutes) : null;
  const el = h('div', { class: 'case-briefing', dir: b.lang === 'fa' ? 'rtl' : 'ltr', lang: b.lang, 'data-phone': phone },
    h('div', { class: 'cb-frost', 'aria-hidden': 'true' }),
    h('div', { class: 'cb-pool', 'aria-hidden': 'true' }),
    h('div', { class: 'cb-body', role: 'dialog', 'aria-label': c.title },
      h('div', { class: 'cb-title' }, c.title),
      est ? h('div', { class: 'cb-est' }, est[0], h('b', {}, est[1])) : null,
      ...paras.map((p, i) => h('p', { class: paras.length > 1 && i === paras.length - 1 ? 'cb-p cb-last' : 'cb-p' }, p)),
      h('div', { class: 'cb-foot' }, h('span', {}, before, count, after), h('span', {}, c.skip(phone)))),
    h('div', { class: 'cb-bar', 'aria-hidden': 'true' }, fill),
    h('div', { class: 'cb-edu' }, c.edu));
  return {
    el,
    set: (remainingS, progress) => {
      setText(count, c.num(mmss(Math.max(0, remainingS))));
      fill.style.width = `${(Math.min(1, Math.max(0, progress)) * 100).toFixed(2)}%`;
    },
  };
}

export interface BriefingLayer {
  /** Show `b`, started at `startMs` on this layer's clock; the same briefing again (a welcome re-sent) changes nothing,
   *  nor does one this screen has ended. */
  show(b: BriefingNotice, startMs: number): void;
  /** End it here, fading into the monitor (only that briefing, when `startedAt` is given). */
  end(startedAt?: number): void;
  /** This layer's clock, ms. */
  now(): number;
}

/** The briefing layer over a learners' monitor (the shell's stage: its monitor host dims under it). */
export function briefingLayer(stage: HTMLElement, o: { phone: boolean; now?: () => number }): BriefingLayer {
  const now = o.now ?? (() => performance.now());
  let cur: { b: BriefingNotice; start: number; el: HTMLElement; timer: ReturnType<typeof setInterval> } | null = null;
  const done = new Set<number>(); // the briefings ended on this screen, by start time
  const remainingMs = (x: { b: BriefingNotice; start: number }) => x.b.durationS * 1000 - (now() - x.start);
  const drop = (fade: boolean) => {
    if (!cur) return;
    const { el, timer, b } = cur;
    cur = null;
    done.add(b.startedAt);
    clearInterval(timer);
    delete stage.dataset.briefing; // the monitor comes back with the same fade
    if (!fade) return el.remove();
    el.classList.add('cb-out');
    setTimeout(() => el.remove(), BRIEFING_FADE_MS);
  };
  const layer: BriefingLayer = {
    now,
    show(b, start) {
      if (done.has(b.startedAt) || cur?.b.startedAt === b.startedAt) return;
      if (remainingMs({ b, start }) <= 0) return void done.add(b.startedAt);
      drop(false); // a new card's briefing replaces the old one at once
      const view = renderBriefing(b, o.phone);
      const tick = () => {
        if (!cur) return;
        const left = remainingMs(cur);
        if (left <= 0) return drop(true);
        view.set(Math.ceil(left / 1000 - 1e-9), 1 - left / (b.durationS * 1000));
      };
      view.el.addEventListener('click', () => drop(true)); // this screen only
      cur = { b, start, el: view.el, timer: setInterval(tick, TICK_MS) };
      tick();
      stage.dataset.briefing = 'on';
      stage.append(view.el);
    },
    end(startedAt) {
      if (cur && (startedAt === undefined || cur.b.startedAt === startedAt)) drop(true);
    },
  };
  return layer;
}

/** A follower's side: the host's `briefing` events in one message, on its layer (the remainder of a running one). */
export function followBriefing(layer: BriefingLayer, m: WireMessage): void {
  if (m.kind !== 'event') return;
  for (const e of m.body) {
    if (e.type !== 'briefing') continue;
    if (e.ended) layer.end(e.startedAt);
    else layer.show(e, layer.now() - Math.max(0, m.sentAt - e.startedAt));
  }
}

/** The host's side: its Monitor view's layer follows the session's briefing (hidden by CSS on the other views). */
export function mountHostBriefing(stage: HTMLElement, session: Pick<AppSession, 'onBriefing'>): BriefingLayer {
  const layer = briefingLayer(stage, { phone: false });
  session.onBriefing((b) => (b ? layer.show(b, layer.now() - Math.max(0, epochNow() - b.startedAt)) : layer.end()));
  return layer;
}

/** A running briefing's whole seconds left, on the host's clock. */
export const briefingLeftS = (b: Pick<BriefingNotice, 'durationS' | 'startedAt'>): number => Math.max(0, Math.ceil(b.durationS - (epochNow() - b.startedAt) / 1000 - 1e-9));

/** Instructor v2's status line while a briefing runs (beside its End briefing): "Case briefing on every screen · 0:48 left". */
export const briefingStatusText = (leftS: number): string => `Case briefing on every screen · ${mmss(leftS)} left`;

/** Today's Instructor view's "End briefing", with the time left; shown only while a briefing runs. */
export function briefingEnd(session: Pick<AppSession, 'onBriefing' | 'endBriefing'>): HTMLElement {
  const left = h('span', { class: 'cb-end-t' });
  const el = h('div', { class: 'cb-end', role: 'group', 'aria-label': "The learners' case briefing", hidden: true },
    h('span', {}, "Case briefing on the learners' screens "), left, button('End briefing', () => session.endBriefing(), 'small'));
  let timer: ReturnType<typeof setInterval> | null = null;
  session.onBriefing((b) => {
    if (timer !== null) clearInterval(timer);
    timer = null;
    el.hidden = !b;
    if (!b) return;
    const draw = () => setText(left, mmss(briefingLeftS(b)));
    draw();
    timer = setInterval(draw, 500);
  });
  return el;
}
