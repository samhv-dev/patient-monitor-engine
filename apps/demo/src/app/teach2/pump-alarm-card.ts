// The pump channels' standing alarms on the instructor's screens, mounted with the page (not with the Pumps sheet, which
// is built when first opened), so an alarm is seen and announced the moment the engine raises it: a card with each
// channel's alarm in the pump's words and, where the page has one, a control that opens the rack's view. Hidden while no
// channel has an alarm. The words are the engine's channel table's, through the Link (link.ts pumpAlarms).
import type { Link } from '../link.ts';
import { h, setText } from '../ui.ts';
import './pump-alarm-card.css';

export const PUMP_ALARM_CARD_WORDS = { title: 'Pump alarms', open: 'Show the pumps' };

export function mountPumpAlarmCard(link: Pick<Link, 'pumpAlarms' | 'onChange'>, open?: () => void): { el: HTMLElement; refresh(): void; destroy(): void } {
  const list = h('ul', { class: 'ip2-pa-list' });
  const say = h('p', { class: 'sr-only', role: 'alert' });
  const card = h('section', { class: 'ip2-pa', 'aria-label': PUMP_ALARM_CARD_WORDS.title, hidden: true },
    h('h3', { class: 'ip2-pa-title' }, PUMP_ALARM_CARD_WORDS.title), list,
    ...(open ? [h('button', { type: 'button', class: 'ip2-pa-open', onclick: open }, PUMP_ALARM_CARD_WORDS.open)] : []));
  // the live region stands outside the card, which is hidden until the first alarm: a hidden region announces nothing
  const el = h('div', { class: 'ip2-pa-slot' }, card, say);
  let shown = new Set<string>();
  const draw = () => {
    const now = link.pumpAlarms ?? []; // a test's partial Link has none
    const ids = new Set(now.map((a) => a.id));
    if (ids.size === shown.size && [...ids].every((id) => shown.has(id))) return;
    const fresh = now.filter((a) => !shown.has(a.id));
    shown = ids;
    card.hidden = now.length === 0;
    list.replaceChildren(...now.map((a) => h('li', { 'data-alarm': a.id }, a.text)));
    if (fresh.length) setText(say, fresh.map((a) => a.text).join('. '));
  };
  const off = link.onChange(draw);
  draw();
  return { el, refresh: draw, destroy: off };
}
