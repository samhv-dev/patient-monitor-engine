// @pme/ventilator public types. The configuration is ONE flat record, exactly the original simulator's `S`
// (ventilator-sim-hamilton.html v1.9): ventilator settings, alarm limits AND the patient's lung mechanics, so the
// reference scenarios (reference/scenarios.json) run unchanged on the port. `LUNG_KEYS` (lung-input.ts) lists
// the keys the patient engine's `lungState` owns.
export type VentMode = 'VC' | 'PC' | 'PRVC' | 'PSV' | 'PAV';
export type Shape = 'linear' | 'smoothstep' | 'halfcos' | 'exp';
export type VentPhase = 'insp' | 'pause' | 'exp';

export interface VentConfig {
  mode: VentMode; peep: number; rate: number; itime: number; fio2: number; riseTime: number;
  trigType: 'flow' | 'pressure'; flowTrig: number; presTrig: number;
  vt: number; vcFlow: number; flowPattern: 'square' | 'decel'; pause: number; pc: number; prvcTarget: number;
  ps: number; cycleOff: number; pmax: number; pavAssist: number;
  sex: '' | 'male' | 'female'; height: number; compliance: number; resistance: number;
  spont: boolean; spontRate: number; pmus: number; responsiveness: number;
  pmusRise: number; pmusHold: number; pmusDecay: number; riseShape: Shape; decayShape: Shape; pmusOffset: number;
  airwayClosure: boolean; openPressure: number; recruitedVol: number; stressIdx: boolean; stressB: number;
  uip: boolean; uipThresh: number; reverseTrig: boolean; entrainRatio: '1:1' | '1:2' | '1:3';
  efl: boolean; eflSeverity: 'mild' | 'moderate' | 'severe' | 'custom'; pcrit: number; eflK: number; peepStent: number;
  /** Stage V.1: pleural-space pressure above normal (cmH2O) from the patient engine's lungState (tension pneumothorax). */
  pleural: number;
  cardiac: boolean; hr: number; variability: boolean; varPct: number;
  showPmus: boolean; showP01: boolean; sweepSec: number;
  /** Hamilton-style name shown in the header when several names share one engine mode (HAMILTON_MODES). */
  modeLabel: string | null;
  /** Carried from v1.9, where they are settings without behaviour (sigh, TRC, apnoea backup): kept unwired. */
  sigh: boolean; trc: boolean; trcPct: number; apneaTime: number; backup: boolean; backupRate: number;
  almMVlo: number; almMVhi: number; almFlo: number; almFhi: number; almVTlo: number; almVThi: number;
  /**
   * The EDP-TS alarm limits (plan vent-skin-edp-ts.md V3, research/57 §10b), OPTIONAL: an alarm whose limit is absent is
   * not evaluated, so the v1.9 configuration (the Hamilton-style face, the reference scenarios) raises none of them and
   * its cfg keeps exactly its v1.9 keys. A face that has these alarms writes their limits (its starting settings).
   * - `almPlo`: minimum inspiratory pressure, cmH2O (`lowPressure`: the last breath's peak under it; L-02, A-35);
   * - `almContHiP`: cmH2O above the set PEEP (`contHighPressure`: the airway pressure above PEEP + this; how long it
   *   must last, 15 s, is the face's alarm delay; L-15, A-31);
   * - `almPeepHi`: High PEEP, cmH2O (`highPeep`: the end-expiratory pressure the caller measured above it; L-13, A-49);
   * - `almO2hi` / `almO2lo`: oxygen concentration, % (`o2High` / `o2Low`: the set oxygen, the model having no oxygen
   *   sensor, outside them; L-08, A-44).
   */
  almPlo?: number; almContHiP?: number; almPeepHi?: number; almO2hi?: number; almO2lo?: number;
  /** The device's alarm sound volume, % (research/57 E-10). A face setting: the model makes no sound. Optional, as above. */
  alarmVolume?: number;
  _preset?: string | null;
}

export interface Measured {
  PIP: number; PLAT: number; RR: number; VTE: number; MV: number; P01: number; autoPEEP: number; Pmean: number;
}

export interface Marker { t: number; type: 'mand' | 'pt' }

/** The original's `P` (physics + per-breath bookkeeping). Plain JSON data. */
export interface VentPhysics {
  V: number; Q: number; Paw: number; Pmus: number; Palv: number; t: number; phase: VentPhase; phaseT: number; breathT: number;
  targetPaw: number; peakInspFlow: number; vtDelivered: number; prvcPressure: number; lastVTE: number;
  neuralT: number; neuralMult: number; lastMandStart: number; breathCount: number; pipCur: number; breathVstart: number;
  curBreathSpont: boolean; lastPtT: number | null; measured: Measured; shown: Measured | null;
  breathTimes: number[]; markers: Marker[];
  /** Display chain (valve/sensor lag + cardiogenic ripple + noise), what the screen draws. */
  dPaw: number | null; dFlow: number | null; dispPaw: number; dispFlowLpm: number;
}

export interface VentState {
  cfg: VentConfig;
  p: VentPhysics;
  /** The original's LCG seed (`_seed`); shared by the variability draw and the display noise, as in v1.9. */
  seed: number;
  flowTarget: number;
  hold: 'insp' | 'exp' | null;
  pendingHold: 'insp' | 'exp' | null;
  /** 5 ms steps taken (the scheduling clock; `p.t` accumulates exactly as the original does). */
  n: number;
  /** Stage V addition: circuit disconnected at the Y-piece. */
  circuit: 'connected' | 'disconnected';
  /** Stage V addition: last time a breath started (apnoea alarm). */
  lastBreathT: number;
  silenceUntil: number;
}

export type VentAlarmId =
  | 'pmax' | 'mvHigh' | 'mvLow' | 'vtHigh' | 'vtLow' | 'fHigh' | 'fLow' | 'intrinsicPeep' | 'disconnection' | 'apnea'
  // the EDP-TS alarms the v1.9 model did not have (plan V3); raised only when their optional limit is set
  | 'lowPressure' | 'contHighPressure' | 'highPeep' | 'o2High' | 'o2Low';
/** `low` is a face's priority (the EDP-TS has three, research/57 A-02); the model itself raises high and medium only. */
export interface VentAlarm { id: VentAlarmId; text: string; priority: 'high' | 'medium' | 'low' }
/** What the caller measured that the model does not: the EDP-TS's PEEP, the mean airway pressure of the last 50 ms of
 *  expiration (research/57 R-23), which the cockpit core's breath record keeps. */
export interface AlarmObs { peepEnd?: number }
