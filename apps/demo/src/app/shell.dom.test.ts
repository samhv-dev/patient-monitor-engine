// @vitest-environment happy-dom
// The alarm mirror follows the active skin: its colours and its priority marks. The session bar per route (E127).
import { describe, expect, it } from 'vitest';
import { RAIL } from './rail.ts';
import { applySkinAlarmColours, LEVEL_MARK, NAV, OWN_BAR_ROUTES, Shell, skinAlarmBar } from './shell.ts';

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

describe('Instructor v2 (E127): its own session bar', () => {
  it('the shell\'s session bar is hidden on #/teach2 and shown again on #/teach; the stage stays on both', () => {
    document.body.replaceChildren();
    const shell = new Shell(document.body, { hostless: false });
    for (const id of ['home', 'teach', 'teach2'] as const) shell.add({ id, el: document.createElement('section') });
    expect(OWN_BAR_ROUTES).toEqual(new Set(['teach2']));
    shell.show({ id: 'teach2', sub: '' });
    expect(shell.bar.hidden).toBe(true);
    expect(shell.stage.hidden).toBe(false);
    expect(document.title).toBe('Instructor v2: patient monitor simulator');
    shell.show({ id: 'teach', sub: '' });
    expect(shell.bar.hidden).toBe(false);
    expect(shell.stage.hidden).toBe(false);
    shell.show({ id: 'teach2', sub: '' });
    shell.show({ id: 'home', sub: '' }); // a console page hides both, as before
    expect(shell.bar.hidden).toBe(true);
    expect(shell.stage.hidden).toBe(true);
  });
  it('the rail lists "Instructor v2" right after Instructor', () => {
    const ids = RAIL.map((e) => e[0]);
    expect(ids.indexOf('teach2')).toBe(ids.indexOf('teach') + 1);
    expect(RAIL[ids.indexOf('teach2')]).toEqual(['teach2', 'Instructor v2']);
    expect(NAV).toContainEqual(['teach2', 'Instructor v2']);
  });
});
