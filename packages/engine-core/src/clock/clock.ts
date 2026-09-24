// Fixed-step simulation clock (brief §3.3; "Fix Your Timestep", Gaffer on Games).
// simT = tick × 20 ms. Frames feed wall time through an accumulator:
//   acc += min(wallΔ, 250 ms) × timeScale;  while (acc ≥ 20 ms) tick()
// The 250 ms clamp is [ENG]. timeScale is limited to 0.25–4 (brief §3.3).

export const TICK_MS = 20;
export const TICK_S = TICK_MS / 1000;
export const MAX_FRAME_MS = 250;
export const MIN_TIME_SCALE = 0.25;
export const MAX_TIME_SCALE = 4;

export class Clock {
  readonly tickMs = TICK_MS;
  private _tick = 0;
  private _accMs = 0;
  private _timeScale = 1;
  private _paused = false;

  /** Integer tick count since start. */
  get tick(): number {
    return this._tick;
  }
  /** Sim seconds at the last completed tick. */
  get simT(): number {
    return (this._tick * TICK_MS) / 1000;
  }
  /** Sim seconds including the not-yet-ticked remainder: the time a renderer should draw. */
  get renderT(): number {
    return (this._tick * TICK_MS + this._accMs) / 1000;
  }
  /** Accumulated sim milliseconds not yet turned into a tick (always < 20). */
  get accumulatorMs(): number {
    return this._accMs;
  }
  get timeScale(): number {
    return this._timeScale;
  }
  set timeScale(k: number) {
    if (!Number.isFinite(k) || k < MIN_TIME_SCALE || k > MAX_TIME_SCALE) {
      throw new RangeError(`timeScale must be in [${MIN_TIME_SCALE}, ${MAX_TIME_SCALE}], got ${k}`);
    }
    this._timeScale = k;
  }
  get paused(): boolean {
    return this._paused;
  }

  /** Feed one frame's wall-clock delta. Returns how many 20 ms ticks the caller must run now. */
  advance(wallDeltaMs: number): number {
    return this.advanceUnclamped(Math.min(wallDeltaMs, MAX_FRAME_MS));
  }

  /**
   * Like advance() but without the 250 ms clamp: for hidden-tab catch-up, which must follow the full wall time
   * (brief §3.3). The sub-tick remainder stays in the accumulator (review L1).
   */
  advanceUnclamped(wallDeltaMs: number): number {
    if (this._paused || !(wallDeltaMs > 0)) return 0;
    this._accMs += wallDeltaMs * this._timeScale;
    let n = 0;
    while (this._accMs >= TICK_MS) {
      this._accMs -= TICK_MS;
      n++;
    }
    this._tick += n;
    return n;
  }

  pause(): void {
    this._paused = true;
  }
  resume(): void {
    this._paused = false;
  }

  /** Single-step while paused. Returns the ticks to run (0 when not paused). */
  step(ticks = 1): number {
    if (!this._paused) return 0;
    const n = Math.max(0, Math.floor(ticks));
    this._tick += n;
    return n;
  }

  /** Jump to an absolute tick (used by snapshot restore). Clears the accumulator. */
  setTick(tick: number): void {
    this._tick = Math.max(0, Math.floor(tick));
    this._accMs = 0;
  }
}
