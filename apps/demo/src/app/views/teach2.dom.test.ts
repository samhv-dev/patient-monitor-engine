// @vitest-environment happy-dom
// The Instructor v2 frame (plan IP4): header, strip, STATE, ACTION, the sheets layer and the dock, the four stub slots
// mounted with the fixed signature, Space wired to the pill, and none of today's locators (plan's selector rule).
import { ScenarioView, type AckResult, type CommandInput } from '@pme/controller';
import { afterEach, describe, expect, it } from 'vitest';
import type { Link } from '../link.ts';
import { DEFAULT_SITE } from '../site.ts';
import { mount as action } from '../teach2/action.ts';
import type { MountSlot, Teach2Ctx } from '../teach2/ctx.ts';
import { mount as cue } from '../teach2/cue.ts';
import { mount as sheets } from '../teach2/sheets.ts';
import { mount as strip } from '../teach2/strip.ts';
import { teach2View, type Teach2View } from './teach2.ts';

const settle = () => new Promise((r) => setTimeout(r, 0));

function rig() {
  const sent: CommandInput[] = [];
  const fns = new Set<() => void>();
  const reply: AckResult = { accepted: true, tick: 0, commandId: 'c1', rttMs: 0 };
  const link = {
    ctl: { scenario: new ScenarioView(), state: null, timeScale: 1, hostPaused: false, fastForward: null, simT: 0 },
    host: null, simT: 0, conditions: new Map(),
    send: async (c: CommandInput) => (sent.push(structuredClone(c)), reply),
    onChange: (fn: () => void) => (fns.add(fn), () => void fns.delete(fn)),
  } as unknown as Link;
  const v = teach2View(link, { site: DEFAULT_SITE, weightKg: () => 70 });
  document.body.append(v.el);
  return { v, sent };
}

let open: Teach2View | null = null;
afterEach(() => {
  open?.destroy();
  open = null;
  document.body.replaceChildren();
});

describe('Instructor v2 frame', () => {
  it('lays out header, strip, STATE, ACTION, the sheets layer and the dock, and mounts the four stub slots', () => {
    const { v } = rig();
    open = v;
    expect(v.id).toBe('teach2');
    expect([...v.el.children].map((c) => c.className)).toEqual(['sr-only', 'ip2-head', 'ip2-strip', 'ip2-state', 'ip2-action', 'ip2-sheets', 'ip2-dock']);
    expect(v.el.querySelector('.ip2-strip')?.getAttribute('data-stub')).toBe('IP5');
    expect(v.el.querySelector('.ip2-cue')?.getAttribute('data-stub')).toBe('IP5');
    expect(v.el.querySelector('.ip2-action-body')?.getAttribute('data-stub')).toBe('IP6');
    expect(v.el.querySelector('.ip2-sheets')?.getAttribute('data-stub')).toBe('IP7');
    expect(() => v.openSheet('devices')).not.toThrow(); // a no-op until IP7
    v.enter?.('');
  });

  it('every stub has the fixed slot signature: mount(el, ctx) => { refresh, destroy }', () => {
    for (const m of [strip, cue, action, sheets] satisfies MountSlot[]) {
      const s = m(document.createElement('div'), {} as Teach2Ctx);
      expect(Object.keys(s).sort()).toEqual(['destroy', 'refresh']);
      expect(() => (s.refresh(), s.destroy())).not.toThrow();
    }
  });

  it('Space presses the clock pill while the view is shown, and nothing while it is hidden', async () => {
    const { v, sent } = rig();
    open = v;
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    await settle();
    expect(sent).toEqual([{ type: 'time', action: 'pause' }]);
    v.el.hidden = true;
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    await settle();
    expect(sent).toHaveLength(1);
  });

  it('never uses today\'s locators', () => {
    const { v } = rig();
    open = v;
    expect(v.el.querySelector('.sessionbar, section[aria-label="Running scenario"], ul[aria-label="Objectives"], [data-tab], [id^="teach-"], .panel, .seg')).toBeNull();
    expect([...v.el.querySelectorAll('[class]')].flatMap((e) => [...e.classList]).filter((c) => !c.startsWith('ip2') && c !== 'sr-only')).toEqual([]);
  });
});
