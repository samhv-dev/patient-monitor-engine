// Stage 4b public types (brief §6.4–§6.7, §7.2–§7.3): the device layer's commands and events. Kept in their own
// file, like types-hemo.ts, so concurrent stages do not collide in types.ts; types.ts adds these to its unions.
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

/** Stage 4b: the skin (and age band) the device layer follows; `setSkin` without an engine restart (brief §3.8). */
export type MonitorDeviceAction = { device: 'monitor'; action: 'skin' | 'ageBand'; value: string; lane?: never };

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

/** Stage 4b device events (additive to brief §7.3). */
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
    }
  | {
      /** Defibrillator and pacer state, on every change and at 1 Hz. */
      type: 'deviceStatus'; t: SimSeconds;
      defib: { energyJ: number; state: 'idle' | 'charging' | 'ready'; sync: boolean; readyAt: SimSeconds | null; shocks: number } | null;
      pacer: { mode: 'off' | 'demand' | 'fixed'; ratePpm: number; mA: number; paused: boolean } | null;
    };
