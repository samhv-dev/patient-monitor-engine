// Web Audio voices for alarm pulses and device tones (brief §6.4: PeriodicWave with harmonics 1–5 at
// 0/−3/−6/−9/−12 dB, 15 ms linear rise and fall). `createTonePlayer` is the `play` function a ToneScheduler
// needs: it plays QRS beeps (existing playBeep), AlarmSounder pulses, and device tones by `kind`.
import { dbToGain } from './alarm-bursts.ts';
import type { AlarmToneRequest } from './alarm-sounder.ts';
import { chargeReadyTone, chargeTone, NIBP_DONE_TONE, SHOCK_TONE, type ToneSegment, type ToneSet } from './profiles/device-tones.ts';
import type { AlarmSoundProfile } from './profiles/types.ts';
import type { ToneHandle, ToneRequest } from './scheduler.ts';
import { playBeep } from './tones.ts';

type Ctx = BaseAudioContext;

/** Real/imag arrays for a PeriodicWave with the given harmonic levels (dB re fundamental). */
export function harmonicTable(harmonicsDb: readonly number[]): { real: Float32Array; imag: Float32Array } {
  const n = harmonicsDb.length + 1;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  harmonicsDb.forEach((db, i) => (imag[i + 1] = dbToGain(db)));
  return { real, imag };
}

function stopper(osc: OscillatorNode, env: GainNode): ToneHandle {
  return {
    stop() {
      env.disconnect();
      try {
        osc.stop(0);
      } catch {
        // already stopped
      }
    },
  };
}

/** One alarm pulse at audio time `when`. */
export function playAlarmPulse(ctx: Ctx, dest: AudioNode, when: number, p: { freqHz: number; durS: number; gain: number }, harmonicsDb: readonly number[], rampMs: number): ToneHandle {
  const osc = ctx.createOscillator();
  const { real, imag } = harmonicTable(harmonicsDb);
  osc.setPeriodicWave(ctx.createPeriodicWave(real, imag, { disableNormalization: false }));
  osc.frequency.value = p.freqHz;
  const env = ctx.createGain();
  const r = Math.min(rampMs / 1000, p.durS / 2);
  env.gain.setValueAtTime(0, when);
  env.gain.linearRampToValueAtTime(p.gain, when + r);
  env.gain.setValueAtTime(p.gain, when + p.durS - r);
  env.gain.linearRampToValueAtTime(0, when + p.durS);
  osc.connect(env).connect(dest);
  osc.start(when);
  osc.stop(when + p.durS + 0.01);
  return stopper(osc, env);
}

/** A device tone (segments back to back, each gliding startHz → endHz) at audio time `when`. */
export function playSegments(ctx: Ctx, dest: AudioNode, when: number, segs: readonly ToneSegment[], gain: number, harmonicsDb: readonly number[] = [0, -6, -12]): ToneHandle {
  const osc = ctx.createOscillator();
  const { real, imag } = harmonicTable(harmonicsDb);
  osc.setPeriodicWave(ctx.createPeriodicWave(real, imag));
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, when);
  let t = when;
  for (const s of segs) {
    const d = s.durMs / 1000;
    const r = Math.min(0.01, d / 2);
    osc.frequency.setValueAtTime(s.startHz, t);
    osc.frequency.linearRampToValueAtTime(s.endHz, t + d);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(gain, t + r);
    env.gain.setValueAtTime(gain, t + d - r);
    env.gain.linearRampToValueAtTime(0, t + d);
    t += d + s.gapMs / 1000;
  }
  osc.connect(env).connect(dest);
  osc.start(when);
  osc.stop(t + 0.01);
  return stopper(osc, env);
}

export interface TonePlayerOptions {
  profile: AlarmSoundProfile;
  toneSet?: ToneSet;
  beepGain?: number;
  deviceGain?: number;
}

/** A device-tone request (engine `tone` kinds 'charge' | 'chargeReady' | 'shock' | 'nibpDone'). */
export interface DeviceToneRequest extends ToneRequest {
  kind: 'charge' | 'chargeReady' | 'shock' | 'nibpDone';
  /** charge only: how long the charge takes (s). */
  chargeS?: number;
}

/** The ToneScheduler `play` function for every tone kind this package knows. Unknown kinds play nothing. */
export function createTonePlayer(ctx: Ctx, dest: AudioNode, opts: TonePlayerOptions): (tone: ToneRequest, when: number) => ToneHandle | void {
  const set = opts.toneSet ?? 'zoll-like';
  const dg = opts.deviceGain ?? 0.3;
  return (tone, when) => {
    switch (tone.kind) {
      case 'qrs':
      case 'pulse':
        return playBeep(ctx, dest, when, tone.freqHz ?? 880, opts.beepGain ?? 0.25);
      case 'alarm': {
        const a = tone as AlarmToneRequest;
        return playAlarmPulse(ctx, dest, when, a, opts.profile.harmonicsDb, opts.profile.rampMs);
      }
      case 'charge':
        return playSegments(ctx, dest, when, chargeTone(set, (tone as DeviceToneRequest).chargeS ?? 5), dg);
      case 'chargeReady':
        return playSegments(ctx, dest, when, chargeReadyTone(set), dg);
      case 'shock':
        return playSegments(ctx, dest, when, SHOCK_TONE, dg);
      case 'nibpDone':
        return playSegments(ctx, dest, when, NIBP_DONE_TONE, dg);
      default:
        return undefined;
    }
  };
}
