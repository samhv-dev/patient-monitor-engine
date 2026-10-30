// Instructor v2 (design `docs/plans/instructor-panel-redesign.md` §3, board "Proposal v6"; plan IP4): a second Instructor
// view beside today's, on the route `teach2`. Its own session bar (header.ts) replaces the shell's, which the shell hides
// here; under it the stage strip, then STATE (the cue box over the shell's one monitor stage, placed by CSS grid so the
// renderer is untouched) and ACTION, then the dock. The strip, the cue box, ACTION and the sheets are slots with a fixed
// signature (teach2/ctx.ts); the view repaints them ≤ 2 Hz while it is shown. With no case loaded (board "Empty 5")
// ACTION offers three ways to begin (teach2/begin.ts); a choice repaints the view at once.
import '../teach2/teach2.css';
import type { Link } from '../link.ts';
import type { ScenarioCard } from '../scenarios.ts';
import type { SiteProfile } from '../site.ts';
import type { View } from '../shell.ts';
import { h, throttle } from '../ui.ts';
import { mount as mountAction } from '../teach2/action.ts';
import { beginState } from '../teach2/begin.ts';
import type { Slot, Teach2Ctx } from '../teach2/ctx.ts';
import { mount as mountCue } from '../teach2/cue.ts';
import { mountDock } from '../teach2/dock.ts';
import { mountAlarmLine } from '../teach2/alarm-line.ts';
import { mountFastForward } from '../teach2/ff.ts';
import { mountHeader, type TopControls } from '../teach2/header.ts';
import { mountKeys } from '../teach2/keys.ts';
import { mount as mountSheets } from '../teach2/sheets.ts';
import { mount as mountStrip } from '../teach2/strip.ts';

export interface Teach2View extends View {
  /** Open a sheet by id (the alarm count opens 'devices'). */
  openSheet(id: string): void;
  destroy(): void;
}

/** The Instructor v2 view on `link`, for `shell.add`. */
export function teach2View(link: Link, o: { site: SiteProfile; weightKg(): number; top?: TopControls; loadScenario?(card: ScenarioCard): boolean }): Teach2View {
  const header = mountHeader(link, o.top);
  const dock = mountDock(link);
  const strip = h('nav', { class: 'ip2-strip', 'aria-label': 'Stages' });
  const cue = h('div', { class: 'ip2-cue' });
  const state = h('section', { class: 'ip2-state', 'aria-labelledby': 'ip2-state-h' }, h('h2', { id: 'ip2-state-h', class: 'ip2-colhead' }, 'STATE'), cue);
  // option G: under the cue box the Fast forward box, then the shell's monitor (placed by the grid), then the alarm
  // line; STATE and ACTION are told apart by a lifted background only (the STATE panel spans the four rows)
  const ff = mountFastForward(link);
  ff.el.classList.add('ip2-ff-row');
  let openAlarms = () => undefined as void;
  const alarms = mountAlarmLine(link, () => openAlarms());
  const statePanel = h('div', { class: 'ip2-state-panel', 'aria-hidden': 'true' });
  const actionBody = h('div', { class: 'ip2-action-body' });
  const action = h('section', { class: 'ip2-action', 'aria-labelledby': 'ip2-action-h' }, h('h2', { id: 'ip2-action-h', class: 'ip2-colhead' }, 'ACTION'), actionBody);
  const sheets = h('div', { class: 'ip2-sheets' });
  const el = h('section', { class: 'ip2', 'aria-labelledby': 'ip2-h' },
    h('h1', { id: 'ip2-h', class: 'sr-only' }, 'Instructor v2'), header.el, strip, statePanel, state, ff.el, alarms.el, action, sheets, dock.el);

  const keys = mountKeys(el, { link, togglePause: header.togglePause });
  const begin = beginState(() => paintNow());
  const ctx: Teach2Ctx = { link, site: o.site, weightKg: o.weightKg, keys, dock: { tools: dock.tools, note: dock.note }, openSheet: () => undefined, begin, ...(o.loadScenario ? { loadScenario: o.loadScenario } : {}) };
  // The sheets mount first: they set ctx.openSheet
  const slots: Slot[] = [mountSheets(sheets, ctx), mountStrip(strip, ctx), mountCue(cue, ctx), mountAction(actionBody, ctx)];
  openAlarms = () => ctx.openSheet('devices');
  const lines = [ff, alarms];
  const paintNow = () => {
    header.refresh();
    dock.refresh();
    for (const x of lines) x.refresh();
    for (const s of slots) s.refresh();
  };
  const repaint = throttle(() => {
    if (el.hidden) return;
    paintNow();
  }, 500);
  const offLink = link.onChange(repaint);
  const tick = setInterval(repaint, 1000); // the clock and the in-stage times move with sim time even without events

  return {
    id: 'teach2', el,
    enter: () => {
      // the strip's past-stage returns need the driver's stage marks: on, on the host, once this view is shown (IP9
      // review M1: off by default, so a session that never opens Instructor v2 takes no extra snapshots)
      link.host?.driver.markStages(true);
      paintNow();
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
