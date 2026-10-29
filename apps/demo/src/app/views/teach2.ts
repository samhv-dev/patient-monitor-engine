// Instructor v2 (design `docs/plans/instructor-panel-redesign.md` §3, board "Proposal v6"; plan IP4): a second Instructor
// view beside today's, on the route `teach2`. Its own session bar (header.ts) replaces the shell's, which the shell hides
// here; under it the stage strip, then STATE (the cue box over the shell's one monitor stage, placed by CSS grid so the
// renderer is untouched) and ACTION, then the dock. The strip, the cue box, ACTION and the sheets are slots with a fixed
// signature (teach2/ctx.ts) that IP5–IP7 fill; the view repaints them ≤ 2 Hz while it is shown.
import '../teach2/teach2.css';
import type { Link } from '../link.ts';
import type { SiteProfile } from '../site.ts';
import type { View } from '../shell.ts';
import { h, throttle } from '../ui.ts';
import { mount as mountAction } from '../teach2/action.ts';
import type { Slot, Teach2Ctx } from '../teach2/ctx.ts';
import { mount as mountCue } from '../teach2/cue.ts';
import { mountDock } from '../teach2/dock.ts';
import { mountHeader } from '../teach2/header.ts';
import { mountKeys } from '../teach2/keys.ts';
import { mount as mountSheets } from '../teach2/sheets.ts';
import { mount as mountStrip } from '../teach2/strip.ts';

export interface Teach2View extends View {
  /** Open a sheet by id (the alarm count opens 'devices'); nothing until IP7 builds the sheets. */
  openSheet(id: string): void;
  destroy(): void;
}

/** The Instructor v2 view on `link`, for `shell.add`. */
export function teach2View(link: Link, o: { site: SiteProfile; weightKg(): number }): Teach2View {
  const header = mountHeader(link);
  const dock = mountDock(link);
  const strip = h('nav', { class: 'ip2-strip', 'aria-label': 'Stages' });
  // the paused banner's row, full width under the strip (board "v9 paused"; IP9, ruling 3): cue.ts makes and paints the
  // banner, and the view moves it here once the cue box is mounted
  const paused = h('div', { class: 'ip2-paused-row' });
  const cue = h('div', { class: 'ip2-cue' });
  const state = h('section', { class: 'ip2-state', 'aria-labelledby': 'ip2-state-h' }, h('h2', { id: 'ip2-state-h', class: 'ip2-colhead' }, 'STATE'), cue);
  const actionBody = h('div', { class: 'ip2-action-body' });
  const action = h('section', { class: 'ip2-action', 'aria-labelledby': 'ip2-action-h' }, h('h2', { id: 'ip2-action-h', class: 'ip2-colhead' }, 'ACTION'), actionBody);
  const sheets = h('div', { class: 'ip2-sheets' });
  const el = h('section', { class: 'ip2', 'aria-labelledby': 'ip2-h' },
    h('h1', { id: 'ip2-h', class: 'sr-only' }, 'Instructor v2'), header.el, strip, paused, state, action, sheets, dock.el);

  const keys = mountKeys(el, { link, togglePause: header.togglePause });
  const ctx: Teach2Ctx = { link, site: o.site, weightKg: o.weightKg, keys, dock: { tools: dock.tools, note: dock.note }, openSheet: () => undefined };
  // The sheets mount first: IP7 may replace ctx.openSheet
  const slots: Slot[] = [mountSheets(sheets, ctx), mountStrip(strip, ctx), mountCue(cue, ctx), mountAction(actionBody, ctx)];
  const banner = cue.querySelector('.ip2-paused');
  if (banner) paused.append(banner);

  const repaint = throttle(() => {
    if (el.hidden) return;
    header.refresh();
    dock.refresh();
    for (const s of slots) s.refresh();
  }, 500);
  const offLink = link.onChange(repaint);
  const tick = setInterval(repaint, 1000); // the clock and the in-stage times move with sim time even without events

  return {
    id: 'teach2', el,
    enter: () => {
      header.refresh();
      dock.refresh();
      for (const s of slots) s.refresh();
    },
    openSheet: (id) => ctx.openSheet(id),
    destroy: () => {
      offLink();
      clearInterval(tick);
      keys.destroy();
      header.destroy();
      for (const s of slots) s.destroy();
    },
  };
}
