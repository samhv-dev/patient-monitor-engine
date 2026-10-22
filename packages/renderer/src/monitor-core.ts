// Engine + sweep lanes + static chrome, driven by frame timestamps. Runs inside the worker (OffscreenCanvas)
// or on the main thread (fallback) unchanged (brief §3.4). The clock is sim time from an accumulator
// (engine-core Clock), and lanes draw at clock.renderT, so sweep speed is independent of frame rate.
// The layout comes from a RenderPlan (skin-plan.ts), a skin switch relayouts without restarting the engine, ECG
// lanes can auto-gain, and event overlays (pace, sync, shock, lead-off) are drawn.
import { capture12, Clock, createEngine, type Capture12, type ChannelId, type Command, type DispatchResult, type EngineEvent, type LeadId, type MonitorEngine, type PatientSnapshot } from '@pme/engine-core';
import { DEFAULT_PX_PER_MM } from './calibration.ts';
import type { Ctx2D } from './ctx.ts';
import { drawLeadOffDashes, drawMark, Overlays, shows } from './overlays.ts';
import type { ClockAnchor, CoreOptions, Size } from './protocol.ts';
import { ecgLabel, formatSpeed, legacyPlan, type PlanLane, type RenderPlan } from './skin-plan.ts';
import { SweepLane } from './sweep-lane.ts';
import { autoRange, scaleFor } from './wave-lanes.ts';

export const THEME = { background: '#000', ecg: '#00ff66', label: '#00ff66', grid: '#222' } as const; // legacy look (legacyPlan)
export const LABEL_W = 56; // CSS px reserved at the left of each lane for chrome
const LABEL_CHAR_W = 8.5; // CSS px per character of the 14 px label font, generous estimate (Ctx2D has no measureText) [ENG]
/** A width per character that holds capitals and "m" ("NORMAL" ≈ 60 px, "50mmHg" ≈ 57 px at 14 px): lane-text boxes are clipped. */
const WIDE_CHAR_W = 10.5;
const LABEL_STRIP_H = 18; // CSS px: the 14 px label row [ENG]
/** F28: the row a 14 px scale value occupies. A phone in portrait gives the Saadat-like lanes ≈ 30–41 px, where the
 *  middle IBP value lands on the top one; it is left out below ≈ 66 px (landscape lanes are ≥ 77 px) [ENG]. */
const SCALE_ROW_H = 14;
/** Display smoothing of a capnogram (skin `co2.displaySmoothMs`, owner correction M2): a window whose range is under
 *  1.5 mmHg (the cardiogenic ripple, ≈ 1 mmHg peak to peak) is averaged in full; one over 3 mmHg (an upstroke, a curare
 *  cleft of 3–15 mmHg) is drawn as it is [ENG]. */
const SMOOTH_GATE_MMHG = [1.5, 3] as const;
/** The middle IBP scale value is indented and sits just above its dotted line (IMG_8113; the mock-up's "80"/"70"). */
const MID_LABEL_X = 20;
function midLabelY(pl: PlanLane, y0: number, h: number): number {
  const [lo, hi] = pl.range as [number, number];
  return y0 + ((hi - (pl.scaleMid as number)) / (hi - lo)) * h - 13;
}
const LABEL_REPAINT_SLACK_PX = 24; // keep repainting the label tail a few frames after the erase bar passed [ENG]
// Impedance auto-scale never spans less than 0.5 units (a 250 mL breath), so the cardiogenic ripple (0.1) stays small
// in apnoea instead of being gained up to a full-height trace that reads as tachypnoea.
const RESP_MIN_SPAN = 0.5;
const EVENT_POST_MS = 250; // post the clock anchor at least this often even without events
/** FX-15: a frame gap longer than this is a stall (a suspended tab or worker), not a slow frame — frames post every
 *  ≤ 250 ms. It is credited in full like a hidden stretch (catchUp) instead of being clamped to 250 ms, so the hidden
 *  minutes are not lost when the worker's rAF wakes before the page's visibility catch-up. [ENG] */
export const STALL_MS = 1000;
/** Auto gain (RR-2) [ENG]: every 2 s the last 4 s of the lead should fill ≤ 60 % of the lane height. */
export const AUTO_GAIN_EVERY_S = 2;
export const AUTO_GAIN_WINDOW_S = 4;
export const AUTO_GAIN_FILL = 0.6;
/** FX-25: how far back heldFrom looks — past the lanes' 100-s backfill, inside the engine's 120-s buffer [ENG]. */
const HELD_PROBE_S = 110;

export interface CanvasTarget {
  width: number;
  height: number;
}

export class MonitorCore {
  readonly engine: MonitorEngine;
  readonly clock = new Clock();
  private lanes: SweepLane[] = [];
  private plan: RenderPlan;
  private waveLive: boolean[] = []; // The channel had samples on the last frame
  private autoRangeT: number[] = []; // sim time of the last auto-scale, per lane
  private readonly plethScratch = new Float32Array(1250); // 10 s at 125 Hz
  private readonly gainScratch = new Float32Array(AUTO_GAIN_WINDOW_S * 500);
  private heldScratch = new Float32Array(0); // heldFrom's read, sized on first use
  private autoGainT = -Infinity;
  /** FX-24: sim time of the oldest sample the engine holds — 0 for a new engine, the snapshot's time after a restore (it
   *  clears the buffers). The lanes' backfill and the auto-gain never read before it. */
  private historyT = 0;
  private gainMult: number[] = []; // per lane, ECG gain multiplier (label and auto gain)
  /** ECG labels wider than LABEL_W (e.g. Saadat-like `II  X1  NORMAL`) run into the sweep area; kept to repaint them. */
  private labelTail: Array<{ text: string; w: number } | null> = [];
  /** The lane generation the right-hand texts were last painted on (a cleared lane gets them back at once). */
  private rightGen: number[] = [];
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
  /** A fast-forward is holding the clock — the pause state to return to (null: none running). */
  private ffWasPaused: boolean | null = null;
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

  /** Switch skin/page/theme: new lanes and chrome, same engine (no restart, tick continuity). */
  setPlan(plan: RenderPlan): void {
    this.plan = plan;
    this.gainMult = []; // the new plan's own gains
    this.overlays.clear();
    this.sendLeads();
    this.layout();
  }

  /** The 12-lead capture of the last 10 s (brief §6.6). */
  capture12(): Capture12 {
    return capture12(this.engine);
  }

  /**
   * Restore the engine and start the sweep afresh at the snapshot's tick. Every lane forgets what it drew (a SweepLane
   * draws only forward, so after a rewind it waited for the old high-water time), the overlay marks of the discarded
   * future go, and the lanes backfill from the restored engine on the next frame.
   */
  restore(s: PatientSnapshot): void {
    this.engine.restore(s);
    this.clock.setTick(s.tick);
    this.historyT = this.clock.simT;
    this.lastEpoch = null; // the clock restarts at the bookmark on the next frame: the restore's own wall time is not sim time
    this.overlays.clear();
    this.layout(); // FX-24: the lanes keep their ECG gain (the auto-gain waits for a full window of the new signal)
  }

  /** Apply a command (lane/filter changes also update the chrome). */
  command(cmd: Command): DispatchResult {
    const r = this.engine.dispatch(cmd);
    if (r.accepted && cmd.type === 'device' && cmd.action.device === 'ecg') {
      // Only what changed is redrawn: a filter change touches the chrome, a lead change one lane.
      const ecgLanes = this.ecgLaneIndices();
      if (cmd.action.action === 'filter') {
        this.filterMode = String(cmd.action.value);
        this.drawChrome(ecgLanes);
      } else if (cmd.action.action === 'lead' && typeof cmd.action.lane === 'number' && cmd.action.lane < ecgLanes.length) {
        const i = ecgLanes[cmd.action.lane] as number;
        (this.plan.lanes[i] as PlanLane).channel = cmd.action.value as LeadId;
        this.lanes[i]?.reset(this.ctx);
        this.drawChrome(this.plan.laneText ? ecgLanes : [i]); // with lane text a repeated lead is unlabelled: all may change
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
    if (this.clock.paused || dt === 0 || this.ffWasPaused !== null) return;
    if (this.clock.advanceUnclamped(dt) > 0) this.engine.advanceTo(this.clock.simT); // Remainder carried
    // Post what was generated while hidden, so the batch does not grow without frames.
    this.post({ simT: this.clock.renderT, epochMs, timeScale: this.clock.timeScale }, this.batch);
    this.batch = [];
    this.lastPost = epochMs;
    this.overlays.due(this.clock.renderT); // marks from the hidden stretch are not drawn
  }

  /**
   * Run `ticks` ticks now, without drawing, and post their events (fast-forward). The clock is held from the first step to
   * the `last` one (a frame neither advances nor draws meanwhile); `last` gives it back in the pause state it had before.
   * The lanes restart on the next drawn frame (the jump exceeds a lane) from the engine's buffers, with no mark at the jump:
   * they look like a monitor that simply ran on.
   */
  advance(ticks: number, last: boolean): { tick: number; simT: number } {
    if (this.ffWasPaused === null) {
      this.ffWasPaused = this.clock.paused;
      this.clock.pause();
    }
    if (this.clock.step(ticks) > 0) this.engine.advanceTo(this.clock.simT);
    this.overlays.due(this.clock.renderT); // marks from the skipped span are not drawn
    if (last) {
      if (!this.ffWasPaused) this.clock.resume();
      this.ffWasPaused = null;
      this.lastEpoch = null; // the next frame counts from itself, not from the fast-forward's start
    }
    const epochMs = performance.timeOrigin + performance.now();
    this.post({ simT: this.clock.renderT, epochMs, timeScale: this.clock.timeScale }, this.batch);
    this.batch = [];
    this.lastPost = epochMs;
    return { tick: this.clock.tick, simT: this.clock.simT };
  }

  /** One animation frame. `epochMs` = performance.timeOrigin + frame timestamp (ms). */
  frame(epochMs: number): void {
    if (this.ffWasPaused !== null) return; // A fast-forward runs the clock; nothing is drawn until it ends
    if (this.lastEpoch !== null && epochMs - this.lastEpoch > STALL_MS) this.catchUp(epochMs); // A stall: no clamp
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
        if (pl.kind === 'wave') {
          this.drawWave(pl, i, t);
          this.repaintLabelTail(i, lane); // "50mmHg" (lane text) runs past the chrome, as a long ECG label does
          return this.repaintRightTexts(i, lane); // review L-3: most right-hand texts are on wave lanes
        }
        const before = lane.lastDrawnIndex;
        lane.draw(this.ctx, t, (from, out) => this.engine.readSamples(pl.channel as LeadId, from, out));
        if (this.overlays.leadsOff && before >= 0) drawLeadOffDashes(this.ctx, lane, before, lane.lastDrawnIndex);
        this.repaintLabelTail(i, lane);
        this.repaintRightTexts(i, lane);
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
      if (!pl.autoGain || pl.gainOptions.length === 0 || t - AUTO_GAIN_WINDOW_S < this.historyT) return; // FX-24: a full window
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

  /** Wave lanes (125 Hz; any channel the plan names), auto-scaled pleth, cleared on 'none'. */
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
      // Every auto-scaled lane (pleth over 4 s, resp over 10 s: two or three breaths)
      const rate = this.engine.sampleRate(ch);
      const winS = ch === 'resp' ? 10 : 4;
      const n = this.engine.readSamples(ch, Math.floor((t - winS) * rate), this.plethScratch.subarray(0, Math.round(winS * rate)));
      // A new engine's first 0.4 s of pleth is flat; scaled on that, the first beat was drawn clamped to the lane's top
      // edge for a second (a rectangle after every load or restore). Until the window holds a second of signal the
      // scale is re-taken every frame.
      if (n >= rate) this.autoRangeT[i] = t;
      const [lo, hi] = autoRange(this.plethScratch, n, ch === 'resp' ? RESP_MIN_SPAN : undefined);
      Object.assign(lane.cfg, scaleFor(lo, hi, lane.cfg.height, this.pxPerMm));
    }
    lane.draw(this.ctx, t, (from, out) => this.engine.readSamples(ch, from, out), () => this.heldFrom(ch));
  }

  /**
   * FX-25: the first sample index the engine holds of `ch` within the last HELD_PROBE_S (a sensor's buffer starts at its
   * attach). The engine has no call for it, but a read that reaches the newest sample copies exactly the held ones.
   */
  private heldFrom(ch: ChannelId): number {
    const latest = this.engine.latestSampleIndex(ch);
    const k = Math.ceil(HELD_PROBE_S * this.engine.sampleRate(ch));
    if (this.heldScratch.length < k) this.heldScratch = new Float32Array(k);
    return latest + 1 - this.engine.readSamples(ch, latest + 1 - k, this.heldScratch.subarray(0, k));
  }

  private layout(): void {
    const { cssW, cssH, dpr } = this.size;
    const p = this.plan;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.fillStyle = p.background;
    this.ctx.fillRect(0, 0, cssW, cssH);
    // FX-24: the ECG gain survives a resize or a restore (the auto-gain re-judges it); a new plan starts from its own
    if (this.gainMult.length !== p.lanes.length) this.gainMult = p.lanes.map((l) => l.gainMmPerMv / 10);
    this.labelTail = [];
    this.lanes = p.lanes.map((pl, i) => {
      const rate = pl.kind === 'ecg' ? 500 : pl.channel ? this.engine.sampleRate(pl.channel) : 125;
      const [lo, hi] = pl.range ?? [-0.5, 3];
      const { y, h } = this.laneBox(i);
      const lane = new SweepLane(
        {
          x: LABEL_W, y, width: cssW - LABEL_W, height: h, rate, mmPerS: pl.mmPerS, pxPerMm: this.pxPerMm, color: pl.color, firstIndex: Math.ceil(this.historyT * rate - 1e-6),
          background: p.background, lineWidth: p.lineWidth, eraseGapPx: p.eraseGapPx, grid: p.grid, cursorLine: p.cursorLine, fill: pl.fill,
          smoothN: Math.max(1, Math.round((pl.smoothMs / 1000) * rate)), smoothGate: SMOOTH_GATE_MMHG,
          hLines: pl.scaleLines ? { values: pl.scaleLines, color: p.scaleLineColor ?? pl.color } : null,
          ...(pl.kind === 'ecg' ? { baseline: 0.6, gainMmPerMv: (this.gainMult[i] as number) * 10 } : scaleFor(lo, hi, h, this.pxPerMm)),
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
    this.rightGen = this.lanes.map((l) => l.generation);
  }

  /**
   * Lane i's top and height in CSS px: equal lanes (today's arithmetic, byte-identical) or, with the skin's lane weights
   * (layout.grid, rc.3), the cumulative share of each weight.
   */
  private laneBox(i: number): { y: number; h: number } {
    const { cssH } = this.size;
    const w = this.plan.laneWeights;
    if (!w) {
      const h = cssH / Math.max(1, this.plan.lanes.length);
      return { y: i * h, h };
    }
    const sum = w.reduce((a, b) => a + b, 0);
    const before = w.slice(0, i).reduce((a, b) => a + b, 0);
    return { y: (cssH * before) / sum, h: (cssH * (w[i] ?? 0)) / sum };
  }

  /** With lane text, an ECG lane showing the same lead as an earlier ECG lane has no label and no speed (IMG_8113). */
  private ecgUnlabelled(i: number): boolean {
    const p = this.plan;
    const pl = p.lanes[i] as PlanLane;
    return p.laneText !== null && pl.kind === 'ecg' && p.lanes.slice(0, i).some((l) => l.kind === 'ecg' && l.channel === pl.channel);
  }

  /** The right-hand texts of lane i (lane text only): its label (and a second line), then the sweep speed at the bottom. */
  private rightTexts(i: number): Array<{ text: string; color: string; y: number }> {
    const p = this.plan;
    if (!p.laneText || this.ecgUnlabelled(i)) return [];
    const pl = p.lanes[i] as PlanLane;
    const { y: y0, h } = this.laneBox(i);
    const out: Array<{ text: string; color: string; y: number }> = [];
    // F28: the speed's cleared box must not cover a row above it. On a short lane (a phone in portrait) the second
    // line goes first (below 60 px), then the speed (below 42 px); the label always stays. Landscape lanes are ≥ 77 px.
    const speedY = y0 + h - 18;
    const fits = (y: number) => y + LABEL_STRIP_H <= speedY;
    if (pl.rightLabel) {
      out.push({ text: pl.rightLabel.text, color: pl.rightLabel.color, y: y0 + 6 });
      if (pl.rightLabel.sub && fits(y0 + 6 + LABEL_STRIP_H)) out.push({ text: pl.rightLabel.sub, color: p.laneText.color, y: y0 + 6 + LABEL_STRIP_H });
    }
    if (!pl.rightLabel || fits(y0 + 6)) out.push({ text: formatSpeed(pl.mmPerS), color: p.laneText.color, y: speedY });
    return out;
  }

  /** The box a right-hand text occupies: right-aligned 6 px from the right edge, one label row high. */
  private rightBox(text: string, y: number): [number, number, number, number] {
    const w = text.length * WIDE_CHAR_W;
    return [this.size.cssW - 6 - w, y - 2, w, LABEL_STRIP_H];
  }

  /** Clear a right-hand text's box and draw the text on top (it stays over the trace, as the ECG label tail does). */
  private paintRightText(t: { text: string; color: string; y: number }): void {
    const ctx = this.ctx;
    const r = this.rightBox(t.text, t.y);
    ctx.save();
    ctx.beginPath();
    ctx.rect(...r);
    ctx.clip();
    ctx.fillStyle = this.plan.background;
    ctx.fillRect(...r);
    ctx.font = `14px ${this.plan.font}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'right';
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, this.size.cssW - 6, t.y);
    ctx.textAlign = 'start'; // the seam label and the chrome rely on it
    ctx.restore();
  }

  /**
   * Repaint the right-hand texts of lane i while the erase bar passes under them (the same window as the label tail,
   * taken modulo the lane width because these boxes sit at the right edge, where the sweep wraps), and at once after
   * the lane was cleared whole (a detached line, a jump).
   */
  private repaintRightTexts(i: number, lane: SweepLane): void {
    const ts = this.rightTexts(i);
    if (ts.length === 0) return;
    if (lane.generation !== this.rightGen[i]) {
      this.rightGen[i] = lane.generation;
      for (const t of ts) this.paintRightText(t);
      this.repaintLabelTail(i, lane, true); // the cleared lane took the label's tail ("50mmHg") with it too
      return;
    }
    if (lane.lastDrawnIndex < 0) return;
    const c = lane.cfg;
    const pen = lane.xOf(lane.lastDrawnIndex) % c.width;
    for (const t of ts) {
      const [x, , w] = this.rightBox(t.text, t.y);
      const start = x - c.x - c.eraseGapPx - LABEL_REPAINT_SLACK_PX;
      const d = (((pen - start) % c.width) + c.width) % c.width;
      if (d <= w + c.eraseGapPx + 2 * LABEL_REPAINT_SLACK_PX) this.paintRightText(t);
    }
  }

  /**
   * Repaint the part of a long ECG label that lies in the sweep area while the erase bar passes under it (the label
   * stays on top of the trace, as on the monitor). Clipped to x ≥ LABEL_W so the chrome part is not overdrawn.
   */
  private repaintLabelTail(i: number, lane: SweepLane, force = false): void {
    const tail = this.labelTail[i];
    if (!tail || (!force && lane.lastDrawnIndex < 0)) return;
    const head = (lane.xOf(lane.lastDrawnIndex) + lane.cfg.eraseGapPx) % lane.cfg.width;
    if (!force && head > tail.w + lane.cfg.eraseGapPx + LABEL_REPAINT_SLACK_PX) return;
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
    ctx.fillStyle = this.plan.laneText?.color ?? pl.color;
    ctx.fillText(tail.text, 6, y0 + 6);
    ctx.restore();
  }

  /** Static chrome (brief §3.5): ECG lead label + gain + filter and the 1 mV bar; wave label and scale. */
  private drawChrome(lanes: number[]): void {
    const ctx = this.ctx;
    const p = this.plan;
    for (const i of lanes) {
      const { y, h } = this.laneBox(i);
      ctx.fillStyle = p.background;
      ctx.fillRect(0, y, LABEL_W, h);
    }
    ctx.font = `14px ${p.font}`;
    ctx.textBaseline = 'top';
    const lt = p.laneText;
    for (const i of lanes) {
      const pl = p.lanes[i] as PlanLane;
      const { y: y0, h } = this.laneBox(i);
      const textColor = lt?.color ?? pl.color;
      ctx.fillStyle = textColor;
      ctx.strokeStyle = pl.color;
      if (pl.kind === 'wave') {
        if (!lt) ctx.fillText(pl.label, 6, y0 + 6); // with lane text the label is at the right, and the top value takes its place
        if (lt) {
          const old = this.labelTail[i];
          if (old) {
            ctx.fillStyle = p.background;
            ctx.fillRect(LABEL_W, y0 + 4, old.w, LABEL_STRIP_H);
            ctx.fillStyle = textColor;
          }
          const top = pl.range && !p.hideScaleNumbers ? `${pl.range[1]}${pl.scaleSuffix}` : '';
          const w = 6 + top.length * WIDE_CHAR_W - LABEL_W;
          this.labelTail[i] = w > 0 ? { text: top, w } : null; // the top value at the label row is repainted like a label
        }
        if (pl.range && !p.hideScaleNumbers) {
          const topY = lt ? y0 + 6 : y0 + 24;
          ctx.fillText(`${pl.range[1]}${pl.scaleSuffix}`, 6, topY);
          const midY = pl.scaleMid !== null ? midLabelY(pl, y0, h) : NaN; // NaN: no middle value
          if (midY >= topY + SCALE_ROW_H && midY + SCALE_ROW_H <= y0 + h - 18) ctx.fillText(String(pl.scaleMid), MID_LABEL_X, midY);
          ctx.fillText(String(pl.range[0]), 6, y0 + h - 18);
        }
        for (const t of this.rightTexts(i)) this.paintRightText(t);
        continue;
      }
      const filterName = p.filterNames[this.filterMode] ?? this.filterMode.replace('band:', '');
      const unlabelled = this.ecgUnlabelled(i);
      const text = unlabelled ? '' : ecgLabel(pl.label, pl.channel as LeadId, this.gainMult[i] ?? 1, p.gainLabel, filterName);
      const old = this.labelTail[i];
      if (old) {
        ctx.fillStyle = p.background; // erase the previous label's tail (it lies in the sweep area)
        ctx.fillRect(LABEL_W, y0 + 4, old.w, LABEL_STRIP_H);
        ctx.fillStyle = textColor;
      }
      const w = 6 + text.length * LABEL_CHAR_W - LABEL_W;
      this.labelTail[i] = w > 0 ? { text, w } : null;
      if (unlabelled) {
        ctx.fillStyle = p.background; // a lane that has just become unlabelled loses its speed text too
        ctx.fillRect(...this.rightBox(formatSpeed(pl.mmPerS), y0 + h - 18));
        ctx.fillStyle = textColor;
      } else {
        ctx.fillText(text, 6, y0 + 6);
        for (const t of this.rightTexts(i)) this.paintRightText(t);
      }
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
