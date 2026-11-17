// The pulse tone a style's data give: its gain by the style's alarm volume law, the tone kind its source drives, and
// its pitch while there is no valid SpO2.
import { beepGain, getAlarmProfile } from '@pme/audio';
import type { ResolvedSkin } from '@pme/skins';

export interface PulseTone {
  gain: number;
  /** 'qrs' for an ECG source (HR_SOURCE's default, AUTO, takes the ECG first); 'pulse' for the pleth. */
  kind: 'qrs' | 'pulse';
  /** Pitch of a beat tone that carries none (no valid SpO2), Hz. */
  neutralHz: number;
}

export function pulseTone(sk: ResolvedSkin): PulseTone {
  const b = sk.audio.beep;
  return { gain: beepGain(getAlarmProfile(sk.audio.alarm.profile).volume, b), kind: b.source === 'PLETH' ? 'pulse' : 'qrs', neutralHz: b.neutralHz };
}

/** The pitch a beat tone plays at: the engine's pitch(SpO2), or the style's neutral pitch when it carries none. */
export const beatToneHz = (sk: ResolvedSkin, freqHz: number | undefined): number => freqHz ?? pulseTone(sk).neutralHz;
