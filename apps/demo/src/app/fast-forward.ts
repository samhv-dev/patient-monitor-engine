// Stage 10 (the owner's fast-forward, 22 Oct demonstration; his decisions of 7 Oct): while the host fast-forwards, the
// window dims and blurs behind one centred panel — a slowly pulsing double chevron, "FAST FORWARD · 5 MIN" in amber in
// the monitor's typeface, the simulated clock running from the start to the end time over a thin progress bar, and
// "sound muted". After it the panel fades and a banner says for FF_DONE_SHOW_MS what was skipped and the alarms raised
// during it, with their times; the alarms that came and went are latched on this window's monitor (`latch`). It reads a
// source (a ControllerSession on the instructor's page and a Remote, a ViewerSync on the second screen) and sits above
// every view, the monitor in full screen included.
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
const MUTED = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

export function mountFastForward(
  parent: HTMLElement,
  src: FastForwardSource,
  o: { simT?: () => number | null; font?: () => string | undefined; latch?: (alarms: FastForwardAlarm[]) => void } = {},
): () => void {
  const icon = h('div', { class: 'ff-icon' });
  icon.innerHTML = CHEVRONS;
  const title = h('div', { class: 'ff-title' });
  const now = h('div', { class: 'ff-now', 'aria-hidden': 'true' }); // the running clock is not read out ten times a second
  const fill = h('div', { class: 'ff-fill' });
  const from = h('span');
  const to = h('span');
  const mute = h('div', { class: 'ff-mute' });
  mute.innerHTML = MUTED;
  mute.append('sound muted');
  const panel = h('div', { class: 'ff-panel', role: 'status' }, icon, title, now, h('div', { class: 'ff-bar', 'aria-hidden': 'true' }, fill), h('div', { class: 'ff-ends', 'aria-hidden': 'true' }, from, to), mute);
  const veil = h('div', { class: 'ff-veil' }, panel);
  const banner = h('div', { class: 'ff-banner', role: 'status' });
  banner.hidden = true;
  parent.append(veil, banner);
  let seen = src.lastFastForward; // one that ended before this window opened is not news
  let endedAt = -Infinity;
  const draw = () => {
    const ff = src.fastForward;
    veil.classList.toggle('on', ff !== null);
    if (ff) {
      const at = Math.min(ff.toT, Math.max(ff.fromT, o.simT?.() ?? ff.fromT));
      const font = o.font?.();
      for (const el of [title, now]) el.style.fontFamily = font ?? '';
      setText(title, `FAST FORWARD · ${spanText(ff.toT - ff.fromT).toUpperCase()}`);
      setText(now, clock(at));
      fill.style.width = `${(100 * (at - ff.fromT)) / (ff.toT - ff.fromT)}%`;
      setText(from, clock(ff.fromT));
      setText(to, clock(ff.toT));
    }
    const done = src.lastFastForward;
    if (done && done !== seen) {
      seen = done;
      endedAt = performance.now();
      o.latch?.(done.alarms.filter((a) => a.ended));
    }
    banner.hidden = ff !== null || !done || performance.now() - endedAt >= FF_DONE_SHOW_MS;
    if (!banner.hidden && done) {
      const al = done.alarms.map((a) => `${a.text} ${clock(a.since)}`);
      setText(banner, `Fast-forwarded ${spanText(done.endT - done.fromT)}, ${clock(done.fromT)} → ${clock(done.endT)}.${done.stopped ? ` Stopped early: ${done.stopped}.` : ''} During it: ${al.length ? al.join(', ') : 'no alarms'}.`);
    }
  };
  const iv = setInterval(draw, 100);
  draw();
  return () => {
    clearInterval(iv);
    veil.remove();
    banner.remove();
  };
}
