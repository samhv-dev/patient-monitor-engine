// @vitest-environment happy-dom
// Instructor v2's session bar and its Fast forward box (in STATE since the owner's option G) send exactly what today's
// session bar sends (plan IP4, answer 9): both are mounted on one fake Link and pressed control by control; the commands
// sent are compared deep-equal, and the toasts too. The header's Sound switch and Room code are the top bar's.
import { ScenarioView, type AckResult, type CommandInput } from '@pme/controller';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Link } from '../link.ts';
import { mountSessionBar } from '../sessionbar.ts';
import { FF_SKIPS, mountFastForward } from './ff.ts';
import { mountHeader } from './header.ts';

function fakeLink(reply: AckResult = { accepted: true, tick: 0, commandId: 'c1', rttMs: 0 }) {
  const sent: CommandInput[] = [];
  const fns = new Set<() => void>();
  const ctl = { scenario: new ScenarioView(), state: null, timeScale: 1, hostPaused: false, fastForward: null as null | { fromT: number; toT: number }, simT: 0 };
  const link = {
    ctl, host: null, simT: 0, conditions: new Map(),
    // the host's answer: an accepted pause or resume is the host's state by the time the ack lands
    send: async (c: CommandInput) => {
      sent.push(structuredClone(c));
      if (reply.accepted && c.type === 'time' && (c.action === 'pause' || c.action === 'resume')) ctl.hostPaused = c.action === 'pause';
      return reply;
    },
    onChange: (fn: () => void) => (fns.add(fn), () => void fns.delete(fn)),
  } as unknown as Link;
  return { link, ctl, sent, take: () => sent.splice(0) };
}

const settle = () => new Promise((r) => setTimeout(r, 0));
const toasts = () => [...document.querySelectorAll('.toast')].map((t) => t.textContent);
const clearToasts = () => document.querySelectorAll('.toast').forEach((t) => t.remove());

let offs: Array<() => void> = [];
beforeEach(() => document.body.replaceChildren());
afterEach(() => {
  for (const off of offs) off();
  offs = [];
});

function both(reply?: AckResult) {
  const f = fakeLink(reply);
  const today = document.createElement('div');
  document.body.append(today);
  offs.push(mountSessionBar(today, f.link));
  const v2 = mountHeader(f.link);
  const ff = mountFastForward(f.link);
  document.body.append(v2.el, ff.el);
  offs.push(v2.destroy);
  const q = <T extends Element>(root: Element, s: string) => root.querySelector(s) as unknown as T;
  return { ...f, today, v2, ff, q };
}

/** Press a control, let the ack land, return what was sent and the toasts said. */
async function press(f: { take(): CommandInput[] }, el: HTMLElement): Promise<{ sent: CommandInput[]; toasts: Array<string | null> }> {
  clearToasts();
  el.click();
  await settle();
  return { sent: f.take(), toasts: toasts() };
}

describe('Instructor v2 header: the same commands as the session bar', () => {
  it('the clock pill pauses and resumes with the Pause / Resume button\'s commands', async () => {
    const r = both();
    const todayPause = [...r.today.querySelectorAll('button')].find((b) => b.textContent === 'Pause') as HTMLButtonElement;
    const pill = r.q<HTMLButtonElement>(r.v2.el, '.ip2-pill');
    expect(pill.dataset.state).toBe('running');
    const a1 = await press(r, todayPause);
    const b1 = await press(r, pill);
    expect(b1).toEqual(a1);
    expect(b1.sent).toEqual([{ type: 'time', action: 'pause' }]);
    expect(pill.dataset.state).toBe('paused');
    expect(pill.textContent).toContain('PAUSED');
    const a2 = await press(r, todayPause); // now "Resume"
    const b2 = await press(r, pill);
    expect(b2).toEqual(a2);
    expect(b2.sent).toEqual([{ type: 'time', action: 'resume' }]);
  });

  it('Space\'s path (togglePause) is the pill\'s press', async () => {
    const r = both();
    r.v2.togglePause();
    await settle();
    expect(r.take()).toEqual([{ type: 'time', action: 'pause' }]);
  });

  it.each(['1', '2', '4', '8'])('the speed box ×%s sends the speed button\'s command and toast, then folds', async (k) => {
    const r = both();
    const box = r.q<HTMLButtonElement>(r.v2.el, '.ip2-speed');
    const fanEl = box.previousElementSibling as HTMLElement;
    expect(fanEl.hidden).toBe(true);
    box.click();
    expect(fanEl.hidden).toBe(false);
    expect(box.getAttribute('aria-expanded')).toBe('true');
    const a = await press(r, r.q(r.today, `[aria-label="Simulation speed"] button[data-v="${k}"]`));
    const b = await press(r, r.q(fanEl, `button[data-v="${k}"]`));
    expect(b).toEqual(a);
    expect(b.sent).toEqual([{ type: 'time', action: 'scale', value: Number(k) }]);
    expect(b.toasts).toEqual([`Speed ×${k}`]);
    expect(fanEl.hidden).toBe(true);
  });

  it('the Fast forward box (STATE, option G): +2 and +5 min send the fast-forward buttons\' commands, with the same toasts', async () => {
    expect(FF_SKIPS).toEqual([120, 300]);
    const r = both();
    for (const s of [120, 300]) {
      const a = await press(r, r.q(r.today, `button[aria-label="Fast-forward ${s / 60} min"]`));
      const b = await press(r, r.q(r.ff.el, `button[aria-label="Fast forward by ${s / 60} min"]`));
      expect(b).toEqual(a);
      expect(b.sent).toEqual([{ type: 'time', action: 'jump', value: s }]);
    }
    expect([...r.ff.el.querySelectorAll('button')].map((b) => b.textContent)).toEqual(['+2 min', '+5 min']);
  });

  it('a refused fast-forward: the same alert toast as today', async () => {
    const r = both({ accepted: false, reason: 'not now', tick: 0, commandId: 'c1', rttMs: 0 });
    const a = await press(r, r.q(r.today, 'button[aria-label="Fast-forward 2 min"]'));
    const b = await press(r, r.q(r.ff.el, 'button[aria-label="Fast forward by 2 min"]'));
    expect(b).toEqual(a);
    expect(b.toasts).toEqual(['Fast-forward refused: not now']);
  });

  it('Fast forward is disabled while paused (nothing is queued) and during a skip', async () => {
    const r = both();
    const btns = () => [...r.ff.el.querySelectorAll<HTMLButtonElement>('button')];
    r.q<HTMLButtonElement>(r.v2.el, '.ip2-pill').click();
    await settle();
    r.take();
    r.ff.refresh();
    expect(btns().every((b) => b.disabled)).toBe(true);
    // the pill's tooltip says when a step pressed now is given (v9's banner text, option G)
    expect(r.q<HTMLElement>(r.v2.el, '.ip2-pill').title).toMatch(/^Paused\. Timers are frozen\. A step pressed now is given at \d\d:\d\d and acts when you resume\.$/);
    // the host resumes (another controller pressed it): enabled again
    r.ctl.hostPaused = false;
    r.ff.refresh();
    expect(btns().every((b) => !b.disabled)).toBe(true);
    // a skip running anywhere: disabled, as today's buttons
    r.ctl.fastForward = { fromT: 0, toT: 120 };
    r.ff.refresh();
    expect(btns().every((b) => b.disabled)).toBe(true);
  });

  it('the Sound switch and the Room code are the top bar\'s: the same toggle, the code and the phone count, the Remote link', async () => {
    const f = fakeLink();
    let on = false;
    const toggled: boolean[] = [];
    const v2 = mountHeader(f.link, { soundOn: () => on, toggleSound: () => void toggled.push((on = !on)), code: 'QFBAWA', phones: () => 3 });
    document.body.append(v2.el);
    offs.push(v2.destroy);
    const sound = v2.el.querySelector('.ip2-sound') as HTMLButtonElement;
    expect([sound.getAttribute('aria-pressed'), sound.textContent]).toEqual(['false', 'Sound off']);
    sound.click();
    await settle();
    expect(toggled).toEqual([true]);
    expect([sound.getAttribute('aria-pressed'), sound.textContent]).toEqual(['true', 'Sound on']);
    const room = v2.el.querySelector('.ip2-room') as HTMLAnchorElement;
    expect(room.textContent).toBe('Room QFBAWA · 3 phones');
    expect(room.getAttribute('href')).toBe('#/remote');
    expect(f.sent).toEqual([]);
    // the order of option G: patient line, MODELED, title, gap, pill, speed, divider, Sound, Room
    expect([...v2.el.children].map((c) => c.className.split(' ')[0])).toEqual(['ip2-who', 'ip2-mode', 'ip2-title', 'ip2-spacer', 'ip2-pill', 'ip2-fanwrap', 'ip2-head-div', 'ip2-topctl', 'ip2-topctl']);
  });

  it('the pill and the speed box follow the host (a pause or speed set elsewhere)', () => {
    const r = both();
    r.ctl.hostPaused = true;
    r.ctl.timeScale = 4;
    r.v2.refresh();
    expect(r.q<HTMLElement>(r.v2.el, '.ip2-pill').dataset.state).toBe('paused');
    expect(r.q<HTMLElement>(r.v2.el, '.ip2-speed').textContent).toBe('×4 ▾');
    expect(r.q<HTMLElement>(r.v2.el, '.ip2-fanopt[data-v="4"]').getAttribute('aria-pressed')).toBe('true');
  });

  it('a press elsewhere and Esc fold an open fan without sending', () => {
    const r = both();
    const box = r.q<HTMLButtonElement>(r.v2.el, '.ip2-speed');
    const fanEl = box.previousElementSibling as HTMLElement;
    box.click();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(fanEl.hidden).toBe(true);
    box.click();
    fanEl.querySelector('button')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(fanEl.hidden).toBe(true);
    expect(r.sent).toEqual([]);
  });

  it('uses its own classes and names, never today\'s locators', () => {
    const r = both();
    expect(r.v2.el.matches('.sessionbar, [class*="sb-"]')).toBe(false);
    expect(r.v2.el.querySelector('.sessionbar, .seg, .ff-group, [class*="sb-"], [id^="teach-"]')).toBeNull();
    const names = [...r.v2.el.querySelectorAll('button')].map((b) => b.getAttribute('aria-label') ?? b.textContent);
    expect(names).not.toContain('Pause');
    expect(names.filter((n) => /^Fast-forward /.test(n ?? ''))).toEqual([]);
  });
});
