// The EDP-TS face's alarm tones (plan vent-skin-edp-ts.md V3, GA16; VQ6), made by the app itself: no sound file. What a
// train holds is the manual's (research/57 A-09, A-10, A-18): high 10 pulses in two groups of 5, medium 3, low 1; when
// the cause ends high 5, medium 3, low none; only the highest priority sounds; silence pauses the audio only (A-20).
// What a pulse sounds like (pitch, length, gaps, how often a train repeats, the gain) is not in the manual (A-11): face.json
// `tones` tags each `eng` until the owner's recording. Pure: `createAlarmSound` decides WHEN a train starts and hands it
// to a player; `audioPackagePlayer` plays it through @pme/audio (brief 202).
import { playAlarmPulse, type AudioOut } from '@pme/audio';
import type { AlarmEvent, AlarmSignals } from '../../core/alarms-view.ts';
import { DATA, num } from './data.ts';

type Priority = 'high' | 'medium' | 'low';
export interface Pulse { atMs: number; durMs: number; freqHz: number }

const T = DATA.tones;
/** One train of a priority: while the alarm is active, or the shorter one when its cause ends (A-10, A-18). */
export function train(pr: Priority, kind: 'active' | 'ended'): Pulse[] {
  const p = T[pr];
  const n = kind === 'active' ? num(p.pulses) : num(p.endPulses);
  const groups = kind === 'active' ? num(p.groups) : 1;
  const perGroup = Math.ceil(n / groups);
  const out: Pulse[] = [];
  let at = 0;
  for (let i = 0; i < n; i++) {
    if (i > 0) at += num(T.pulseMs) + (i % perGroup === 0 ? num(T.groupGapMs) : num(T.gapMs));
    out.push({ atMs: at, durMs: num(T.pulseMs), freqHz: num(p.freqHz) });
  }
  return out;
}
/** The gain of the sound volume setting (25–100 %, research/57 E-10) [eng: A-12's dBA cannot be set in a browser]. */
export const gainOf = (volumePct: number): number => num(T.gainMax) * (volumePct / 100);

export interface AlarmSound {
  /** Every render, with the view's signals, the sound volume and the wall clock. */
  update(s: AlarmSignals, volumePct: number, nowMs: number): void;
  /** The view's events (cockpit.onAlarm): an alarm that ends plays its end train. */
  event(e: AlarmEvent, s: AlarmSignals, volumePct: number): void;
}
export function createAlarmSound(play: (pulses: Pulse[], gain: number) => void): AlarmSound {
  let playing: Priority | null = null;
  let nextAt = 0;
  return {
    update(s, vol, nowMs) {
      const pr = s.silencedS > 0 ? null : s.sounding;
      if (pr === null) { playing = null; return; }
      if (pr !== playing || nowMs >= nextAt) {
        playing = pr;
        nextAt = nowMs + num(T[pr].repeatS) * 1000;
        play(train(pr, 'active'), gainOf(vol));
      }
    },
    event(e, s, vol) {
      if (e.kind !== 'ended' || s.silencedS > 0) return;
      // tones do not mix (A-09): an ending alarm is heard only when no higher one sounds
      const RANK = { high: 0, medium: 1, low: 2 } as const;
      if (s.sounding && RANK[s.sounding] < RANK[e.priority]) return;
      const p = train(e.priority, 'ended');
      if (p.length) play(p, gainOf(vol));
    },
  };
}

/** The player through the project's audio package (@pme/audio): each pulse one `playAlarmPulse` on the context and
 *  master gain `unlockAudio` made in a user gesture, a pure tone (one harmonic) with a 5 ms ramp, no click [eng: the
 *  tone's timbre is not in the manual either (A-11)]. */
export function audioPackagePlayer(out: AudioOut): (pulses: Pulse[], gain: number) => void {
  return (pulses, gain) => {
    const t0 = out.ctx.currentTime + 0.02;
    for (const p of pulses) playAlarmPulse(out.ctx, out.master, t0 + p.atMs / 1000, { freqHz: p.freqHz, durS: p.durMs / 1000, gain }, [0], 5);
  };
}
