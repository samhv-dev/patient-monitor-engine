// Alarm header and tile views (brief §6.4 visual table, §6.4.1) as pure functions.
import { describe, expect, it } from 'vitest';
import { resolveSkin } from '@pme/skins';
import { barView, tileAlarmView, type AlarmStatus } from '../src/alarm-view.ts';

const sa = resolveSkin('saadat-like');
const ph = resolveSkin('philips-like');
function status(over: Partial<AlarmStatus> = {}): AlarmStatus {
  return {
    type: 'alarmStatus', t: 10, skin: 'saadat-like', ageBand: 'adult', active: [], silencedUntil: null, pausedUntil: null,
    limits: { HR: { numeric: 'hr', low: 50, high: 150, enabled: true, level: 1, approximate: false } }, allOff: false, arrhythmiaAnalysis: false, volume: 1, ...over,
  };
}
const asy = { id: 'ASYSTOLE', level: 1 as const, category: 'physiological' as const, text: 'ECG ASYSTOLE', since: 5, latched: false, acked: false };
const hr = { id: 'HR_HIGH', level: 2 as const, category: 'physiological' as const, text: 'HR TOO HIGH', numeric: 'hr' as const, since: 4, latched: false, acked: false };
const leads = { id: 'ecgLeadsOff', level: 3 as const, category: 'technical' as const, text: 'ECG CHECK LA/RA/LL', since: 3, latched: false, acked: false };

describe('barView', () => {
  it('saadat-like idle: grey bar, lamp off; all-off bell when every parameter alarm is OFF', () => {
    expect(barView(status({ allOff: true }), sa, 10)).toMatchObject({ text: '', bg: '#E0E0E0', lamp: 'off', allOffBell: true });
  });
  it('saadat-like levels: L1 red flash 2 Hz, L2 yellow flash 0.6 Hz, L3 cyan bar with a steady yellow lamp, black text', () => {
    expect(barView(status({ active: [hr, asy] }), sa, 10)).toMatchObject({ text: 'ECG ASYSTOLE', bg: '#F00000', fg: '#000000', lamp: 'red-flash', flashHz: 2 });
    expect(barView(status({ active: [hr] }), sa, 10)).toMatchObject({ bg: '#F0F000', lamp: 'yellow-flash', flashHz: 0.6 });
    expect(barView(status({ active: [leads] }), sa, 10)).toMatchObject({ bg: '#00D0D0', fg: '#000000', lamp: 'yellow-steady', flashHz: 0 });
  });
  it('saadat-like silence hides physiological alarms and shows the countdown; the PUMP page keeps ASYSTOLE', () => {
    const s = status({ active: [asy, { ...leads, acked: true }], silencedUntil: 130 });
    expect(barView(s, sa, 10)).toMatchObject({ text: 'ECG CHECK LA/RA/LL', bg: '#E0E0E0', lamp: 'off', countdownS: 120, countdownKind: 'silence' });
    expect(barView(s, sa, 10, true)).toMatchObject({ text: 'ECG ASYSTOLE', bg: '#F00000' });
  });
  it('IEC-style mute (zoll-like 90 s) keeps the visuals (audio only) with a countdown; philips-like Silence acknowledges (FU-5: no countdown); same-level messages rotate every 2 s', () => {
    const zl = resolveSkin('zoll-like');
    const a2 = { ...asy, id: 'VFIB', text: '***VFIB/VTACH', since: 6 };
    const s = status({ active: [{ ...asy, text: '***ASYSTOLE' }, a2], silencedUntil: 100 });
    expect(barView(s, zl, 12)).toMatchObject({ text: '***ASYSTOLE', bg: '#FF0000', fg: '#FFFFFF', countdownS: 88 });
    expect(barView(s, zl, 14).text).toBe('***VFIB/VTACH');
    expect(barView(status({ active: [{ ...asy, text: '***ASYSTOLE' }, a2] }), ph, 14)).toMatchObject({ text: '***VFIB/VTACH', countdownS: null });
  });
});

describe('FU-5 barView: latched style, INOP visibility (audit M2, M3)', () => {
  const vf = { ...asy, id: 'VFIB', text: '***VFIB/VTACH', since: 6 };
  it('a latched alarm keeps its message in the latched style (level colour as text, lamp off); under a live yellow it stays in the rotation (philips-like rotates every message, [S2] p. 29–30; review ruling 4) or on top (other skins), never hidden', () => {
    const s = status({ active: [{ ...vf, latched: true }] });
    expect(barView(s, ph, 12)).toMatchObject({ text: '***VFIB/VTACH', latched: true, lamp: 'off', fg: '#FF0000' });
    const both = status({ active: [{ ...vf, latched: true }, { ...hr, text: '**HR 130>120' }] });
    expect(barView(both, ph, 12)).toMatchObject({ text: '***VFIB/VTACH', latched: true, lamp: 'yellow-flash' }); // the lamp from the live yellow
    expect(barView(both, ph, 14)).toMatchObject({ text: '**HR 130>120', latched: false, lamp: 'yellow-flash' });
    const zo = resolveSkin('zoll-like'); // IEC default: lethal alarms latch; the top level rotates, a latched red is the top
    expect([12, 14, 16].map((t) => barView(both, zo, t).text)).toEqual(['***VFIB/VTACH', '***VFIB/VTACH', '***VFIB/VTACH']);
  });
  it('single bar (philips-like): LEADS OFF rotates in with a red alarm every 2 s, the lamp stays red', () => {
    const s = status({ active: [{ ...asy, id: 'apnoea-co2', text: '***APNEA' }, { ...leads, text: 'ECG LEADS OFF' }] });
    expect(barView(s, ph, 12)).toMatchObject({ text: '***APNEA', lamp: 'red-flash' });
    expect(barView(s, ph, 14)).toMatchObject({ text: 'ECG LEADS OFF', lamp: 'red-flash' });
  });
  it('split layout (mindray-like, [S4] §3.6): the INOP has its own field beside the physiological bar', () => {
    const mr = resolveSkin('mindray-like');
    const b = barView(status({ active: [{ ...asy, id: 'apnoea-co2', text: '***APNEA' }, { ...leads, text: 'ECG LEADS OFF' }] }), mr, 14);
    expect(b.text).toBe('***APNEA');
    expect(b.inop?.text).toBe('ECG LEADS OFF');
  });
});

describe('tileAlarmView', () => {
  it('limits shown only when ON; crossed bell when OFF; flash level from the alarm on its numeric', () => {
    expect(tileAlarmView('HR', status({ active: [hr] }), sa, 10)).toEqual({ flash: 2, bellOff: false, limits: '50–150' });
    const off = status({ limits: { HR: { numeric: 'hr', low: 50, high: 150, enabled: false, level: 1, approximate: true } } });
    expect(tileAlarmView('HR', off, sa, 10)).toEqual({ flash: null, bellOff: true, limits: '' });
    expect(tileAlarmView('HR', status({ active: [hr], silencedUntil: 100 }), sa, 10).flash).toBeNull(); // saadat-like silence hides it
  });
});
