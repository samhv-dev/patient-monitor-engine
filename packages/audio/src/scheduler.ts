// Look-ahead tone scheduler (brief §3.6): a 25 ms timer schedules every tone due in the next 100 ms on
// the audio clock. Tones are also tried the moment they arrive. A tone up to 30 ms late plays at once;
// a later one is dropped [ENG]. toneCancel revokes queued tones after a sim time.
import { ClockMap } from './clock-map.ts';

export const TIMER_MS = 25;
export const LOOKAHEAD_S = 0.1;
export const MAX_LATE_S = 0.03;

export interface ToneRequest {
  t: number; // sim seconds
  id: string;
  kind: string;
  freqHz?: number;
}

export interface SchedulerDeps {
  /** Current audio clock (AudioContext.currentTime). */
  audioNow(): number;
  /** Map main-thread performance ms to audio time (uses getOutputTimestamp). */
  perfToAudio(perfMs: number): number;
  /** Actually start the sound at audio time `when`. */
  play(tone: ToneRequest, when: number): void;
}

export interface ToneLogEntry {
  id: string;
  kind: string;
  simT: number;
  when: number; // audio time it was scheduled for
  lateS: number; // > 0 when played late
  dropped: boolean;
}

export class ToneScheduler {
  readonly clock = new ClockMap();
  readonly log: ToneLogEntry[] = [];
  private queue: ToneRequest[] = [];
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
    this.queue.push(tone);
    this.queue.sort((a, b) => a.t - b.t);
    this.pump();
  }

  /** Revoke every queued tone with t > after (engine `toneCancel`). */
  cancelAfter(after: number): void {
    this.queue = this.queue.filter((q) => q.t <= after);
  }

  get pending(): number {
    return this.queue.length;
  }

  /** Schedule everything due within the look-ahead window. */
  pump(): void {
    if (!this.clock.hasAnchor) return;
    const now = this.deps.audioNow();
    while (this.queue.length > 0) {
      const tone = this.queue[0] as ToneRequest;
      const when = this.deps.perfToAudio(this.clock.simToPerfMs(tone.t));
      if (when > now + LOOKAHEAD_S) break;
      this.queue.shift();
      const late = now - when;
      if (late > MAX_LATE_S) {
        this.log.push({ id: tone.id, kind: tone.kind, simT: tone.t, when, lateS: late, dropped: true });
        continue;
      }
      const at = Math.max(when, now);
      this.deps.play(tone, at);
      this.log.push({ id: tone.id, kind: tone.kind, simT: tone.t, when: at, lateS: Math.max(0, late), dropped: false });
      if (this.log.length > 500) this.log.splice(0, this.log.length - 500);
    }
  }
}
