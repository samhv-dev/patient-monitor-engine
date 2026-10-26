// Monitor (research/13 §4.2): the learner's full-screen monitor, with the learner controls strip under it only when the
// instructor has switched it on for this scenario. Nothing of the instructor shows; `i`, five taps in the top-left
// corner or a three-finger hold open the instructor view (the hidden panel's reveal gestures), and a quiet strip
// appears under the monitor's header only on pointer hover or keyboard focus.
import { learnerStrip } from '../learner.ts';
import type { Link } from '../link.ts';
import { hrefOf } from '../router.ts';
import type { AppSession } from '../session.ts';
import { button, h } from '../ui.ts';
import type { View } from '../shell.ts';

export function monitorView(stage: HTMLElement, o: { session: AppSession; link: Link; learnerUrl: string; phones?: boolean }): View {
  const full = button('Full screen', () => void (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.()), 'small');
  // A second window that FOLLOWS this session (drag it to the projector), not a second patient
  // `noopener` puts the window in its own process (an opener would share this page's main thread with its engine)
  const second = button('Open on a second screen', () => void window.open(o.learnerUrl, '_blank', 'noopener,width=1280,height=800'), 'small');
  const strip = h('div', { class: 'reveal', role: 'toolbar', 'aria-label': 'Monitor view' },
    h('a', { class: 'btn small', href: hrefOf('teach') }, 'Instructor view'), full, second,
    // The QR moment, from the screen the room is looking at (a classroom relay only): the Room page holds the QR code
    o.phones ? h('a', { class: 'btn small', href: hrefOf('room') }, 'Phones') : null,
    h('a', { class: 'btn small ghost', href: hrefOf('home') }, 'Home'));
  stage.append(strip);
  // UI review #25: the strip sits under the monitor's header, at the right of the wave area, so the date and time, the
  // header line and the HR tile's label stay visible (at the top right it covered all three). It follows the header's
  // real box: a ResizeObserver re-places it whenever the header (or the stage) changes size, and a new header (a new
  // patient, a skin) is observed on the next placement. A placement taken once on pointerenter went stale on CI (run
  // 40403985512): the header was still at its 62 px minimum before the monitor height applied, and grew to 71/96 px
  // under a strip left 63 px down.
  let observed: Element | null = null;
  const place = (): void => {
    const hdr = stage.querySelector<HTMLElement>('.pme-hdr');
    if (hdr !== observed) {
      if (observed) ro?.unobserve(observed);
      if (hdr) ro?.observe(hdr);
      observed = hdr;
    }
    if (!hdr) return void (strip.style.removeProperty('top'), strip.style.removeProperty('right'));
    const s = stage.getBoundingClientRect();
    const r = hdr.getBoundingClientRect();
    strip.style.top = `${Math.ceil(r.bottom - s.top)}px`;
    strip.style.right = `${Math.ceil(s.right - r.right)}px`;
  };
  const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => place());
  ro?.observe(stage);
  let queued = false; // a pointer already over the stage (no new pointerenter) still re-places it, once a frame
  const soon = (): void => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => ((queued = false), place()));
  };
  stage.addEventListener('pointerenter', place);
  stage.addEventListener('pointermove', soon);
  strip.addEventListener('focusin', place);
  // The learner controls strip under the monitor: hidden unless the instructor switched it on
  const learner = learnerStrip(o.link);
  o.session.onLearner((on) => (learner.hidden = !on));
  return { id: 'monitor', el: h('section', { 'aria-labelledby': 'mon-h' }, h('h1', { id: 'mon-h', class: 'sr-only' }, 'Learner monitor'), learner) };
}
