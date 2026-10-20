// @vitest-environment happy-dom
// The fast-forward panel — the page dimmed and blurred behind it, the ringed chevrons, "FAST FORWARD · 5 MIN", a progress
// bar with no times on it, the muted-sound icon with no words beside it — then the banner for ≈ 8 s on three lines (the
// span, from → to, the alarms and their times), and the alarms that came and went handed to the monitor to latch (FX-23).
import type { FastForwardAlarm, FastForwardDone } from '@pme/controller';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fastForwardDoneLines, FF_DONE_SHOW_MS, FF_SPANS, FF_WALL_MS, mountFastForward, type FastForwardSource } from './fast-forward.ts';

afterEach(() => vi.useRealTimers());
const al = (id: string, text: string, since: number, ended: boolean): FastForwardAlarm => ({ id, text, since, ended, level: 2, category: 'physiological', acked: false, latched: false });

describe('the fast-forward panel and banner', () => {
  it('fills the bar over the span (no running clock, no start or end time), then fades into the banner, which goes after 8 s; the ended alarms are latched once', () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'performance'] });
    expect(FF_SPANS).toEqual([120, 300]);
    expect(FF_WALL_MS).toBe(10_000);
    const src: { fastForward: FastForwardSource['fastForward']; lastFastForward: FastForwardDone | null } = { fastForward: null, lastFastForward: null };
    let simT = 600;
    const latched: FastForwardAlarm[][] = [];
    const off = mountFastForward(document.body, src, { simT: () => simT, latch: (a) => latched.push(a) });
    const veil = document.querySelector('.ff-veil') as HTMLElement;
    const banner = document.querySelector('.ff-banner') as HTMLElement;
    expect(veil.classList.contains('on')).toBe(false);
    src.fastForward = { fromT: 600, toT: 900 };
    simT = 750;
    vi.advanceTimersByTime(100);
    expect(veil.classList.contains('on')).toBe(true);
    expect(veil.querySelector('.ff-title')?.textContent).toBe('FAST FORWARD · 5 MIN');
    expect(veil.querySelector('.ff-icon svg')).not.toBeNull(); // the ring is the icon's own border: one element blinks
    expect((veil.querySelector('.ff-fill') as HTMLElement).style.width).toBe('50%');
    expect(veil.querySelector('.ff-now')).toBeNull();
    expect(veil.querySelector('.ff-ends')).toBeNull();
    expect(veil.textContent).not.toMatch(/\d\d:\d\d/); // no time anywhere on the panel
    const mute = veil.querySelector('.ff-mute') as HTMLElement;
    expect(mute.querySelector('svg')).not.toBeNull();
    expect([...mute.childNodes].filter((n) => n.nodeType === 3 || (n as Element).className !== 'sr-only').map((n) => n.nodeName)).toEqual(['svg']); // no words on screen
    expect(mute.querySelector('.sr-only')?.textContent).toBe('sound muted'); // for a screen reader
    expect(banner.hidden).toBe(true);
    src.fastForward = null;
    src.lastFastForward = { fromT: 600, toT: 900, endT: 900, alarms: [al('HR_HIGH', '**HR 75>70', 700, true), al('SPO2_LOW', '**SpO2 89<90', 800, false)] };
    vi.advanceTimersByTime(100);
    expect(veil.classList.contains('on')).toBe(false);
    expect(banner.hidden).toBe(false);
    expect([...banner.children].map((l) => l.textContent)).toEqual(['Fast-forwarded 5 min', '10:00 → 15:00', '**HR 75>70 11:40, **SpO2 89<90 13:20']);
    expect(latched.map((a) => a.map((x) => x.id))).toEqual([['HR_HIGH']]);
    vi.advanceTimersByTime(FF_DONE_SHOW_MS);
    expect(banner.hidden).toBe(true);
    expect(latched).toHaveLength(1);
    src.fastForward = { fromT: 900, toT: 1020 };
    vi.advanceTimersByTime(100);
    expect(veil.querySelector('.ff-title')?.textContent).toBe('FAST FORWARD · 2 MIN');
    off();
    expect(document.querySelector('.ff-veil')).toBeNull();
  });

  it('the banner: three lines from one function: the span, from → to, the alarms or "No alarms"', () => {
    expect(fastForwardDoneLines({ fromT: 8, toT: 308, endT: 308, alarms: [] })).toEqual(['Fast-forwarded 5 min', '00:08 → 05:08', 'No alarms']);
    expect(fastForwardDoneLines({ fromT: 600, toT: 720, endT: 720, alarms: [al('SPO2_LOW', '**SpO2 89<90', 650, true)] })).toEqual(['Fast-forwarded 2 min', '10:00 → 12:00', '**SpO2 89<90 10:50']);
    expect(fastForwardDoneLines({ fromT: 600, toT: 900, endT: 660, stopped: 'a new patient or scenario started', alarms: [] })[0]).toBe('Fast-forwarded 1 min (stopped early: a new patient or scenario started)');
  });
});
