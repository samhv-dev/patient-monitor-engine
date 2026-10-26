// While the host fast-forwards, the window dims and blurs behind one centred panel — a double chevron in a ring of its
// colour, the two blinking together, "FAST FORWARD · 5 MIN" in amber in the monitor's typeface, a thin progress bar and
// the muted-sound icon (the owner's fast-forward, 22 Oct demonstration; his decisions of 7 Oct; his review FX-23). After
// it the panel fades and a banner says for FF_DONE_SHOW_MS, on two lines, how much was skipped and the alarms raised
// during it, with their times (owner's mockup m13); the alarms that came and went are latched on this window's monitor
// (`latch`). It reads a source (a ControllerSession on the instructor's page and a Remote, a ViewerSync on the second
// screen) and sits above every view, the monitor in full screen included — under the nav and the session bar, never on
// the Debrief or in print (UI-A #9, app.css).
import type { FastForwardAlarm, FastForwardDone } from '@pme/controller';
import { spanText } from './describe.ts';
import { clock, h, setText } from './ui.ts';

export interface FastForwardSource {
  readonly fastForward: { fromT: number; toT: number } | null;
  readonly lastFastForward: FastForwardDone | null;
}

/** The owner's spans: 2 min (the CPR pulse-check interval) and 5 min. */
export const FF_SPANS: readonly number[] = [120, 300];
/** The wall time a span is paced to (owner: long enough for the room to notice it), ms. */
export const FF_WALL_MS = 10_000;
/** How long the banner stays after the end (owner: ≈ 8 s), wall ms. */
export const FF_DONE_SHOW_MS = 8000;

const CHEVRONS = '<svg viewBox="0 0 48 32" aria-hidden="true"><path d="M6 4l14 12-14 12M24 4l14 12-14 12" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/></svg>';
/** The two lines of the banner after a fast-forward, worded here only: the span, the alarms during it. */
export function fastForwardDoneLines(done: FastForwardDone): [string, string] {
  const al = done.alarms.map((a) => `${a.text} ${clock(a.since)}`);
  return [
    `Fast-forwarded ${spanText(done.endT - done.fromT)}${done.stopped ? ` (stopped early: ${done.stopped})` : ''}`,
    al.length ? al.join(', ') : 'No alarms',
  ];
}

const MUTED = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

export function mountFastForward(
  parent: HTMLElement,
  src: FastForwardSource,
  o: { simT?: () => number | null; font?: () => string | undefined; latch?: (alarms: FastForwardAlarm[]) => void } = {},
): () => void {
  const icon = h('div', { class: 'ff-icon' });
  icon.innerHTML = CHEVRONS;
  const title = h('div', { class: 'ff-title' });
  const fill = h('div', { class: 'ff-fill' });
  const mute = h('div', { class: 'ff-mute' });
  mute.innerHTML = MUTED;
  mute.append(h('span', { class: 'sr-only' }, 'sound muted')); // the icon alone on screen (FX-23); the words for a screen reader
  const panel = h('div', { class: 'ff-panel', role: 'status' }, icon, title, h('div', { class: 'ff-bar', 'aria-hidden': 'true' }, fill), mute);
  const veil = h('div', { class: 'ff-veil' }, panel);
  const lines = [0, 1].map(() => h('div'));
  const banner = h('div', { class: 'ff-banner', role: 'status' }, ...lines);
  banner.hidden = true;
  parent.append(veil, banner);
  let seen = src.lastFastForward; // one that ended before this window opened is not news
  let endedAt = -Infinity;
  const draw = () => {
    const ff = src.fastForward;
    veil.classList.toggle('on', ff !== null);
    if (ff) {
      const at = Math.min(ff.toT, Math.max(ff.fromT, o.simT?.() ?? ff.fromT));
      title.style.fontFamily = o.font?.() ?? '';
      setText(title, `FAST FORWARD · ${spanText(ff.toT - ff.fromT).toUpperCase()}`);
      fill.style.width = `${(100 * (at - ff.fromT)) / (ff.toT - ff.fromT)}%`;
    }
    const done = src.lastFastForward;
    if (done && done !== seen) {
      seen = done;
      endedAt = performance.now();
      o.latch?.(done.alarms.filter((a) => a.ended));
    }
    banner.hidden = ff !== null || !done || performance.now() - endedAt >= FF_DONE_SHOW_MS;
    if (!banner.hidden && done) fastForwardDoneLines(done).forEach((text, i) => setText(lines[i] as HTMLElement, text));
  };
  const iv = setInterval(draw, 100);
  draw();
  return () => {
    clearInterval(iv);
    veil.remove();
    banner.remove();
  };
}
