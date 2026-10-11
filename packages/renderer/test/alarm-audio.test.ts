// Only the highest-priority alarm is audible (fake audio clock); silence and a new Saadat-like alarm behave as the
// engine says (brief §6.4.1).
import { describe, expect, it } from 'vitest';
import { AlarmSounder, IEC_STYLE, SAADAT, ToneScheduler, type AlarmSoundProfile, type AlarmToneRequest } from '@pme/audio';
import { AlarmAudioBridge } from '../src/alarm-audio.ts';
import type { AlarmStatus } from '../src/alarm-view.ts';

function rig(profile: AlarmSoundProfile, o: { windowSilence?: boolean } = {}) {
  let now = 0;
  const played: AlarmToneRequest[] = [];
  const sched = new ToneScheduler({
    audioNow: () => now,
    perfToAudio: (ms) => ms / 1000,
    outputLatency: () => 0,
    play: (tone) => {
      played.push(tone as AlarmToneRequest);
      return { stop: () => undefined };
    },
  });
  sched.clock.setAnchor({ simT: 0, perfMs: 0, timeScale: 1 });
  const sounder = new AlarmSounder(sched, profile);
  const bridge = new AlarmAudioBridge(sounder, () => 1, o);
  const run = (t: number) => {
    while (now < t - 1e-9) {
      now = Math.min(t, now + 0.025);
      sounder.pump(now);
      sched.pump();
    }
  };
  return { bridge, played, run };
}
const entry = (id: string, level: 1 | 2 | 3, acked = false) => ({ id, level, category: 'physiological' as const, text: id, since: 0, latched: false, acked });
const st = (t: number, active: Array<ReturnType<typeof entry> & { sounding?: boolean }>, silencedUntil: number | null = null): AlarmStatus => ({
  type: 'alarmStatus', t, skin: 'x', ageBand: 'adult', active, silencedUntil, pausedUntil: null, limits: {}, allOff: false, arrhythmiaAnalysis: false, volume: 5,
});

describe('FU-5 alarm audio bridge: the engine decides what sounds', () => {
  it('a latched alarm under visual-only latching is silent (`sounding: false`); a new alarm after an acknowledge sounds at once', () => {
    const r = rig(IEC_STYLE);
    r.bridge.onStatus(st(0, [{ ...entry('VFIB', 1), latched: true, sounding: false }]));
    r.run(5);
    expect(r.played).toEqual([]);
    r.bridge.onStatus(st(5, [{ ...entry('VFIB', 1, true), sounding: false }, { ...entry('ASYSTOLE', 1), sounding: true }])); // no silence timer (acknowledge skins)
    r.run(6.5);
    expect(r.played.length).toBeGreaterThan(0);
    expect(r.played.every((p) => p.id.startsWith('alarm:ASYSTOLE:'))).toBe(true);
  });
});

describe('alarm audio bridge', () => {
  it('only the highest priority sounds: a medium train stops when a high alarm is raised, and resumes after it clears', () => {
    const r = rig(IEC_STYLE);
    r.bridge.onStatus(st(0, [entry('HR_HIGH', 2)]));
    r.run(5);
    expect(new Set(r.played.map((p) => p.level))).toEqual(new Set([2]));
    const n = r.played.length;
    r.bridge.onStatus(st(5, [entry('HR_HIGH', 2), entry('ASYSTOLE', 1)]));
    r.run(14);
    const during = r.played.slice(n);
    expect(during.length).toBe(10); // one IEC-style high burst (the next is due at 15 s)
    expect(during.every((p) => p.level === 1 && p.id.startsWith('alarm:ASYSTOLE:'))).toBe(true);
    r.bridge.onStatus(st(14.5, [entry('HR_HIGH', 2)]));
    r.run(15);
    expect(r.played[r.played.length - 1]!.id.startsWith('alarm:HR_HIGH:')).toBe(true);
  });

  it('acknowledged alarms are silent; silence stops audio; a new Saadat-like alarm ends the silence', () => {
    const r = rig(SAADAT);
    r.bridge.onStatus(st(0, [entry('ASYSTOLE', 1, true)]));
    r.run(3);
    expect(r.played).toEqual([]);
    r.bridge.onStatus(st(3, [entry('ASYSTOLE', 1)]));
    r.run(4.5);
    expect(r.played.length).toBe(5); // one saadat L1 burst: 5 pulses over 1.35 s
    r.bridge.onStatus(st(4.5, [entry('ASYSTOLE', 1)], 124.5));
    r.run(40);
    expect(r.played.length).toBe(5);
    r.bridge.onStatus(st(40, [entry('ASYSTOLE', 1), entry('VFIB', 1)], null)); // the engine ended the silence (new alarm)
    r.run(41.5);
    expect(r.played.length).toBe(10);
  });
});

describe('FU-11 G3 (owner ruling Q7): an alarm pause ended by a new higher-priority alarm sounds at once', () => {
  it('the paused monitor is quiet; when the engine ends the pause for a higher alarm, that alarm sounds in the same status', () => {
    const r = rig(IEC_STYLE);
    r.bridge.onStatus(st(0, [entry('HR_HIGH', 2)]));
    r.run(2);
    const n = r.played.length;
    expect(n).toBeGreaterThan(0);
    r.bridge.onStatus({ ...st(2, []), pausedUntil: 182 }); // Pause: the engine removes every alarm and raises nothing
    r.run(20);
    expect(r.played.length).toBe(n);
    r.bridge.onStatus(st(20, [entry('HR_HIGH', 2), entry('ASYSTOLE', 1)])); // the engine ended the pause (G3) and raised
    r.run(21);
    expect(r.played.slice(n).some((p) => p.id.startsWith('alarm:ASYSTOLE:'))).toBe(true);
    expect(r.played.slice(n).every((p) => p.t >= 20 - 1e-9)).toBe(true);
  });
});

describe('FU-11 (owner ruling Q3): a learner window manages its own alarm sound', () => {
  it("ignores the instructor's silence (timer or acknowledge) and keeps its own; its own silence never reaches the engine", () => {
    const r = rig(IEC_STYLE, { windowSilence: true });
    r.bridge.onStatus(st(0, [entry('HR_HIGH', 2)]));
    r.run(2);
    const n = r.played.length;
    expect(n).toBeGreaterThan(0);
    r.bridge.onStatus(st(2, [entry('HR_HIGH', 2)], 92)); // the instructor pressed Silence (mute timer)
    r.bridge.onStatus(st(2.5, [entry('HR_HIGH', 2, true)], 92)); // …or an acknowledge-style Silence
    r.run(40);
    expect(r.played.length).toBeGreaterThan(n); // this window still sounds
    expect(r.bridge.silenceWindow(40, { durationS: 90, mode: 'mute' })).toBe(true); // its own Silence
    const m = r.played.length;
    r.run(80);
    expect(r.played.length).toBe(m);
    r.bridge.onStatus(st(80, [entry('HR_HIGH', 2, true), entry('ASYSTOLE', 1)], 92)); // a higher alarm breaks through (Q1)
    r.run(82);
    expect(r.played.slice(m).some((p) => p.id.startsWith('alarm:ASYSTOLE:'))).toBe(true);
  });
  it('an acknowledge-style skin\'s own-window Silence lasts until a new alarm', () => {
    const r = rig(IEC_STYLE, { windowSilence: true });
    r.bridge.onStatus(st(0, [entry('HR_HIGH', 2)]));
    r.run(1);
    r.bridge.silenceWindow(1, { durationS: null, mode: 'acknowledge' });
    const m = r.played.length;
    r.run(200);
    expect(r.played.length).toBe(m);
    r.bridge.onStatus(st(200, [entry('HR_HIGH', 2), entry('SPO2_LOW', 2)]));
    r.run(202);
    expect(r.played.length).toBeGreaterThan(m);
  });
});
