import { afterEach, describe, expect, it, vi } from 'vitest';
import { RevealGesture } from '../../src/panel/reveal.ts';

const key = (k: string, mods: Partial<{ ctrlKey: boolean; shiftKey: boolean; altKey: boolean; metaKey: boolean }> = {}, targetTag = 'BODY') => ({
  key: k, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, targetTag, ...mods,
});

describe('RevealGesture', () => {
  afterEach(() => vi.useRealTimers());

  it('toggles on `i` and Ctrl+Shift+I, not while typing, not on Cmd+I', () => {
    const fn = vi.fn();
    const g = new RevealGesture(fn);
    expect(g.key(key('i'))).toBe(true);
    expect(g.key(key('I', { ctrlKey: true, shiftKey: true }))).toBe(true);
    expect(g.key(key('i', {}, 'INPUT'))).toBe(false);
    expect(g.key(key('i', { metaKey: true }))).toBe(false);
    expect(g.key(key('j'))).toBe(false);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('toggles after 5 taps in the top-left corner within 3 s, and not for slow or outside taps', () => {
    const fn = vi.fn();
    const g = new RevealGesture(fn);
    for (const t of [0, 1000, 2000, 3000, 3500]) g.down(10, 10, 1, t); // the tap at 0 is > 3 s old at 3500
    expect(fn).not.toHaveBeenCalled();
    g.down(10, 10, 1, 3600); // 1000, 2000, 3000, 3500, 3600: five within 3 s
    expect(fn).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 5; i++) g.down(200, 10, 1, 9000 + i * 100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('toggles after a three-finger hold of 800 ms, cancelled by lifting early', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const g = new RevealGesture(fn);
    g.down(300, 300, 3, 0);
    vi.advanceTimersByTime(500);
    g.up();
    vi.advanceTimersByTime(1000);
    expect(fn).not.toHaveBeenCalled();
    g.down(300, 300, 3, 0);
    vi.advanceTimersByTime(800);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
