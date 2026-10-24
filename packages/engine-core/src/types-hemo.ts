// Haemodynamic public types (brief §7.2–§7.3), kept in their own file. types.ts adds `HemoCommandBody`,
// `NibpDeviceAction` and `HemoEvent` to its unions.
import type { Ramp, RhythmId, SimSeconds, StateVar } from './types.ts';

/** Sensors named in brief §7.2 `attachSensor`. The haemodynamics implement abp, cvp, pap, spo2 (pleth) and nibp. */
export type SensorId = 'ecg' | 'spo2' | 'nibp' | 'abp' | 'cvp' | 'pap' | 'co2' | 'temp' | 'pv' | 'icp' | 'pbto2' | 'urometer'; // 'pv' = teaching channels; icp, pbto2, urometer
/** Invasive-line sensor states (brief §6.2, CAE semantics). */
export type LineSensorState = 'none' | 'atmosphere' | 'connected' | 'zeroing' | 'damped';
export type PressureChannel = 'abp' | 'cvp' | 'pap';
/** Sites that decide same-limb effects (brief §4.2, §4.5): cuff on the arterial-line or SpO2 arm. */
export type AbpSite = 'leftRadial' | 'rightRadial' | 'femoral';
export type Spo2Site = 'leftFinger' | 'rightFinger' | 'ear' | 'forehead';
export type NibpSite = 'rightArm' | 'leftArm' | 'leg';

/** Brief §7.2 ClinicalEvent, the members the haemodynamics implement. `fnHz` is an extension for `damp`. */
export type HemoClinicalEvent =
  | {
      kind: 'line'; line: PressureChannel;
      action: 'flush' | 'zero' | 'sample' | 'disconnect' | 'reconnect' | 'damp' | 'level' | 'wedge';
      /** damp: ζ (default 1.2); level: transducer cm BELOW the phlebostatic axis; wedge: 1 inflate, 0 deflate. */
      value?: number;
      /** damp only: natural frequency in Hz (default: unchanged). */
      fnHz?: number;
    }
  | { kind: 'cpr'; active: boolean; rate?: number; quality?: number; ventilation?: '30:2' | 'continuous' };

/** Haemodynamic command variants (brief §7.2). setTarget already exists in types.ts. */
export type HemoCommandBody =
  | { type: 'pin'; variable: StateVar; value?: number; ramp?: Ramp }
  | { type: 'release'; variable: StateVar | 'all'; ramp?: Ramp }
  | { type: 'setMode'; mode: 'manual' | 'modeled' }
  | { type: 'applyEvent'; event: HemoClinicalEvent }
  | {
      type: 'attachSensor'; sensor: SensorId; state: string; site?: string;
      leadSet?: 3 | 5 | 12; sampling?: 'sidestream' | 'mainstream';
    };

/** Brief §7.2 DeviceAction, nibp member. */
/** 'manual' (rc.3): auto cycling off without aborting a running measurement (a monitor's "Off (manual)" interval). */
export type NibpDeviceAction = { device: 'nibp'; action: 'start' | 'stat' | 'stop' | 'auto' | 'manual'; intervalMin?: number };

export type NibpPhase = 'idle' | 'inflating' | 'deflating' | 'done' | 'failed';
export type ControlFlag = 'modeled' | 'pinned' | 'ramping' | 'override';

/** Haemodynamic event variants (brief §7.3). */
export type HemoEvent =
  | {
      type: 'nibp'; t: SimSeconds; phase: NibpPhase; cuffMmHg?: number; nextInS?: number;
      result?: { sys: number; dia: number; map: number; pr: number };
      /** The cuff's cycling mode and auto interval at this event (rc.3), so a restore or a phone shows "AUTO(5Min)". */
      mode?: 'manual' | 'auto' | 'stat'; intervalMin?: number;
    }
  | {
      type: 'state'; t: SimSeconds; tick: number; mode: 'manual' | 'modeled';
      values: Partial<Record<StateVar, number>>; control: Partial<Record<StateVar, ControlFlag>>;
      rhythm?: { id: RhythmId; rateBpm: number }; // The running rhythm, engine-initiated changes included
      /** Every sensor's state as `attachSensor` names it (the `state` strings of brief §7.2), so a Remote can show
       * which sensors are attached. Assembled by the engine when the event is committed (four owners). */
      sensors?: Partial<Record<SensorId, string>>;
      /** Who breathes and through what (E121b), so a panel can tell a spontaneously breathing patient without an airway
       *  device from a bagged, ventilated (external = the Ventilator view) or intubated one. Assembled with `sensors`. */
      breathing?: { source: 'spontaneous' | 'bvm' | 'ventilator' | 'none' | 'external'; device: 'none' | 'ett' | 'sga' };
    }; // The brief §7.3 `alarm` event (NIBP INOP) is the copy in types.ts
