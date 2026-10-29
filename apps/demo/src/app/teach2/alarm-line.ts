// Instructor v2, the alarm line under the learners' monitor in STATE (the owner's final layout, board "Option G"): the
// count and the sounding alarms' words (the alarm table's, as the top bar's count words its top alarm), amber while one
// sounds. A press opens the same alarm list the top bar's count opens on this route (the Devices sheet). The top bar is
// not shown on #/teach2, so this line replaces its count here.
import { alarmLine, LIMITS_OFF_LABEL } from '../alarms.ts';
import type { Link } from '../link.ts';
import { h, setText } from '../ui.ts';

const BELL_SVG = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 17V11a6 6 0 0 1 12 0v6l2 2H4zM10 21h4"/></svg>';

export function mountAlarmLine(link: Link, open: () => void): { el: HTMLElement; refresh(): void } {
  const count = h('span', { class: 'ip2-alarm-count' });
  const texts = h('span', { class: 'ip2-alarm-texts' });
  const hint = h('span', { class: 'ip2-alarm-hint' });
  const el = h('button', { type: 'button', class: 'ip2-alarmline', onclick: open }, count, texts, h('span', { class: 'ip2-spacer' }), hint);
  let sig = '';
  const refresh = () => {
    const s = link.alarmSummary;
    const act = (link.alarms?.active ?? []).filter((a) => !a.acked || a.latched).sort((a, b) => a.level - b.level);
    const words = act.map((a) => alarmLine(a).text);
    const key = `${s.n}|${words.join('|')}|${link.alarms?.allOff ?? false}`;
    if (key === sig) return;
    sig = key;
    el.dataset.level = s.level ? String(s.level) : 'none';
    count.innerHTML = BELL_SVG;
    count.append(s.n ? `${s.n} ${s.n === 1 ? 'alarm' : 'alarms'}` : link.alarms?.allOff ? LIMITS_OFF_LABEL : 'No alarms');
    texts.replaceChildren(...words.map((w) => h('span', {}, w)));
    el.setAttribute('aria-label', `${s.n ? `Alarms: ${s.n} sounding${words.length ? ` (${words.join(', ')})` : ''}` : 'No active alarms'}; opens the alarm list`);
    setText(hint, s.n ? 'Shift+S silences · opens the list' : 'opens the list');
  };
  refresh();
  return { el, refresh };
}
