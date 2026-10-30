// Monitor (research/13 §4.2): the learner's full-screen monitor, with the learner controls strip under it only when the
// instructor has switched it on for this scenario. Nothing of the instructor shows; `i`, five taps in the top-left
// corner or a three-finger hold open the Instructor view chosen in Settings (the hidden panel's reveal gestures), and a
// quiet strip under the monitor shows its return controls only on pointer hover or keyboard focus.
import { learnerStrip } from '../learner.ts';
import type { Link } from '../link.ts';
import { hrefOf } from '../router.ts';
import type { AppSession } from '../session.ts';
import type { InstructorRoute } from '../site.ts';
import { button, h } from '../ui.ts';
import type { View } from '../shell.ts';

export function monitorView(o: { session: AppSession; link: Link; learnerUrl: string; phones?: boolean; instructor: () => InstructorRoute }): View {
  const full = button('Full screen', () => void (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.()), 'small');
  // A second window that FOLLOWS this session (drag it to the projector), not a second patient
  // `noopener` puts the window in its own process (an opener would share this page's main thread with its engine)
  const second = button('Open on a second screen', () => void window.open(o.learnerUrl, '_blank', 'noopener,width=1280,height=800'), 'small');
  const back = h('a', { class: 'btn small', href: hrefOf(o.instructor()) }, 'Instructor view'); // the one chosen in Settings
  const strip = h('div', { class: 'reveal', role: 'toolbar', 'aria-label': 'Monitor view' },
    back, full, second,
    // The QR moment, from the screen the room is looking at (a classroom relay only): the Room page holds the QR code
    o.phones ? h('a', { class: 'btn small', href: hrefOf('room') }, 'Phones') : null,
    h('a', { class: 'btn small ghost', href: hrefOf('home') }, 'Home'));
  // The learner controls strip under the monitor: hidden unless the instructor switched it on
  const learner = learnerStrip(o.link);
  o.session.onLearner((on) => (learner.hidden = !on));
  // The return strip at the foot, in this view's own row under the stage, never on the monitor (the owner, 30 October:
  // placed over the wave area it covered the right half of the ECG lane on the Saadat-like skin)
  return { id: 'monitor', el: h('section', { 'aria-labelledby': 'mon-h' }, h('h1', { id: 'mon-h', class: 'sr-only' }, 'Learner monitor'), learner, strip), enter: () => back.setAttribute('href', hrefOf(o.instructor())) };
}
