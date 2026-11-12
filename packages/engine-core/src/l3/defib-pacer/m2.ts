// The ZOLL M2's Manual and Sync behaviour and its patient type (docs/plans/defibrillator-zoll-m2.md §3.1 C1, piece E1):
// the Mode Selector and the power-off memory, the patient type and the energies it selects, the automatic energy
// escalation, the disarm rules, the configured ready time-out and the tones, Sync persistence and Sync blocked on
// lead-off, and the top trace by mode, which the sync detector reads. Pages are the guide's printed pages, [G n-m]
// (ZOLL M2 Operator's Guide, REF 9650-000873-01 Rev. C). The state lives in E0's M2State fields (power, defibMode,
// patientType, topLead, escalation, held.panel, config); this module reads and changes them and tells the device layer
// what the defibrillator must do (select an energy, disarm). A rule the guide does not state is a marked placeholder
// ([ENG: device; placeholder …]) and is put to the owner as a question.
import type { LeadId } from '../../types.ts';
import type { DefibEvent, M2LeadName, M2PatientType, M2Selector } from '../../types-device.ts';
import { INTERNAL_START_J, panelShockReason, therapyOf } from './connections.ts';
import type { M2State } from './m2-vocabulary.ts';

/** Off for less than this keeps every setting; this long or more resets the patient settings (alarm limits,
 * defibrillator energy, …) to their defaults [G 1-23], [G 3-1]; the same 30 s bounds the remembered Manual/AED mode
 * [G 12-2], [G 14-2] and the rescue incident [G 17-1]. */
export const OFF_MEMORY_S = 30;

/** The device's tones [G A-7]: charging 1510 Hz, 150 ms every 390 ms; ready 1510 Hz continuously; the invalid operation
 * tone 160 Hz, 250 ms. The sound itself is the audio's (plan F4); the engine's tone events carry the frequency. */
export const M2_TONES = { charge: { hz: 1510, ms: 150, everyMs: 390 }, ready: { hz: 1510 }, invalid: { hz: 160, ms: 250 } } as const;

/**
 * The AED's ready tones over the ready time-out T: "A continuous tone sounds for 10 to 50 seconds (depending on
 * configuration), followed by a higher pitch tone for 5 to 10 seconds", within "this 15 or 60 second interval"
 * [G 12-7]: 10 + 5 at 15 s, 50 + 10 at 60 s. Between them the guide gives no split; the higher tone's length is drawn
 * on the straight line between the two stated pairs [ENG: device; placeholder, the split at a time-out other than 15
 * or 60 s is not given]. For the AED cycle (E5) and the audio (F4); the guide states a single continuous ready tone in
 * Manual Defib [G 14-6], [G 14-12], [G A-7].
 */
export function readyToneSplit(timeoutS: number): { continuousS: number; higherS: number } {
  const higherS = 5 + ((10 - 5) * (timeoutS - 15)) / (60 - 15);
  return { continuousS: timeoutS - higherS, higherS };
}

/** The top trace's sources: Pads/Paddles (the therapy electrodes, shown as Pads, Paddles or Int. Paddles [G 14-19]) and
 * the cable leads [G 6-7], [G 2-13]. Which of them the Lead key offers with each cable is E8a's. */
export const M2_LEADS: readonly M2LeadName[] = ['pads', 'I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
type M2Lead = M2LeadName;
const LEAD_ID: Readonly<Record<Exclude<M2Lead, 'pads'>, LeadId>> = {
  I: 'ecgI', II: 'ecgII', III: 'ecgIII', aVR: 'aVR', aVL: 'aVL', aVF: 'aVF', V1: 'V1', V2: 'V2', V3: 'V3', V4: 'V4', V5: 'V5', V6: 'V6',
};

/**
 * The lead the sync detector reads: the top trace's [G 14-14], [G 2-13]. The Pads lead has no vector in the engine yet:
 * M0a found no published lead field for the pad sites (research note §1), so Pads reads Lead II until E2b builds it
 * [ENG: device; placeholder until E2b, the Pads lead's vector is not sourced].
 */
export function syncLeadOf(m: M2State): LeadId {
  return m.topLead === 'pads' ? 'ecgII' : (LEAD_ID[m.topLead as Exclude<M2Lead, 'pads'>] ?? 'ecgII');
}

/**
 * Whether the top trace carries a signal the sync detector can find R waves in. A cable lead with the cable absent or
 * a lead off: "An ECG Lead Off condition prevents synchronized discharge if leads are selected as the primary ECG trace"
 * [G 14-16]. Pads not on the patient, shorted, or no therapy cable: the trace is a dashed line [G 6-8], so no R wave,
 * no sync marker and no discharge ("If the sync marker does not display, the defibrillator will not discharge"
 * [G 14-16]). Paddles: always drawn solid [G 6-8], so the detector runs on them; internal handles read as paddles
 * [ENG: device; choice, the guide gives no internal-paddle trace rule]. Unit off: none.
 */
export function syncSignal(m: M2State): boolean {
  if (m.power.selector === 'off') return false;
  const c = m.connections;
  if (m.topLead !== 'pads') return c.ecgCable !== 'none' && !c.ecgLeadsOff;
  const t = therapyOf(c);
  if (t === 'pads') return c.pads.contact !== 'off';
  return t === 'externalPaddles' || t === 'internalHandles';
}

/**
 * The top trace a mode starts with [G 6-7]: Lead II in Pacer and Monitor, Pads/Paddles in Manual Defib and AED; the
 * Monitor and Manual Defib defaults are configured (plan §5.4). Pacer: "When the defibrillator is initially placed in
 * Pacer mode, the ECG lead selection defaults to Lead II" (chapter 16, pacing procedure). Applied at each entry into a
 * mode [ENG: device; choice, the guide says "default … according to current operating mode", not whether a lead chosen
 * earlier in that mode is remembered].
 */
export function topLeadFor(m: M2State): M2Lead {
  switch (m.power.selector) {
    case 'monitor':
      return m.config.topLead.monitor;
    case 'pacer':
      return 'II';
    default:
      return m.defibMode === 'aed' ? 'pads' : m.config.topLead.manual;
  }
}

/** The configured Shock 1, 2, 3 levels for the patient type [G 14-3], [G 14-4] (DQ18). */
export const levelsOf = (m: M2State): readonly [number, number, number] => m.config.escalation[m.patientType];

/**
 * The energy the device selects by itself (at power-up, at a change of patient type): Shock 1 of the patient type
 * [G 14-3] ("After setting the patient type, the ZOLL M2 unit selects and displays the default energy for the selected
 * patient type"). With internal handles connected the device holds their 10 J [G 14-18], as Shock 1 may exceed their
 * 50 J maximum [ENG: device; choice, the guide does not say what a patient-type change or a power-up selects with
 * internal handles].
 */
export function defaultEnergyJ(m: M2State): number {
  return therapyOf(m.connections) === 'internalHandles' ? INTERNAL_START_J : levelsOf(m)[0];
}

const SELECTOR_WORD: Record<M2Selector, string> = { off: 'OFF', monitor: 'MONITOR', defib: 'DEFIB', pacer: 'PACER' };

/**
 * A defibrillator event the Mode Selector does not allow, or undefined. OFF: the unit is powered off [G 2-4], [G 1-13].
 * MONITOR: physiological monitoring only [G 2-4]; turning to it disarms [G 1-13]. In PACER the guide does not say
 * whether the defibrillator charges, so nothing is refused there [ENG: device; placeholder, defibrillation from Pacer
 * mode is not stated]. The instructor's pre-selection is not a device control and is never refused.
 */
export function selectorRefusal(m: M2State, ev: DefibEvent): string | undefined {
  const s = m.power.selector;
  if (ev.action === 'preselect' || s === 'defib' || s === 'pacer') return undefined;
  return `the Mode Selector is at ${SELECTOR_WORD[s]} (turn it to DEFIB)`; // [ENG: device; choice, the refusal's words]
}

/** The M2 controls that do nothing with the unit off: the patient type (the Trim Knob) and the Lead key. What is
 * attached, the configuration and the paddle buttons are physical or Room setup, not controls of a powered unit. */
export function commandRefusal(m: M2State, action: string): string | undefined {
  if (m.power.selector !== 'off') return undefined;
  return action === 'patientType' || action === 'lead' ? `the Mode Selector is at OFF (turn it to DEFIB)` : undefined;
}

/** What the device layer must do to the defibrillator after an M2 change. */
export interface M2Effect {
  disarm?: boolean;
  /** The device's own energy selection (never a manual change: the escalation is not touched). */
  energyJ?: number;
  syncOff?: boolean;
}

/**
 * The Mode Selector turned at sim time t [G 2-4].
 * - To OFF: disarm [G 1-13]; Sync off and the power-off clock started [ENG: device; choice, the guide does not say
 *   Sync survives a power cycle; a powered-off unit has no Sync].
 * - To MONITOR: disarm [G 1-13]. To PACER: the guide lists no disarm.
 * - Back on from OFF after OFF_MEMORY_S or more: the patient settings reset — the patient type to Adult [ENG: device;
 *   placeholder, the guide names no configured power-up patient type], the energy to Shock 1, the escalation back on
 *   as configured [G 14-6] ("disables auto energy escalation until the unit is turned off for greater than 30 seconds
 *   and then turned back on"), and the Manual/AED mode to the configured start mode (DQ4) [G 12-2], [G 14-2].
 * - The top trace takes the new mode's default [G 6-7].
 */
export function turnSelector(m: M2State, to: M2Selector, t: number): M2Effect {
  const from = m.power.selector;
  if (to === from) return {};
  const fx: M2Effect = {};
  m.power.selector = to;
  m.held.panel = false;
  if (to === 'off') {
    m.power.offSinceS = t;
    return { disarm: true, syncOff: true };
  }
  if (to === 'monitor') fx.disarm = true;
  if (from === 'off') {
    const offS = m.power.offSinceS;
    m.power.offSinceS = null;
    if (offS !== null && t - offS >= OFF_MEMORY_S - 1e-9) {
      m.patientType = 'adult';
      m.defibMode = m.config.startMode;
      m.escalation = { next: 1, on: m.config.escalation.on };
      fx.energyJ = defaultEnergyJ(m);
    }
  }
  m.topLead = topLeadFor(m);
  return fx;
}

/** A change of patient type [G 14-3]: Shock 1 of the new type, the escalation from Shock 1 again (whether it is still on
 * is the power-off memory's), and a charged unit disarms [G 1-13]. */
export function setPatientType(m: M2State, to: M2PatientType): M2Effect {
  if (to === m.patientType) return {};
  m.patientType = to;
  m.escalation.next = 1;
  return { disarm: true, energyJ: defaultEnergyJ(m) };
}

/**
 * An operator's energy selection. While charging or charged it disarms (defib.ts) and disables the escalation until the
 * unit has been off for more than 30 s [G 14-6]; an energy other than the current level counts, the same energy does
 * not [ENG: device; choice]. When idle, only the shock decides (afterShock below).
 */
export function onEnergySelected(m: M2State, energyJ: number, charged: boolean): void {
  if (charged && m.defibMode === 'manual' && energyJ !== levelsOf(m)[m.escalation.next - 1]) m.escalation.on = false;
}

/**
 * After a delivered shock at `shotJ` in Manual Defib, with the escalation on: a shock at the current level steps to the
 * next ("automatically sets the energy to the preconfigured Energy Level: Shock 1, 2, 3 setting at power-up and after
 * each of the first two shocks" [G 14-3], [G 14-10]); after the third every shock is at the third [G 14-10]. A shock at
 * any other energy is a manual change outside the sequence, and disables the escalation [G 14-3], [G 14-10] (an energy
 * that is another shock's level, 150 J at Shock 1, is read as outside [ENG: device; choice]). With internal handles the
 * escalation neither steps nor ends, so their 50 J maximum holds [G 14-18] [ENG: device; choice, the guide does not say
 * how the escalation meets the handles' maximum]. The AED's own sequence is E5's. Returns the energy to select.
 */
export function afterShockEscalation(m: M2State, shotJ: number): number | undefined {
  const e = m.escalation;
  if (m.defibMode !== 'manual' || !e.on || therapyOf(m.connections) === 'internalHandles') return undefined;
  const lv = levelsOf(m);
  if (shotJ !== lv[e.next - 1]) {
    e.on = false;
    return undefined;
  }
  e.next = Math.min(3, e.next + 1) as 1 | 2 | 3;
  return lv[e.next - 1];
}

/**
 * The front panel SHOCK button, pressed and held [G 14-12], [G 14-18]. It is active only with pads, or with paddles or
 * handles that have no button of their own [G 2-4], [G 14-7]; pressed otherwise it does nothing (the invalid operation
 * tone [G 14-7], [G A-7] is the audio's, F4). Returns 'shock' on a press while the device is ready (in Sync it arms for
 * the next R), 'cancel' on a release (a synchronised shock not yet delivered is not), null otherwise. A press made
 * before ready does not discharge at ready, as E2a rules for the paddles.
 */
export function pressPanel(m: M2State, phase: 'down' | 'up', ready: boolean): 'shock' | 'cancel' | null {
  if (phase === 'up') {
    const was = m.held.panel;
    m.held.panel = false;
    return was ? 'cancel' : null;
  }
  if (panelShockReason(m.connections)) return null;
  m.held.panel = true;
  return ready ? 'shock' : null;
}

/** E1's fields as primitives, for the device layer's change compare (it runs every tick), so the status goes out at once
 * when one changes. */
export function m2Key(m: M2State): Array<string | number | boolean | null> {
  return [m.power.selector, m.power.offSinceS, m.defibMode, m.patientType, m.topLead, m.escalation.next, m.escalation.on];
}
