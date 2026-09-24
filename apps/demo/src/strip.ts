// Offline 10 s two-lead strips for the Stage 5 gallery: an engine is run headlessly in the page, samples are read
// from its lane buffers (monitor-filtered, as displayed) and drawn on a 25 mm/s, 10 mm/mV grid. Pace markers
// (EngineEvent 'marker' kind 'paceSpike') are drawn as vertical ticks, as a monitor does (research 03 §1.7).
import { createEngine, type Command, type EngineEvent, type LeadId, type ModifiersPatch, type RhythmId, type RhythmOpts } from '@pme/engine-core';

export interface StripSpec {
  rhythm: RhythmId;
  opts?: RhythmOpts;
  mods?: ModifiersPatch;
  leads?: [LeadId, LeadId];
  seed?: number;
  /** Seconds of sim time to run before the 10 s window starts (lets HRV/filters settle; VF evolves). */
  warmupS?: number;
  /** ECG filter mode (default monitor: 0.5–40 Hz + mains notch, which removes mains interference entirely). */
  filter?: 'monitor' | 'diagnostic';
}

export const STRIP_S = 10;
const PX_PER_S = 100; // 4 px per mm at 25 mm/s
const PX_PER_MV = 40; // 10 mm/mV
const LANE_H = 150;

export function renderStrip(canvas: HTMLCanvasElement, spec: StripSpec, label: string | null): void {
  const leads = spec.leads ?? ['ecgII', 'V1'];
  const e = createEngine({ seed: spec.seed ?? 7, patient: { rhythm: { id: spec.rhythm, ...(spec.opts ? { opts: spec.opts } : {}) } } });
  let n = 0;
  const send = (c: Record<string, unknown>) => e.dispatch({ id: `s${++n}`, issuedBy: 'strip', ...c } as Command);
  send({ type: 'device', action: { device: 'ecg', action: 'lead', value: leads[0], lane: 0 } });
  send({ type: 'device', action: { device: 'ecg', action: 'lead', value: leads[1], lane: 1 } });
  if (spec.filter) send({ type: 'device', action: { device: 'ecg', action: 'filter', value: spec.filter } });
  if (spec.mods) send({ type: 'setModifiers', modifiers: spec.mods });
  const markers: number[] = [];
  e.on((ev: EngineEvent) => {
    if (ev.type === 'marker' && ev.kind === 'paceSpike') markers.push(ev.t);
  }, ['marker']);
  const t0 = spec.warmupS ?? 4;
  e.advanceTo(t0 + STRIP_S + 0.2);
  const w = STRIP_S * PX_PER_S;
  canvas.width = w;
  canvas.height = 2 * LANE_H;
  const g = canvas.getContext('2d') as CanvasRenderingContext2D;
  g.fillStyle = '#000';
  g.fillRect(0, 0, w, 2 * LANE_H);
  g.strokeStyle = '#1d2a1d';
  g.lineWidth = 1;
  for (let x = 0; x <= w; x += 20) {
    g.beginPath();
    g.moveTo(x + 0.5, 0);
    g.lineTo(x + 0.5, 2 * LANE_H);
    g.stroke();
  }
  for (let y = 0; y <= 2 * LANE_H; y += 20) {
    g.beginPath();
    g.moveTo(0, y + 0.5);
    g.lineTo(w, y + 0.5);
    g.stroke();
  }
  const buf = new Float32Array(STRIP_S * 500);
  leads.forEach((lead, li) => {
    const got = e.readSamples(lead, Math.round(t0 * 500), buf);
    const mid = li * LANE_H + LANE_H / 2;
    g.strokeStyle = '#3f3';
    g.lineWidth = 1.5;
    g.beginPath();
    for (let i = 0; i < got; i++) {
      const x = (i / 500) * PX_PER_S;
      const y = mid - Math.max(-LANE_H / 2, Math.min(LANE_H / 2, (buf[i] as number) * PX_PER_MV));
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
    g.fillStyle = '#9c9';
    g.font = '13px system-ui, sans-serif';
    g.fillText(lead.replace('ecg', ''), 6, li * LANE_H + 16);
    g.strokeStyle = '#fff';
    for (const t of markers) {
      if (t < t0 || t > t0 + STRIP_S) continue;
      const x = Math.round((t - t0) * PX_PER_S) + 0.5;
      g.beginPath();
      g.moveTo(x, mid - 30);
      g.lineTo(x, mid - 10);
      g.stroke();
    }
  });
  if (label) {
    g.fillStyle = '#fff';
    g.font = 'bold 15px system-ui, sans-serif';
    g.fillText(label, w - 8 - g.measureText(label).width, 18);
  }
}
