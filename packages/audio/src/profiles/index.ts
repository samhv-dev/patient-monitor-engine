import { IEC_STYLE } from './iec-style.ts';
import { SAADAT } from './saadat.ts';
import { TRADITIONAL } from './traditional.ts';
import type { AlarmSoundProfile } from './types.ts';

export const ALARM_PROFILES: Readonly<Record<AlarmSoundProfile['id'], AlarmSoundProfile>> = {
  'iec-style': IEC_STYLE,
  traditional: TRADITIONAL,
  saadat: SAADAT,
};

export function getAlarmProfile(id: string): AlarmSoundProfile {
  const p = (ALARM_PROFILES as Record<string, AlarmSoundProfile>)[id];
  if (!p) throw new Error(`unknown alarm sound profile: ${id}`);
  return p;
}

export * from './types.ts';
export { IEC_STYLE, SAADAT, TRADITIONAL };
