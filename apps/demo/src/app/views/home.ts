// Home (E125, owner's mockup f1-home): the page the app opens on (`#/`, `#/home`). The product mark, the name, the
// version and build, one paragraph, ONE button ("Start here" → Room), the repository address alone on its line, the
// documentation links and three live tiles (meters.ts says what each measures); the disclaimer is the shell's footer
// line. Centred, about 640 px wide. The session's engine already runs behind it; nothing here touches the patient.
import { HOME_VERSION, REPO } from '../about.ts';
import { Meters, type MeterValues } from '../meters.ts';
import { hrefOf } from '../router.ts';
import type { View } from '../shell.ts';
import { h, setText } from '../ui.ts';

export const HOME_INTRO = "A teaching patient monitor driven by a physiological engine: drugs, bleeding, ventilation and the body's reflexes change the numbers and the waveforms as they would in a patient. Open source, runs in a browser, follows on phones.";

const LINKS: ReadonlyArray<[string, string]> = [
  ['Documentation', `https://${REPO}/tree/main/docs`],
  ['Licence', `https://${REPO}/blob/main/LICENSE`],
  ['Release notes', `https://${REPO}/releases`],
];

export function homeView(o: { meters?: Meters } = {}): View {
  const meters = o.meters ?? new Meters();
  const tile = (k: string, unit: string) => {
    const v = h('span', { class: 'home-v num' }, '…');
    const el = h('div', { class: 'home-stat' }, h('span', { class: 'home-k' }, k), h('span', { class: 'home-vrow' }, v, h('small', {}, unit)));
    return { el, v };
  };
  const engine = tile('Engine', 'ms per tick');
  const memory = tile('Memory', 'MB used');
  const cpu = tile('CPU, this app', '% of one core');
  engine.el.title = 'The median time of one 20-ms engine tick on this computer: the same engine build, timed in a background thread of this page.';
  const draw = (m: MeterValues) => {
    setText(engine.v, m.engineMs === null ? '…' : m.engineMs < 10 ? m.engineMs.toFixed(2) : m.engineMs.toFixed(1));
    setText(memory.v, m.memoryMb === null ? '—' : String(Math.round(m.memoryMb)));
    memory.el.title = m.memoryMb === null ? 'This browser does not report memory (Chrome and Edge do).' : "This page's JavaScript memory; the monitor's engine thread is not included.";
    setText(cpu.v, m.cpuPct === null ? '…' : String(Math.round(m.cpuPct)));
    cpu.el.title = meters.cpuMethod();
  };
  meters.onChange(draw);
  draw(meters.values);

  const el = h('section', { class: 'console home', 'aria-labelledby': 'home-h' },
    h('div', { class: 'home-intro' },
      h('div', { class: 'home-logo', 'aria-hidden': 'true' }),
      h('h1', { id: 'home-h' }, 'Patient monitor simulator'),
      h('p', { class: 'home-ver', 'data-about': '' }, HOME_VERSION),
      h('p', { class: 'home-lede' }, HOME_INTRO),
      h('a', { class: 'btn primary home-start', href: hrefOf('room') }, 'Start here'),
      h('code', { class: 'home-repo' }, REPO),
      h('p', { class: 'home-links' }, ...LINKS.map(([t, href]) => h('a', { href, target: '_blank', rel: 'noopener' }, t))),
      h('div', { class: 'home-stats' }, cpu.el, memory.el, engine.el)));
  return {
    id: 'home',
    el,
    enter: () => meters.start(),
    leave: () => meters.stop(),
  };
}
