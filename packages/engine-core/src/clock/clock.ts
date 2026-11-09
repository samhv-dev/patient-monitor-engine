// Fixed-step simulation clock (brief §3.3; "Fix Your Timestep", Gaffer on Games). simT = tick × 20 ms.
// Frames credit wall time IN FULL to an accumulator, acc += wallΔ × timeScale, and the caller runs owed ticks of the
// engine's own 20 ms, one at a time, within a work budget per frame (runOwed, frameBudgetMs); what the budget leaves
// stays owed and runs on the next frames. Sim time is never thrown away and a tick is never longer than 20 ms: when the
// machine cannot keep up, the clock is BEHIND by the owed time (behindS), which the runtime reports, rather than
// running slow in silence. Until brief 105 a frame's credit was clamped to 250 ms, so every frame slower than that lost
// the rest without a word: on a busy machine (frames every ≈ 400 ms) the body ran at 0.6 of real time (defect N25).
// timeScale is limited to 0.25–8 (brief §3.3 said 0.25–4; ×8 is the owner's request for the 22 Oct demonstration: at ×8
// a 60 fps frame runs 6.7 ticks).

export const TICK_MS = 20;
export const TICK_S = TICK_MS / 1000;
/**
 * A frame may spend on owed ticks as much wall time as passed since the last frame, at least FRAME_BUDGET_MS and at
 * most FRAME_BUDGET_MAX_MS (frameBudgetMs) [ENG: control]. Spending what passed keeps real time whenever a tick costs less
 * than the 20 ms it simulates, however far apart the frames are: a fixed 50 ms let a worker whose frames came every
 * 400 ms use only 50/400 of the wall time, so it fell behind on a machine that could keep up (PR #369's first CI run:
 * 1.8 s owed after 20 s of 400-ms frames, ≈ 2.7 ms a tick). The floor, three 60 fps frames, lets catch-up outrun real
 * time at a normal frame rate (at the measured 0.07–6.6 ms a tick, 0.15–14 s of sim per frame); the ceiling keeps a frame
 * coming back to draw and post within the 250 ms the page expects between posts. At least one owed tick runs per frame
 * whatever its cost, so the clock always progresses.
 */
export const FRAME_BUDGET_MS = 50;
export const FRAME_BUDGET_MAX_MS = 250;
/** The work budget of a frame `wallDeltaMs` after the last one (FRAME_BUDGET_MS–FRAME_BUDGET_MAX_MS). */
export function frameBudgetMs(wallDeltaMs: number): number {
  return Math.min(FRAME_BUDGET_MAX_MS, Math.max(FRAME_BUDGET_MS, wallDeltaMs || 0));
}
/**
 * The runtime says it is behind real time when the owed sim time exceeds this, s [ENG: control]. Above the ≤ 1-tick
 * remainder of a normal frame and the ≈ 0.25 s a busy frame owes before the next one catches it up, so a passing slow
 * frame is not announced; well under the 1 s granularity of the clock the instructor reads, so a behind clock is said
 * before it shows as a wrong second.
 */
export const BEHIND_REPORT_S = 0.5;
export const MIN_TIME_SCALE = 0.25;
export const MAX_TIME_SCALE = 8;

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
  /** Sim seconds a renderer should draw: the last tick plus the sub-tick remainder, never the owed ticks not yet run. */
  get renderT(): number {
    return (this._tick * TICK_MS + Math.min(this._accMs, TICK_MS - 1e-6)) / 1000;
  }
  /** Accumulated sim milliseconds not yet turned into ticks (< 20 when the clock is not behind). */
  get accumulatorMs(): number {
    return this._accMs;
  }
  /** Whole ticks owed: credited wall time the engine has not yet run. */
  get owedTicks(): number {
    return Math.floor(this._accMs / TICK_MS);
  }
  /** Sim seconds the clock is behind real time (owed whole ticks); 0 when it keeps up. */
  get behindS(): number {
    return (this.owedTicks * TICK_MS) / 1000;
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

  /** Credit one frame's wall-clock delta in full (no clamp); nothing while paused. */
  credit(wallDeltaMs: number): void {
    if (this._paused || !(wallDeltaMs > 0)) return;
    this._accMs += wallDeltaMs * this._timeScale;
  }

  /** Turn up to `maxTicks` owed ticks into ticks the caller must run now. Returns how many. */
  take(maxTicks = Infinity): number {
    if (this._paused) return 0;
    const n = Math.max(0, Math.min(this.owedTicks, Math.floor(maxTicks)));
    this._accMs -= n * TICK_MS;
    this._tick += n;
    return n;
  }

  /** Credit a wall delta and take every owed tick (a hidden-tab catch-up, a test): the caller runs them all. */
  advance(wallDeltaMs: number): number {
    this.credit(wallDeltaMs);
    return this.take();
  }

  /** A pause credits nothing more; what was owed before it is kept and runs after resume (it was real time). */
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

  /** Jump to an absolute tick (used by snapshot restore). Clears the accumulator: nothing is owed on a new timeline. */
  setTick(tick: number): void {
    this._tick = Math.max(0, Math.floor(tick));
    this._accMs = 0;
  }
}

/**
 * Run the clock's owed ticks one 20-ms tick at a time (`runTo(simT)` after each), within `budgetMs` of wall time; at
 * least one when any is owed. What the budget leaves stays owed (the clock's behindS). Returns the ticks run.
 */
export function runOwed(clock: Clock, runTo: (simT: number) => void, budgetMs = FRAME_BUDGET_MS, now: () => number = () => performance.now()): number {
  const t0 = now();
  let n = 0;
  while (clock.take(1) === 1) {
    n++;
    runTo(clock.simT);
    if (now() - t0 >= budgetMs) break;
  }
  return n;
}
