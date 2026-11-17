// Instructor v2, the alarm line under the learners' monitor in STATE (the owner's final layout, board "Option G"): the
// count and the sounding alarms' words (the alarm table's, as the top bar's count words its top alarm), amber while one
// sounds. A press opens the same alarm list the top bar's count opens on this route (the Devices sheet). The top bar is
// not shown on #/teach2, so this line replaces its count here. The ventilator's alarms stand beside the monitor's, by
// level, each named as the ventilator's and in its priority's colour; a new one is announced to a screen reader.
import { alarmLine, LIMITS_OFF_LABEL } from '../alarms.ts';
import type { Link } from '../link.ts';
import { h, setText } from '../ui.ts';
import { VENT_LEVEL, ventAlarmShort } from '../vent-alarms.ts';

const BELL_SVG = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 17V11a6 6 0 0 1 12 0v6l2 2H4zM10 21h4"/></svg>';
const LEVEL_WORD = { 1: 'high', 2: 'medium', 3: 'low' } as const;

export function mountAlarmLine(link: Link, open: () => void): { el: HTMLElement; refresh(): void } {
  const count = h('span', { class: 'ip2-alarm-count' });
  const texts = h('span', { class: 'ip2-alarm-texts' });
  const hint = h('span', { class: 'ip2-alarm-hint' });
  const live = h('span', { class: 'sr-only', 'aria-live': 'assertive' });
  const el = h('button', { type: 'button', class: 'ip2-alarmline', onclick: open }, count, texts, h('span', { class: 'ip2-spacer' }), hint, live);
  let sig = '';
  let announced = new Set<string>();
  const refresh = () => {
    const s = link.alarmSummary;
    const v = link.ventAlarms;
    const items = [
      ...(link.alarms?.active ?? []).filter((a) => !a.acked || a.latched).map((a) => ({ level: a.level, text: alarmLine(a).text, vent: false })),
      ...(v?.active ?? []).map((a) => ({ level: VENT_LEVEL[a.priority], text: `${ventAlarmShort(a)}${a.silenced ? ' (silenced)' : ''}`, vent: true })),
    ].sort((a, b) => a.level - b.level);
    const words = items.map((x) => x.text);
    const key = `${s.n}|${words.join('|')}|${link.alarms?.allOff ?? false}`;
    const fresh = (v?.active ?? []).filter((a) => !announced.has(a.id));
    announced = new Set((v?.active ?? []).map((a) => a.id));
    if (fresh.length) setText(live, `Ventilator alarm: ${fresh.map((a) => a.text).join(', ')}`);
    if (key === sig) return;
    sig = key;
    el.dataset.level = s.level ? String(s.level) : 'none';
    count.innerHTML = BELL_SVG;
    count.append(s.n ? `${s.n} ${s.n === 1 ? 'alarm' : 'alarms'}` : link.alarms?.allOff ? LIMITS_OFF_LABEL : 'No alarms');
    texts.replaceChildren(...items.map((x) => h('span', x.vent ? { 'data-vent': LEVEL_WORD[x.level] } : {}, x.text)));
    el.setAttribute('aria-label', `${s.n ? `Alarms: ${s.n} sounding${words.length ? ` (${words.join(', ')})` : ''}` : 'No active alarms'}; opens the alarm list`);
    // the instructor's Silence is the monitor's: the ventilator is another device
    setText(hint, s.n ? `Shift+S silences${v?.active.length ? ' the monitor only' : ''} · opens the list` : 'opens the list');
  };
  refresh();
  return { el, refresh };
}
