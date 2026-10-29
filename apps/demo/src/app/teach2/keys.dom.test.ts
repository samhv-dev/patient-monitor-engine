// @vitest-environment happy-dom
// Instructor v2's keyboard (plan IP4, answer 16, risk R7): Space pauses through the pill and never also presses the
// focused button; Esc asks the sheets, the latest first; 1–9 and the letters run what IP6 / IP7 register; Shift+S/P/N
// send what today's panel sends. Nothing acts while typing, in a dialog, with a modifier, on a repeat, or while the view
// is hidden, and today's panel and this view never both answer one key.
import { ScenarioView, type AckResult, type CommandInput } from '@pme/controller';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Link } from '../link.ts';
import { mountPanel, type PanelHandle } from '../panel/panel.ts';
import { DEFAULT_SITE } from '../site.ts';
import { mountKeys } from './keys.ts';

const settle = () => new Promise((r) => setTimeout(r, 0));
const toasts = () => [...document.querySelectorAll('.toast')].map((t) => t.textContent);

function fakeLink(reply: AckResult = { accepted: true, tick: 0, commandId: 'c1', rttMs: 0 }) {
  const sent: CommandInput[] = [];
  const fns = new Set<() => void>();
  const link = {
    ctl: { scenario: new ScenarioView(), bookmarks: [], simT: 0, state: null, rhythm: null, log: [], send: async () => reply },
    host: null, alarms: null, simT: 0, log: [], ramps: new Map(),
    send: async (c: CommandInput) => (sent.push(structuredClone(c)), reply),
    note: () => undefined,
    onChange: (fn: () => void) => (fns.add(fn), () => void fns.delete(fn)),
  } as unknown as Link;
  return { link, sent };
}

function key(target: EventTarget, k: string, o: KeyboardEventInit = {}, type = 'keydown'): KeyboardEvent {
  const e = new KeyboardEvent(type, { key: k, bubbles: true, cancelable: true, ...o });
  target.dispatchEvent(e);
  return e;
}

let cleanup: Array<() => void> = [];
beforeEach(() => document.body.replaceChildren());
afterEach(() => {
  for (const f of cleanup) f();
  cleanup = [];
});

function rig(reply?: AckResult) {
  const f = fakeLink(reply);
  const view = document.createElement('section');
  const btn = document.createElement('button');
  const pressed = vi.fn();
  btn.addEventListener('click', pressed);
  const input = document.createElement('input');
  // a header button (IP9 review L2: Space pauses from the page, an ACTION row, or a header or dock button)
  const head = document.createElement('header');
  head.className = 'ip2-head';
  head.append(btn);
  view.append(head, input);
  document.body.append(view);
  const togglePause = vi.fn();
  const keys = mountKeys(view, { link: f.link, togglePause });
  cleanup.push(keys.destroy);
  return { ...f, view, btn, input, pressed, togglePause, keys };
}

describe('Instructor v2 keys', () => {
  it('Space toggles pause once; on a focused button its keydown and keyup are both taken, so the button is not pressed', () => {
    const r = rig();
    r.btn.focus();
    const down = key(r.btn, ' ');
    const up = key(r.btn, ' ', {}, 'keyup');
    expect(r.togglePause).toHaveBeenCalledTimes(1);
    expect(down.defaultPrevented).toBe(true);
    expect(up.defaultPrevented).toBe(true);
    expect(r.pressed).not.toHaveBeenCalled();
    key(r.btn, ' ', { repeat: true }); // held down: no flapping
    expect(r.togglePause).toHaveBeenCalledTimes(1);
  });

  it('IP9 review L2: Space pauses from the page, an ACTION row or a dock button; on a checkbox, radio, select, summary or another control it is that control\'s', () => {
    const r = rig();
    const make = (html: string) => {
      const box = document.createElement('div');
      box.innerHTML = html;
      r.view.append(box);
      return box.firstElementChild as HTMLElement;
    };
    const own = [make('<input type="checkbox">'), make('<input type="radio">'), make('<select><option>a</option></select>'), make('<details><summary>Finished</summary></details>').querySelector('summary') as HTMLElement, make('<button type="button" class="btn">Stage</button>')];
    for (const t of own) expect(key(t, ' ').defaultPrevented, t.outerHTML).toBe(false);
    expect(r.togglePause).not.toHaveBeenCalled();
    const row = make('<ol><li><button type="button" class="ip2-row">1</button></li></ol>').querySelector('.ip2-row') as HTMLElement;
    const dock = make('<footer class="ip2-dock"><button type="button">Debrief</button></footer>').querySelector('button') as HTMLElement;
    for (const t of [document.body, row, dock]) {
      expect(key(t, ' ').defaultPrevented).toBe(true);
      key(t, ' ', {}, 'keyup');
    }
    expect(r.togglePause).toHaveBeenCalledTimes(3);
  });

  it('nothing acts while typing, in an open dialog, with Ctrl/Cmd/Alt, or while the view is hidden', () => {
    const r = rig();
    const d = vi.fn();
    r.keys.digit(1, d);
    r.input.focus();
    for (const k of [' ', '1', 'S']) expect(key(r.input, k, { shiftKey: k === 'S' }).defaultPrevented).toBe(false);
    r.input.blur();
    for (const mod of ['ctrlKey', 'metaKey', 'altKey']) expect(key(document.body, '1', { [mod]: true }).defaultPrevented).toBe(false);
    const dlg = document.createElement('dialog');
    const inside = document.createElement('button');
    dlg.append(inside);
    dlg.setAttribute('open', '');
    document.body.append(dlg);
    expect(key(inside, ' ').defaultPrevented).toBe(false);
    dlg.remove();
    r.view.hidden = true;
    expect(key(document.body, ' ').defaultPrevented).toBe(false);
    expect(key(document.body, '1').defaultPrevented).toBe(false);
    const wrap = document.createElement('div');
    wrap.hidden = true; // hidden by an ancestor (the shell hides the view section)
    r.view.hidden = false;
    wrap.append(r.view);
    document.body.append(wrap);
    expect(key(document.body, ' ').defaultPrevented).toBe(false);
    expect(r.togglePause).not.toHaveBeenCalled();
    expect(d).not.toHaveBeenCalled();
    expect(r.sent).toEqual([]);
  });

  it('1–9 and the letters run what is registered, and only that; `i` stays the reveal gesture\'s', () => {
    const r = rig();
    const three = vi.fn();
    const drug = vi.fn();
    r.keys.digit(3, three);
    r.keys.letter('d', drug);
    expect(key(document.body, '3').defaultPrevented).toBe(true);
    expect(key(document.body, '4').defaultPrevented).toBe(false); // no row 4: the key is left alone
    expect(key(document.body, 'd').defaultPrevented).toBe(true);
    expect(key(document.body, '3', { repeat: true }).defaultPrevented).toBe(false);
    expect(three).toHaveBeenCalledTimes(1);
    expect(drug).toHaveBeenCalledTimes(1);
    r.keys.digit(3, null);
    key(document.body, '3');
    expect(three).toHaveBeenCalledTimes(1);
    expect(() => r.keys.letter('i', () => undefined)).toThrow(/reveal/);
  });

  it('Esc asks the handlers registered last first, and stops at the one that used it', () => {
    const r = rig();
    const asked: string[] = [];
    r.keys.escape(() => (asked.push('first'), true));
    const off = r.keys.escape(() => (asked.push('second'), false));
    expect(key(document.body, 'Escape').defaultPrevented).toBe(true);
    expect(asked).toEqual(['second', 'first']);
    off();
    asked.length = 0;
    key(document.body, 'Escape');
    expect(asked).toEqual(['first']);
    r.keys.destroy();
    rig();
    expect(key(document.body, 'Escape').defaultPrevented).toBe(false); // nothing open: Esc is left alone
  });
});

describe('Shift+S/P/N: what today\'s panel sends, and only one view answers', () => {
  let panel: PanelHandle | null = null;
  afterEach(() => {
    panel?.destroy();
    panel = null;
  });

  for (const [k, toast] of [['S', 'Alarm sound silenced'], ['P', 'Alarms paused'], ['N', 'NIBP measurement started']] as const) {
    it(`Shift+${k}`, async () => {
      const r = rig();
      // today's panel on the same link, as in the app: its section and this view are never shown together
      const today = document.createElement('section');
      panel = mountPanel(r.link, { site: DEFAULT_SITE, weightKg: () => 70, tab: 'log' });
      today.append(panel.el);
      document.body.append(today);
      r.view.hidden = true; // on #/teach
      key(document.body, k, { shiftKey: true });
      await settle();
      const todaySent = r.sent.splice(0);
      const todayToasts = toasts();
      document.querySelectorAll('.toast').forEach((t) => t.remove());
      expect(todaySent).toHaveLength(1);
      today.hidden = true; // on #/teach2
      r.view.hidden = false;
      key(document.body, k, { shiftKey: true });
      await settle();
      expect(r.sent).toEqual(todaySent);
      expect(toasts()).toEqual(todayToasts);
      expect(toasts()).toEqual([toast]);
    });
  }

  it('a refusal is said in the same words', async () => {
    const r = rig({ accepted: false, reason: 'no NIBP', tick: 0, commandId: 'c1', rttMs: 0 });
    key(document.body, 'N', { shiftKey: true });
    await settle();
    expect(r.sent).toEqual([{ type: 'device', action: { device: 'nibp', action: 'start' } }]);
    expect(toasts()).toEqual(['Not done: no NIBP']);
  });
});
