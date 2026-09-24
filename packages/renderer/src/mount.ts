// mountMonitor (brief §7.6), Stage 1 minimal: two ECG lanes + HR tile, hard-coded dark theme, QRS beep.
// Skins (setSkin), the instructor panel and transports arrive in Stages 4 and 6.
import { playBeep, ToneScheduler, unlockAudio, type AudioOut, type ToneLogEntry } from '@pme/audio';
import type { Command, DispatchResult, EngineEvent, EngineOptions, LeadId, PatientSnapshot } from '@pme/engine-core';
import { NumericTile } from './numerics-dom.ts';
import { formatNibp, formatPressure, PressureTile } from './numerics-hemo.ts'; // Stage 2
import { WAVE_STYLE, type WaveLaneId } from './wave-lanes.ts'; // Stage 2
import type { ClockAnchor, Size } from './protocol.ts';
import { createHost, type Host, type RenderPath } from './worker-host.ts';

export interface MountOptions {
  engine?: EngineOptions;
  /** Stage 1 accepts only 'philips-like' (hard-coded dark theme). */
  skin?: string;
  layout?: string;
  worker?: 'auto' | 'off';
  lanes?: LeadId[];
  /** Stage 2: waveform lanes below the ECG lanes (their tiles appear with them). */
  waves?: WaveLaneId[];
  /** Stage 2: show the NIBP tile. */
  nibp?: boolean;
  fps?: 60 | 30;
  pxPerMm?: number;
  /** The part this monitor plays in a session (brief §7.5; renderer request R-1, ruling R25). Default 'host'. */
  role?: MonitorRole;
}

/** A monitor either owns the simulation ('host') or mirrors one from its snapshot and commands ('viewer'). */
export type MonitorRole = 'host' | 'viewer';

export interface MonitorHandle {
  dispatch(cmd: Command): Promise<DispatchResult>;
  on(fn: (e: EngineEvent) => void): () => void;
  calibrate(pxPerMm: number): void;
  /** Must be called from a user gesture (brief §3.6). */
  enableSound(): Promise<void>;
  setTimeScale(k: number): void;
  pause(): void;
  resume(): void;
  setFps(fps: 60 | 30): void;
  destroy(): void;
  /** Which render path is running (worker rAF, worker with main-thread frame pump, or main thread). */
  readonly renderPath: Promise<RenderPath>;
  /** Scheduled/dropped tones, for diagnostics (beep − R alignment). */
  readonly audioLog: readonly ToneLogEntry[];
  /** Worker proxy (brief §7.6 `engine`). */
  readonly engine: { dispatch(cmd: Command): Promise<DispatchResult> };
  /** MountOptions.role (R-1). */
  readonly role: MonitorRole;
  /** Engine snapshot, from the worker or the main thread (R-1): a late joiner or a bookmark starts from it. */
  snapshot(): Promise<PatientSnapshot>;
  /** Restore an engine snapshot and move the sim clock to its tick (R-1). */
  restore(s: PatientSnapshot): Promise<void>;
}

const TILE_W = 190;

export function mountMonitor(el: HTMLElement, opts: MountOptions = {}): MonitorHandle {
  if (opts.skin && opts.skin !== 'philips-like') throw new Error(`skin ${opts.skin} arrives in Stage 4`);
  const doc = el.ownerDocument;
  const root = doc.createElement('div');
  root.style.cssText = 'display:flex;width:100%;height:100%;background:#000;overflow:hidden;';
  const wrap = doc.createElement('div');
  wrap.style.cssText = 'flex:1;position:relative;min-width:0;';
  const canvas = doc.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  wrap.append(canvas);
  const tiles = doc.createElement('div');
  tiles.style.cssText = `width:${TILE_W}px;flex:none;border-left:1px solid #222;overflow-y:auto;`; // Stage 2: scroll
  root.append(wrap, tiles);
  el.append(root);
  const hrTile = new NumericTile(tiles, { label: 'HR', unit: 'bpm', color: '#00ff66' });
  // Stage 2 tiles (brief §6.1, §6.3)
  const waves = opts.waves ?? [];
  const abpTile = waves.includes('abp') ? new PressureTile(tiles, 'ABP', 'mmHg', WAVE_STYLE.abp.color) : null;
  const papTile = waves.includes('pap') ? new PressureTile(tiles, 'PAP', 'mmHg', WAVE_STYLE.pap.color) : null;
  const cvpTile = waves.includes('cvp') ? new PressureTile(tiles, 'CVP', 'mmHg', WAVE_STYLE.cvp.color) : null;
  const prTile = waves.includes('pleth') ? new PressureTile(tiles, 'PR', 'bpm', WAVE_STYLE.pleth.color) : null;
  const piTile = waves.includes('pleth') ? new PressureTile(tiles, 'PI', '%', WAVE_STYLE.pleth.color) : null;
  const nibpTile = opts.nibp ? new PressureTile(tiles, 'NBP', 'mmHg', '#ff7ad9') : null;
  let nibpLast: { sys: number; dia: number; map: number; at: number } | null = null;
  const single = (m: { value: number | null; flag: string } | undefined, digits = 0) =>
    m && m.value !== null && m.flag !== 'invalid' ? m.value.toFixed(digits) : '---';

  const listeners = new Set<(e: EngineEvent) => void>();
  let scheduler: ToneScheduler | null = null;
  let audio: AudioOut | null = null;
  let soundP: Promise<void> | null = null;
  const onEvents = (anchor: ClockAnchor, events: EngineEvent[]) => {
    scheduler?.clock.setAnchor({ simT: anchor.simT, perfMs: anchor.epochMs - performance.timeOrigin, timeScale: anchor.timeScale });
    for (const e of events) {
      if (e.type === 'measurement' && e.values.hr) hrTile.update(e.values.hr);
      if (e.type === 'measurement') {
        // Stage 2 tiles
        const v = e.values;
        if (abpTile && v.abpSys) {
          const p = formatPressure(v.abpSys, v.abpDia, v.abpMean);
          abpTile.set(p.main, p.sub);
        }
        if (papTile && v.papSys) {
          const p = formatPressure(v.papSys, v.papDia, v.papMean);
          papTile.set(p.main, p.sub);
        }
        if (cvpTile && v.cvpMean) cvpTile.set(single(v.cvpMean), '');
        if (prTile && v.pr) prTile.set(single(v.pr), '');
        if (piTile && v.pi) piTile.set(single(v.pi, 1), '');
        if (nibpTile && v.nibpSys && v.nibpSys.value !== null) {
          nibpLast = { sys: v.nibpSys.value, dia: v.nibpDia?.value ?? 0, map: v.nibpMean?.value ?? 0, at: e.t };
          const n = formatNibp(undefined, nibpLast);
          nibpTile.set(n.main, n.sub, n.status);
        }
      }
      if (e.type === 'nibp' && nibpTile) {
        const n = formatNibp(e, nibpLast);
        nibpTile.set(n.main, n.sub, n.status);
      }
      if (e.type === 'tone') {
        scheduler?.enqueue({
          t: e.t, id: e.id, kind: e.kind,
          ...(e.freqHz !== undefined ? { freqHz: e.freqHz } : {}),
          ...(e.refT !== undefined ? { refT: e.refT } : {}),
        });
      }
      if (e.type === 'toneCancel') {
        if (e.ids) scheduler?.cancel(e.ids);
        else scheduler?.cancelAfter(e.after);
      }
      for (const fn of listeners) fn(e);
    }
  };

  const sizeOf = (): Size => ({
    cssW: Math.max(200, wrap.clientWidth),
    cssH: Math.max(100, wrap.clientHeight),
    dpr: globalThis.devicePixelRatio || 1,
  });
  const coreOpts = {
    ...(opts.engine ? { engine: opts.engine } : {}),
    ...(opts.lanes ? { lanes: opts.lanes } : {}),
    ...(opts.waves ? { waves: opts.waves } : {}), // Stage 2
    ...(opts.fps ? { fps: opts.fps } : {}),
    ...(opts.pxPerMm ? { pxPerMm: opts.pxPerMm } : {}),
  };
  const hostP: Promise<Host> = createHost(canvas, sizeOf(), coreOpts, opts.worker ?? 'auto', onEvents);

  // Resize and DPR changes (brief §3.5: backing store = CSS size × DPR; watch DPR through matchMedia).
  const ro = new ResizeObserver(() => void hostP.then((h) => h.control({ type: 'resize', size: sizeOf() })));
  ro.observe(wrap);
  let mq: MediaQueryList | null = null;
  const watchDpr = () => {
    mq?.removeEventListener('change', onDpr);
    mq = matchMedia(`(resolution: ${globalThis.devicePixelRatio || 1}dppx)`);
    mq.addEventListener('change', onDpr);
  };
  const onDpr = () => {
    void hostP.then((h) => h.control({ type: 'resize', size: sizeOf() }));
    watchDpr();
  };
  watchDpr();

  const dispatch = (cmd: Command) => hostP.then((h) => h.command(cmd));
  return {
    dispatch,
    on(fn) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    calibrate: (pxPerMm) => void hostP.then((h) => h.control({ type: 'calibrate', pxPerMm })),
    enableSound() {
      // Idempotent: two quick taps must not create two AudioContexts (iOS caps live contexts; review M7).
      soundP ??= unlockAudio(() => scheduler?.clear()).then((out) => {
        audio = out;
        scheduler = new ToneScheduler({
          audioNow: () => out.ctx.currentTime,
          perfToAudio: out.perfToAudio,
          outputLatency: out.outputLatency,
          play: (tone, when) => playBeep(out.ctx, out.master, when, tone.freqHz ?? 880),
        });
        scheduler.start();
      });
      return soundP;
    },
    setTimeScale: (k) => void hostP.then((h) => h.control({ type: 'timeScale', k })),
    pause: () => void hostP.then((h) => h.control({ type: 'pause' })),
    resume: () => void hostP.then((h) => h.control({ type: 'resume' })),
    setFps: (fps) => void hostP.then((h) => h.control({ type: 'fps', fps })),
    destroy() {
      ro.disconnect();
      mq?.removeEventListener('change', onDpr);
      scheduler?.stop();
      audio?.close();
      void hostP.then((h) => h.destroy());
      root.remove();
    },
    renderPath: hostP.then((h) => h.path),
    get audioLog() {
      return scheduler?.log ?? [];
    },
    engine: { dispatch },
    role: opts.role ?? 'host',
    snapshot: () => hostP.then((h) => h.snapshot()),
    restore: (s) => hostP.then((h) => h.restore(s)),
  };
}
