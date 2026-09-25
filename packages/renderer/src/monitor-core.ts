// Engine + sweep lanes + static chrome, driven by frame timestamps. Runs inside the worker (OffscreenCanvas)
// or on the main thread (fallback) unchanged (brief §3.4). The clock is sim time from an accumulator
// (engine-core Clock), and lanes draw at clock.renderT, so sweep speed is independent of frame rate.
// Stage 4b: the layout comes from a RenderPlan (skin-plan.ts; requests RR-1..RR-4), a skin switch relayouts without
// restarting the engine, ECG lanes can auto-gain (RR-2), and event overlays (pace, sync, shock, lead-off) are drawn.
import { capture12, Clock, createEngine, type Capture12, type Command, type DispatchResult, type EngineEvent, type LeadId, type MonitorEngine } from '@pme/engine-core';
import { DEFAULT_PX_PER_MM } from './calibration.ts';
import type { Ctx2D } from './ctx.ts';
import { drawLeadOffDashes, drawMark, Overlays, shows } from './overlays.ts';
import type { ClockAnchor, CoreOptions, Size } from './protocol.ts';
import { ecgLabel, legacyPlan, type PlanLane, type RenderPlan } from './skin-plan.ts';
import { SweepLane } from './sweep-lane.ts';
import { autoRange, scaleFor } from './wave-lanes.ts'; // Stage 2

export const THEME = { background: '#000', ecg: '#00ff66', label: '#00ff66', grid: '#222' } as const; // Stage 1 look (legacyPlan)
export const LABEL_W = 56; // CSS px reserved at the left of each lane for chrome
const LABEL_CHAR_W = 8.5; // CSS px per character of the 14 px label font, generous estimate (Ctx2D has no measureText) [ENG]
const LABEL_STRIP_H = 18; // CSS px: the 14 px label row [ENG]
const LABEL_REPAINT_SLACK_PX = 24; // keep repainting the label tail a few frames after the erase bar passed [ENG]
// Stage 3: impedance auto-scale never spans less than 0.5 units (a 250 mL breath), so the cardiogenic ripple
// (0.1) stays small in apnoea instead of being gained up to a full-height trace that reads as tachypnoea.
const RESP_MIN_SPAN = 0.5;
const EVENT_POST_MS = 250; // post the clock anchor at least this often even without events
/** Auto gain (RR-2) [ENG]: every 2 s the last 4 s of the lead should fill ≤ 60 % of the lane height. */
export const AUTO_GAIN_EVERY_S = 2;
export const AUTO_GAIN_WINDOW_S = 4;
export const AUTO_GAIN_FILL = 0.6;

export interface CanvasTarget {
  width: number;
  height: number;
}

export class MonitorCore {
  readonly engine: MonitorEngine;
  readonly clock = new Clock();
  private lanes: SweepLane[] = [];
  private plan: RenderPlan;
  private waveLive: boolean[] = []; // Stage 2: the channel had samples on the last frame
  private autoRangeT: number[] = []; // Stage 2 (4b: per lane): sim time of the last auto-scale
  private readonly plethScratch = new Float32Array(1250); // Stage 2 (Stage 3: 10 s at 125 Hz)
  private readonly gainScratch = new Float32Array(AUTO_GAIN_WINDOW_S * 500);
  private autoGainT = -Infinity;
  private gainMult: number[] = []; // per lane, ECG gain multiplier (label and auto gain)
  /** ECG labels wider than LABEL_W (e.g. Saadat-like `II  X1  NORMAL`) run into the sweep area; kept to repaint them. */
  private labelTail: Array<{ text: string; w: number } | null> = [];
  private readonly overlays = new Overlays();
  private size: Size;
  private pxPerMm: number;
  private fps: 60 | 30;
  private filterMode = 'monitor';
  private lastEpoch: number | null = null;
  private parity = 0;
  private batch: EngineEvent[] = [];
  private lastPost = -Infinity;
  private visible = true;
  private readonly canvas: CanvasTarget;
  private readonly ctx: Ctx2D;
  private readonly post: (anchor: ClockAnchor, events: EngineEvent[]) => void;

  constructor(
    canvas: CanvasTarget,
    ctx: Ctx2D,
    size: Size,
    opts: CoreOptions,
    post: (anchor: ClockAnchor, events: EngineEvent[]) => void,
  ) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.post = post;
    this.engine = createEngine(opts.engine ?? {});
    this.plan = opts.plan ?? legacyPlan(opts.lanes ?? ['ecgII', 'V5'], opts.waves ?? []);
    this.pxPerMm = opts.pxPerMm ?? DEFAULT_PX_PER_MM;
    this.fps = opts.fps ?? 60;
    this.size = size;
    this.sendLeads();
    this.engine.on((e) => {
      this.batch.push(e);
      this.overlays.push(e);
    });
    this.layout();
  }

  /** The ECG lanes' leads, in order. */
  private get leads(): LeadId[] {
    return this.plan.lanes.filter((l) => l.kind === 'ecg').map((l) => l.channel as LeadId);
  }

  /** The engine computes one filtered buffer per ECG lane (≤ 3). */
  private sendLeads(): void {
    this.leads.slice(0, 3).forEach((lead, lane) =>
      this.engine.dispatch({ id: `init-lead-${lane}-${this.plan.skin}`, issuedBy: 'renderer', type: 'device', action: { device: 'ecg', action: 'lead', value: lead, lane } }),
    );
  }

  /** Stage 4b: switch skin/page/theme: new lanes and chrome, same engine (no restart, tick continuity). */
  setPlan(plan: RenderPlan): void {
    this.plan = plan;
    this.overlays.clear();
    this.sendLeads();
    this.layout();
  }

  /** Stage 4b: the 12-lead capture of the last 10 s (brief §6.6). */
  capture12(): Capture12 {
    return capture12(this.engine);
  }

  /** Apply a command (lane/filter changes also update the chrome). */
  command(cmd: Command): DispatchResult {
    const r = this.engine.dispatch(cmd);
    if (r.accepted && cmd.type === 'device' && cmd.action.device === 'ecg') {
      // Only what changed is redrawn: a filter change touches the chrome, a lead change one lane (review L3).
      const ecgLanes = this.ecgLaneIndices();
      if (cmd.action.action === 'filter') {
        this.filterMode = String(cmd.action.value);
        this.drawChrome(ecgLanes);
      } else if (cmd.action.action === 'lead' && typeof cmd.action.lane === 'number' && cmd.action.lane < ecgLanes.length) {
        const i = ecgLanes[cmd.action.lane] as number;
        (this.plan.lanes[i] as PlanLane).channel = cmd.action.value as LeadId;
        this.lanes[i]?.reset(this.ctx);
        this.drawChrome([i]);
      } else this.layout();
    }
    return r;
  }

  resize(size: Size): void {
    this.size = size;
    this.layout();
  }

  calibrate(pxPerMm: number): void {
    this.pxPerMm = pxPerMm;
    this.layout();
  }

  setFps(fps: 60 | 30): void {
    this.fps = fps;
  }

  setVisible(v: boolean): void {
    this.visible = v;
  }

  /**
   * Hidden tab (brief §3.3): advance sim time by the FULL wall delta (no 250 ms clamp), without drawing.
   * The lanes restart cleanly on the next drawn frame because the jump exceeds one lane.
   */
  catchUp(epochMs: number): void {
    const dt = this.lastEpoch === null ? 0 : Math.max(0, epochMs - this.lastEpoch);
    this.lastEpoch = epochMs;
    if (this.clock.paused || dt === 0) return;
    if (this.clock.advanceUnclamped(dt) > 0) this.engine.advanceTo(this.clock.simT); // remainder carried (review L1)
    // Post what was generated while hidden, so the batch does not grow without frames (review L2).
    this.post({ simT: this.clock.renderT, epochMs, timeScale: this.clock.timeScale }, this.batch);
    this.batch = [];
    this.lastPost = epochMs;
    this.overlays.due(this.clock.renderT); // marks from the hidden stretch are not drawn
  }

  /** One animation frame. `epochMs` = performance.timeOrigin + frame timestamp (ms). */
  frame(epochMs: number): void {
    if (this.fps === 30 && this.parity++ % 2 === 1) return; // 30 fps mode: skip every other frame
    const dt = this.lastEpoch === null ? 0 : epochMs - this.lastEpoch;
    this.lastEpoch = epochMs;
    const ticks = this.clock.advance(dt);
    if (ticks > 0) this.engine.advanceTo(this.clock.simT);
    const t = this.clock.renderT;
    if (this.visible) {
      if (t - this.autoGainT >= AUTO_GAIN_EVERY_S) this.autoGain(t);
      this.plan.lanes.forEach((pl, i) => {
        const lane = this.lanes[i] as SweepLane;
        if (pl.kind === 'wave') return this.drawWave(pl, i, t);
        const before = lane.lastDrawnIndex;
        lane.draw(this.ctx, t, (from, out) => this.engine.readSamples(pl.channel as LeadId, from, out));
        if (this.overlays.leadsOff && before >= 0) drawLeadOffDashes(this.ctx, lane, before, lane.lastDrawnIndex);
        this.repaintLabelTail(i, lane);
      });
      const marks = this.overlays.due(t);
      for (const m of marks) {
        if (!shows(this.plan, m)) continue;
        for (const i of this.ecgLaneIndices()) drawMark(this.ctx, this.lanes[i] as SweepLane, m, this.plan, this.pxPerMm);
      }
    }
    if (this.batch.length > 0 || epochMs - this.lastPost >= EVENT_POST_MS) {
      this.post({ simT: t, epochMs, timeScale: this.clock.timeScale }, this.batch);
      this.batch = [];
      this.lastPost = epochMs;
    }
  }

  private ecgLaneIndices(): number[] {
    const out: number[] = [];
    this.plan.lanes.forEach((l, i) => l.kind === 'ecg' && out.push(i));
    return out;
  }

  /** RR-2: pick the largest skin gain whose last-4-s peak-to-peak fits AUTO_GAIN_FILL of the lane. */
  private autoGain(t: number): void {
    this.autoGainT = t;
    const changed: number[] = [];
    this.plan.lanes.forEach((pl, i) => {
      if (!pl.autoGain || pl.gainOptions.length === 0 || t < AUTO_GAIN_WINDOW_S) return;
      const n = this.engine.readSamples(pl.channel as LeadId, Math.floor((t - AUTO_GAIN_WINDOW_S) * 500), this.gainScratch);
      let lo = Infinity;
      let hi = -Infinity;
      for (let k = 0; k < n; k++) {
        const v = this.gainScratch[k] as number;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      if (!(hi > lo)) return;
      const lane = this.lanes[i] as SweepLane;
      const fits = pl.gainOptions.filter((g) => (hi - lo) * g * 10 * this.pxPerMm <= AUTO_GAIN_FILL * lane.cfg.height).sort((a, b) => b - a);
      const g = fits[0] ?? Math.min(...pl.gainOptions);
      if (g !== this.gainMult[i]) {
        this.gainMult[i] = g;
        lane.cfg.gainMmPerMv = g * 10;
        changed.push(i);
      }
    });
    if (changed.length > 0) this.drawChrome(changed);
  }

  /** Stage 2 wave lanes (125 Hz; Stage 4b: any channel the plan names), auto-scaled pleth, cleared on 'none'. */
  private drawWave(pl: PlanLane, i: number, t: number): void {
    const lane = this.lanes[i] as SweepLane;
    const ch = pl.channel;
    const live = ch !== null && this.engine.latestSampleIndex(ch) >= 0;
    if (!live || ch === null) {
      if (this.waveLive[i]) lane.reset(this.ctx);
      this.waveLive[i] = false;
      return;
    }
    this.waveLive[i] = true;
    if (pl.range === null && t - (this.autoRangeT[i] ?? -1) >= 1) {
      this.autoRangeT[i] = t;
      // Stage 3: every auto-scaled lane (pleth over 4 s, resp over 10 s: two or three breaths)
      const rate = this.engine.sampleRate(ch);
      const winS = ch === 'resp' ? 10 : 4;
      const n = this.engine.readSamples(ch, Math.floor((t - winS) * rate), this.plethScratch.subarray(0, Math.round(winS * rate)));
      const [lo, hi] = autoRange(this.plethScratch, n, ch === 'resp' ? RESP_MIN_SPAN : undefined);
      Object.assign(lane.cfg, scaleFor(lo, hi, lane.cfg.height, this.pxPerMm));
    }
    lane.draw(this.ctx, t, (from, out) => this.engine.readSamples(ch, from, out));
  }

  private layout(): void {
    const { cssW, cssH, dpr } = this.size;
    const p = this.plan;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.fillStyle = p.background;
    this.ctx.fillRect(0, 0, cssW, cssH);
    const h = cssH / Math.max(1, p.lanes.length);
    this.gainMult = p.lanes.map((l) => l.gainMmPerMv / 10);
    this.labelTail = [];
    this.lanes = p.lanes.map((pl, i) => {
      const rate = pl.kind === 'ecg' ? 500 : pl.channel ? this.engine.sampleRate(pl.channel) : 125;
      const [lo, hi] = pl.range ?? [-0.5, 3];
      const lane = new SweepLane(
        {
          x: LABEL_W, y: i * h, width: cssW - LABEL_W, height: h, rate, mmPerS: pl.mmPerS, pxPerMm: this.pxPerMm, color: pl.color,
          background: p.background, lineWidth: p.lineWidth, eraseGapPx: p.eraseGapPx, grid: p.grid, cursorLine: p.cursorLine,
          ...(pl.kind === 'ecg' ? { baseline: 0.6, gainMmPerMv: pl.gainMmPerMv } : scaleFor(lo, hi, h, this.pxPerMm)),
        },
        dpr,
      );
      lane.reset(this.ctx, dpr);
      return lane;
    });
    this.waveLive = p.lanes.map(() => false);
    this.autoRangeT = p.lanes.map(() => -1);
    this.autoGainT = -Infinity;
    this.drawChrome(p.lanes.map((_, i) => i));
  }

  /**
   * Repaint the part of a long ECG label that lies in the sweep area while the erase bar passes under it (the label
   * stays on top of the trace, as on the monitor). Clipped to x ≥ LABEL_W so the chrome part is not overdrawn.
   */
  private repaintLabelTail(i: number, lane: SweepLane): void {
    const tail = this.labelTail[i];
    if (!tail || lane.lastDrawnIndex < 0) return;
    const head = (lane.xOf(lane.lastDrawnIndex) + lane.cfg.eraseGapPx) % lane.cfg.width;
    if (head > tail.w + lane.cfg.eraseGapPx + LABEL_REPAINT_SLACK_PX) return;
    const ctx = this.ctx;
    const y0 = lane.cfg.y;
    const pl = this.plan.lanes[i] as PlanLane;
    ctx.save();
    ctx.beginPath();
    ctx.rect(LABEL_W, y0 + 4, tail.w, LABEL_STRIP_H);
    ctx.clip();
    ctx.fillStyle = this.plan.background;
    ctx.fillRect(LABEL_W, y0 + 4, tail.w, LABEL_STRIP_H);
    ctx.font = `14px ${this.plan.font}`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = pl.color;
    ctx.fillText(tail.text, 6, y0 + 6);
    ctx.restore();
  }

  /** Static chrome (brief §3.5): ECG lead label + gain + filter and the 1 mV bar; wave label and scale. */
  private drawChrome(lanes: number[]): void {
    const ctx = this.ctx;
    const p = this.plan;
    const h = this.size.cssH / Math.max(1, p.lanes.length);
    for (const i of lanes) {
      ctx.fillStyle = p.background;
      ctx.fillRect(0, i * h, LABEL_W, h);
    }
    ctx.font = `14px ${p.font}`;
    ctx.textBaseline = 'top';
    for (const i of lanes) {
      const pl = p.lanes[i] as PlanLane;
      const y0 = i * h;
      ctx.fillStyle = pl.color;
      ctx.strokeStyle = pl.color;
      if (pl.kind === 'wave') {
        ctx.fillText(pl.label, 6, y0 + 6);
        if (pl.range && !p.hideScaleNumbers) {
          ctx.fillText(String(pl.range[1]), 6, y0 + 24);
          ctx.fillText(String(pl.range[0]), 6, y0 + h - 18);
        }
        continue;
      }
      const filterName = p.filterNames[this.filterMode] ?? this.filterMode.replace('band:', '');
      const text = ecgLabel(pl.label, pl.channel as LeadId, this.gainMult[i] ?? 1, p.gainLabel, filterName);
      const old = this.labelTail[i];
      if (old) {
        ctx.fillStyle = p.background; // erase the previous label's tail (it lies in the sweep area)
        ctx.fillRect(LABEL_W, y0 + 4, old.w, LABEL_STRIP_H);
        ctx.fillStyle = pl.color;
      }
      const w = 6 + text.length * LABEL_CHAR_W - LABEL_W;
      this.labelTail[i] = w > 0 ? { text, w } : null;
      ctx.fillText(text, 6, y0 + 6);
      const base = y0 + 0.6 * h;
      const mv = Math.min(0.5 * h, (this.gainMult[i] ?? 1) * 10 * this.pxPerMm); // 1 mV at the lane gain
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(14, base);
      ctx.lineTo(24, base);
      ctx.lineTo(24, base - mv);
      ctx.lineTo(36, base - mv);
      ctx.lineTo(36, base);
      ctx.lineTo(46, base);
      ctx.stroke();
    }
  }
}
