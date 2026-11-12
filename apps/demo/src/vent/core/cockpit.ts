// The ventilator cockpit's core (plan vent-skin-edp-ts.md §4.3, piece V0): the logic every face needs, moved out of
// the Hamilton front end, knowing nothing of any look. It owns the driver's step and control hooks (and, when the
// face asks for it, the matched-flow wrap of `d.frame`) from creation, so it runs headless: a test or a node script
// drives it with `d.frame(ms)`; `start` only adds the animation frame a face draws in.
// Freeze freezes the DISPLAY only (the buffers stop; the physics keeps running, as on a real ventilator).
import {
  bannerText, clamp, DT, loadPreset, lungBaseOf, manualBreath, modeName, monitorMatchedFlow, resetPhysics, runScenario,
  setMode, silenceAlarms, toggleHold, ventAlarms,
  type Measured, type PresetId, type VentAlarm, type VentConfig, type VentDriver, type VentPhase, type VentPhysics, type VentState,
} from '@pme/ventilator';
import { createRecorder } from './record.ts';
import type { BreathRecord, Change, ChangeSource, FaceSpec, NumKey } from './types.ts';

export interface SampleBuffers {
  /** Displayed airway pressure (cmH₂O), flow (L/min), volume (mL) and sim time (s), one sample per 5 ms step. */
  readonly p: readonly number[];
  readonly f: readonly number[];
  readonly v: readonly number[];
  readonly t: readonly number[];
  /** V1: each sample's phase (a face colours its traces by it) and the volume since that breath started (mL). */
  readonly ph: readonly VentPhase[];
  readonly vb: readonly number[];
}

export interface AlarmView {
  /** The banner: silenced countdown, the first active alarm, or none. */
  banner: { cls: '' | 'armed' | 'silenced'; text: string };
  /** The model's active alarms through the face's alarm profile: V1 applies its `show` and `priority` (V3 delays, latching). */
  active: VentAlarm[];
}

export interface Cockpit {
  readonly d: VentDriver;
  readonly vs: Readonly<VentState>;
  /** Read here; written only through `set`, `write`, `chooseMode` and the actions. */
  readonly cfg: Readonly<VentConfig>;
  readonly p: Readonly<VentPhysics>;
  readonly face: FaceSpec;
  /** The measured view the device shows (the smoothed one when there is one). */
  measured(): Measured;
  modeName(): string;
  /** Linked: the monitor's lungState is the lung (the drawer's lung sliders would last a second). */
  lungLinked(): boolean;

  readonly buf: SampleBuffers;
  /** V1: the last complete breath (live while the display is frozen), or null before the first. */
  record(): BreathRecord | null;
  clearBuf(): void;
  readonly frozen: boolean;
  toggleFreeze(): void;
  hold(kind: 'insp' | 'exp'): void;
  manualBreath(): void;
  reset(): void;

  /** A setting from the face's control, clamped and stepped to the face's range; returns the value stored. */
  set(key: NumKey, value: number, source?: ChangeSource): number;
  /** Settings written as given (the control itself bounds them: a slider, a segment, a check box, a number field). */
  write(patch: Partial<VentConfig>, source?: ChangeSource): void;
  /** A mode by its name in the face's mode table; false when the table has no such name. */
  chooseMode(name: string): boolean;
  preset(id: PresetId): void;
  scenario(id: string): void;

  alarms(): AlarmView;
  silence(): void;

  /** Every change of settings or state, with who made it. */
  onChange(fn: (c: Change) => void): () => void;
  /** After every 5 ms step the buffers took (not while frozen). */
  onStep(fn: () => void): () => void;
  /** Run the animation frame: `d.frame(ts)`, then `draw(ts)`. */
  start(draw: (ts: number) => void): void;
  /** Stop the frame and give the driver its hooks back. */
  stop(): void;
}

export interface CockpitOptions {
  /** The driver has a link port (a monitor behind it): the face's matched-flow option applies. */
  linked: boolean;
}

export function createCockpit(d: VentDriver, face: FaceSpec, o: CockpitOptions): Cockpit {
  const vs = d.vs;
  const S = vs.cfg;
  const P = vs.p;
  const BUF = { p: [] as number[], f: [] as number[], v: [] as number[], t: [] as number[], ph: [] as VentPhase[], vb: [] as number[] };
  const rec = createRecorder();
  if (face.init) Object.assign(S, face.init);
  let frozen = false;
  const changes = new Set<(c: Change) => void>();
  const steps = new Set<() => void>();
  /** V1: the face's invariants restored after any change (FaceSpec.settle), before anyone hears of it. */
  const settle = (keys: ReadonlyArray<keyof VentConfig>): ReadonlyArray<keyof VentConfig> => {
    const fix = face.settle?.(S);
    if (!fix) return keys;
    const k = (Object.keys(fix) as Array<keyof VentConfig>).filter((x) => S[x] !== fix[x]);
    if (!k.length) return keys;
    Object.assign(S, fix);
    return [...keys, ...k.filter((x) => !keys.includes(x))];
  };
  const emit = (source: ChangeSource, keys: ReadonlyArray<keyof VentConfig> = []) => {
    const all = settle(keys);
    for (const fn of [...changes]) fn({ source, keys: all });
  };
  settle([]); // the face's starting state is settled too (VC's flow from its set Ti)
  /** The drawer edits the lung before the first lungState and the stand-alone lung (link/core.ts patchVent); linked, lungState
   *  overwrites C, R, flow limitation and pleural pressure every second (Stage V.1) — the base keeps the patient's own effort. */
  const syncBase = () => { d.core.lung.base = lungBaseOf(S); };
  const clearBuf = () => { BUF.p.length = BUF.f.length = BUF.v.length = BUF.t.length = BUF.ph.length = BUF.vb.length = 0; };
  const keep = () => Math.ceil(((S.sweepSec || 12) * 1.15) / DT) + 40;

  d.onStep = () => {
    rec.step(vs);
    if (frozen) return;
    BUF.p.push(P.dispPaw); BUF.f.push(P.dispFlowLpm); BUF.v.push(P.V); BUF.t.push(P.t); BUF.ph.push(P.phase); BUF.vb.push(Math.max(0, P.V - P.breathVstart));
    const k = keep();
    while (BUF.t.length > k) { BUF.p.shift(); BUF.f.shift(); BUF.v.shift(); BUF.t.shift(); BUF.ph.shift(); BUF.vb.shift(); }
    for (const fn of [...steps]) fn();
  };
  d.onControl = () => emit('remote'); // a remote patch (link page, demo, host)

  // Matched flow: until the user writes Flow or Pause here, VC runs at the monitor ventilator's flow for the set VT and rate
  let matched = face.matchMonitorFlow && o.linked;
  const frame = d.frame;
  if (matched) {
    d.frame = (ms) => {
      if (matched && S.mode === 'VC') Object.assign(S, monitorMatchedFlow(S));
      frame(ms);
    };
  }
  const userWrote = (keys: ReadonlyArray<keyof VentConfig>, source: ChangeSource) => {
    if (source !== 'remote' && (keys.includes('vcFlow') || keys.includes('pause'))) matched = false;
  };

  const prof = face.alarmProfile;
  const profiled = (a: VentAlarm[]): VentAlarm[] => (prof ? a.filter((x) => !prof.show || prof.show.includes(x.id)).map((x) => ({ ...x, priority: prof.priority?.[x.id] ?? x.priority })) : a);

  let raf = 0;
  const c: Cockpit = {
    d, vs, cfg: S, p: P, face,
    measured: () => P.shown ?? P.measured,
    modeName: () => modeName(S),
    lungLinked: () => d.core.lung.last !== null,
    buf: BUF,
    record: () => rec.last(),
    clearBuf,
    get frozen() { return frozen; },
    toggleFreeze() { frozen = !frozen; emit('action'); },
    hold(kind) { toggleHold(vs, kind); emit('action'); },
    manualBreath() { manualBreath(vs); emit('action'); },
    reset() { resetPhysics(vs); clearBuf(); emit('action'); },
    set(key, value, source = 'face') {
      const r = face.ranges[key];
      const v = r ? clamp(Math.round(value / r[2]) * r[2], r[0], r[1]) : value;
      c.write({ [key]: v } as Partial<VentConfig>, source);
      return S[key];
    },
    write(patch, source = 'face') {
      Object.assign(S, patch);
      const keys = Object.keys(patch) as Array<keyof VentConfig>;
      userWrote(keys, source);
      if (source === 'tool') syncBase(); // the simulator's patient settings are the stand-alone lung's base
      emit(source, keys);
    },
    chooseMode(name) {
      const m = face.modes[name];
      if (!m) return false;
      const carried = m.carry?.(S) ?? {}; // from the settings of the mode being left
      setMode(vs, m.mode);
      if (m.patch) Object.assign(S, m.patch);
      Object.assign(S, carried);
      S.modeLabel = m.label;
      emit('mode', ['mode', 'modeLabel', ...(Object.keys({ ...m.patch, ...carried }) as Array<keyof VentConfig>)]);
      return true;
    },
    preset(id) { loadPreset(vs, id); syncBase(); emit('preset'); },
    scenario(id) { runScenario(vs, id); clearBuf(); emit('scenario'); },
    alarms: () => ({ banner: bannerText(vs), active: profiled(ventAlarms(vs)) }),
    silence() { silenceAlarms(vs); emit('action'); },
    onChange: (fn) => (changes.add(fn), () => void changes.delete(fn)),
    onStep: (fn) => (steps.add(fn), () => void steps.delete(fn)),
    start(draw) {
      if (raf) cancelAnimationFrame(raf);
      const loop = (ts: number) => { d.frame(ts); draw(ts); raf = requestAnimationFrame(loop); };
      raf = requestAnimationFrame(loop);
    },
    stop() {
      if (raf) cancelAnimationFrame(raf); // headless (no start), there is no frame to cancel
      d.onStep = undefined;
      d.onControl = undefined;
      d.frame = frame;
      changes.clear();
      steps.clear();
    },
  };
  return c;
}
