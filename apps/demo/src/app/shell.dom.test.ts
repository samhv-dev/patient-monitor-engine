// @vitest-environment happy-dom
// The alarm mirror follows the active skin: its colours (D5, R50 review F5) and its priority marks (R50 review F12).
import { describe, expect, it } from 'vitest';
import { applySkinAlarmColours, LEVEL_MARK, skinAlarmBar } from './shell.ts';

const v = (k: string) => document.documentElement.style.getPropertyValue(k).toUpperCase();

describe('skin alarm mirror', () => {
  it('copies the skin L1–L3 colours and its priority marks', () => {
    applySkinAlarmColours('mindray-like', '');
    expect(v('--alarm-high-bg')).toBe(skinAlarmBar('mindray-like')?.L1.bg.toUpperCase());
    expect(v('--alarm-medium-bg')).toBe(skinAlarmBar('mindray-like')?.L2.bg.toUpperCase());
    expect(LEVEL_MARK).toEqual({ 1: '***', 2: '**', 3: '*' }); // IEC-style skins print asterisks
    applySkinAlarmColours('saadat-like', '');
    expect(v('--alarm-high-bg')).toBe(skinAlarmBar('saadat-like')?.L1.bg.toUpperCase());
    expect(LEVEL_MARK).toEqual({ 1: '!!!', 2: '!!', 3: '!' }); // no marks on the monitor: the mirror still marks
  });
  it('white on a bright red below 4.5:1 turns black (rule 9)', () => {
    applySkinAlarmColours('philips-like', '');
    const bar = skinAlarmBar('philips-like');
    expect(bar).not.toBeNull();
    expect(['#FFFFFF', '#000000']).toContain(v('--alarm-high-fg'));
  });
});
