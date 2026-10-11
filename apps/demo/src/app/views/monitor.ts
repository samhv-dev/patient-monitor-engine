// Monitor (research/13 §4.2): the learner's full-screen monitor, with the learner controls strip under it only when the
// instructor has switched it on for this scenario (orchestrator ruling 4). Nothing of the instructor shows; `i`, five taps in the
// top-left corner or a three-finger hold open the instructor view (the Stage 6a reveal gestures), and a quiet strip
// appears at the top edge only on pointer hover or keyboard focus.
import { learnerStrip } from '../learner.ts';
import type { Link } from '../link.ts';
import { hrefOf } from '../router.ts';
import type { AppSession } from '../session.ts';
import { button, h } from '../ui.ts';
import type { View } from '../shell.ts';

export function monitorView(stage: HTMLElement, o: { session: AppSession; link: Link; learnerUrl: string; phones?: { open(): Promise<void> } | null }): View {
  const full = button('Full screen', () => void (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.()), 'small');
  // FU-11 (K2): a second window that FOLLOWS this session (drag it to the projector), not a second patient
  // R50 F4: `noopener` puts the window in its own process (an opener would share this page's main thread with its engine)
  const second = button('Open on a second screen', () => void window.open(o.learnerUrl, '_blank', 'noopener,width=1280,height=800'), 'small');
  const strip = h('div', { class: 'reveal', role: 'toolbar', 'aria-label': 'Monitor view' },
    h('a', { class: 'btn small', href: hrefOf('teach') }, 'Instructor view'), full, second,
    // Stage 12: the QR moment, from the screen the room is looking at (a classroom relay only)
    o.phones ? button('Phones', () => void o.phones?.open(), 'small') : null,
    h('a', { class: 'btn small ghost', href: hrefOf('start') }, 'Start'));
  stage.append(strip);
  // the learner controls strip under the monitor: hidden unless the instructor switched it on (ruling 4)
  const learner = learnerStrip(o.link);
  o.session.onLearner((on) => (learner.hidden = !on));
  return { id: 'monitor', el: h('section', { 'aria-labelledby': 'mon-h' }, h('h1', { id: 'mon-h', class: 'sr-only' }, 'Learner monitor'), learner) };
}
