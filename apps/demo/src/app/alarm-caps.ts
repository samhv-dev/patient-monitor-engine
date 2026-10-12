// FX-4: what the active monitor's alarm keys can do, read from its skin data (the same data the engine's alarm manager
// uses), so the panel offers only what the modelled device has. A missing pause is never invented: Saadat-like has none
// (research/06 §3: the manual's Audio Pause key has "currently no function"); its Silence mutes for 120 s.
import { resolveSkin } from '@pme/skins';

export interface AlarmCaps {
  /** Alarm pause length in seconds, or null when the monitor has no alarm pause. */
  pauseS: number | null;
  silence: { mode: 'mute' | 'acknowledge'; durationS: number | null };
}

/** The skin's alarm capabilities; null while the skin is not known (a Remote before the first alarm status). */
export function alarmCaps(skin: string | null | undefined): AlarmCaps | null {
  if (!skin) return null;
  try {
    const a = resolveSkin(skin).skin.alarms;
    return { pauseS: a.pause?.durationS ?? null, silence: { mode: a.silence.mode, durationS: a.silence.durationS } };
  } catch {
    return null;
  }
}

/** Why "Pause alarms" is not offered, in clinical words; null when the monitor has a pause (or is not known yet). */
export function noPauseReason(c: AlarmCaps | null): string | null {
  if (!c || c.pauseS !== null) return null;
  const silence = c.silence.mode === 'mute' && c.silence.durationS ? `Silence mutes for ${c.silence.durationS} s.` : 'Silence acknowledges the alarms.';
  return `This monitor has no alarm pause. ${silence}`;
}

/** The toast for an alarm action the engine refused: its reason, in clinical words, with no skin id. */
export function alarmRefusal(action: unknown, reason: string | undefined, skin: string | null | undefined): string {
  const why = action === 'pause' ? noPauseReason(alarmCaps(skin)) : null;
  return `Not done: ${why ?? (reason && skin ? reason.replaceAll(skin, 'this monitor') : reason ?? 'refused')}`;
}
