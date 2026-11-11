// Device-layer public types (brief §6.4–§6.7, §7.2–§7.3): the device layer's commands and events. Kept in their own
// file, like types-hemo.ts, so parallel modules do not collide in types.ts; types.ts adds these to its unions.
import type { NumericId, RhythmId, SimSeconds } from './types.ts';

/** Alarm levels, 1 = highest (brief §3.8 `alarms.levels`; IEC high/medium/low and Saadat 1/2/3 are display names). */
export type AlarmLevel = 1 | 2 | 3;
export type AlarmPriority = 'high' | 'medium' | 'low';
export type AgeBand = 'adult' | 'paed' | 'neo';

/** Brief §7.2 ClinicalEvent `defib` (+ `preselect`, the instructor's "convert" of brief §6.5). */
export type DefibEvent = {
  kind: 'defib';
  action: 'selectEnergy' | 'charge' | 'shock' | 'disarm' | 'syncOn' | 'syncOff' | 'preselect';
  energyJ?: number;
  /** preselect only: the rhythm the NEXT shock produces ('unchanged' = shock does nothing), overriding the table. */
  outcome?: RhythmId | 'unchanged';
};

/** Brief §7.2 ClinicalEvent `pacer` (transcutaneous), plus the instructor fault switch (brief §6.5, 4b ACCEPTANCE). */
export type PacerEvent = {
  kind: 'pacer';
  /** Not in the brief's shape: every device ClinicalEvent names its action (the 6a controller's log reads it). */
  action: 'set';
  mode: 'off' | 'demand' | 'fixed';
  ratePpm?: number;
  mA?: number;
  pause?: boolean;
  /** failureToSense: demand pacing fires asynchronously; failureToCapture: no capture at any mA. */
  fault?: 'none' | 'failureToSense' | 'failureToCapture';
};

export type DeviceClinicalEvent = DefibEvent | PacerEvent;

/** Brief §7.2 DeviceAction `alarm`, plus `enable` (per-parameter switch, brief §6.4.1) and `ageBand`. */
export type AlarmDeviceAction = {
  device: 'alarm';
  action: 'silence' | 'pause' | 'ack' | 'setLimit' | 'setVolume' | 'enable' | 'enableAll' | 'arrhythmiaAnalysis';
  /** Parameter key of the skin's limit table ('HR', 'SpO2', 'NIBP_S', 'ART_M', …) for setLimit / enable. */
  param?: string;
  low?: number;
  high?: number;
  value?: number | boolean;
  /** Never used; keeps every DeviceAction member readable as `.lane` (the 6a controller's command log does). */
  lane?: never;
};

/**
 * The room's defibrillator model (Room plan R5a, owner's Q6 ruling of 5 November; the pacer with it, research/41 row
 * 58, ruling of 6 November): its spec (energies, charge times, ladder; the pacer's default rate and output, ranges, PAUSE
 * behaviour and HR dashes while pacing) is the model's, apart from the monitor skin, until another model is set; `value`
 * is a `DEFIB_MODELS` key.
 */
export type DefibDeviceAction = { device: 'defib'; action: 'model'; value: string; lane?: never } | M2DeviceAction;

// --- The ZOLL M2's vocabulary (plan docs/plans/defibrillator-zoll-m2.md §5.1, §5.4, piece E0) -------------------------
// Every command a resident or the room's configuration gives the M2, declared once (E0) with its validation. Each is a
// no-op until the piece named in M2_COMMANDS (l3/defib-pacer/m2-vocabulary.ts) gives it its behaviour. Accepted only
// when the room's model is `zoll-m2`; refused otherwise, so the generic model is unchanged. Energy select, Charge,
// Disarm and Sync are the existing `applyEvent defib` actions; the pacer's mode, rate and output the existing
// `applyEvent pacer set` (both validated against the M2's lists when the model is the M2).

/** The rotary mode selector [G 2-4]. */
export type M2Selector = 'off' | 'monitor' | 'defib' | 'pacer';
/** The device's patient type, chosen at the top of the screen [G 14-3]. */
export type M2PatientType = 'adult' | 'pediatric';
/** A held key: pressed and released (Shock is press-and-hold [G 14-12]; 4:1 while held [G 16-6]; Alarm Control by
 * hold time [G 5-6]). */
export type M2Phase = 'down' | 'up';
/** The SHOCK buttons: the front panel [G 2-4], each external paddle [G 14-7], the internal handle's Discharge
 * button [G 14-19]. */
export type M2ShockButton = 'panel' | 'apex' | 'sternum' | 'internal';
export type M2Contact = 'good' | 'poor' | 'off';

/** What is attached to the device and the patient (plan §3.1 C2; DQ5 = A: the learner's drawer, the instructor may
 * override; DQ11 = A: pads, external paddles and internal handles). */
export interface M2Connections {
  /** The multi-function cable is plugged into the device ("Connect Therapy Cable" otherwise [G 12-10]). */
  mfc: boolean;
  /** What the MFC carries [G 2-8], [G 14-4], [G 14-18]. */
  therapy: 'none' | 'pads' | 'externalPaddles' | 'internalHandles' | 'testPlug';
  /** Adult, adult with the CPR sensor [G 15-1], or paediatric pads [G 1-12]; apex/sternum or anterior/posterior [G 14-8]. */
  pads: { type: 'adult' | 'adultCpr' | 'pediatric'; placement: 'apexSternum' | 'anteriorPosterior'; contact: M2Contact };
  /** External paddles: the paediatric plates [G 2-12]; with or without shock buttons [G 2-4]; on the chest or not. */
  paddles: { pediPlates: boolean; shockButtons: boolean; contact: M2Contact };
  /** Internal handles, with or without a Discharge button [G 14-19]. */
  internal: { dischargeButton: boolean; contact: M2Contact };
  /** The ECG patient cable [G A-2]. */
  ecgCable: 'none' | '3' | '5' | '12';
  /** The cable's electrodes are off the patient (plan §3.1 C2: sync and demand pacing read it, [G 14-16], [G 16-6]). */
  ecgLeadsOff: boolean;
  /** The other sensors at the rear connectors [G 2-7]. */
  spo2: boolean;
  nibp: boolean;
  co2: boolean;
  temp1: boolean;
  temp2: boolean;
}

/** The operator's settings the menus change (only those whose values the guide lists). */
export interface M2Settings {
  /** Manual, Auto, STAT [G 8-4]. */
  nibpMode: 'manual' | 'auto' | 'stat';
  /** 2.5, 5, 10, 15, 20, 30, 45, 60, 90 or 120 min [G 8-9]. */
  nibpIntervalMin: number;
  /** Low 16 s, Medium 8 s, High 4 s [G A-5]. */
  spo2Averaging: 'low' | 'medium' | 'high';
  /** Upper corner of the monitor band, 0.67–20 or 0.67–40 Hz [G A-2]. */
  ecgFilterHz: 20 | 40;
  /** Pace marker on or off [G 6-9], [G 6-10]. */
  paceMarker: boolean;
  /** Impedance respiration [G 7-2]. */
  respImpedance: boolean;
}

/** The Supervisor configuration (plan §5.4), set in Room setup and sent as one command so followers replay it. */
export interface M2Config {
  /** Manual or AED at power-up [G 14-3] (DQ4). */
  startMode: 'manual' | 'aed';
  /** Ready time-out, 15–60 s [G 14-13] (DQ17). */
  readyTimeoutS: number;
  /** Auto energy escalation and its three levels per patient type [G 14-3], [G 14-4] (DQ18). */
  escalation: { on: boolean; adult: [number, number, number]; pediatric: [number, number, number] };
  /** The AED's three energies per patient type [G 12-6]. */
  aedEnergies: { adult: [number, number, number]; pediatric: [number, number, number] };
  /** A CPR period before the first analysis [G 12-6] (DQ19). */
  cprAtStart: boolean;
  /** The CPR period, default 2.0 min [G 12-9]. */
  cprPeriodS: number;
  /** Target compression depth, default 5 cm [G 12-9]. */
  cprTargetDepthCm: number;
  /** The metronome: the whole CPR period (default) or once compressions start; 105 /min [G 12-9], [G A-10] (DQ26). */
  metronome: { mode: 'always' | 'compressions'; ratePerMin: number };
  /** A password to leave AED mode [G 12-12], or none (DQ20). */
  aedPassword: string | null;
  /** Pause after each CPR period and wait for Analyze [G 12-11] (DQ24). */
  checkPatientPause: boolean;
  /** The NIBP Auto interval at power-up, one of M2Settings' intervals [G 8-9] (plan §5.4). */
  nibpIntervalMin: number;
  /** Trend logging interval, 30 s to 30 min [G 4-1]. */
  trendIntervalS: number;
  /** The accessories the room has (DQ11 = A: pads and external paddles by default; internal handles exist, not present). */
  accessories: { pads: boolean; externalPaddles: boolean; internalHandles: boolean };
}

export type M2DeviceAction =
  | { device: 'defib'; action: 'selector'; value: M2Selector; lane?: never }
  | { device: 'defib'; action: 'patientType'; value: M2PatientType; lane?: never }
  /** Manual/AED switch [G 12-12]; `password` when the configuration asks for one (DQ20). */
  | { device: 'defib'; action: 'defibMode'; value: { mode: 'manual' | 'aed'; password?: string }; lane?: never }
  | { device: 'defib'; action: 'shockButton'; value: { phase: M2Phase; button: M2ShockButton }; lane?: never }
  /** The Analyze key (AED mode) [G 2-14]. */
  | { device: 'defib'; action: 'analyze'; value?: never; lane?: never }
  /** The pacer's 4:1 key, held [G 16-6]. */
  | { device: 'defib'; action: 'fourToOne'; value: { phase: M2Phase }; lane?: never }
  /**
   * The M2's own Alarm Control button [G 5-6] (DQ3 = A: never the bedside monitor's alarms). Its effect depends on how
   * long it is held (< 1 s, 1–3 s, > 3 s); the simulation clock can pause or run scaled while a key is held, so the
   * release may carry the hold the operator gave it in wall-clock milliseconds.
   */
  | { device: 'defib'; action: 'alarmControl'; value: { phase: M2Phase; heldMs?: number }; lane?: never }
  /** One of the M2's own limits [G 5-7]; `param` is an M2_LIMIT_KEYS key; null = that side unset. */
  | { device: 'defib'; action: 'alarmLimit'; value: { param: string; low?: number | null; high?: number | null; enabled?: boolean }; lane?: never }
  /** The NIBP button: starts or stops a measurement [G 2-4]. */
  | { device: 'defib'; action: 'nibp'; value: 'press'; lane?: never }
  /** The CO2 key: enable, disable, zero [G 2-13], [G 2-14]. */
  | { device: 'defib'; action: 'co2'; value: 'on' | 'off' | 'zero'; lane?: never }
  /** A code marker from the configured list [G 2-16]. */
  | { device: 'defib'; action: 'codeMarker'; value: { label: string }; lane?: never }
  /** The Print button: starts or stops the strip [G 2-4]. */
  | { device: 'defib'; action: 'print'; value: 'press'; lane?: never }
  /** A change to what is connected (a patch of M2Connections; each part given whole). */
  | { device: 'defib'; action: 'connect'; value: Partial<M2Connections>; lane?: never }
  | { device: 'defib'; action: 'setting'; value: Partial<M2Settings>; lane?: never }
  | { device: 'defib'; action: 'config'; value: Partial<M2Config>; lane?: never };

/** The M2's state in `deviceStatus.m2` (present only when the room's model is the M2). E0 declares every field with
 * its idle value; the piece named on each fills it. */
export interface M2Status {
  /** E1, E9b. */
  power: {
    selector: M2Selector;
    /** When the selector went to OFF (power-off memory [G 3-1]), null while on. */
    offSinceS: SimSeconds | null;
    ac: boolean;
    /** Battery level 1–5 and state [G 2-6]; level null with no battery. */
    battery: { level: number | null; state: 'ok' | 'low' | 'replace' | 'none' | 'fault' | 'calibrate' };
    selfTest: 'none' | 'running' | 'passed' | 'failed';
  };
  /** E1, E5. */
  defibMode: 'manual' | 'aed';
  patientType: M2PatientType;
  /** The top trace's source: sync, HR and Check Patient read it [G 14-14], [G 6-7] (E1, E8a). */
  topLead: string;
  /** Auto energy escalation: the next level (1–3) and whether it is still on [G 14-3] (E1). */
  escalation: { next: 1 | 2 | 3; on: boolean };
  /** Keys held now (E1, E2a, E6, E7b). */
  held: { panel: boolean; apex: boolean; sternum: boolean; internal: boolean; fourToOne: boolean; alarmControl: boolean };
  /** The AED cycle [G 12-6], [G 12-7] (E4, E5). */
  aed: {
    phase: 'idle' | 'analyzing' | 'shockAdvised' | 'noShockAdvised' | 'pressShock' | 'cpr' | 'stopCpr' | 'checkPatient';
    verdict: 'shockAdvised' | 'noShockAdvised' | 'noisy' | 'halted' | null;
    untilS: SimSeconds | null;
    /** The next shock of the sequence, 1–3 [G 12-6]. */
    shockIndex: number;
  };
  /** Real CPR Help [G 15-2], [G 15-3] (E3, E5): null = "- - -". */
  cpr: { depthCm: number | null; ratePerMin: number | null; periodEndsS: SimSeconds | null; metronome: boolean };
  /** The pacer's 10-minute resume rule [G 16-5] (E6). */
  pacerResume: { mA: number | null; untilS: SimSeconds | null };
  /** The device's message bar, most important first ("Attach Pads", …) (E2a, E7c). */
  messages: string[];
  /** The M2's own alarm instance (DQ3 = A) (E7a, E7b). */
  alarm: {
    audio: 'on' | 'paused' | 'off';
    alarmsOff: boolean;
    untilS: SimSeconds | null;
    active: AlarmEntry[];
    limits: Record<string, LimitState>;
  };
  /** Which of its channels are live, each only when its sensor is connected (DQ3 = A) (E7b, E8a, E8b). */
  channels: { ecg: boolean; pads: boolean; spo2: boolean; nibp: boolean; co2: boolean; resp: boolean; temp1: boolean; temp2: boolean };
  /** E8b. */
  nibp: { running: boolean };
  co2: 'off' | 'warmup' | 'on' | 'zeroing';
  /** E9a. */
  printing: boolean;
  lastCodeMarker: { t: SimSeconds; label: string } | null;
  /** The last delivery as the device reports it [G 17-8] (E2b). */
  lastDelivery: { t: SimSeconds; selectedJ: number; deliveredJ: number; impedanceOhm: number; currentA: number; sync: boolean } | null;
  connections: M2Connections;
  settings: M2Settings;
  /** The configuration; the password itself is never published, only whether one is set. */
  config: Omit<M2Config, 'aedPassword'> & { aedPassword: boolean };
}

/**
 * The skin (and age band) the device layer follows; `setSkin` without an engine restart (brief §3.8). The
 * defibrillator model rides this union so `DeviceAction` (types.ts) carries it unchanged.
 */
export type MonitorDeviceAction = { device: 'monitor'; action: 'skin' | 'ageBand'; value: string; lane?: never } | DefibDeviceAction;

/** One active (or latched) alarm as the renderer shows it. */
export interface AlarmEntry {
  id: string;
  level: AlarmLevel;
  category: 'physiological' | 'technical';
  text: string;
  /** Numeric that is in alarm (limit alarms only), for the flashing tile. */
  numeric?: NumericId;
  since: SimSeconds;
  /** The condition is gone but the alarm is latched (brief §6.4). */
  latched: boolean;
  acked: boolean;
  /**
   * The alarm sound plays — raised and not acknowledged, and while latched only under the skin's AUDIBLE latching
   * (philips-like #H30: visual only). Absent in older events: read as `!acked`.
   */
  sounding?: boolean;
  /** A technical PROMPT (MUI-7: saadat-like "IBP1 NO SENSOR"): shown in the message bar, with no tone and no lamp. */
  prompt?: boolean;
}

/** Brief §6.4 alarm-limit table as the device layer uses it: parameter key → [low, high] (null = no limit). */
export interface LimitState {
  numeric: NumericId;
  low: number | null;
  high: number | null;
  enabled: boolean;
  level: AlarmLevel;
  /** Inherited from another age band (brief §6.8: "marked approximate"). */
  approximate: boolean;
}

/** Device-layer events (additive to brief §7.3). */
export type DeviceEvent =
  | {
      /** The alarm manager's whole visible state, on every change and at 1 Hz: the renderer's single source. */
      type: 'alarmStatus'; t: SimSeconds; skin: string; ageBand: AgeBand;
      active: AlarmEntry[];
      silencedUntil: SimSeconds | null;
      pausedUntil: SimSeconds | null;
      /** Per-parameter switch and limits, keyed by the skin's limit keys. */
      limits: Record<string, LimitState>;
      allOff: boolean;
      arrhythmiaAnalysis: boolean;
      /** Alarm volume step (skin range, brief §6.4 / §6.4.1). */
      volume: number;
    }
  | {
      /** Defibrillator and pacer state, on every change and at 1 Hz. */
      type: 'deviceStatus'; t: SimSeconds;
      defib: {
        energyJ: number; state: 'idle' | 'charging' | 'ready'; sync: boolean; readyAt: SimSeconds | null; shocks: number;
        /** outcome: 'unchanged' | 'vf' | 'asystole' | 'pea' | 'rosc' | 'sinus', or the pre-selected rhythm id. */
        lastShock: { t: SimSeconds; energyJ: number; sync: boolean; outcome: string } | null;
      } | null;
      pacer: { mode: 'off' | 'demand' | 'fixed'; ratePpm: number; mA: number; paused: boolean } | null;
      /** HR shows dashes while pacing on this skin (LIFEPAK-like, research/05 §2.6). */
      hrDashes: boolean;
      /** The ZOLL M2's own state; absent unless the room's model is `zoll-m2` (plan E0). */
      m2?: M2Status;
    };
