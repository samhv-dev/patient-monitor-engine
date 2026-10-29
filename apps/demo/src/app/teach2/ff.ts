// Instructor v2, the Fast forward box in STATE (the owner's final layout, board "Option G"): its title with the icon, a
// divider, "+2 min" and "+5 min", and the catch-up note. Each button sends what today's session-bar button of the same
// span sends (`time jump` 120 and 300, the same refusal toast); both are disabled while paused (answer 9: nothing is
// queued) and while a skip runs, as today's are.
import { spanText } from '../describe.ts';
import type { Link } from '../link.ts';
import { h, toast } from '../ui.ts';

/** The box's skips in seconds: +2 and +5 min, today's two buttons. */
export const FF_SKIPS: readonly number[] = [120, 300];
const FF_SVG = '<svg aria-hidden="true" width="16" height="12" viewBox="0 0 16 12"><path d="M1 1 8 6 1 11z M8 1l7 5-7 5z" fill="currentColor"/></svg>';

export function mountFastForward(link: Link): { el: HTMLElement; refresh(): void } {
  const title = h('span', { class: 'ip2-ff-title' });
  title.innerHTML = `${FF_SVG}<span>Fast forward</span>`;
  const buttons = FF_SKIPS.map((s) => h('button', {
    type: 'button', class: 'ip2-ffbtn', 'aria-label': `Fast forward by ${spanText(s)}`,
    onclick: () => void link.send({ type: 'time', action: 'jump', value: s }).then((r) => r.accepted || toast(`Fast-forward refused: ${r.reason ?? 'refused'}`, 'alert')),
  }, `+${spanText(s)}`));
  const el = h('div', { class: 'ip2-ff', role: 'group', 'aria-label': 'Fast forward' },
    title, h('span', { class: 'ip2-ff-div', 'aria-hidden': 'true' }), ...buttons, h('span', { class: 'ip2-spacer' }),
    h('span', { class: 'ip2-ff-note', title: 'The phones catch up at the end of the skip; disabled while paused' }, 'the phones catch up at the end of the skip · disabled while paused'));
  const refresh = () => {
    // one skip at a time (as today), none while paused
    const off = link.ctl.fastForward !== null || link.ctl.hostPaused;
    for (const b of buttons) b.disabled = off;
    el.title = link.ctl.hostPaused ? 'Resume to fast forward' : '';
  };
  refresh();
  return { el, refresh };
}
