// Home's three live tiles (E125): Engine (ms per tick), Memory (MB used) and "CPU, this app" (% of one core). They run
// only while Home is on screen. What each one measures, exactly:
//  - Engine: the median time of one 20-ms engine tick, measured by engine-bench.worker.ts on the same engine build in a
//    background thread of this page (the monitor's own worker has no timing hook). Updated every 5 s.
//  - Memory: `performance.memory.usedJSHeapSize` of this page (Chromium only); elsewhere "—" with a tooltip. The
//    workers' heaps (the monitor's engine among them) are not in it.
//  - CPU, this app: the MAIN THREAD's busy fraction over the last 5 s, in % of one core. Busy time = the long tasks a
//    `PerformanceObserver` reports (`longtask`, every task of 50 ms or more, exact) + the frame overruns seen by
//    requestAnimationFrame (an interval longer than 1.5 frames counts its excess over one frame as busy) that no long
//    task already covers. Short tasks that delay no frame are not seen, and the monitor's engine and drawing run in
//    their own worker thread, so this is the instructor page's own load, not the whole browser's.
export const CPU_WINDOW_MS = 5000;

export interface Span {
  start: number;
  dur: number;
}

/** The busy fraction (0–1) of the main thread over [now − windowMs, now] (method above). `frames` are rAF timestamps. */
export function busyFraction(longTasks: readonly Span[], frames: readonly number[], now: number, windowMs = CPU_WINDOW_MS): number {
  const from = now - windowMs;
  const overlap = (a0: number, a1: number, b0: number, b1: number) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
  let busy = 0;
  for (const t of longTasks) busy += overlap(t.start, t.start + t.dur, from, now);
  const ts = frames.filter((t) => t >= from - 1000 && t <= now);
  const gaps = ts.slice(1).map((t, i) => t - (ts[i] as number));
  const frame = median(gaps) ?? 1000 / 60;
  for (let i = 1; i < ts.length; i++) {
    const a = ts[i - 1] as number;
    const b = ts[i] as number;
    if (b - a <= 1.5 * frame || b < from) continue;
    if (longTasks.some((t) => overlap(t.start, t.start + t.dur, a, b) > 0)) continue;
    busy += overlap(a + frame, b, from, now);
  }
  return Math.min(1, busy / windowMs);
}

export function median(xs: readonly number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((p, q) => p - q);
  const m = s.length >> 1;
  return s.length % 2 ? (s[m] as number) : ((s[m - 1] as number) + (s[m] as number)) / 2;
}

export interface MeterValues {
  engineMs: number | null;
  memoryMb: number | null;
  cpuPct: number | null;
}

/** The three tiles' sources; `start()` on entering Home, `stop()` on leaving it. */
export class Meters {
  values: MeterValues = { engineMs: null, memoryMb: null, cpuPct: null };
  private bench: Worker | null = null;
  private benchMs: number[] = [];
  private longTasks: Span[] = [];
  private frames: number[] = [];
  private obs: PerformanceObserver | null = null;
  private raf = 0;
  private timers: Array<ReturnType<typeof setInterval>> = [];
  private readonly fns = new Set<(v: MeterValues) => void>();
  private longTaskSupported = false;

  onChange(fn: (v: MeterValues) => void): () => void {
    this.fns.add(fn);
    return () => void this.fns.delete(fn);
  }

  start(): void {
    if (this.timers.length) return;
    try {
      this.bench = new Worker(new URL('./engine-bench.worker.ts', import.meta.url), { type: 'module', name: 'pme-engine-bench' });
      this.bench.onmessage = (e: MessageEvent<{ ms: number[] }>) => {
        this.benchMs = [...this.benchMs, ...e.data.ms].slice(-100);
        this.values.engineMs = median(this.benchMs);
        this.emit();
      };
      this.bench.onerror = () => this.stopBench();
      this.bench.postMessage({ samples: 30 });
    } catch {
      this.bench = null; // no workers here: the tile says "—"
    }
    try {
      this.obs = new PerformanceObserver((l) => {
        for (const e of l.getEntries()) this.longTasks.push({ start: e.startTime, dur: e.duration });
      });
      this.obs.observe({ type: 'longtask', buffered: true });
      this.longTaskSupported = true;
    } catch {
      this.obs = null; // WebKit has no long-task timing: frame overruns alone
    }
    const frame = (t: number) => {
      this.frames.push(t);
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
    const t0 = performance.now();
    this.timers.push(setInterval(() => this.bench?.postMessage({ samples: 20 }), 5000));
    this.timers.push(setInterval(() => {
      const now = performance.now();
      this.frames = this.frames.filter((t) => t >= now - CPU_WINDOW_MS - 1000);
      this.longTasks = this.longTasks.filter((t) => t.start + t.dur >= now - CPU_WINDOW_MS);
      // The first value once a whole window has been watched (a shorter one would read the page's own opening)
      this.values.cpuPct = now - t0 >= CPU_WINDOW_MS && !document.hidden ? 100 * busyFraction(this.longTasks, this.frames, now) : this.values.cpuPct;
      this.values.memoryMb = memoryMb();
      this.emit();
    }, 1000));
    this.values.memoryMb = memoryMb();
    this.emit();
  }

  stop(): void {
    for (const t of this.timers) clearInterval(t);
    this.timers = [];
    cancelAnimationFrame(this.raf);
    this.obs?.disconnect();
    this.obs = null;
    this.frames = [];
    this.longTasks = [];
    this.stopBench();
  }

  /** How the CPU tile measures here (its tooltip). */
  cpuMethod(): string {
    return `The main thread's busy share over the last 5 s: ${this.longTaskSupported ? 'long tasks plus frame overruns' : 'frame overruns (this browser reports no long tasks)'}. The monitor's engine and drawing run in their own thread and are not counted.`;
  }

  private stopBench(): void {
    this.bench?.terminate();
    this.bench = null;
  }

  private emit(): void {
    for (const fn of this.fns) fn(this.values);
  }
}

/** This page's JS heap in MB, or null where the browser does not say (only Chromium has `performance.memory`). */
export function memoryMb(): number | null {
  const m = (performance as Performance & { memory?: { usedJSHeapSize?: number } }).memory;
  return typeof m?.usedJSHeapSize === 'number' ? m.usedJSHeapSize / 1048576 : null;
}
