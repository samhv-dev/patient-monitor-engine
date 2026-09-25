// Alarm message text (brief §6.4 "Message format: `***SpO2 94<96`"; brief §6.4.1: Saadat-like messages are English
// uppercase without asterisks, e.g. "HR TOO LOW", "%SPO2 LOW", "ECG ASYSTOLE"). Texts not quoted by a source are
// [inferred] from those patterns.
import type { AlarmLevel } from '../../types-device.ts';
import type { DeviceProfile, LimitDef } from './profile.ts';

export type FixedAlarmId =
  | 'ASYSTOLE' | 'VFIB' | 'VTAC' | 'EXTREME_BRADY' | 'EXTREME_TACHY' | 'BRADY' | 'TACHY' | 'PAUSE' | 'PVCS' | 'DESAT'
  | 'ecgLeadsOff' | 'spo2SensorOff' | 'nibp-failed' | 'apnoea-co2' | 'apnoea-resp' | 'co2Line';

const IEC_TEXT: Record<FixedAlarmId, string> = {
  ASYSTOLE: 'ASYSTOLE',
  VFIB: 'VFIB/VTACH', // Philips-like red arrhythmia alarm name [inferred]
  VTAC: 'VTACH',
  EXTREME_BRADY: 'EXTREME BRADY',
  EXTREME_TACHY: 'EXTREME TACHY',
  BRADY: 'BRADY',
  TACHY: 'TACHY',
  PAUSE: 'PAUSE',
  PVCS: 'PVCs/min HIGH',
  DESAT: 'DESAT',
  ecgLeadsOff: 'ECG LEADS OFF', // brief §6.2 "LEADS OFF" INOP
  spo2SensorOff: 'SpO2 SENSOR OFF', // brief §6.2
  'nibp-failed': 'NBP MEASUREMENT FAILED', // brief §6.3
  'apnoea-co2': 'APNEA', // brief §6.4 conditions; Stage 3's capnograph detector
  'apnoea-resp': 'APNEA (RESP)', // Stage 3's impedance detector [inferred text, Stage 3's raw text]
  co2Line: 'CO2 LINE', // brief §6.4 technical INOP "CO2 line" [inferred text]
};

const SAADAT_TEXT: Record<FixedAlarmId, string> = {
  ASYSTOLE: 'ECG ASYSTOLE', // brief §6.4.1
  VFIB: 'ECG VFIB',
  VTAC: 'ECG VTAC',
  EXTREME_BRADY: 'HR TOO LOW',
  EXTREME_TACHY: 'HR TOO HIGH',
  BRADY: 'ECG BRADY',
  TACHY: 'ECG TACHY',
  PAUSE: 'ECG PAUSE',
  PVCS: 'ECG PVCS HIGH',
  DESAT: '%SPO2 LOW',
  ecgLeadsOff: 'ECG CHECK LA/RA/LL', // brief §6.4.1
  spo2SensorOff: 'SPO2 SENSOR OFF',
  'nibp-failed': 'NIBP MEASUREMENT FAILED',
  'apnoea-co2': 'CO2 APNEA', // [inferred] from the "RESP APNEA" pattern
  'apnoea-resp': 'RESP APNEA', // brief §6.4.1
  co2Line: 'CO2 CHECK LINE', // [inferred] from the "ECG CHECK LA/RA/LL" pattern
};

/** IEC-style priority marks: *** high, ** medium, * low (research/05 §2.5). Technical INOPs carry none. */
const stars = (level: AlarmLevel): string => '*'.repeat(4 - level);

export function fixedText(p: DeviceProfile, id: FixedAlarmId, level: AlarmLevel, technical: boolean): string {
  if (p.prefix === 'none') return SAADAT_TEXT[id];
  return `${technical ? '' : stars(level)}${IEC_TEXT[id]}`;
}

const fmt = (v: number): string => (Math.abs(v) >= 10 || Number.isInteger(v) ? String(Math.round(v)) : v.toFixed(1));

/** Limit alarm text: IEC-style `**HR 130>120`, Saadat-like `HR TOO HIGH` / `%SPO2 LOW`. */
export function limitText(p: DeviceProfile, d: LimitDef, side: 'HIGH' | 'LOW', value: number): string {
  if (p.prefix === 'none') return d.numeric === 'spo2' ? `${d.upper} ${side}` : `${d.upper} TOO ${side}`;
  const lim = side === 'HIGH' ? (d.high as number) : (d.low as number);
  return `${stars(d.level)}${d.label} ${fmt(value)}${side === 'HIGH' ? '>' : '<'}${fmt(lim)}`;
}
