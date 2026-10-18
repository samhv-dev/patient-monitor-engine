// Developer (research/13 §4.5, brief Q3): the only place the build-stage pages, the physiology console with its engine
// keys and the evidence pages are listed. Each opens in a new tab so this session keeps running. Pages that a later
// merge adds (evidence pages) are listed when the server has them.
import { h } from '../ui.ts';
import type { View } from '../shell.ts';

type Page = [file: string, title: string, note: string];
const TOOLS: Page[] = [
  ['dev/physiology-console.html', 'Physiology console', 'Every model value by organ, with engine keys, baseline diff and raw commands'],
  ['dev/device-layer.html', 'Device layer', 'Alarms, defibrillator, pacer, 12-lead, trends'],
  ['dev/skins.html', 'Skin preview', 'Every monitor skin and theme, alarm sound profiles'],
  ['dev/rhythm-library.html', 'Rhythm library', 'All rhythms on ECG paper, with modifiers'],
  ['dev/controller-host.html', 'Host monitor with the drawer', 'The first instructor drawer and its remote and viewer'],
  ['dev/controller-remote.html', 'Remote controller (first version)', ''],
  ['dev/controller-viewer.html', 'Second-screen viewer', ''],
  ['dev/scenario-runner.html?scenario=acls-vf-witnessed', 'Scenario runner', 'The ACLS VF case with learner buttons'],
  ['dev/vent-link.html', 'Ventilator and monitor link', 'With the ventilator demonstrations'],
];
const STAGES: Page[] = [
  ['dev/circulation.html', 'Circulation', ''],
  ['dev/blood-acid-base.html', 'Blood and acid–base', ''], ['dev/organs.html', 'Brain, kidney, liver', ''], ['dev/endocrine-thermal.html', 'Endocrine and temperature', ''],
  ['dev/depth-neuromuscular.html', 'Depth and neuromuscular block', ''], ['dev/drug-pkpd.html', 'Drug PK/PD', ''],
];
const EVIDENCE: Page[] = [['dev/arrest-evidence.html', 'Integration evidence', ''], ['dev/respiratory-evidence.html', 'Respiratory integration evidence', ''], ['dev/drug-evidence.html', 'Drug layer evidence', '']];

const list = (pages: Page[]) => h('ul', { class: 'devlist' }, ...pages.map(([f, t, n]) => h('li', { 'data-file': f }, h('a', { href: `./${f}`, target: '_blank', rel: 'noopener' }, t), n ? h('span', { class: 'muted' }, ` ${n}`) : null)));

export function devView(): View {
  const ev = list(EVIDENCE);
  let checked = false;
  const el = h('section', { 'aria-labelledby': 'dev-h' }, h('div', { class: 'page' },
    h('h1', { id: 'dev-h' }, 'Developer'),
    h('p', { class: 'lede' }, 'Tools for building and checking the model. Pages open in a new tab, so the session here keeps running.'),
    h('h2', {}, 'Tools'), list(TOOLS),
    h('h2', {}, 'Developer pages'), list(STAGES),
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
