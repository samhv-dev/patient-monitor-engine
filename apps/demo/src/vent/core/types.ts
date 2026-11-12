// The ventilator cockpit's core types (plan vent-skin-edp-ts.md §4.3, piece V0). The core knows nothing of any look:
// a face is a module that builds its own DOM and draws from a Cockpit. The parts a later piece fills are named and
// typed here, unbuilt: the alarm profile (V3) and the breath record (V1/V4).
import type { PresetId, VentAlarm, VentConfig, VentMode } from '@pme/ventilator';
import type { SimTools } from '../sim-tools.ts';
import type { Cockpit } from './cockpit.ts';

/** The numeric and boolean settings of a VentConfig. */
export type NumKey = keyof { [K in keyof VentConfig as VentConfig[K] extends number ? K : never]: 1 };
export type BoolKey = keyof { [K in keyof VentConfig as VentConfig[K] extends boolean ? K : never]: 1 };
/** [min, max, step] of a setting on a face. */
export type Range = readonly [number, number, number];

/** One row of a face's mode table: the model's mode, the settings the face's mode implies, the name the device shows. */
export interface ModeEntry {
  mode: VentMode;
  patch?: Partial<VentConfig>;
  /** Written to `cfg.modeLabel`, so the link's frame (`modeName(cfg)`) carries the device's own name (§4.3 coupling 1). */
  label: string;
  /** V1: settings computed from the current ones when the mode starts (a face that carries VT and Ti across modes). */
  carry?: (cfg: Readonly<VentConfig>) => Partial<VentConfig>;
}

/**
 * V1: a setting in the DEVICE's units, which need not be one cfg key (the EDP-TS's Ti in VC is a flow; its I:E is an
 * inspiratory time). Pure: it reads a configuration and returns the patch a value means, so the same setting edits the
 * live cfg or a draft (a mode's settings before its start, plan §2.4).
 */
export interface Setting {
  /** [min, max, step] for this configuration (a range can depend on another setting: PCV + PEEP ≤ 100). */
  range(cfg: Readonly<VentConfig>): Range;
  read(cfg: Readonly<VentConfig>): number;
  write(v: number, cfg: Readonly<VentConfig>): Partial<VentConfig>;
}

/** Where a confirmed value goes: the live cfg (through the cockpit) or a draft. */
export interface Target {
  cfg(): Readonly<VentConfig>;
  apply(patch: Partial<VentConfig>): void;
}

/**
 * V3 fills this: which of the model's alarm ids a face shows, their priority and delay, which latch (the device's
 * alarm chapter). V0 has no profile: the model's alarms pass through unchanged.
 */
export interface AlarmProfile {
  show?: ReadonlyArray<VentAlarm['id']>;
  priority?: Partial<Record<VentAlarm['id'], VentAlarm['priority']>>;
  delayS?: Partial<Record<VentAlarm['id'], number>>;
  latch?: ReadonlyArray<VentAlarm['id']>;
}

/**
 * V1/V4 fill this from the 5 ms steps: the last breath's peak flow, Ti, Te, I:E, end-expiratory PEEP, VE mandatory and
 * spontaneous, Ti/Ttot (§3.3 GD16–GD17). Not built in V0: the Hamilton face reads the model's measured view only.
 */
export interface BreathRecord {
  /** Sim time the breath (its inspiration) started, s. */
  t0: number;
  peakFlowLpm: number;
  /** Inspiration including a pause or a hold (as a ventilator reports Ti), s. */
  ti: number;
  te: number;
  /** Ti / Te. */
  ie: number;
  /** Mean airway pressure over the last 50 ms of expiration, cmH2O. */
  peepEnd: number;
  tiTtot: number;
  /** V4. */
  veMandLpm?: number;
  veSpontLpm?: number;
}

export interface FaceSpec {
  id: string;
  label: string;
  /** The ranges `set()` clamps and steps to. A key without a range is written as given. */
  ranges: Partial<Record<NumKey, Range>>;
  /** `chooseMode(name)` looks the name up here. */
  modes: Readonly<Record<string, ModeEntry>>;
  /**
   * Linked to a monitor, VC runs at the monitor ventilator's flow for the set VT and rate until the user sets Flow or
   * Pause on this face. A property of the Hamilton face (its VC sets flow); off for EDP-TS (§4.3 coupling 2, GM1).
   */
  matchMonitorFlow: boolean;
  /** V3 fills delays and latching; V1 applies `show` and `priority`. Absent: the model's alarms as they are. */
  alarmProfile?: AlarmProfile;
  /** V1: the device's own starting settings, written once when the cockpit is created (before any link patch). */
  init?: Partial<VentConfig>;
  /**
   * V1: run after every change, whoever made it, on the live cfg; returns the settings that restore the face's
   * invariants (a device mode label after a remote patch or a scenario; VC's flow from the set Ti after a VT change).
   */
  settle?: (cfg: Readonly<VentConfig>) => Partial<VentConfig>;
}

/**
 * Who changed the settings or the device's state. `face`: the face's own control (the face has already repainted);
 * `tool`: the simulator's tools (the patient drawer); `remote`: a link `control` message; `mode`, `preset`, `scenario`:
 * those actions; `action`: freeze, hold, manual breath, reset, silence.
 */
export type ChangeSource = 'face' | 'tool' | 'remote' | 'mode' | 'preset' | 'scenario' | 'action';
export interface Change {
  source: ChangeSource;
  /** The settings written (empty for an action or a remote patch, whose keys the core does not see). */
  keys: ReadonlyArray<keyof VentConfig>;
}

/** A face: its spec, and the module that builds its DOM on a cockpit and draws each frame. */
export interface FaceModule {
  spec: FaceSpec;
  mount(c: Cockpit, tools: SimTools, env?: FaceEnv): { draw(ts: number): void; stop(): void };
}

/** What the page gives a face (V1): the app's translation of an app string OUTSIDE the device (the "Simulator" handle,
 *  plan §6), or null to keep the English; absent (the embed), the English stays. */
export interface FaceEnv {
  translate?: (en: string) => Promise<string | null>;
}

export type { PresetId };
