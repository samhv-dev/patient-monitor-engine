// Alarm message text (brief §6.4 "Message format: `***SpO2 94<96`"; brief §6.4.1: Saadat-like messages are English
// uppercase without asterisks, e.g. "HR TOO LOW", "%SPO2 LOW", "ECG ASYSTOLE"). Texts not quoted by a source are
// [inferred] from those patterns.
import type { AlarmLevel } from '../../types-device.ts';
import type { NumericId } from '../../types.ts';
import type { DeviceProfile, LimitDef } from './profile.ts';

export type FixedAlarmId =
  | 'ASYSTOLE' | 'VFIB' | 'VTAC' | 'EXTREME_BRADY' | 'EXTREME_TACHY' | 'BRADY' | 'TACHY' | 'PAUSE' | 'PVCS' | 'DESAT'
  | 'ecgLeadsOff' | 'spo2SensorOff' | 'nibp-failed' | 'apnoea-co2' | 'apnoea-resp' | 'co2Line'
  // FU-5 (audit M8): technical alarms raised by real conditions, and the arterial line's disconnect alarm
  | 'spo2NonPulsatile' | 'spo2LowPerf' | 'abpNonPulsatile' | 'abpDisconnect' | 'abpZero' | 'tempProbeOff';

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
  'apnoea-resp': 'APNEA', // FU-5: one message whatever the source ([S2] IFU p. 41 "***APNEA" from CO2, Resp or AGM)
  co2Line: 'CO2 OCCLUSION', // brief §6.4 INOP "CO2 line"; FU-5: the Philips text ([S2] IFU p. 53)
  spo2NonPulsatile: 'SpO2 NON-PULSAT.', // [S2] IFU p. 59
  spo2LowPerf: 'SpO2 LOW PERF', // [S2] IFU p. 58
  abpNonPulsatile: 'ABP NON-PULSATILE', // [S2] IFU p. 57
  abpDisconnect: 'ABP DISCONNECT', // [S2] IFU p. 44 (red: non-pulsatile, mean < 10 mmHg)
  abpZero: 'ABP ZEROING', // brief §6.4 INOP "ABP zeroing" [inferred text]
  tempProbeOff: 'TEMP NO TRANSDUCER', // [S2] IFU p. 62 "<Temp label> NO TRANSDUCER"
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
  spo2NonPulsatile: 'SPO2 NO PULSE', // [inferred] brief §4.3 "NO PULSE"
  spo2LowPerf: 'SPO2 LOW PERFUSION', // research/06 §4.2 (M p.109–116)
  abpNonPulsatile: 'IBP1 STATIC PRESSURE', // research/06 §4.2, §4.1 (static pressure: SYS/DIA hidden, mean shown)
  abpDisconnect: 'IBP CATHETER DISCONNECT', // research/06 §4.2 (M p.161)
  abpZero: 'IBP1 ZEROING', // [inferred] from the "IBP1 …" pattern
  tempProbeOff: 'TEMP NO CABLE', // [inferred] from "SPO2 NO CABLE" / "ECG NO CABLE" (research/06 §4.2)
};

/** IEC-style priority marks: *** high, ** medium, * low (research/05 §2.5). Technical INOPs carry none. */
const stars = (level: AlarmLevel): string => '*'.repeat(4 - level);

export function fixedText(p: DeviceProfile, id: FixedAlarmId, level: AlarmLevel, technical: boolean): string {
  if (p.prefix === 'none') return SAADAT_TEXT[id];
  return `${technical ? '' : stars(level)}${p.texts?.[id] ?? IEC_TEXT[id]}`; // Stage 9 (E-S9-4): the skin's wording first
}

/**
 * FU-5 (audit M6): decimals of each numeric as its tile shows it (renderer device-ui: TEMP and ST one, the rest none).
 * Limit alarms compare the value ROUNDED to these and print it so ("**Temp 35.9<36.0", never "**Temp 36<36").
 */
export const DISPLAY_DIGITS: Readonly<Partial<Record<NumericId, number>>> = { tempCore: 1, tempSite: 1, stII: 1 };
export const displayDigits = (n: NumericId): number => DISPLAY_DIGITS[n] ?? 0;

/** Limit alarm text: IEC-style `**HR 130>120`, Saadat-like `HR TOO HIGH` / `%SPO2 LOW`. */
export function limitText(p: DeviceProfile, d: LimitDef, side: 'HIGH' | 'LOW', value: number): string {
  if (p.prefix === 'none') return d.numeric === 'spo2' ? `${d.upper} ${side}` : `${d.upper} TOO ${side}`;
  const lim = side === 'HIGH' ? (d.high as number) : (d.low as number);
  const dig = displayDigits(d.numeric);
  return `${stars(d.level)}${d.label} ${value.toFixed(dig)}${side === 'HIGH' ? '>' : '<'}${lim.toFixed(dig)}`;
}
