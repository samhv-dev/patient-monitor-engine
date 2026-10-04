// Validate (research/13 §4.7): the three Stage 8a tools as tabs in the bench theme. They are internal pages with their
// own engines, so they load only when their tab opens. The performance check measures ONE monitor alone by design, so
// it opens in a new tab rather than in a frame next to this session's running monitor (R50 review F13).
import { h, tabs } from '../ui.ts';
import type { View } from '../shell.ts';

const PAGES: ReadonlyArray<[string, string, string, string]> = [
  ['bedside', 'Bedside checklist', 'validation-bedside.html', 'Compare the simulator with a real Saadat monitor, item by item.'],
  ['review', 'Blind review', 'validation-review.html', 'Rate recorded strips without knowing which is real.'],
  ['perf', 'Performance', 'validation-perf.html', 'An eight-lane monitor with frame-time statistics (this page runs its own patient).'],
];

export function validateView(): View {
  let t: ReturnType<typeof tabs> | null = null;
  const el = h('section', { 'aria-labelledby': 'val-h' });
  return {
    id: 'validate', el, bench: true,
    enter: (sub) => {
      if (!t) {
        t = tabs('Validation tools', PAGES.map(([id, label, src, hint]) => ({
          id, label, render: () => id === 'perf'
            ? h('div', { class: 'framed' }, h('p', { class: 'hint' }, hint),
              h('p', {}, 'It measures one monitor on its own, so it runs in a separate tab while this session keeps its patient.'),
              h('a', { class: 'btn primary', href: `./${src}`, target: '_blank', rel: 'noopener' }, 'Open the performance check in a new tab'))
            : h('div', { class: 'framed' }, h('p', { class: 'hint' }, hint), h('iframe', { class: 'iframe', title: label, src: `./${src}` })),
        })), 'bedside', (id) => history.replaceState(null, '', `#/validate/${id}`));
        el.append(h('div', { class: 'page wide' }, h('h1', { id: 'val-h' }, 'Validate'), t.el));
      }
      if (sub) t.select(sub);
    },
    // the tools run their own engines: leaving the view unloads them, so a hidden view does no work (brief §10, D26)
    // and this session's main thread is not shared with two more monitors while the instructor teaches
    leave: () => {
      el.replaceChildren();
      t = null;
    },
  };
}
