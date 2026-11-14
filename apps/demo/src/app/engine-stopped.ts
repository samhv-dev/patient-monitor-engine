// Brief 195: the instructor's page when its simulation has stopped (the monitor's `pme-monitor-failed`: an error while the
// engine stepped, a worker that crashed, or one the watchdog found dead). A notice that stays until a new engine runs
// says so, why, and the two ways on the app already has, each with what it keeps and what it loses. Nothing here
// recovers by itself: the engine's state at the stop may be half a tick on, so no way on silently continues from it.
import { button, h } from './ui.ts';

export const STOPPED_TITLE = 'The simulation has stopped';
/** What follows the reason: what the room sees meanwhile. */
export const STOPPED_FROZEN = 'The monitor is frozen where it stopped, and every phone and second screen says the simulation has stopped. Nothing more happens to this patient.';
/** "Restart the patient" with a case running (AppSession.restartPatient, FX-12). */
export const STOPPED_RESTART_CASE = 'The case starts again from 0:00 on its own patient: drugs, fluids and ventilation reset, and the time run since the start is lost. The bookmarks, the room code, the phones and the log carry on, so Return here can go back to a bookmark.';
/** "Restart the patient" in a free run. */
export const STOPPED_RESTART_FREE = 'A new engine for the same patient: drugs, fluids and ventilation reset. The room code, the phones and the log carry on.';
/** "Reload this page" (position.ts: the running library case is kept every second; a restart forgets it). */
export const STOPPED_RELOAD = 'A library case comes back where this page last kept it, about a second of the clock before the stop (more at a higher speed); the same error can happen again from there. Without a library case running, the page starts again. After a restart, a reload no longer goes back to before the stop.';

export interface StoppedNotice {
  /** Show (or replace) the notice; `inCase`: a card runs (what a restart keeps differs). */
  show(reason: string, inCase: boolean): void;
  hide(): void;
}

/** The notice, in `root`; `ways` are the app's own restart and reload. */
export function stoppedNotice(root: HTMLElement, ways: { restart(): void; reload(): void }): StoppedNotice {
  let box: HTMLElement | null = null;
  const hide = () => {
    box?.remove();
    box = null;
  };
  return {
    hide,
    show: (reason, inCase) => {
      hide();
      box = h('div', { class: 'engine-stopped', role: 'alert' },
        h('h2', {}, STOPPED_TITLE),
        h('p', {}, `Reason: ${reason}. ${STOPPED_FROZEN}`),
        h('div', { class: 'engine-stopped-way' }, button('Restart the patient', () => ways.restart(), 'primary'), h('p', { class: 'hint' }, inCase ? STOPPED_RESTART_CASE : STOPPED_RESTART_FREE)),
        h('div', { class: 'engine-stopped-way' }, button('Reload this page', () => ways.reload()), h('p', { class: 'hint' }, STOPPED_RELOAD)));
      root.append(box);
    },
  };
}
