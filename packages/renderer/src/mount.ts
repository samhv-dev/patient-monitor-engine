// mountMonitor (brief §7.6). Stage 1: ECG lanes + HR tile + QRS beep; Stage 2: pressure/pleth lanes and tiles.
// Stage 4b: `skin` takes any resolveSkin id (skin or preset) with an optional theme and page; the lanes, tiles,
// alarm header, alarm sound and device tones follow the skin, `setSkin` switches without restarting the engine,
// and the handle exposes the 12-lead capture, the trends and the event log. Without `skin` the Stage 1/2 look stays.
import {
  AlarmSounder, createTonePlayer, getAlarmProfile, playBeep, ToneScheduler, unlockAudio, type AudioOut, type ToneHandle, type ToneLogEntry, type ToneRequest,
} from '@pme/audio';
import { EventLog, TrendStore, type Capture12, type Command, type DispatchResult, type EngineEvent, type EngineOptions, type LeadId, type PatientSnapshot } from '@pme/engine-core';
import { resolveSkin, type ResolvedSkin } from '@pme/skins';
import { AlarmAudioBridge } from './alarm-audio.ts';
import { DeviceUI } from './device-ui.ts';
import { NumericTile } from './numerics-dom.ts';
import { formatNibp, formatPressure, PressureTile } from './numerics-hemo.ts'; // Stage 2
import { filterModeFor, renderPlan, type LaneOverride } from './skin-plan.ts'; // Stage 4b
import { WAVE_STYLE, type WaveLaneId } from './wave-lanes.ts'; // Stage 2
import type { ClockAnchor, Size } from './protocol.ts';
import { createHost, type Host, type RenderPath } from './worker-host.ts';

export interface MountOptions {
  engine?: EngineOptions;
  /** Stage 4b: any resolveSkin id ('saadat-like', 'iran-icu-as-found', 'philips-like', …). Omitted: the Stage 1/2 look. */
  skin?: string;
  /** Stage 4b: 'projector-light' | 'ecg-grid'. */
  theme?: string;
  /** Stage 4b: a page of the skin ('P1', 'P10' = PUMP on saadat-like). */
  page?: string;
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
  /** Scheduled/dropped tones, for diagnostics (beep − R alignment; Stage 4b: alarm pulses and device tones too). */
  readonly audioLog: readonly ToneLogEntry[];
  /** Worker proxy (brief §7.6 `engine`). */
  readonly engine: { dispatch(cmd: Command): Promise<DispatchResult> };
  /** MountOptions.role (R-1). */
  readonly role: MonitorRole;
  /** Engine snapshot, from the worker or the main thread (R-1): a late joiner or a bookmark starts from it. */
  snapshot(): Promise<PatientSnapshot>;
  /** Restore an engine snapshot and move the sim clock to its tick (R-1). */
  restore(s: PatientSnapshot): Promise<void>;
  /** Stage 4b: switch skin, theme or page without restarting the engine (brief §3.8). Needs a skin at mount. */
  setSkin(id: string, opts?: { theme?: string; page?: string }): Promise<void>;
  /** Stage 4b: the resolved skin in use (null without `skin`). */
  readonly skin: ResolvedSkin | null;
  /** Stage 4b: 12 leads × the last 10 s, diagnostic filter (brief §6.6). */
  capture12(): Promise<Capture12>;
  /** Stage 4b: 1 Hz numerics for 8 h (brief §6.7). */
  readonly trends: TrendStore;
  /** Stage 4b: commands, alarms, shocks, NIBP results (brief §6.7), CSV/JSON export. */
  readonly eventLog: EventLog;
}

const TILE_W = 190;
const SOUNDER_PUMP_MS = 100; // alarm bursts are enqueued ≥ 1 s ahead, so 100 ms is plenty [ENG]

export function mountMonitor(el: HTMLElement, opts: MountOptions = {}): MonitorHandle {
  let r: ResolvedSkin | null = opts.skin ? resolveSkin(opts.skin, opts.theme ? { theme: opts.theme } : {}) : null;
  let page = opts.page;
  const doc = el.ownerDocument;
  const outer = doc.createElement('div');
  outer.style.cssText = 'display:flex;flex-direction:column;width:100%;height:100%;overflow:hidden;';
  const root = doc.createElement('div');
  root.style.cssText = `display:flex;flex:1;min-height:0;width:100%;background:${r?.render.background ?? '#000'};overflow:hidden;`;
  const wrap = doc.createElement('div');
  wrap.style.cssText = 'flex:1;position:relative;min-width:0;';
  const canvas = doc.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  wrap.append(canvas);
  const tiles = doc.createElement('div');
  tiles.style.cssText = `width:${TILE_W}px;flex:none;border-left:1px solid #222;overflow-y:auto;`; // Stage 2: scroll
  const ui = r ? new DeviceUI(doc, wrap, r, page) : null; // Stage 4b
  root.append(wrap, ui ? ui.tiles : tiles);
  if (ui) outer.append(ui.header);
  outer.append(root);
  el.append(outer);
  const legacy = !ui;
  const hrTile = legacy ? new NumericTile(tiles, { label: 'HR', unit: 'bpm', color: '#00ff66' }) : null;
  // Stage 2 tiles (brief §6.1, §6.3)
  const waves = legacy ? (opts.waves ?? []) : [];
  const abpTile = waves.includes('abp') ? new PressureTile(tiles, 'ABP', 'mmHg', WAVE_STYLE.abp.color) : null;
  const papTile = waves.includes('pap') ? new PressureTile(tiles, 'PAP', 'mmHg', WAVE_STYLE.pap.color) : null;
  const cvpTile = waves.includes('cvp') ? new PressureTile(tiles, 'CVP', 'mmHg', WAVE_STYLE.cvp.color) : null;
  const prTile = waves.includes('pleth') ? new PressureTile(tiles, 'PR', 'bpm', WAVE_STYLE.pleth.color) : null;
  const piTile = waves.includes('pleth') ? new PressureTile(tiles, 'PI', '%', WAVE_STYLE.pleth.color) : null;
  const nibpTile = legacy && opts.nibp ? new PressureTile(tiles, 'NBP', 'mmHg', '#ff7ad9') : null;
  let nibpLast: { sys: number; dia: number; map: number; at: number } | null = null;
  const single = (m: { value: number | null; flag: string } | undefined, digits = 0) =>
    m && m.value !== null && m.flag !== 'invalid' ? m.value.toFixed(digits) : '---';

  const trends = new TrendStore(); // Stage 4b
  const eventLog = new EventLog(); // Stage 4b
  const listeners = new Set<(e: EngineEvent) => void>();
  let scheduler: ToneScheduler | null = null;
  let audio: AudioOut | null = null;
  let soundP: Promise<void> | null = null;
  let sounder: AlarmSounder | null = null; // Stage 4b
  let bridge: AlarmAudioBridge | null = null; // Stage 4b
  let lastStatus: Extract<EngineEvent, { type: 'alarmStatus' }> | null = null;
  let play: ((tone: ToneRequest, when: number) => ToneHandle | void) | null = null; // Stage 4b: follows the skin
  const playerFor = (out: AudioOut, sk: ResolvedSkin | null) =>
    sk
      ? createTonePlayer(out.ctx, out.master, { profile: getAlarmProfile(sk.audio.alarm.profile), toneSet: sk.skin.defib?.toneSet ?? 'zoll-like' }) // RR-6
      : (tone: ToneRequest, when: number) => playBeep(out.ctx, out.master, when, tone.freqHz ?? 880);
  let anchor: { simT: number; perfMs: number; timeScale: number } = { simT: 0, perfMs: performance.now(), timeScale: 1 };
  const simNow = () => anchor.simT + ((performance.now() - anchor.perfMs) / 1000) * anchor.timeScale;
  const onEvents = (a: ClockAnchor, events: EngineEvent[]) => {
    anchor = { simT: a.simT, perfMs: a.epochMs - performance.timeOrigin, timeScale: a.timeScale };
    scheduler?.clock.setAnchor({ simT: a.simT, perfMs: anchor.perfMs, timeScale: a.timeScale });
    for (const e of events) {
      trends.record(e);
      eventLog.event(e);
      ui?.onEvent(e);
      if (e.type === 'alarmStatus') {
        lastStatus = e;
        bridge?.onStatus(e);
      }
      if (hrTile && e.type === 'measurement' && e.values.hr) hrTile.update(e.values.hr);
      if (legacy && e.type === 'measurement') {
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
      if (e.type === 'tone' && (e.kind !== 'qrs' || !r || r.audio.beep.enabled)) {
        scheduler?.enqueue({
          t: e.t, id: e.id, kind: e.kind,
          ...(e.freqHz !== undefined ? { freqHz: e.freqHz } : {}),
          ...(e.refT !== undefined ? { refT: e.refT } : {}),
          ...(e.chargeS !== undefined ? { chargeS: e.chargeS } : {}), // Stage 4b (E-4a-3)
        });
      }
      if (e.type === 'toneCancel') {
        if (e.ids) scheduler?.cancel(e.ids);
        else scheduler?.cancelAfter(e.after);
      }
      for (const fn of listeners) fn(e);
    }
    ui?.paint(a.simT);
    sounder?.pump(a.simT);
  };

  const sizeOf = (): Size => ({
    cssW: Math.max(200, wrap.clientWidth),
    cssH: Math.max(100, wrap.clientHeight),
    dpr: globalThis.devicePixelRatio || 1,
  });
  const only: LaneOverride | undefined = opts.lanes || opts.waves ? { ...(opts.lanes ? { lanes: opts.lanes } : {}), waves: opts.waves ?? [] } : undefined;
  const engineOpts: EngineOptions | undefined = r ? { ...(opts.engine ?? {}), device: { ...(opts.engine?.device ?? {}), skin: opts.skin as string } } : opts.engine;
  const coreOpts = {
    ...(engineOpts ? { engine: engineOpts } : {}),
    ...(opts.lanes ? { lanes: opts.lanes } : {}),
    ...(opts.waves ? { waves: opts.waves } : {}), // Stage 2
    ...(opts.fps ? { fps: opts.fps } : {}),
    ...(opts.pxPerMm ? { pxPerMm: opts.pxPerMm } : {}),
    ...(r ? { plan: renderPlan(r, page, only) } : {}), // Stage 4b
  };
  const hostP: Promise<Host> = createHost(canvas, sizeOf(), coreOpts, opts.worker ?? 'auto', onEvents);
  const skinCmd = (body: Record<string, unknown>) => ({ id: `skin-${Math.random().toString(36).slice(2)}`, issuedBy: 'renderer', ...body }) as Command;
  if (r) void hostP.then((h) => h.command(skinCmd({ type: 'device', action: { device: 'ecg', action: 'filter', value: filterModeFor(r!.render.ecgFilter.band) } })));

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
  const pumpTimer = setInterval(() => sounder?.pump(simNow()), SOUNDER_PUMP_MS);

  /** Stage 4b: the alarm voice of the current skin (profile + the skin's cadence overrides, brief §3.8). */
  const makeSounder = () => {
    if (!scheduler || !r) return;
    sounder?.dispose();
    const a = r.audio.alarm;
    sounder = new AlarmSounder(scheduler, getAlarmProfile(a.profile), { overrides: { repeatS: a.repeatS, lowPulses: a.lowPulses, volume: a.volume, silence: a.silence } });
    const s = scheduler;
    bridge = new AlarmAudioBridge(sounder, () => s.clock.timeScale);
    if (lastStatus) bridge.onStatus({ ...lastStatus, t: simNow() });
  };

  const dispatch = (cmd: Command) =>
    hostP.then(async (h) => {
      const res = await h.command(cmd);
      if (res.accepted) eventLog.command(cmd, anchor.simT); // Stage 4b
      return res;
    });
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
        play = playerFor(out, r);
        scheduler = new ToneScheduler({
          audioNow: () => out.ctx.currentTime,
          perfToAudio: out.perfToAudio,
          outputLatency: out.outputLatency,
          play: (tone, when) => play?.(tone, when),
        });
        scheduler.clock.setAnchor({ simT: anchor.simT, perfMs: anchor.perfMs, timeScale: anchor.timeScale });
        scheduler.start();
        makeSounder();
      });
      return soundP;
    },
    setTimeScale: (k) => void hostP.then((h) => h.control({ type: 'timeScale', k })),
    pause: () => void hostP.then((h) => h.control({ type: 'pause' })),
    resume: () => void hostP.then((h) => h.control({ type: 'resume' })),
    setFps: (fps) => void hostP.then((h) => h.control({ type: 'fps', fps })),
    destroy() {
      ro.disconnect();
      clearInterval(pumpTimer);
      mq?.removeEventListener('change', onDpr);
      sounder?.dispose();
      scheduler?.stop();
      audio?.close();
      ui?.destroy();
      void hostP.then((h) => h.destroy());
      outer.remove();
    },
    renderPath: hostP.then((h) => h.path),
    get audioLog() {
      return scheduler?.log ?? [];
    },
    engine: { dispatch },
    role: opts.role ?? 'host',
    snapshot: () => hostP.then((h) => h.snapshot()),
    restore: (s) => hostP.then((h) => h.restore(s)),
    async setSkin(id, o = {}) {
      if (!ui || !r) throw new Error('setSkin needs a skin at mount (MountOptions.skin)');
      const next = resolveSkin(id, o.theme ? { theme: o.theme } : {});
      const h = await hostP;
      if (next.id !== r.id) await h.command(skinCmd({ type: 'device', action: { device: 'monitor', action: 'skin', value: id } }));
      await h.command(skinCmd({ type: 'device', action: { device: 'ecg', action: 'filter', value: filterModeFor(next.render.ecgFilter.band) } }));
      const soundChanged = next.audio.alarm.profile !== r.audio.alarm.profile || next.skin.defib?.toneSet !== r.skin.defib?.toneSet;
      r = next;
      page = o.page;
      h.control({ type: 'plan', plan: renderPlan(next, page, only) });
      ui.setSkin(next, page);
      root.style.background = next.render.background;
      if (soundChanged && audio) {
        play = playerFor(audio, next);
        makeSounder();
      }
    },
    get skin() {
      return r;
    },
    capture12: () => hostP.then((h) => h.capture12()),
    trends,
    eventLog,
  };
}
