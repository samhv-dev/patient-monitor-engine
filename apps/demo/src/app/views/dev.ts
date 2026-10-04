// Developer (research/13 §4.5, brief Q3): the only place the build-stage pages, the physiology console with its engine
// keys and the evidence pages are listed. Each opens in a new tab so this session keeps running. Pages that a later
// merge adds (evidence pages) are listed when the server has them.
import { h } from '../ui.ts';
import type { View } from '../shell.ts';

type Page = [file: string, title: string, note: string];
const TOOLS: Page[] = [
  ['physiology-console.html', 'Physiology console', 'Every model value by organ, with engine keys, baseline diff and raw commands'],
  ['stage4b-device.html', 'Device layer', 'Alarms, defibrillator, pacer, 12-lead, trends'],
  ['stage4a-skins.html', 'Skin preview', 'Every monitor skin and theme, alarm sound profiles'],
  ['stage5.html', 'Rhythm library', 'All rhythms on ECG paper, with modifiers'],
  ['stage6a.html', 'Host monitor with the drawer', 'The first instructor drawer and its remote and viewer'],
  ['stage6a-remote.html', 'Remote controller (first version)', ''],
  ['stage6a-viewer.html', 'Second-screen viewer', ''],
  ['stage6b-acls.html?scenario=acls-vf-witnessed', 'Scenario runner', 'The ACLS VF case with learner buttons'],
  ['vent-link.html', 'Ventilator and monitor link', 'With the ventilator demonstrations'],
];
const STAGES: Page[] = [
  ['stage0.html', 'Sweep cursor', 'stage 0'], ['stage1.html', 'ECG rhythm engine', 'stage 1'], ['stage2.html', 'Haemodynamics', 'stage 2'],
  ['stage3.html', 'Respiration, gas and temperature', 'stage 3'], ['stage7a.html', 'Circulation', 'stage 7a'], ['stage7b.html', 'Lungs', 'stage 7b'],
  ['stage7c.html', 'Blood and acid–base', 'stage 7c'], ['stage7d.html', 'Brain, kidney, liver', 'stage 7d'], ['stage7e.html', 'Endocrine and temperature', 'stage 7e'],
  ['stage7f.html', 'Depth and neuromuscular block', 'stage 7f'], ['stage7g.html', 'Drug PK/PD', 'stage 7g'],
];
const EVIDENCE: Page[] = [['fu4.html', 'Integration evidence', 'FU-4'], ['fu6.html', 'Respiratory integration evidence', 'FU-6'], ['fu7.html', 'Drug layer evidence', 'FU-7']];

const list = (pages: Page[]) => h('ul', { class: 'devlist' }, ...pages.map(([f, t, n]) => h('li', { 'data-file': f }, h('a', { href: `./${f}`, target: '_blank', rel: 'noopener' }, t), n ? h('span', { class: 'muted' }, ` ${n}`) : null)));

export function devView(): View {
  const ev = list(EVIDENCE);
  let checked = false;
  const el = h('section', { 'aria-labelledby': 'dev-h' }, h('div', { class: 'page' },
    h('h1', { id: 'dev-h' }, 'Developer'),
    h('p', { class: 'lede' }, 'Tools for building and checking the model. Pages open in a new tab, so the session here keeps running.'),
    h('h2', {}, 'Tools'), list(TOOLS),
    h('h2', {}, 'Build-stage pages'), list(STAGES),
    h('h2', {}, 'Evidence pages'), ev,
    h('h2', {}, 'Audits'), h('p', {}, 'The physiology audits run from the command line and write their reports to docs/gates: ', h('code', {}, 'pnpm run audit:physiology'), '.'),
  ));
  return {
    id: 'dev', el, bench: true,
    enter: () => {
      if (checked) return;
      checked = true;
      for (const li of ev.querySelectorAll<HTMLElement>('li')) {
        void fetch(`./${li.dataset.file}`, { method: 'HEAD' }).then((r) => (li.hidden = !r.ok || !(r.headers.get('content-type') ?? '').includes('html')), () => (li.hidden = true));
      }
    },
  };
}
