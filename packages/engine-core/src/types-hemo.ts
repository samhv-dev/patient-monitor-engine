// Stage 2 public types (brief §7.2–§7.3), kept in their own file so parallel stages do not collide in
// types.ts. types.ts adds `HemoCommandBody`, `NibpDeviceAction` and `HemoEvent` to its unions.
import type { Ramp, SimSeconds, StateVar } from './types.ts';

/** Sensors named in brief §7.2 `attachSensor`. Stage 2 implements abp, cvp, pap, spo2 (pleth) and nibp. */
export type SensorId = 'ecg' | 'spo2' | 'nibp' | 'abp' | 'cvp' | 'pap' | 'co2' | 'temp';
/** Invasive-line sensor states (brief §6.2, CAE semantics). */
export type LineSensorState = 'none' | 'atmosphere' | 'connected' | 'zeroing' | 'damped';
export type PressureChannel = 'abp' | 'cvp' | 'pap';
/** Sites that decide same-limb effects (brief §4.2, §4.5): cuff on the arterial-line or SpO2 arm. */
export type AbpSite = 'leftRadial' | 'rightRadial' | 'femoral';
export type Spo2Site = 'leftFinger' | 'rightFinger' | 'ear' | 'forehead';
export type NibpSite = 'rightArm' | 'leftArm' | 'leg';

/** Brief §7.2 ClinicalEvent, the members Stage 2 implements. `fnHz` is a Stage 2 extension for `damp`. */
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

/** Command variants added in Stage 2 (brief §7.2). setTarget already exists in types.ts. */
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
export type NibpDeviceAction = { device: 'nibp'; action: 'start' | 'stat' | 'stop' | 'auto'; intervalMin?: number };

export type NibpPhase = 'idle' | 'inflating' | 'deflating' | 'done' | 'failed';
export type ControlFlag = 'modeled' | 'pinned' | 'ramping' | 'override';

/** Event variants added in Stage 2 (brief §7.3). */
export type HemoEvent =
  | {
      type: 'nibp'; t: SimSeconds; phase: NibpPhase; cuffMmHg?: number; nextInS?: number;
      result?: { sys: number; dia: number; map: number; pr: number };
    }
  | {
      type: 'state'; t: SimSeconds; tick: number; mode: 'manual' | 'modeled';
      values: Partial<Record<StateVar, number>>; control: Partial<Record<StateVar, ControlFlag>>;
    }; // the brief §7.3 `alarm` event (NIBP INOP) is Stage 5's copy in types.ts
