// The Instructor v2 session bar (design §3.1, boards "Proposal v6" and "Header controls v2"; answer 9). Left: the patient
// line, the MODELED tag and the card's title. Right: the clock pill (the pause / play control), the speed box (×1 ×2 ×4
// ×8, opening sideways) and the Fast forward fan (+1 +2 +5 +10 min, disabled while paused and during a skip). Every
// control sends exactly what today's session bar (`sessionbar.ts`) sends for it, with the same toasts: `time pause` /
// `time resume`, `time scale` and `time jump`. A fan folds back on a choice, on a click elsewhere and on Esc.
import type { StateVar } from '@pme/engine-core';
import { spanText } from '../describe.ts';
import { activeText } from '../events.ts';
import type { Link } from '../link.ts';
import { oneLiner } from '../patients.ts';
import { cardOf } from '../scenarios.ts';
import { SPEEDS } from '../sessionbar.ts';
import { clock, h, setText, toast } from '../ui.ts';

/** The fan's skips in seconds: +1, +2, +5 and +10 min (the host accepts 0–600 s: `FF_MAX_S` in host-session.ts). */
export const FF_SKIPS: readonly number[] = [60, 120, 300, 600];

const PLAY_SVG = '<svg aria-hidden="true" width="12" height="14" viewBox="0 0 12 14"><path d="M1.5 1 11 7 1.5 13z" fill="currentColor"/></svg>';
const STOP_SVG = '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12"><rect x="1" y="1" width="10" height="10" rx="2" fill="currentColor"/></svg>';
const FF_SVG = '<svg aria-hidden="true" width="16" height="12" viewBox="0 0 16 12"><path d="M1 1 8 6 1 11z M8 1l7 5-7 5z" fill="currentColor"/></svg>';

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
export function mountHeader(link: Link): Header {
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
  };
  pill.addEventListener('click', () => {
    paused = !paused;
    asking++;
    void link.send({ type: 'time', action: paused ? 'pause' : 'resume' }).finally(() => (asking--, refresh()));
    drawPill();
    drawFf();
  });

  // The speed box: today's speed buttons, one at a time
  const speed = fan({
    cls: 'ip2-speed', label: 'Simulation speed: press to choose', groupLabel: 'Speed',
    options: SPEEDS.map((k) => [k, `×${k}`, `Speed ×${k}`]),
    choose: (v) => void link.send({ type: 'time', action: 'scale', value: Number(v) }).then((r) => r.accepted && toast(`Speed ×${v}`)),
  });

  // The Fast forward fan: today's fast-forward buttons, with the host's longer skips
  const ff = fan({
    cls: 'ip2-ff', label: 'Fast forward: press to choose how far', groupLabel: 'Fast forward by',
    options: FF_SKIPS.map((s) => [String(s), `+${spanText(s)}`, `Fast forward by ${spanText(s)}`]),
    choose: (v) => void link.send({ type: 'time', action: 'jump', value: Number(v) }).then((r) => r.accepted || toast(`Fast-forward refused: ${r.reason ?? 'refused'}`, 'alert')),
  });
  ff.box.innerHTML = `${FF_SVG}<span>Fast forward ▾</span>`;
  const drawFf = () => {
    // One skip at a time (as today), and none while paused (answer 9: nothing is queued)
    const off = link.ctl.fastForward !== null || paused;
    ff.box.disabled = off;
    for (const b of ff.opts) b.disabled = off;
    if (off) ff.close();
    ff.box.title = paused ? 'Resume to fast forward' : '';
  };

  const held = (): StateVar[] => Object.entries(link.ctl.state?.control ?? {}).filter(([, f]) => f === 'pinned' || f === 'ramping').map(([v]) => v as StateVar);

  const refresh = () => {
    const host = link.host;
    const p = link.ctl.scenario.doc?.patient;
    const base = host ? oneLiner(host.spec) : p ? [p.sex ?? '', p.ageY !== undefined ? `${p.ageY} y` : '', p.weightKg !== undefined ? `${p.weightKg} kg` : ''].filter(Boolean).join(' ') : '';
    setText(who, [base, ...activeText(link.conditions)].filter(Boolean).join(' · '));
    const m = link.ctl.state?.mode ?? host?.mode ?? 'manual';
    const n = m === 'modeled' ? held().length : 0;
    mode.dataset.mode = m;
    setText(mode, m === 'modeled' ? (n ? `MODELED, ${n} held` : 'MODELED') : 'MANUAL');
    const sv = link.ctl.scenario;
    setText(title, sv.doc ? cardOf(sv.doc).title : 'No scenario');
    // The pause and speed the HOST runs at, wherever they were set
    if (!asking && paused !== link.ctl.hostPaused) paused = link.ctl.hostPaused;
    drawPill();
    drawFf();
    const k = String(link.ctl.timeScale);
    setText(speed.box, `×${SPEEDS.includes(k) ? k : link.ctl.timeScale} ▾`);
    for (const b of speed.opts) b.setAttribute('aria-pressed', String(b.dataset.v === k));
  };

  const el = h('header', { class: 'ip2-head', 'aria-label': 'Session' },
    who, mode, title, h('span', { class: 'ip2-spacer' }), pill, speed.wrap, ff.wrap);
  refresh();
  return {
    el,
    togglePause: () => pill.click(),
    refresh,
    destroy: () => (speed.close(), ff.close()),
  };
}
