// AlarmSounder: turns "alarm X of level L is active" into pulse tones on the existing look-ahead ToneScheduler
// (brief §3.6, §6.4, §6.4.1). Only the highest-priority active alarm sounds (lowest level number; ties: first
// raised). Bursts repeat at the level's repeatS until the alarm clears; a change of the sounding alarm cancels the
// old train's pending pulses and starts the new train at once. Silence cancels pending pulses for durationS; with
// cancelOnNewAlarm (saadat) any NEW alarm ends the silence. Every pulse has a stable, never-reused id
// `alarm:<alarmId>:<train>:<burst>:<pulse>` so a cancel reaches pulses already handed to Web Audio.
// Sim time ↔ real time: pulse offsets are real seconds × clock.timeScale (bursts keep real-time patterns [ENG]).
import { burstPulses, dbToGain, levelSound, volumeGain } from './alarm-bursts.ts';
import type { AlarmLevel, AlarmSoundProfile, ProfileOverrides } from './profiles/types.ts';
import type { ToneRequest } from './scheduler.ts';

export interface AlarmToneRequest extends ToneRequest {
  kind: 'alarm';
  freqHz: number;
  durS: number;
  gain: number;
  level: AlarmLevel;
  profile: AlarmSoundProfile['id'];
}

/** The part of ToneScheduler the sounder needs (a fake in tests). */
export interface SounderScheduler {
  enqueue(tone: ToneRequest): void;
  cancel(ids: readonly string[]): void;
  readonly clock: { readonly timeScale: number };
}

export interface AlarmSounderOptions {
  overrides?: ProfileOverrides;
  /** Volume step; default = the skin's (overrides.volume) or the profile's default. */
  volume?: number;
  /** How far ahead (real seconds) bursts are enqueued. Default 1 s [ENG]: > the scheduler's 100 ms look-ahead. */
  horizonS?: number;
}

interface Active {
  id: string;
  level: AlarmLevel;
  seq: number;
}

interface Train {
  alarmId: string;
  level: AlarmLevel;
  no: number;
  startT: number;
  nextBurst: number;
  nextBurstT: number;
  done: boolean;
}

const PRUNE_AFTER_S = 5;

export class AlarmSounder {
  readonly profile: AlarmSoundProfile;
  private readonly sched: SounderScheduler;
  private readonly ov: ProfileOverrides;
  private readonly horizonS: number;
  private readonly active = new Map<string, Active>();
  private seq = 0;
  private trainNo = 0;
  private train: Train | null = null;
  private pending = new Map<string, number>(); // id → sim t
  private silentUntil: number | null = null;
  private volumeStep: number;

  constructor(sched: SounderScheduler, profile: AlarmSoundProfile, opts: AlarmSounderOptions = {}) {
    this.sched = sched;
    this.profile = profile;
    this.ov = opts.overrides ?? {};
    this.horizonS = opts.horizonS ?? 1;
    this.volumeStep = opts.volume ?? this.ov.volume?.default ?? profile.volume.default;
  }

  get volume(): number {
    return this.volumeStep;
  }

  /** Sim time the current silence ends, or null. */
  get silencedUntil(): number | null {
    return this.silentUntil;
  }

  /** Id of the alarm whose train is sounding (null when none, or while silenced). */
  get sounding(): string | null {
    return this.silentUntil === null ? (this.train?.alarmId ?? null) : null;
  }

  private get silence() {
    return this.ov.silence ?? this.profile.silence;
  }

  private get volumeRange() {
    return { ...this.profile.volume, ...(this.ov.volume ?? {}) };
  }

  setVolume(step: number): void {
    const v = this.volumeRange;
    this.volumeStep = Math.round(Math.min(v.max, Math.max(v.min, step)));
  }

  /** Alarm `id` became active (or changed level) at sim time t. */
  raise(id: string, level: AlarmLevel, t: number): void {
    const prev = this.active.get(id);
    if (prev && prev.level === level) return;
    this.active.set(id, { id, level, seq: prev?.seq ?? this.seq++ });
    if (!prev && this.silentUntil !== null && this.silence.cancelOnNewAlarm) this.silentUntil = null;
    this.retrain(t);
  }

  /** Alarm `id` ended at sim time t. */
  clear(id: string, t: number): void {
    if (!this.active.delete(id)) return;
    this.retrain(t);
  }

  /** Silence all alarm audio from t for durationS real seconds (default: the profile's / skin's silence). */
  silenceAll(t: number, durationS = this.silence.durationS): void {
    this.cancelPending(() => true);
    this.train = null;
    this.silentUntil = t + durationS * this.sched.clock.timeScale;
  }

  /** End a silence early (e.g. Silence pressed again, brief §6.4.1). */
  endSilence(t: number): void {
    if (this.silentUntil === null) return;
    this.silentUntil = null;
    this.retrain(t);
  }

  /** Enqueue every burst that starts before t + horizon. Call it often (every scheduler tick or frame). */
  pump(t: number): void {
    if (this.silentUntil !== null && t >= this.silentUntil) {
      const end = this.silentUntil;
      this.silentUntil = null;
      this.retrain(end);
    }
    for (const [id, pt] of this.pending) if (pt < t - PRUNE_AFTER_S) this.pending.delete(id);
    const tr = this.train;
    if (!tr || this.silentUntil !== null) return;
    const ts = this.sched.clock.timeScale;
    const ls = levelSound(this.profile, tr.level, this.ov);
    const gain = volumeGain(this.volumeRange, this.volumeStep) * dbToGain(ls.levelDb);
    while (!tr.done && tr.nextBurstT <= t + this.horizonS * ts) {
      burstPulses(ls).forEach((p, i) => {
        const req: AlarmToneRequest = {
          t: tr.nextBurstT + p.offsetS * ts,
          id: `alarm:${tr.alarmId}:${tr.no}:${tr.nextBurst}:${i}`,
          kind: 'alarm',
          freqHz: p.freqHz,
          durS: p.durS,
          gain,
          level: tr.level,
          profile: this.profile.id,
        };
        this.pending.set(req.id, req.t);
        this.sched.enqueue(req);
      });
      tr.nextBurst++;
      if (ls.repeatS === null) tr.done = true;
      else tr.nextBurstT = tr.startT + tr.nextBurst * ls.repeatS * ts;
    }
  }

  /** Stop everything (page teardown). */
  dispose(): void {
    this.cancelPending(() => true);
    this.active.clear();
    this.train = null;
  }

  private top(): Active | null {
    let best: Active | null = null;
    for (const a of this.active.values()) if (!best || a.level < best.level || (a.level === best.level && a.seq < best.seq)) best = a;
    return best;
  }

  private retrain(t: number): void {
    const top = this.top();
    const cur = this.train;
    if (cur && top && cur.alarmId === top.id && cur.level === top.level) return;
    if (cur) this.cancelPending((pt, id) => id.startsWith(`alarm:${cur.alarmId}:${cur.no}:`) && pt >= t);
    this.train = top && this.silentUntil === null ? { alarmId: top.id, level: top.level, no: this.trainNo++, startT: t, nextBurst: 0, nextBurstT: t, done: false } : null;
    this.pump(t);
  }

  private cancelPending(match: (t: number, id: string) => boolean): void {
    const ids = [...this.pending].filter(([id, pt]) => match(pt, id)).map(([id]) => id);
    for (const id of ids) this.pending.delete(id);
    if (ids.length > 0) this.sched.cancel(ids);
  }
}
