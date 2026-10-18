// @vitest-environment happy-dom
// The fast-forward panel — the page dimmed and blurred behind it, "FAST FORWARD · 5 MIN", the clock running from start
// to end over a progress bar, "sound muted" — then the banner for ≈ 8 s with the alarms and their times, and the alarms
// that came and went handed to the monitor to latch.
import type { FastForwardAlarm, FastForwardDone } from '@pme/controller';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FF_DONE_SHOW_MS, FF_SPANS, FF_WALL_MS, mountFastForward, type FastForwardSource } from './fast-forward.ts';

afterEach(() => vi.useRealTimers());
const al = (id: string, text: string, since: number, ended: boolean): FastForwardAlarm => ({ id, text, since, ended, level: 2, category: 'physiological', acked: false, latched: false });

describe('Stage 10: the fast-forward panel and banner', () => {
  it('runs the clock over the span, then fades into the banner, which goes after 8 s; the ended alarms are latched once', () => {
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
    expect(veil.querySelector('.ff-now')?.textContent).toBe('12:30');
    expect((veil.querySelector('.ff-fill') as HTMLElement).style.width).toBe('50%');
    expect(veil.querySelector('.ff-ends')?.textContent).toBe('10:0015:00');
    expect(veil.querySelector('.ff-mute')?.textContent).toBe('sound muted');
    expect(banner.hidden).toBe(true);
    src.fastForward = null;
    src.lastFastForward = { fromT: 600, toT: 900, endT: 900, alarms: [al('HR_HIGH', '**HR 75>70', 700, true), al('SPO2_LOW', '**SpO2 89<90', 800, false)] };
    vi.advanceTimersByTime(100);
    expect(veil.classList.contains('on')).toBe(false);
    expect(banner.hidden).toBe(false);
    expect(banner.textContent).toBe('Fast-forwarded 5 min, 10:00 → 15:00. During it: **HR 75>70 11:40, **SpO2 89<90 13:20.');
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
});
