// Engine + sweep lanes + static chrome, driven by frame timestamps. Runs inside the worker (OffscreenCanvas)
// or on the main thread (fallback) unchanged (brief §3.4). The clock is sim time from an accumulator
// (engine-core Clock), and lanes draw at clock.renderT, so sweep speed is independent of frame rate.
import { Clock, createEngine, type Command, type DispatchResult, type EngineEvent, type LeadId, type MonitorEngine } from '@pme/engine-core';
import { DEFAULT_PX_PER_MM } from './calibration.ts';
import type { Ctx2D } from './ctx.ts';
import type { ClockAnchor, CoreOptions, Size } from './protocol.ts';
import { SweepLane } from './sweep-lane.ts';
import { autoRange, scaleFor, WAVE_STYLE, type WaveLaneId } from './wave-lanes.ts'; // Stage 2

export const THEME = { background: '#000', ecg: '#00ff66', label: '#00ff66', grid: '#222' } as const; // hard-coded dark theme (Stage 1)
export const LABEL_W = 56; // CSS px reserved at the left of each lane for chrome
const LEAD_LABEL: Record<LeadId, string> = {
  ecgI: 'I', ecgII: 'II', ecgIII: 'III', aVR: 'aVR', aVL: 'aVL', aVF: 'aVF', V1: 'V1', V2: 'V2', V3: 'V3', V4: 'V4', V5: 'V5', V6: 'V6',
};
const EVENT_POST_MS = 250; // post the clock anchor at least this often even without events

export interface CanvasTarget {
  width: number;
  height: number;
}

export class MonitorCore {
  readonly engine: MonitorEngine;
  readonly clock = new Clock();
  private lanes: SweepLane[] = [];
  private leads: LeadId[];
  private waves: WaveLaneId[]; // Stage 2
  private waveLive: boolean[] = []; // Stage 2: the channel had samples on the last frame
  private rangeT: number[] = []; // Stage 2/3: sim time of each auto-scaled lane's last rescale (pleth, resp)
  private readonly plethScratch = new Float32Array(1250); // Stage 2 (10 s at 125 Hz)
  private size: Size;
  private pxPerMm: number;
  private fps: 60 | 30;
  private filterLetter = 'M';
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
    this.leads = [...(opts.lanes ?? ['ecgII', 'V5'])];
    this.waves = [...(opts.waves ?? [])]; // Stage 2
    this.pxPerMm = opts.pxPerMm ?? DEFAULT_PX_PER_MM;
    this.fps = opts.fps ?? 60;
    this.size = size;
    this.leads.forEach((lead, lane) =>
      this.engine.dispatch({ id: `init-lead-${lane}`, issuedBy: 'renderer', type: 'device', action: { device: 'ecg', action: 'lead', value: lead, lane } }),
    );
    this.engine.on((e) => this.batch.push(e));
    this.layout();
  }

  /** Apply a command (lane/filter changes also update the chrome). */
  command(cmd: Command): DispatchResult {
    const r = this.engine.dispatch(cmd);
    if (r.accepted && cmd.type === 'device' && cmd.action.device === 'ecg') {
      // Only what changed is redrawn: a filter change touches the chrome, a lead change one lane (review L3).
      if (cmd.action.action === 'filter') {
        this.filterLetter = cmd.action.value === 'diagnostic' ? 'D' : 'M';
        this.drawChrome(this.leads.map((_, i) => i));
      } else if (cmd.action.action === 'lead' && typeof cmd.action.lane === 'number' && cmd.action.lane < this.leads.length) { // Stage 2: leads, not lanes (wave lanes follow)
        const lane = cmd.action.lane;
        this.leads[lane] = cmd.action.value as LeadId;
        this.lanes[lane]?.reset(this.ctx);
        this.drawChrome([lane]);
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
      this.lanes.forEach((lane, i) => {
        if (i >= this.leads.length) return; // Stage 2: wave lanes are drawn by drawWaves
        const ch = this.leads[i] as LeadId;
        lane.draw(this.ctx, t, (from, out) => this.engine.readSamples(ch, from, out));
      });
      this.drawWaves(t); // Stage 2
    }
    if (this.batch.length > 0 || epochMs - this.lastPost >= EVENT_POST_MS) {
      this.post({ simT: t, epochMs, timeScale: this.clock.timeScale }, this.batch);
      this.batch = [];
      this.lastPost = epochMs;
    }
  }

  /** Stage 2: pressure and pleth lanes (125 Hz), auto-scaled pleth, cleared when a sensor goes to 'none'. */
  private drawWaves(t: number): void {
    this.waves.forEach((w, j) => {
      const lane = this.lanes[this.leads.length + j] as SweepLane;
      const live = this.engine.latestSampleIndex(w) >= 0;
      if (!live) {
        if (this.waveLive[j]) lane.reset(this.ctx);
        this.waveLive[j] = false;
        return;
      }
      this.waveLive[j] = true;
      const st = WAVE_STYLE[w];
      if (st.range === null && t - (this.rangeT[j] ?? -1) >= 1) {
        // Stage 3: every auto-scaled lane (pleth over 4 s, resp over 10 s: two or three breaths)
        this.rangeT[j] = t;
        const rate = st.rate ?? 125;
        const n = this.engine.readSamples(w, Math.floor((t - (w === 'resp' ? 10 : 4)) * rate), this.plethScratch.subarray(0, Math.round((w === 'resp' ? 10 : 4) * rate)));
        const [lo, hi] = autoRange(this.plethScratch, n);
        Object.assign(lane.cfg, scaleFor(lo, hi, lane.cfg.height, this.pxPerMm));
      }
      lane.draw(this.ctx, t, (from, out) => this.engine.readSamples(w, from, out));
    });
  }

  private layout(): void {
    const { cssW, cssH, dpr } = this.size;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.fillStyle = THEME.background;
    this.ctx.fillRect(0, 0, cssW, cssH);
    const h = cssH / (this.leads.length + this.waves.length); // Stage 2: wave lanes share the height
    this.lanes = this.leads.map((_, i) => {
      const lane = new SweepLane(
        {
          x: LABEL_W, y: i * h, width: cssW - LABEL_W, height: h, baseline: 0.6, rate: 500, mmPerS: 25,
          pxPerMm: this.pxPerMm, gainMmPerMv: 10, color: THEME.ecg, background: THEME.background, lineWidth: 1.75, eraseGapPx: 16,
        },
        dpr,
      );
      lane.reset(this.ctx, dpr);
      return lane;
    });
    // Stage 2: waveform lanes below the ECG lanes
    this.waves.forEach((w, j) => {
      const st = WAVE_STYLE[w];
      const [lo, hi] = st.range ?? [-0.5, 3];
      const lane = new SweepLane(
        {
          x: LABEL_W, y: (this.leads.length + j) * h, width: cssW - LABEL_W, height: h, rate: st.rate ?? 125, mmPerS: st.mmPerS ?? 25, // Stage 3
          pxPerMm: this.pxPerMm, ...scaleFor(lo, hi, h, this.pxPerMm), color: st.color, background: THEME.background,
          lineWidth: 1.75, eraseGapPx: 16,
        },
        dpr,
      );
      lane.reset(this.ctx, dpr);
      this.lanes.push(lane);
    });
    this.waveLive = this.waves.map(() => false);
    this.rangeT = this.waves.map(() => -1);
    this.drawChrome(this.leads.map((_, i) => i));
    this.drawWaveChrome(h); // Stage 2
  }

  /** Stage 2: label and scale of each waveform lane (static chrome, brief §3.5). */
  private drawWaveChrome(h: number): void {
    const ctx = this.ctx;
    ctx.font = '14px system-ui, sans-serif';
    ctx.textBaseline = 'top';
    this.waves.forEach((w, j) => {
      const st = WAVE_STYLE[w];
      const y0 = (this.leads.length + j) * h;
      ctx.fillStyle = st.color;
      ctx.fillText(st.label, 6, y0 + 6);
      if (st.range) {
        ctx.fillText(String(st.range[1]), 6, y0 + 24);
        ctx.fillText(String(st.range[0]), 6, y0 + h - 18);
      }
    });
  }

  /** Static chrome (brief §3.5): lead label, filter letter, 1 mV calibration bar, for the given lanes. */
  private drawChrome(lanes: number[]): void {
    const ctx = this.ctx;
    const h = this.size.cssH / (this.leads.length + this.waves.length); // Stage 2
    for (const i of lanes) {
      ctx.fillStyle = THEME.background;
      ctx.fillRect(0, i * h, LABEL_W, h);
    }
    ctx.fillStyle = THEME.label;
    ctx.strokeStyle = THEME.label;
    ctx.font = '14px system-ui, sans-serif';
    ctx.textBaseline = 'top';
    lanes.forEach((i) => {
      const lead = this.leads[i] as LeadId;
      const y0 = i * h;
      ctx.fillText(`${LEAD_LABEL[lead]}  ${this.filterLetter}`, 6, y0 + 6);
      const base = y0 + 0.6 * h;
      const mv = 10 * this.pxPerMm; // 1 mV at 10 mm/mV
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(14, base);
      ctx.lineTo(24, base);
      ctx.lineTo(24, base - mv);
      ctx.lineTo(36, base - mv);
      ctx.lineTo(36, base);
      ctx.lineTo(46, base);
      ctx.stroke();
    });
  }
}
