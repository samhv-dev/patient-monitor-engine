// The instructor's alarm mirror in glossary words (R50 review F4; research/11 §5.16 rules 1 and 2). The monitor prints
// its vendor's own text ("**ABPs 21<90", "ABP NON-PULSATILE", "%SPO2 LOW") inside its frame; outside the frame — the
// panel's alarm list and the top-bar count — the same alarm is worded from the glossary: the parameter's clinical
// label and the condition in plain words. The monitor's text stays available as the row's tooltip. No DOM here.
import type { AlarmEntry } from '@pme/engine-core';
import { labelOf } from './glossary.ts';

/** Fixed (non-limit) alarms of the device layer (engine-core l3/alarms `FixedAlarmId`), in clinical words. */
export const FIXED_ALARM_WORDS: Readonly<Record<string, string>> = {
  ASYSTOLE: 'Asystole',
  VFIB: 'Ventricular fibrillation or tachycardia',
  VTAC: 'Ventricular tachycardia',
  EXTREME_BRADY: 'Extreme bradycardia',
  EXTREME_TACHY: 'Extreme tachycardia',
  BRADY: 'Bradycardia',
  TACHY: 'Tachycardia',
  PAUSE: 'Pause in the ECG',
  PVCS: 'Frequent PVCs',
  DESAT: 'Desaturation',
  ecgLeadsOff: 'ECG leads off',
  spo2SensorOff: 'SpO₂ probe off',
  'nibp-failed': 'NIBP measurement failed',
  APNEA: 'Apnoea', // FU-11 (Q4): the skins' `alwaysOn` id for both apnoea alarms
  'apnoea-co2': 'Apnoea (no CO₂ breaths)',
  'apnoea-resp': 'Apnoea (no impedance breaths)',
  co2Line: 'CO₂ sampling line blocked',
  spo2NonPulsatile: 'SpO₂: no pulse detected',
  spo2LowPerf: 'SpO₂: low perfusion',
  abpNonPulsatile: 'ART: no pulsatile pressure',
  abpDisconnect: 'ART: line disconnected',
  abpZero: 'ART: zeroing',
  tempProbeOff: 'T1: probe off',
};

/** Numerics whose glossary label is not `mon.<numeric>` (the pulse rate from the arterial line). */
const NUMERIC_LABEL: Readonly<Record<string, string>> = { prAbp: 'PR (ART)' };

/**
 * The mirror line for one alarm: "ART S low", "SpO₂ low", "Asystole". An alarm the table does not know keeps the
 * monitor's text (`known: false`), so nothing is hidden; the gate note lists any such id (review F4).
 */
export function alarmLine(a: Pick<AlarmEntry, 'id' | 'text' | 'numeric'>): { text: string; known: boolean } {
  const fixed = FIXED_ALARM_WORDS[a.id];
  if (fixed) return { text: fixed, known: true };
  const side = /_(HIGH|LOW)$/.exec(a.id)?.[1];
  if (a.numeric && side) {
    const label = NUMERIC_LABEL[a.numeric] ?? labelOf(`mon.${a.numeric}`);
    if (label) return { text: `${label} ${side === 'HIGH' ? 'high' : 'low'}`, known: true };
  }
  return { text: a.text.replace(/^\*+/, ''), known: false };
}

/** FU-11 (owner ruling Q4; showcase kit K3): the top bar's words when every limit-alarm group is off. */
export const LIMITS_OFF_LABEL = 'Limit alarms off';

/**
 * …and its tooltip: what still alarms, from the skin's own `alarms.alwaysOn` (saadat-like: research/06 §4.2) worded by
 * this table — no list of names in the code (R56) — less apnoea when the preset has APNEA LIMIT OFF (research/06 §3.1
 * F7). A skin that lists none gets the generic sentence.
 */
export function limitsOffTitle(alwaysOn: readonly string[], apnoeaOff = false): string {
  const words = alwaysOn.filter((id) => !(apnoeaOff && id === 'APNEA')).map((id) => alarmLine({ id, text: id }).text);
  return words.length ? `Limit alarms are off on this monitor. Still alarming: ${words.join(', ')}.` : 'Limit alarms are off on this monitor; the alarms it cannot switch off still sound.';
}
