// Log (research/13 §4.3 item 8): the debrief view — every instructor, learner, scenario and alarm event with the sim
// time, filters, notes and bookmarks, and CSV/JSON export. Refused commands show the engine's reason in words.
import { logCsv, type ClinicalLogEntry } from '../link.ts';
import { button, clock, download, h, input, seg } from '../ui.ts';
import { bookmark } from '../commands.ts';
import type { PanelCtx } from './ctx.ts';

const KIND_TEXT: Readonly<Record<ClinicalLogEntry['kind'], string>> = { instructor: 'Instructor', learner: 'Learner', scenario: 'Scenario', alarm: 'Alarm', marker: 'Marker', note: 'Note', system: 'System' };

export function logTab(c: PanelCtx): HTMLElement {
  const { link } = c;
  let filter: 'all' | 'actions' | 'alarms' | 'markers' = 'all';
  const list = h('ol', { class: 'log', 'aria-label': 'Session log' });
  const note = input('Note', { placeholder: 'Add a note for the debrief', autocomplete: 'off' });
  note.inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && note.inp.value.trim()) {
      link.note(note.inp.value.trim());
      note.inp.value = '';
    }
  });
  const show = (e: ClinicalLogEntry) => filter === 'all' || (filter === 'actions' && (e.kind === 'instructor' || e.kind === 'learner')) || (filter === 'alarms' && e.kind === 'alarm') || (filter === 'markers' && (e.kind === 'marker' || e.kind === 'note' || e.kind === 'scenario'));
  let n = -1;
  const draw = () => {
    if (n === link.log.length) return;
    n = link.log.length;
    list.replaceChildren(...link.log.filter(show).slice(-300).reverse().map((e) => h('li', { 'data-kind': e.kind },
      h('time', {}, e.simT === null ? '--:--' : clock(e.simT)), h('span', { class: 'k' }, KIND_TEXT[e.kind]),
      h('span', {}, e.text, e.refused ? h('span', { class: 'refused' }, ' (not applied; the reason is in the exported log)') : null))));
  };
  c.onRefresh(draw);
  return h('div', {},
    seg('Show', [['all', 'All'], ['actions', 'Actions'], ['alarms', 'Alarms'], ['markers', 'Marks and notes']], filter, (v) => ((filter = v), (n = -1), draw())),
    h('div', { class: 'row' }, note.el, button('Bookmark now', () => void bookmark(link), 'small')),
    list,
    h('div', { class: 'row' },
      button('Export CSV', () => download('session-log.csv', logCsv(link.log), 'text/csv'), 'ghost small'),
      button('Export JSON', () => download('session-log.json', JSON.stringify({ schema: 'pme-session-log/1', entries: link.log }, null, 1), 'application/json'), 'ghost small')));
}
