// mountMonitor (brief §7.6): ECG lanes + HR tile + QRS beep; pressure/pleth lanes and tiles. `skin` takes any
// resolveSkin id (skin or preset) with an optional theme and page; the lanes, tiles, alarm header, alarm sound and
// device tones follow the skin, `setSkin` switches without restarting the engine, and the handle exposes the 12-lead
// capture, the trends and the event log. Without `skin` the legacy look stays.
import {
  AlarmSounder, beepMsAt, createTonePlayer, getAlarmProfile, playBeep, ToneScheduler, unlockAudio, type AudioOut, type ToneHandle, type ToneLogEntry, type ToneRequest,
} from '@pme/audio';
import { EventLog, MAX_TIME_SCALE, MIN_TIME_SCALE, TrendStore, type AlarmEntry, type Capture12, type Command, type DispatchResult, type EngineEvent, type EngineOptions, type LeadId, type Measured, type PatientSnapshot } from '@pme/engine-core';
import { resolveSkin, type ResolvedSkin } from '@pme/skins';
import { AlarmAudioBridge } from './alarm-audio.ts';
import { DeviceUI, gridOf } from './device-ui.ts';
import { NumericTile } from './numerics-dom.ts';
import { formatNibp, formatPressure, PressureTile } from './numerics-hemo.ts';
import { filterModeFor, renderPlan, type LaneOverride } from './skin-plan.ts';
import { WAVE_STYLE, type WaveLaneId } from './wave-lanes.ts';
import { formatEtco2, formatRr, formatSpo2, formatTemp } from './numerics-resp.ts';
import { simClock } from './overlays.ts';
import type { ClockAnchor, Size } from './protocol.ts';
import { createHost, type Host, type RenderPath } from './worker-host.ts';

export interface MountOptions {
  engine?: EngineOptions;
  /** Any resolveSkin id ('saadat-like', 'iran-icu-as-found', 'philips-like', …). Omitted: the legacy look. */
  skin?: string;
  /** 'projector-light' | 'ecg-grid'. */
  theme?: string;
  /** A page of the skin ('P1', 'P10' = PUMP on saadat-like). */
  page?: string;
  layout?: string;
  worker?: 'auto' | 'off';
  lanes?: LeadId[];
  /** Waveform lanes below the ECG lanes (their tiles appear with them). */
  waves?: WaveLaneId[];
  /** Show the NIBP tile. */
  nibp?: boolean;
  /** Show the temperature tile (T1/T2). */
  temp?: boolean;
  fps?: 60 | 30;
  pxPerMm?: number;
  /** The part this monitor plays in a session (brief §7.5). Default 'host'. */
  role?: MonitorRole;
  /**
   * Who manages this window's alarm SOUND. 'engine' (default): the device's Silence. 'window': this window alone
   * (`silenceAudio()`); the instructor's Silence does not quiet it — the learner monitor on a second screen. The alarm
   * conditions and the visual alarm state are the engine's either way.
   */
  audioSilence?: 'engine' | 'window';
  /**
   * The waveforms over the whole width and the skin's tiles in a grid under them, instead of tile columns beside the
   * waveforms (a learner's phone held upright). Needs `skin`.
   */
  portrait?: boolean;
  /** The bed line of a two-row header (skin `layout.headerStyle`); default "BED 01" (rc.3, E96). */
  bed?: string;
}

/** A monitor either owns the simulation ('host') or mirrors one from its snapshot and commands ('viewer'). */
export type MonitorRole = 'host' | 'viewer';

/**
 * The synchronous clock a ViewerSync steers every frame for the second-screen learner monitor (structurally the
 * controller's ViewerTarget). Only a 'viewer' monitor mounted with worker 'off' has one (its calls must be immediate).
 */
export interface ViewerClock {
  restore(s: PatientSnapshot): void;
  dispatch(cmd: Command): DispatchResult;
  on(fn: (e: EngineEvent) => void, types?: EngineEvent['type'][]): () => void;
  renderT(): number;
  tick(): number;
  setRate(k: number): void;
  /** The session's nominal speed (the host's), which the beat-tone gate reads instead of the steered rate. */
  setNominalRate(k: number): void;
  setPaused(p: boolean): void;
  jumpTo(simT: number): void;
}

export interface MonitorHandle {
  dispatch(cmd: Command): Promise<DispatchResult>;
  on(fn: (e: EngineEvent) => void): () => void;
  calibrate(pxPerMm: number): void;
  /** Must be called from a user gesture (brief §3.6). */
  enableSound(): Promise<void>;
  /** Sound off again — this window's output goes silent at once (the audio clock keeps running, so a later
   *  enableSound() resumes in step); the alarms and the device state are untouched. Idempotent. */
  disableSound(): void;
  /** Whether this window is sounding (unlocked and not turned off). */
  readonly soundOn: boolean;
  setTimeScale(k: number): void;
  pause(): void;
  resume(): void;
  setFps(fps: 60 | 30): void;
  destroy(): void;
  /** Which render path is running (worker rAF, worker with main-thread frame pump, or main thread). */
  readonly renderPath: Promise<RenderPath>;
  /** Scheduled/dropped tones, for diagnostics (beep − R alignment; alarm pulses and device tones too). */
  readonly audioLog: readonly ToneLogEntry[];
  /** Worker proxy (brief §7.6 `engine`). */
  readonly engine: { dispatch(cmd: Command): Promise<DispatchResult> };
  /** MountOptions.role (R-1). */
  readonly role: MonitorRole;
  /** Engine snapshot, from the worker or the main thread (R-1): a late joiner or a bookmark starts from it. */
  snapshot(): Promise<PatientSnapshot>;
  /** Restore an engine snapshot and move the sim clock to its tick (R-1). */
  restore(s: PatientSnapshot): Promise<void>;
  /** Switch skin, theme or page without restarting the engine (brief §3.8). Needs a skin at mount. */
  setSkin(id: string, opts?: { theme?: string; page?: string }): Promise<void>;
  /** The resolved skin in use (null without `skin`). */
  readonly skin: ResolvedSkin | null;
  /** 12 leads × the last 10 s, diagnostic filter (brief §6.6). */
  capture12(): Promise<Capture12>;
  /** 1 Hz numerics for 8 h (brief §6.7). */
  readonly trends: TrendStore;
  /** Commands, alarms, shocks, NIBP results (brief §6.7), CSV/JSON export. */
  readonly eventLog: EventLog;
  /** The clock ViewerSync steers; needs role 'viewer' and worker 'off' (its calls are synchronous). */
  viewerClock(): Promise<ViewerClock>;
  /**
   * Run `ticks` sim ticks now without drawing them; their events arrive as usual (trends, tiles, alarms, the event log)
   * (fast-forward). Sound is off from the first step to the `last`: no tone is scheduled and the alarm voice stops; after
   * the last step the alarms still active sound again. Resolves after the step's events were delivered.
   */
  advance(ticks: number, last: boolean): Promise<{ tick: number; simT: number }>;
  /**
   * Show alarms that came and went inside a fast-forward in the alarm area as silent latched entries ("… · during
   * fast-forward mm:ss") until the next acknowledge (Silence or Acknowledge), as a monitor's alarm history keeps them. A
   * later call replaces the list; a rewind drops entries after the restored time.
   */
  latchAlarms(alarms: readonly AlarmEntry[]): void;
  /**
   * A short line in the free centre of the skin's two-row header ("SIMULATION · not a clinical monitor" on a monitor
   * surface), in the header's font and size; with `portrait`, in the message area while no message shows. '' removes
   * it. Returns whether the header shows it (false: a one-row header on a wide screen, or no skin); kept across a skin
   * switch.
   */
  setHeaderNote(text: string): boolean;
  /** With `audioSilence: 'window'`, this window's own alarm-sound Silence (pressed again: ends it). Returns
   *  whether this window is now silenced; false before sound is enabled. */
  silenceAudio(): boolean;
}

const TILE_W = 190;
const SOUNDER_PUMP_MS = 100; // alarm bursts are enqueued ≥ 1 s ahead, so 100 ms is plenty [ENG]
/** Above this speed the beat tones (QRS beep, pulse tone) are off — at ×8 a heart rate of
 *  80 beeps 10.7 times a second; alarms and device tones still sound [ENG]. */
export const BEAT_TONE_MAX_SCALE = 4;
/** Whether a tone of this kind plays at this speed. A follower passes the session's `nominal` speed: its own clock is
 *  steered up to ±10 % around it, and a gate on the steered rate dropped about half the beats at ×4. */
export const beatToneAt = (kind: string, timeScale: number, nominal?: number): boolean => (kind !== 'qrs' && kind !== 'pulse') || (nominal ?? timeScale) <= BEAT_TONE_MAX_SCALE;
/** The two-tone cue at the end of a fast-forward (none at its start), Hz [ENG]. */
const FF_CUE_HZ = [660, 990] as const;

export function mountMonitor(el: HTMLElement, opts: MountOptions = {}): MonitorHandle {
  // Showcase hotfix item 4: a skin's layout.whenAttached follows the CO2 line (saadat-like: the CO2 waveform takes the
  // RESP lane, the CO2 tile the RR tile). The state starts as the engine's (resp pipeline: 'on' or 'warmup' = attached)
  // and follows every accepted attachSensor co2; skins without the rule resolve identically either way.
  const sensorState = opts.engine?.patient?.sensors?.co2;
  let co2 = sensorState === 'on' || sensorState === 'warmup';
  let theme = opts.theme;
  const resolveFor = (id: string): ResolvedSkin => resolveSkin(id, { ...(theme ? { theme } : {}), sensors: { co2 } });
  let r: ResolvedSkin | null = opts.skin ? resolveFor(opts.skin) : null;
  let page = opts.page;
  /** ECG lead per ECG lane chosen since the skin was set, kept when a sensor swaps a lane (a new skin starts afresh). */
  const leads = new Map<number, LeadId>();
  const doc = el.ownerDocument;
  const outer = doc.createElement('div');
  outer.style.cssText = 'display:flex;flex-direction:column;width:100%;height:100%;overflow:hidden;';
  const root = doc.createElement('div');
  root.style.cssText = `display:flex;flex:1;min-height:0;width:100%;background:${r?.render.background ?? '#000'};overflow:hidden;${opts.portrait ? 'flex-direction:column;' : ''}`;
  const wrap = doc.createElement('div');
  wrap.style.cssText = 'flex:1;position:relative;min-width:0;min-height:0;';
  // The wave column: box-less (display:contents) for the tile columns; with a skin's layout.grid (rc.3) it holds the
  // header over the waves at the skin's width, and the bottom strip runs under it and the tiles (place())
  const left = doc.createElement('div');
  left.append(wrap);
  const canvas = doc.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  wrap.append(canvas);
  const tiles = doc.createElement('div');
  tiles.style.cssText = `width:${TILE_W}px;flex:none;border-left:1px solid #222;overflow-y:auto;`; // Scroll
  const ui = r ? new DeviceUI(doc, wrap, r, page, opts.portrait, opts.bed) : null; // Device layer; portrait
  root.append(left, ui ? ui.tiles : tiles);
  outer.append(root);
  if (ui) outer.append(ui.strip);
  el.append(outer);
  // The monitor height the grid's sizes scale with (--pme-h: layout.grid's fonts and the two-row header's rows). Set only
  // with a grid: without one (other skins, portrait, the rollback by data) the monitor draws exactly as before (R-G 3)
  let grid = false;
  const setH = () => {
    if (grid) outer.style.setProperty('--pme-h', `${outer.clientHeight}px`);
    else outer.style.removeProperty('--pme-h');
  };
  /** The header, the wave column and the strip for the current skin (at mount and after every DeviceUI.setSkin). */
  const place = () => {
    const g = ui && r ? gridOf(r, opts.portrait === true) : null;
    grid = g !== null;
    setH();
    if (!ui || !r) {
      left.style.cssText = 'display:contents';
      return;
    }
    if (g) {
      left.style.cssText = `display:flex;flex-direction:column;flex:0 0 ${r.skin.layout.waveAreaFraction * 100}%;min-width:0;min-height:0;`;
      left.prepend(ui.header);
    } else {
      left.style.cssText = 'display:contents';
      outer.prepend(ui.header);
    }
  };
  place();
  const legacy = !ui;
  const hrTile = legacy ? new NumericTile(tiles, { label: 'HR', unit: 'bpm', color: '#00ff66' }) : null;
  // Pressure/pleth tiles (brief §6.1, §6.3)
  const waves = legacy ? (opts.waves ?? []) : [];
  const abpTile = waves.includes('abp') ? new PressureTile(tiles, 'ABP', 'mmHg', WAVE_STYLE.abp.color) : null;
  const papTile = waves.includes('pap') ? new PressureTile(tiles, 'PAP', 'mmHg', WAVE_STYLE.pap.color) : null;
  const cvpTile = waves.includes('cvp') ? new PressureTile(tiles, 'CVP', 'mmHg', WAVE_STYLE.cvp.color) : null;
  const prTile = waves.includes('pleth') ? new PressureTile(tiles, 'PR', 'bpm', WAVE_STYLE.pleth.color) : null;
  const piTile = waves.includes('pleth') ? new PressureTile(tiles, 'PI', '%', WAVE_STYLE.pleth.color) : null;
  const nibpTile = legacy && opts.nibp ? new PressureTile(tiles, 'NBP', 'mmHg', '#ff7ad9') : null;
  // SpO2/CO2/RR/TEMP tiles (brief §6.1, §6.8); with a skin, DeviceUI draws the skin's SpO2/CO2/RR/TEMP tiles instead
  const spo2Tile = waves.includes('pleth') ? new PressureTile(tiles, 'SpO2', '%', WAVE_STYLE.pleth.color) : null;
  const co2Tile = waves.includes('co2') ? new PressureTile(tiles, 'EtCO2', 'mmHg', WAVE_STYLE.co2.color) : null;
  const rrTile = waves.includes('resp') ? new PressureTile(tiles, 'RR', 'rpm', WAVE_STYLE.resp.color) : null;
  const tempTile = legacy && opts.temp ? new PressureTile(tiles, 'TEMP', '°C', '#e0e0e0') : null;
  let lastPi: Measured | undefined;
  let nibpLast: { sys: number; dia: number; map: number; at: number } | null = null;
  const single = (m: { value: number | null; flag: string } | undefined, digits = 0) =>
    m && m.value !== null && m.flag !== 'invalid' ? m.value.toFixed(digits) : '---';

  const trends = new TrendStore();
  const eventLog = new EventLog();
  const listeners = new Set<(e: EngineEvent) => void>();
  let destroyed = false; // A late audio unlock after destroy() closes its context instead of attaching
  let scheduler: ToneScheduler | null = null;
  let audio: AudioOut | null = null;
  let soundP: Promise<void> | null = null;
  let muted = false; // Sound turned off again
  let sounder: AlarmSounder | null = null;
  let bridge: AlarmAudioBridge | null = null;
  let lastStatus: Extract<EngineEvent, { type: 'alarmStatus' }> | null = null;
  let ff = false; // A fast-forward is running — no tone is scheduled, the alarm voice is gone until it ends
  let ffLatched: AlarmEntry[] = []; // Alarms of a fast-forward shown latched until the next acknowledge
  const withLatched = (e: EngineEvent): EngineEvent => (e.type === 'alarmStatus' && ffLatched.length ? { ...e, active: [...e.active, ...ffLatched] } : e);
  let play: ((tone: ToneRequest, when: number) => ToneHandle | void) | null = null; // Follows the skin
  const playerFor = (out: AudioOut, sk: ResolvedSkin | null) =>
    sk
      ? createTonePlayer(out.ctx, out.master, { profile: getAlarmProfile(sk.audio.alarm.profile), toneSet: sk.skin.defib?.toneSet ?? 'zoll-like' }) // RR-6
      : (tone: ToneRequest, when: number) => playBeep(out.ctx, out.master, when, tone.freqHz ?? 880, 0.25, tone.durMs);
  let anchor: { simT: number; perfMs: number; timeScale: number } = { simT: 0, perfMs: performance.now(), timeScale: 1 };
  let nominalRate: number | undefined; // a viewer's session speed (set by ViewerSync); a host gates on its own rate
  let lastBeatT: number | null = null; // sim time of the last beat tone: the beat interval that caps the beep's length
  const simNow = () => anchor.simT + ((performance.now() - anchor.perfMs) / 1000) * anchor.timeScale;
  const onEvents = (a: ClockAnchor, events: EngineEvent[]) => {
    anchor = { simT: a.simT, perfMs: a.epochMs - performance.timeOrigin, timeScale: a.timeScale };
    scheduler?.clock.setAnchor({ simT: a.simT, perfMs: anchor.perfMs, timeScale: a.timeScale });
    for (const e of events) {
      trends.record(e);
      eventLog.event(e);
      ui?.onEvent(withLatched(e)); // The device shows the fast-forward's latched alarms; the sound never hears them
      if (e.type === 'alarmStatus') {
        lastStatus = e;
        bridge?.onStatus(e);
      }
      if (hrTile && e.type === 'measurement' && e.values.hr) hrTile.update(e.values.hr);
      if (legacy && e.type === 'measurement') {
        // Pressure/pleth tiles
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
        // SpO2/CO2/RR/TEMP tiles
        if (v.pi) lastPi = v.pi;
        if (spo2Tile && v.spo2) {
          const f = formatSpo2(v.spo2, lastPi);
          spo2Tile.set(f.main, f.sub, f.status);
        }
        if (co2Tile && (v.etco2 || v.awrr)) {
          const f = formatEtco2(v.etco2, v.imco2, v.awrr);
          co2Tile.set(f.main, f.sub, f.status);
        }
        if (rrTile && v.rr) {
          const f = formatRr(v.rr);
          rrTile.set(f.main, '', f.status);
        }
        if (tempTile && v.tempCore) {
          const f = formatTemp(v.tempCore, v.tempSite);
          tempTile.set(f.main, f.sub);
        }
        if (nibpTile && v.nibpSys && v.nibpSys.value !== null) {
          nibpLast = { sys: v.nibpSys.value, dia: v.nibpDia?.value ?? 0, map: v.nibpMean?.value ?? 0, at: e.t };
          const n = formatNibp(undefined, nibpLast);
          nibpTile.set(n.main, n.sub, n.status);
        }
        // A failed cuff cycle's blanked numerics clear the last result (the tile then reads "---/---")
        else if (nibpTile && v.nibpSys?.flag === 'invalid') nibpLast = null;
      }
      if (e.type === 'nibp' && nibpTile) {
        const n = formatNibp(e, nibpLast);
        nibpTile.set(n.main, n.sub, n.status);
      }
      const beat = e.type === 'tone' && (e.kind === 'qrs' || e.kind === 'pulse');
      const rr = beat && lastBeatT !== null ? e.t - lastBeatT : 0; // ≤ 0 after a rewind or a re-posted tone: no cap
      if (beat) lastBeatT = e.t;
      if (e.type === 'tone' && !ff && beatToneAt(e.kind, a.timeScale, nominalRate) && (e.kind !== 'qrs' || !r || r.audio.beep.enabled)) {
        scheduler?.enqueue({
          t: e.t, id: e.id, kind: e.kind,
          ...(rr > 0 ? { durMs: beepMsAt(60 / rr, nominalRate ?? a.timeScale) } : {}), // the same speed as the gate
          ...(e.freqHz !== undefined ? { freqHz: e.freqHz } : {}),
          ...(e.refT !== undefined ? { refT: e.refT } : {}),
          ...(e.chargeS !== undefined ? { chargeS: e.chargeS } : {}),
        });
      }
      if (e.type === 'toneCancel') {
        lastBeatT = null; // a cancelled beat tone must not set the next beat's interval (its replacement is re-detected close by)
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
    ...(opts.waves ? { waves: opts.waves } : {}),
    ...(opts.fps ? { fps: opts.fps } : {}),
    ...(opts.pxPerMm ? { pxPerMm: opts.pxPerMm } : {}),
    ...(r ? { plan: renderPlan(r, page, only, opts.portrait === true) } : {}),
  };
  /** The lanes the canvas draws, as data for tests and embedders (the labels themselves are canvas pixels). */
  const markLanes = (lanes: ReadonlyArray<{ id: string }>) => void (canvas.dataset.lanes = lanes.map((l) => l.id).join(' '));
  if (coreOpts.plan) markLanes(coreOpts.plan.lanes);
  const hostP: Promise<Host> = createHost(canvas, sizeOf(), coreOpts, opts.worker ?? 'auto', onEvents);
  const skinCmd = (body: Record<string, unknown>) => ({ id: `skin-${Math.random().toString(36).slice(2)}`, issuedBy: 'renderer', ...body }) as Command;
  if (r) void hostP.then((h) => h.command(skinCmd({ type: 'device', action: { device: 'ecg', action: 'filter', value: filterModeFor(r!.render.ecgFilter.band) } })));

  // Resize and DPR changes (brief §3.5: backing store = CSS size × DPR; watch DPR through matchMedia).
  const ro = new ResizeObserver((entries) => {
    if (entries.some((e) => e.target === outer)) setH();
    if (entries.some((e) => e.target === wrap)) void hostP.then((h) => h.control({ type: 'resize', size: sizeOf() }));
  });
  ro.observe(wrap);
  ro.observe(outer);
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

  /** The alarm voice of the current skin (profile + the skin's cadence overrides, brief §3.8). */
  const makeSounder = () => {
    if (!scheduler || !r || ff) return; // Sound enabled during a fast-forward starts at its end
    sounder?.dispose();
    const a = r.audio.alarm;
    sounder = new AlarmSounder(scheduler, getAlarmProfile(a.profile), { overrides: { repeatS: a.repeatS, lowPulses: a.lowPulses, volume: a.volume, silence: a.silence } });
    const s = scheduler;
    bridge = new AlarmAudioBridge(sounder, () => s.clock.timeScale, { windowSilence: opts.audioSilence === 'window' });
    if (lastStatus) bridge.onStatus({ ...lastStatus, t: simNow() });
  };

  /**
   * After a restore the trends forget the discarded future, the sim clock estimate starts at the bookmark, and a skin's
   * CO2 lane follows the restored sampling line. The sampling-line state is read from the snapshot
   * (`st.resp.co2Sensor`, a string the codec keeps).
   */
  const afterRestore = (s: PatientSnapshot, h: Host) => {
    const t = s.tick * 0.02;
    trends.rewind(t);
    ui?.reset(t); // the tiles and the alarm header refill from the restored engine
    lastStatus = null;
    ffLatched = ffLatched.filter((x) => x.since <= t); // A rewind drops the latched alarms of its discarded future
    nibpLast = null;
    lastPi = undefined;
    anchor = { simT: t, perfMs: performance.now(), timeScale: anchor.timeScale };
    const line = (s.state as { st?: { resp?: { co2Sensor?: string } } } | null)?.st?.resp?.co2Sensor;
    if (line !== undefined) setCo2(line !== 'off', h);
    // UI review #14 follow-up: the cuff's last result is the restored engine's too (it is emitted only when measured,
    // so a resynced phone or a restored bookmark showed "/" until the next cycle, up to 5 min, beside a host that showed
    // it). Not after a failed cycle: the monitor had blanked it
    const nb = (s.state as { st?: { hemo?: { nibp?: { phase?: string; last?: { sys: number; dia: number; map: number; at: number } | null } } } } | null)?.st?.hemo?.nibp;
    if (nb?.last && nb.phase !== 'failed') {
      nibpLast = { sys: nb.last.sys, dia: nb.last.dia, map: nb.last.map, at: nb.last.at };
      ui?.seedNibp(nibpLast);
    }
  };
  /** The plan for the current skin, with the ECG leads chosen on this skin kept. */
  const planNow = (sk: ResolvedSkin) => {
    const p = renderPlan(sk, page, only, opts.portrait === true);
    let k = 0;
    for (const l of p.lanes) if (l.kind === 'ecg') l.channel = leads.get(k++) ?? l.channel;
    return p;
  };
  /** Showcase hotfix item 4: the CO2 line was attached or detached; re-resolve and redraw only if the skin swaps. */
  const setCo2 = (on: boolean, h: Host) => {
    if (on === co2) return;
    co2 = on;
    if (!r || !ui) return;
    const next = resolveFor(r.id);
    const same = JSON.stringify(next.render.lanes) === JSON.stringify(r.render.lanes) && JSON.stringify(next.skin.layout.tiles) === JSON.stringify(r.skin.layout.tiles);
    r = next;
    if (same) return;
    const plan = planNow(next);
    h.control({ type: 'plan', plan });
    markLanes(plan.lanes);
    ui.setSkin(next, page);
    place();
  };
  /** An accepted command's effects on this page (the log, the CO2 lane swap, the kept ECG leads), shared by a
   *  viewer's mirrored commands. */
  const accepted = (cmd: Command, h: Host) => {
    eventLog.command(cmd, anchor.simT);
    const c = cmd as { type: string; sensor?: string; state?: string; action?: { device?: string; action?: string; lane?: number; value?: unknown } };
    if (ffLatched.length && c.type === 'device' && c.action?.device === 'alarm' && (c.action.action === 'ack' || c.action.action === 'silence')) {
      ffLatched = []; // The next acknowledge clears the fast-forward's latched alarms
      if (lastStatus) ui?.onEvent(lastStatus);
    }
    if (c.type === 'attachSensor' && c.sensor === 'co2') setCo2(c.state !== 'off', h);
    if (c.type === 'device' && c.action?.device === 'ecg' && c.action.action === 'lead' && typeof c.action.lane === 'number') leads.set(c.action.lane, c.action.value as LeadId);
  };
  const dispatch = (cmd: Command) =>
    hostP.then(async (h) => {
      const res = await h.command(cmd);
      if (res.accepted) accepted(cmd, h);
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
      muted = false; // On again after disableSound()
      if (audio) audio.master.gain.value = 1;
      // Idempotent: two quick taps must not create two AudioContexts (iOS caps live contexts).
      if (destroyed) return Promise.resolve();
      soundP ??= unlockAudio(() => scheduler?.clear()).then((out) => {
        if (destroyed) return out.close(); // The monitor went away while the unlock was pending
        audio = out;
        out.master.gain.value = muted ? 0 : 1; // Turned off while the unlock was pending
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
    disableSound() {
      muted = true; // The master gain, not the context: a suspended context would stall the tone clock
      if (audio) audio.master.gain.value = 0;
    },
    get soundOn() {
      return !!audio && !muted;
    },
    setTimeScale: (k) => void hostP.then((h) => h.control({ type: 'timeScale', k })),
    pause: () => void hostP.then((h) => h.control({ type: 'pause' })),
    resume: () => void hostP.then((h) => h.control({ type: 'resume' })),
    setFps: (fps) => void hostP.then((h) => h.control({ type: 'fps', fps })),
    destroy() {
      destroyed = true;
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
    silenceAudio: () => (opts.audioSilence === 'window' && bridge && r ? bridge.silenceWindow(simNow(), r.skin.alarms.silence) : false),
    snapshot: () => hostP.then((h) => h.snapshot()),
    restore: (s) =>
      hostP.then(async (h) => {
        await h.restore(s);
        afterRestore(s, h);
      }),
    async setSkin(id, o = {}) {
      if (!ui || !r) throw new Error('setSkin needs a skin at mount (MountOptions.skin)');
      theme = o.theme;
      const next = resolveFor(id);
      const h = await hostP;
      if (next.id !== r.id) await h.command(skinCmd({ type: 'device', action: { device: 'monitor', action: 'skin', value: id } }));
      await h.command(skinCmd({ type: 'device', action: { device: 'ecg', action: 'filter', value: filterModeFor(next.render.ecgFilter.band) } }));
      const soundChanged = next.audio.alarm.profile !== r.audio.alarm.profile || next.skin.defib?.toneSet !== r.skin.defib?.toneSet;
      r = next;
      page = o.page;
      leads.clear();
      const plan = renderPlan(next, page, only, opts.portrait === true);
      h.control({ type: 'plan', plan });
      markLanes(plan.lanes);
      ui.setSkin(next, page);
      place();
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
    advance: (ticks, last) =>
      hostP.then(async (h) => {
        if (!ff) {
          ff = true; // Silence now — queued and sounding tones stop, the alarm voice goes (no bursts are pumped)
          sounder?.dispose();
          sounder = null;
          bridge = null;
          scheduler?.clear();
        }
        try {
          return await h.advance(ticks, last);
        } finally {
          if (last) {
            ff = false;
            makeSounder(); // the alarms active NOW sound again (makeSounder replays the last alarm status)
            // the owner's cue: one short two-tone at the END only (the Sound toggle's gain applies)
            if (audio) FF_CUE_HZ.forEach((hz, i) => playBeep((audio as AudioOut).ctx, (audio as AudioOut).master, (audio as AudioOut).ctx.currentTime + 0.05 + 0.18 * i, hz));
          }
        }
      }),
    setHeaderNote: (text) => ui?.setNote(text) ?? false,
    latchAlarms(alarms) {
      ffLatched = alarms.map(({ numeric: _n, ...x }) => ({ ...x, id: `ff:${x.id}`, text: `${x.text} · during fast-forward ${simClock(x.since)}`, latched: true, acked: false, sounding: false }));
      if (lastStatus) ui?.onEvent(withLatched(lastStatus));
    },
    trends,
    eventLog,
    viewerClock: () =>
      hostP.then((h) => {
        const core = h.core;
        if (opts.role !== 'viewer' || !core) throw new Error("viewerClock needs a monitor mounted with role 'viewer' and worker 'off'");
        const clock: ViewerClock = {
          restore: (s) => {
            core.restore(s);
            afterRestore(s, h);
          },
          dispatch: (cmd) => {
            const r = core.command(cmd);
            if (r.accepted) accepted(cmd, h);
            return r;
          },
          on: (fn, types) => core.engine.on(fn, types),
          renderT: () => core.clock.renderT,
          tick: () => core.engine.now().tick,
          setRate: (k) => void (core.clock.timeScale = Math.min(MAX_TIME_SCALE, Math.max(MIN_TIME_SCALE, k))), // ×8
          setNominalRate: (k) => void (nominalRate = k),
          setPaused: (p) => (p ? core.clock.pause() : core.clock.resume()),
          jumpTo: (simT) => {
            core.clock.setTick(Math.floor(simT * 50 + 1e-6));
            core.engine.advanceTo(core.clock.simT);
          },
        };
        return clock;
      }),
  };
}
