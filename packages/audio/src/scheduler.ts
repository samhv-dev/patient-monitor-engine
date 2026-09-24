// Look-ahead tone scheduler (brief §3.6): a 25 ms timer schedules every tone due in the next 100 ms on
// the audio clock. Tones are also tried the moment they arrive.
// Lateness policy (Gate 1 ruling R15, with the review's refinement, docs/gates/stage-1-review.md §6.3):
// - a late tone plays at once (a QRS beep is a DETECTION event, as on a real monitor);
// - `now − when` includes the output device's latency (`when` is output-mapped through getOutputTimestamp),
//   so the measured output latency (fallback 20 ms) is subtracted before judging staleness;
// - a QRS tone is dropped only if it would sound more than 150 ms after the R it marks; other kinds never drop.
// Each tone id plays once (the engine re-posts nothing, but ids are deduped anyway), and a cancel also stops
// tones already handed to Web Audio, through the handle `play` returns.
import { ClockMap } from './clock-map.ts';

export const TIMER_MS = 25;
export const LOOKAHEAD_S = 0.1;
/** A QRS tone is stale (dropped) if it would sound more than this after its R (ruling R15). */
export const MAX_QRS_AFTER_R_S = 0.15;
/** Output latency assumed when the browser reports none (ruling R15). */
export const DEFAULT_OUTPUT_LATENCY_S = 0.02;
const LOG_MAX = 500;
const FORGET_AFTER_S = 2; // keep played ids this long for dedupe [ENG]

export interface ToneRequest {
  t: number; // sim seconds
  id: string;
  kind: string;
  freqHz?: number;
  /** Sim time of the event the tone marks (the detected R for 'qrs'). */
  refT?: number;
}

export interface ToneHandle {
  stop(): void;
}

export interface SchedulerDeps {
  /** Current audio clock (AudioContext.currentTime). */
  audioNow(): number;
  /** Map main-thread performance ms to audio time (uses getOutputTimestamp). */
  perfToAudio(perfMs: number): number;
  /** Measured output latency (s), or undefined when the browser does not report it. */
  outputLatency?(): number | undefined;
  /** Actually start the sound at audio time `when`; the handle lets a cancel stop it. */
  play(tone: ToneRequest, when: number): ToneHandle | void;
}

export interface ToneLogEntry {
  id: string;
  kind: string;
  simT: number;
  refT?: number;
  when: number; // audio time it was scheduled for
  /** Audible lag behind the intended time (s): at − when, which includes the device output latency. */
  lateS: number;
  dropped: boolean;
}

interface Live {
  t: number;
  at: number; // audio time it was started at (NaN while queued)
  handle: ToneHandle | null;
}

export class ToneScheduler {
  readonly clock = new ClockMap();
  readonly log: ToneLogEntry[] = [];
  private queue: ToneRequest[] = [];
  private readonly live = new Map<string, Live>();
  private readonly deps: SchedulerDeps;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(deps: SchedulerDeps) {
    this.deps = deps;
  }

  start(): void {
    if (this.timer === null) this.timer = setInterval(() => this.pump(), TIMER_MS);
  }

  stop(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }

  enqueue(tone: ToneRequest): void {
    if (this.live.has(tone.id)) return; // already queued or played
    this.live.set(tone.id, { t: tone.t, at: Number.NaN, handle: null });
    this.queue.push(tone);
    this.queue.sort((a, b) => a.t - b.t);
    this.pump();
  }

  /** Revoke these tones (engine `toneCancel.ids`), stopping any already scheduled. */
  cancel(ids: readonly string[]): void {
    const set = new Set(ids);
    this.revoke((id) => set.has(id));
  }

  /** Revoke every tone with t > after (engine `toneCancel` without ids), stopping any already scheduled. */
  cancelAfter(after: number): void {
    this.revoke((_, l) => l.t > after);
  }

  /** Drop everything (e.g. the AudioContext was interrupted). */
  clear(): void {
    this.revoke(() => true);
  }

  get pending(): number {
    return this.queue.length;
  }

  /** The output latency used to judge lateness (s). */
  get outputLatencyS(): number {
    const v = this.deps.outputLatency?.();
    return v !== undefined && Number.isFinite(v) && v >= 0 ? v : DEFAULT_OUTPUT_LATENCY_S;
  }

  private revoke(match: (id: string, l: Live) => boolean): void {
    const now = this.deps.audioNow();
    for (const [id, l] of [...this.live]) {
      if (!match(id, l)) continue;
      if (l.handle && l.at > now) l.handle.stop();
      this.live.delete(id);
    }
    this.queue = this.queue.filter((q) => this.live.has(q.id));
  }

  /** Schedule everything due within the look-ahead window. */
  pump(): void {
    if (!this.clock.hasAnchor) return;
    const now = this.deps.audioNow();
    for (const [id, l] of this.live) if (l.at + FORGET_AFTER_S < now) this.live.delete(id);
    while (this.queue.length > 0) {
      const tone = this.queue[0] as ToneRequest;
      const when = this.deps.perfToAudio(this.clock.simToPerfMs(tone.t));
      if (when > now + LOOKAHEAD_S) break;
      this.queue.shift();
      const entry: ToneLogEntry = { id: tone.id, kind: tone.kind, simT: tone.t, when, lateS: 0, dropped: false };
      if (tone.refT !== undefined) entry.refT = tone.refT;
      const excess = Math.max(0, now - when - this.outputLatencyS);
      const afterRef = (tone.refT !== undefined ? (tone.t - tone.refT) / this.clock.timeScale : 0) + excess;
      if (tone.kind === 'qrs' && afterRef > MAX_QRS_AFTER_R_S) {
        entry.lateS = now - when;
        entry.dropped = true;
        this.live.delete(tone.id);
      } else {
        const at = Math.max(when, now);
        const handle = this.deps.play(tone, at) ?? null;
        this.live.set(tone.id, { t: tone.t, at, handle });
        entry.when = at;
        entry.lateS = at - when;
      }
      this.log.push(entry);
      if (this.log.length > LOG_MAX) this.log.splice(0, this.log.length - LOG_MAX);
    }
  }
}
