// The session bar (research/13 brief §5, §7): patient one-liner, the MODELED / MANUAL / "n held" badge (a popover
// dialog lists held values with "Return to model"), the scenario's state and time, sim speed and pause, and a bookmark.
// It reads the same Link as the panel, so it is identical same-screen and on a Remote.
import type { Link } from './link.ts';
import { cardOf } from './scenarios.ts';
import { oneLiner } from './patients.ts';
import { activeText } from './events.ts';
import { vitalLabel } from './vitals.ts';
import type { StateVar } from '@pme/engine-core';
import { bookmark } from './commands.ts';
import { button, clock, h, infoDialog, PIN_SVG, seg, setText, throttle, toast, WAVE_SVG } from './ui.ts';

export function mountSessionBar(bar: HTMLElement, link: Link): () => void {
  const who = h('span', { class: 'who num' });
  const badge = h('button', { type: 'button', class: 'mode-badge', 'aria-haspopup': 'dialog' });
  const scen = h('span', { class: 'scen' });
  const t = h('span', { class: 'clock num', 'aria-label': 'Simulation time' });
  const speed = seg<string>('Simulation speed', [['1', '×1'], ['2', '×2'], ['4', '×4']], '1', (v) => void link.send({ type: 'time', action: 'scale', value: Number(v) }).then((r) => r.accepted && toast(`Speed ×${v}`)));
  speed.classList.add('compact'); // ×4 is the host's limit (the 6a host refuses a scale above 4: 'scale must be 0.25–4')
  let paused = false;
  let asking = 0; // R50 M4: own pause/resume requests not yet answered — until then the button shows what was asked
  const pause = button('Pause', () => {
    paused = !paused;
    asking++;
    void link.send({ type: 'time', action: paused ? 'pause' : 'resume' }).finally(() => (asking--, draw()));
    pause.textContent = paused ? 'Resume' : 'Pause';
    pause.setAttribute('aria-pressed', String(paused));
  }, 'small');
  pause.setAttribute('aria-pressed', 'false');
  const mark = button('Bookmark', () => void bookmark(link), 'small ghost');
  mark.setAttribute('aria-keyshortcuts', 'Shift+B');

  const held = (): StateVar[] => Object.entries(link.ctl.state?.control ?? {}).filter(([, f]) => f === 'pinned' || f === 'ramping').map(([v]) => v as StateVar);
  badge.addEventListener('click', () => {
    const m = link.ctl.state?.mode ?? 'manual';
    const vars = m === 'modeled' ? held() : [];
    const body = h('div', {},
      h('p', {}, m === 'modeled' ? 'The body sets every value you have not held.' : 'MANUAL: every value is what you set.'),
      vars.length ? h('ul', { class: 'plain' }, ...vars.map((v) => h('li', {}, vitalLabel(v), ' ', button('Return to model', () => void link.send({ type: 'release', variable: v }), 'ghost small')))) : null,
      vars.length > 1 ? button('Return all to the model', () => void link.send({ type: 'release', variable: 'all' }), 'small') : null);
    void infoDialog(m === 'modeled' ? 'MODELED' : 'MANUAL', body);
  });

  bar.replaceChildren(h('div', { class: 'sb-left' }, who, badge, scen), h('div', { class: 'sb-right' }, t, speed, pause, mark));
  const draw = throttle(() => {
    const host = link.host;
    const p = link.ctl.scenario.doc?.patient;
    // a Remote knows the patient only from the loaded scenario; the status pill says whether it is connected
    const base = host ? oneLiner(host.spec) : p ? [p.sex ?? '', p.ageY !== undefined ? `${p.ageY} y` : '', p.weightKg !== undefined ? `${p.weightKg} kg` : ''].filter(Boolean).join(' ') : '';
    setText(who, [base, ...activeText(link.conditions)].filter(Boolean).join(' · ')); // Task 26: the acute events running
    const m = link.ctl.state?.mode ?? host?.mode ?? 'manual';
    const n = m === 'modeled' ? held().length : 0;
    badge.dataset.mode = m;
    badge.innerHTML = m === 'modeled' ? WAVE_SVG : PIN_SVG;
    badge.append(m === 'modeled' ? (n ? `MODELED, ${n} held` : 'MODELED') : 'MANUAL');
    badge.setAttribute('aria-label', `Physiology mode ${m === 'modeled' ? 'MODELED' : 'MANUAL'}${n ? `, ${n} values held by you` : ''}: show details`);
    const sv = link.ctl.scenario;
    setText(scen, sv.doc ? `${cardOf(sv.doc).title}: ${sv.stateLabel()} ${clock(sv.timeInState(link.simT))}` : 'No scenario');
    setText(t, clock(link.simT));
    // FU-11 (K5): the speed and pause the HOST runs at, wherever they were set (a Remote showed ×1 under a ×4 host)
    const k = String(link.ctl.timeScale);
    if (speed.value !== k && ['1', '2', '4'].includes(k)) speed.set(k);
    if (!asking && paused !== link.ctl.hostPaused) {
      paused = link.ctl.hostPaused;
      pause.textContent = paused ? 'Resume' : 'Pause';
      pause.setAttribute('aria-pressed', String(paused));
    }
  }, 500);
  const off = link.onChange(draw);
  const iv = setInterval(draw, 1000);
  draw();
  return () => {
    off();
    clearInterval(iv);
  };
}
