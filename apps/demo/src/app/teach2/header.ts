// The Instructor v2 session bar (design §3.1; the owner's final layout, board "Option G"; answer 9). The app's top bar
// is not shown on this route, so this header carries, left to right: the patient line, the MODELED tag, the card's
// title, a flexible gap, the clock pill (the pause / play control; while paused its tooltip says when a step pressed now
// is given), the speed box (×1 ×2 ×4 ×8, opening sideways), a divider, the Sound switch and the Room code with the
// phone count (the top bar's own controls: the same toggle and the same link). Fast forward moved to STATE (ff.ts).
// Every control sends exactly what today's session bar (`sessionbar.ts`) sends for it, with the same toasts: `time
// pause` / `time resume` and `time scale`. The speed box folds back on a choice, on a click elsewhere and on Esc.
import type { StateVar } from '@pme/engine-core';
import { activeText } from '../events.ts';
import type { Link } from '../link.ts';
import { oneLiner } from '../patients.ts';
import { hrefOf } from '../router.ts';
import { cardOf } from '../scenarios.ts';
import { SPEEDS } from '../sessionbar.ts';
import { clock, h, setText, toast } from '../ui.ts';
import { defaultPatient, NO_CASE } from './begin.ts';

/** The top bar's controls the header carries on this route (main.ts: the same toggle and the same pairing code). */
export interface TopControls {
  soundOn(): boolean;
  toggleSound(): void | Promise<void>;
  code: string;
  /** The phones following the session. */
  phones(): number;
}

const PLAY_SVG = '<svg aria-hidden="true" width="12" height="14" viewBox="0 0 12 14"><path d="M1.5 1 11 7 1.5 13z" fill="currentColor"/></svg>';
const STOP_SVG = '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12"><rect x="1" y="1" width="10" height="10" rx="2" fill="currentColor"/></svg>';
const SOUND_SVG = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 10v4h4l5 4V6l-5 4zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>';

export interface Header {
  el: HTMLElement;
  /** Press the clock pill (Space). */
  togglePause(): void;
  refresh(): void;
  destroy(): void;
}

/** One box that opens sideways into its choices and folds back (the speed box, the Fast forward fan). */
function fan(o: { cls: string; label: string; groupLabel: string; options: Array<[string, string, string]>; choose(v: string): void }) {
  const box = h('button', { type: 'button', class: `ip2-fanbox ${o.cls}`, 'aria-expanded': 'false', 'aria-label': o.label });
  const opts = o.options.map(([v, text, aria]) => h('button', { type: 'button', class: 'ip2-fanopt', 'data-v': v, 'aria-label': aria, onclick: () => (close(), o.choose(v)) }, text));
  const group = h('span', { class: 'ip2-fan', role: 'group', 'aria-label': o.groupLabel, hidden: true }, ...opts);
  const wrap = h('span', { class: 'ip2-fanwrap' }, group, box);
  const outside = (e: Event) => void (wrap.contains(e.target as Node) || close());
  const close = () => {
    if (group.hidden) return;
    group.hidden = true;
    box.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', outside, true);
  };
  box.addEventListener('click', () => {
    if (!group.hidden) return close();
    group.hidden = false;
    box.setAttribute('aria-expanded', 'true');
    document.addEventListener('pointerdown', outside, true);
    opts[0]?.focus();
  });
  wrap.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || group.hidden) return;
    e.preventDefault();
    e.stopPropagation();
    close();
    box.focus();
  });
  return { wrap, box, opts, close };
}

/** The view's session bar on `link`; `refresh()` redraws it from the host's state. */
export function mountHeader(link: Link, top?: TopControls): Header {
  const who = h('span', { class: 'ip2-who' });
  const mode = h('span', { class: 'ip2-mode' });
  const title = h('span', { class: 'ip2-title' });

  // The clock pill: today's Pause / Resume button, copied (the press shows what was asked until the host answers)
  let paused = false;
  let asking = 0;
  const pillWord = h('span', { class: 'ip2-pill-word' });
  const pillTime = h('span', { class: 'ip2-pill-time' });
  const pillIcon = h('span', { class: 'ip2-pill-icon' });
  const pill = h('button', { type: 'button', class: 'ip2-pill', 'aria-keyshortcuts': 'Space' }, pillIcon, pillWord, pillTime);
  const drawPill = () => {
    pill.dataset.state = paused ? 'paused' : 'running';
    pillIcon.innerHTML = paused ? STOP_SVG : PLAY_SVG;
    setText(pillWord, paused ? 'PAUSED' : 'RUNNING');
    setText(pillTime, clock(link.simT));
    pill.setAttribute('aria-label', `${paused ? 'Paused' : 'Running'} at ${clock(link.simT)}; press to ${paused ? 'resume' : 'pause'}`);
    // the paused rule, once the banner of v9 (the owner dropped it for option G): on the pill's tooltip
    pill.title = paused ? `Paused. Timers are frozen. A step pressed now is given at ${clock(link.simT)} and acts when you resume.` : 'Space pauses';
  };
  pill.addEventListener('click', () => {
    paused = !paused;
    asking++;
    void link.send({ type: 'time', action: paused ? 'pause' : 'resume' }).finally(() => (asking--, refresh()));
    drawPill();
  });

  // The speed box: today's speed buttons, one at a time
  const speed = fan({
    cls: 'ip2-speed', label: 'Simulation speed: press to choose', groupLabel: 'Speed',
    options: SPEEDS.map((k) => [k, `×${k}`, `Speed ×${k}`]),
    choose: (v) => void link.send({ type: 'time', action: 'scale', value: Number(v) }).then((r) => r.accepted && toast(`Speed ×${v}`)),
  });

  // The top bar's Sound switch and Room code (option G): the same toggle, the same link to the Remote's pairing
  const sound = top ? h('button', { type: 'button', class: 'ip2-topctl ip2-sound', 'aria-pressed': 'false', onclick: () => void Promise.resolve(top.toggleSound()).finally(() => refresh()) }) : null;
  const room = top ? h('a', { class: 'ip2-topctl ip2-room', href: hrefOf('remote') }) : null;
  const drawTop = () => {
    if (!top || !sound || !room) return;
    const on = top.soundOn();
    sound.setAttribute('aria-pressed', String(on));
    sound.innerHTML = `${SOUND_SVG}<span>${on ? 'Sound on' : 'Sound off'}</span>`;
    const n = top.phones();
    const phones = `${n} ${n === 1 ? 'phone' : 'phones'}`;
    room.innerHTML = '';
    room.append('Room ', h('span', { class: 'ip2-room-code' }, top.code), ` · ${phones}`);
    room.setAttribute('aria-label', `Room code ${top.code.split('').join(' ')}, ${phones}: pair a remote`);
  };

  const held = (): StateVar[] => Object.entries(link.ctl.state?.control ?? {}).filter(([, f]) => f === 'pinned' || f === 'ramping').map(([v]) => v as StateVar);

  const refresh = () => {
    const host = link.host;
    const p = link.ctl.scenario.doc?.patient;
    const none = !link.ctl.scenario.doc;
    const dp = none && host ? defaultPatient(link) : null; // no case (board "Empty 5"): "Adult · 70 kg"
    const base = dp ? `${dp.band} · ${dp.kg} kg` : host ? oneLiner(host.spec) : p ? [p.sex ?? '', p.ageY !== undefined ? `${p.ageY} y` : '', p.weightKg !== undefined ? `${p.weightKg} kg` : ''].filter(Boolean).join(' ') : '';
    setText(who, [base, ...activeText(link.conditions)].filter(Boolean).join(' · '));
    const m = link.ctl.state?.mode ?? host?.mode ?? 'manual';
    const n = m === 'modeled' ? held().length : 0;
    mode.dataset.mode = m;
    setText(mode, m === 'modeled' ? (n ? `MODELED, ${n} held` : 'MODELED') : 'MANUAL');
    const sv = link.ctl.scenario;
    setText(title, sv.doc ? cardOf(sv.doc).title : NO_CASE);
    title.toggleAttribute('data-none', none);
    // The pause and speed the HOST runs at, wherever they were set
    if (!asking && paused !== link.ctl.hostPaused) paused = link.ctl.hostPaused;
    drawPill();
    drawTop();
    const k = String(link.ctl.timeScale);
    setText(speed.box, `×${SPEEDS.includes(k) ? k : link.ctl.timeScale} ▾`);
    for (const b of speed.opts) b.setAttribute('aria-pressed', String(b.dataset.v === k));
  };

  const el = h('header', { class: 'ip2-head', 'aria-label': 'Session' },
    who, mode, title, h('span', { class: 'ip2-spacer' }), pill, speed.wrap,
    ...(top ? [h('span', { class: 'ip2-head-div', 'aria-hidden': 'true' }), sound, room] : []));
  refresh();
  return {
    el,
    togglePause: () => pill.click(),
    refresh,
    destroy: () => speed.close(),
  };
}
