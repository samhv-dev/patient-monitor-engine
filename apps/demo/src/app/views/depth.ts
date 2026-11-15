// EEG plan E12 (docs/plans/stage-eeg-depth-of-anaesthesia.md §7 E12): the depth-of-anaesthesia window, `#/depth` on a
// follower page (a phone, a tablet or a second screen that opened the picker's "Depth of anaesthesia" card, or Room
// setup's "New window"). It is a follower like the defibrillator window: it computes nothing the host did not command.
// The host switches the patient's EEG on and chooses its reader (`device eeg on`, `device eeg model <id>`, Room setup);
// the follower's own engine replays both and reads the same samples (D3: no EEG sample crosses the wire), and this
// window draws that engine's `eegReading` events and the reader's numerics (the `measurement` at the reading's time).
// While the ventilator drives the patient the follower holds (follower.ts), and so does this screen: its clock stops,
// the last reading stays.
//
// The look: one FACE per EEG device model (DEPTH_FACES, keyed by the registry's ids, l3/eeg-devices/registry.ts): the
// generic reader's plain processed-EEG screen, the BIS-type reader's (E7) and the Entropy reader's (E8), each with what
// its reader computes and nothing else. A later piece gives a named device (Narcotrend, PSI; the makers' photographs) its own
// face by adding one function here and one row in DEPTH_FACES; the window, its source and its "off" state stay.
// English only on the device's screen (the owner's rule for device faces).
import { EEG_DEVICES, type EegModelId, type EegReadingEvent, type EngineEvent, type Measured, type NumericId } from '@pme/engine-core';
import { createEegDisplay, drawEegRaw, paintDsa, pushEegDisplay } from '@pme/renderer';
import { SIM_LINE } from '../sim-line.ts';
import { h, setText } from '../ui.ts';

/** The engine's EEG sample rate (EEG plan D2: one frontal channel at 125 Hz; engine-core does not export EEG_RATE). */
export const EEG_FS_HZ = 125;
/**
 * No reading for this long (sim seconds) and the window says no device is on: the generic reader publishes every 1 s,
 * and the monitor's BFA tile goes after the same 5 missed seconds (renderer numerics-neuro.ts MODULE_TILES) [ENG: display].
 */
export const DEPTH_STALE_S = 5;

export const DEPTH_WORDS = {
  off: 'No depth-of-anaesthesia device is on',
  offSub: 'The instructor switches one on in Room setup. This screen shows it as soon as it reads.',
  noValue: '--',
  quality: { good: 'Signal good', questionable: 'Check electrodes', invalid: 'Artefact: epoch rejected' },
  /** The BIS-type face's Q8 note (EEG plan Q8 B): what the reading is and is not. */
  bisNote: 'The maker\'s algorithm is proprietary; this index uses the published components only (Connor 2022, Rampil 1998).',
  /** The Entropy face's Q8 note: the method is the maker's published description, without the parts it gives no numbers for. */
  entropyNote: 'Computed from the maker\'s published description (Viertiö-Oja 2004); its burst-suppression and artefact rules are not published, so they are not applied.',
};

/** One reading as a face draws it: the device's `eegReading` and its numerics (the measurement of the same time). */
export interface DepthReading extends EegReadingEvent {
  values: Partial<Record<NumericId, Measured>>;
}

/** A device's screen: built for one model, fed each of its readings. */
export interface DepthFace {
  readonly el: HTMLElement;
  readonly model: string;
  show(r: DepthReading): void;
}

/** What the window reads: the follower's own engine (its viewer clock). */
export interface DepthSource {
  on(fn: (e: EngineEvent) => void, types?: EngineEvent['type'][]): () => void;
  renderT(): number;
}

export interface DepthWindow {
  readonly el: HTMLElement;
  /** The last reading drawn, or null. */
  readonly last: DepthReading | null;
  /** Start reading the follower's engine (once its viewer clock exists). */
  attach(src: DepthSource): void;
  /** The host's theme: 'projector-light' is the light screen, anything else the dark one. */
  setTheme(theme: string): void;
  destroy(): void;
}

const fmt = (m: Measured | undefined, digits: number): string => (m && m.value !== null && m.flag !== 'invalid' ? m.value.toFixed(digits) : DEPTH_WORDS.noValue);

/** A canvas sized to its box in device pixels (null while it has no box, or in a DOM without canvas). */
function sized(c: HTMLCanvasElement): { ctx: CanvasRenderingContext2D; w: number; h: number; k: number } | null {
  const k = globalThis.devicePixelRatio || 1;
  const w = Math.round(c.clientWidth * k);
  const hgt = Math.round(c.clientHeight * k);
  if (w < 2 || hgt < 2) return null;
  if (c.width !== w) c.width = w;
  if (c.height !== hgt) c.height = hgt;
  const ctx = c.getContext('2d');
  return ctx ? { ctx, w, h: hgt, k } : null;
}

/** The colour a face's CSS gives a trace (`--dw-trace` on the window). */
const trace = (el: HTMLElement): string => getComputedStyle(el).getPropertyValue('--dw-trace').trim() || '#5db7ff';

/**
 * The generic processed-EEG face (EEG plan E5's "Processed EEG (generic)"): the raw EEG over the reader's window, the
 * spectrogram (density spectral array) of about the last hour, the spectral edge frequency with its trend over the same
 * hour, the median frequency, the suppression ratio, the highest electrode impedance and the signal quality from the
 * reader's two flags. The reader computes no index of its own besides SEF and no EMG value, so none is drawn.
 */
export function genericFace(model: string): DepthFace {
  const spec = (EEG_DEVICES[model as EegModelId] ?? EEG_DEVICES.generic).spec;
  const k = spec.constants as Record<string, { value: number } | undefined>;
  const disp = createEegDisplay(spec.id, EEG_FS_HZ);
  const rawUv = 100; // ±100 µV over the trace's height, as the developer page draws it [ENG: display]
  const sefTopHz = k.spectrumHiHz?.value ?? 30; // the SEF lies inside the reader's 0.5–30 Hz span
  const histS = k.dsaHistoryS?.value ?? 3600;
  const dsaHz = k.dsaMaxHz?.value ?? 50;
  const trend: Array<{ t: number; v: number }> = [];
  const canvas = (cls: string, label: string) => h('canvas', { class: cls, role: 'img', 'aria-label': label });
  const raw = canvas('depth-raw', 'Raw EEG');
  const dsa = canvas('depth-dsa', 'Spectrogram');
  const tr = canvas('depth-trend', 'SEF trend');
  const off = document.createElement('canvas'); // the spectrogram at one pixel per column, scaled onto `dsa`
  off.width = disp.colsN;
  off.height = 64;
  const tile = (id: string, label: string, unit: string, big = false) => {
    const v = h('span', { class: 'v' }, DEPTH_WORDS.noValue);
    return { v, el: h('div', { class: `depth-tile${big ? ' big' : ''}`, 'data-id': id }, h('span', { class: 'l' }, label), v, h('span', { class: 'u' }, unit)) };
  };
  const sef = tile('sef', 'SEF', 'Hz', true);
  const mf = tile('mf', 'MF', 'Hz');
  const sr = tile('eegSr', 'SR', '%');
  const imp = tile('eegImp', 'Impedance', 'kΩ');
  const q = h('span', { class: 'depth-sqi', role: 'status' }, '');
  const cap = (text: string) => h('span', { class: 'depth-cap' }, text);
  const el = h('div', { class: 'depth-face', 'data-face': 'generic' },
    h('header', { class: 'depth-head' }, h('h2', { class: 'depth-label' }, spec.label), h('span', { class: 'depth-sim', role: 'note' }, SIM_LINE), q),
    h('div', { class: 'depth-waves' },
      h('figure', { class: 'depth-lane raw' }, cap(`EEG · ${k.rawWindowS?.value ?? 8} s · ±${rawUv} µV`), raw),
      h('figure', { class: 'depth-lane dsa' }, cap(`DSA · 0–${dsaHz} Hz · ${Math.round(histS / 60)} min`), dsa),
      h('figure', { class: 'depth-lane trend' }, cap(`SEF trend · 0–${sefTopHz} Hz · ${Math.round(histS / 60)} min`), tr)),
    h('div', { class: 'depth-nums' }, sef.el, mf.el, sr.el, imp.el));
  const draw = (t: number) => {
    const r = sized(raw);
    if (r) {
      r.ctx.strokeStyle = trace(el);
      r.ctx.lineWidth = r.k;
      drawEegRaw(r.ctx, disp.raw, r.w, r.h, disp.rawN, rawUv);
    }
    const d = sized(dsa);
    const oc = d ? off.getContext('2d') : null;
    if (d && oc) {
      const img = oc.createImageData(off.width, off.height);
      paintDsa(img, disp.cols, { minDb: -20, maxDb: 25 }); // dB re 1 µV²/Hz, as the developer page [ENG: display]
      oc.putImageData(img, 0, 0);
      d.ctx.clearRect(0, 0, d.w, d.h);
      d.ctx.imageSmoothingEnabled = false;
      d.ctx.drawImage(off, 0, 0, d.w, d.h);
    }
    const g = sized(tr);
    if (g) {
      g.ctx.clearRect(0, 0, g.w, g.h);
      g.ctx.strokeStyle = trace(el);
      g.ctx.lineWidth = 1.5 * g.k;
      g.ctx.beginPath();
      let first = true;
      for (const p of trend) {
        const x = ((p.t - (t - histS)) / histS) * g.w;
        const y = g.h - (Math.min(p.v, sefTopHz) / sefTopHz) * g.h;
        if (first) g.ctx.moveTo(x, y);
        else g.ctx.lineTo(x, y);
        first = false;
      }
      g.ctx.stroke();
    }
  };
  return {
    el,
    model,
    show(e) {
      pushEegDisplay(disp, e);
      const s = e.values.sef;
      if (s && s.value !== null && s.flag !== 'invalid') trend.push({ t: e.t, v: s.value });
      while (trend.length && (trend[0] as { t: number }).t < e.t - histS) trend.shift();
      setText(sef.v, fmt(s, 1));
      setText(mf.v, fmt(e.values.mf, 1));
      setText(sr.v, fmt(e.values.eegSr, 0));
      setText(imp.v, fmt(e.values.eegImp, 1));
      const quality = e.flags.invalid ? 'invalid' : e.flags.questionable ? 'questionable' : 'good';
      q.dataset.q = quality;
      setText(q, DEPTH_WORDS.quality[quality]);
      draw(e.t);
    },
  };
}

/**
 * The BIS-type face (EEG plan E7, the BIS-type reader l3/eeg-devices/bis-type.ts): a plain screen with the index large
 * and its trend over the last hour (0–100), the burst suppression rate, the electrode impedance, the raw EEG and the
 * signal quality from the reader's flags; the Q8 label and note say it is computed from published components. Not a
 * picture of the maker's monitor: a face matched to the owner's photographs replaces this function in DEPTH_FACES.
 * No EMG or SQI value: neither paper defines one from the signal.
 */
export function bisTypeFace(model: string): DepthFace {
  const spec = EEG_DEVICES.bisType.spec;
  const k = spec.constants;
  const disp = createEegDisplay(spec.id, EEG_FS_HZ);
  const rawUv = 100; // ±100 µV over the trace's height, as the generic face [ENG: display]
  const histS = k.dsaHistoryS.value; // the trend over the same hour the generic face keeps [ENG: display]
  const trend: Array<{ t: number; v: number }> = [];
  const canvas = (cls: string, label: string) => h('canvas', { class: cls, role: 'img', 'aria-label': label });
  const raw = canvas('depth-raw', 'Raw EEG');
  const tr = canvas('depth-trend', 'Index trend');
  const tile = (id: string, label: string, unit: string, big = false) => {
    const v = h('span', { class: 'v' }, DEPTH_WORDS.noValue);
    return { v, el: h('div', { class: `depth-tile${big ? ' big' : ''}`, 'data-id': id }, h('span', { class: 'l' }, label), v, h('span', { class: 'u' }, unit)) };
  };
  const bis = tile('bis', 'Index', '0–100', true);
  const sr = tile('bisSr', 'SR', '%');
  const imp = tile('eegImp', 'Impedance', 'kΩ');
  const q = h('span', { class: 'depth-sqi', role: 'status' }, '');
  const cap = (text: string) => h('span', { class: 'depth-cap' }, text);
  const el = h('div', { class: 'depth-face', 'data-face': 'bisType' },
    h('header', { class: 'depth-head' }, h('h2', { class: 'depth-label' }, spec.label), h('span', { class: 'depth-sim', role: 'note' }, SIM_LINE), q,
      h('p', { class: 'depth-note' }, DEPTH_WORDS.bisNote)),
    h('div', { class: 'depth-waves' },
      h('figure', { class: 'depth-lane raw' }, cap(`EEG · ${k.rawWindowS.value} s · ±${rawUv} µV`), raw),
      h('figure', { class: 'depth-lane trend' }, cap(`Index trend · 0–100 · ${Math.round(histS / 60)} min`), tr)),
    h('div', { class: 'depth-nums' }, bis.el, sr.el, imp.el));
  const draw = (t: number) => {
    const r = sized(raw);
    if (r) {
      r.ctx.strokeStyle = trace(el);
      r.ctx.lineWidth = r.k;
      drawEegRaw(r.ctx, disp.raw, r.w, r.h, disp.rawN, rawUv);
    }
    const g = sized(tr);
    if (g) {
      g.ctx.clearRect(0, 0, g.w, g.h);
      g.ctx.strokeStyle = trace(el);
      g.ctx.lineWidth = 1.5 * g.k;
      g.ctx.beginPath();
      trend.forEach((p, i) => {
        const x = ((p.t - (t - histS)) / histS) * g.w;
        const y = g.h - (p.v / 100) * g.h;
        if (i === 0) g.ctx.moveTo(x, y);
        else g.ctx.lineTo(x, y);
      });
      g.ctx.stroke();
    }
  };
  return {
    el,
    model,
    show(e) {
      pushEegDisplay(disp, e);
      const b = e.values.bis;
      if (b && b.value !== null && b.flag !== 'invalid') trend.push({ t: e.t, v: b.value });
      while (trend.length && (trend[0] as { t: number }).t < e.t - histS) trend.shift();
      setText(bis.v, fmt(b, 0));
      setText(sr.v, fmt(e.values.bisSr, 0));
      setText(imp.v, fmt(e.values.eegImp, 1));
      const quality = e.flags.invalid ? 'invalid' : e.flags.questionable ? 'questionable' : 'good';
      q.dataset.q = quality;
      setText(q, DEPTH_WORDS.quality[quality]);
      draw(e.t);
    },
  };
}

/**
 * The Entropy face (EEG plan E8, the Entropy reader l3/eeg-devices/entropy.ts): SE and RE large with their trends over
 * the last hour (0–100; RE dashed), RE − SE (the EMG indicator, Viertiö-Oja 2004 p. 158), the electrode impedance, the
 * raw EEG and the signal quality from the reader's flags; the Q8 label and note. Not a picture of the maker's module: a
 * face matched to the owner's photographs replaces this function in DEPTH_FACES. No BSR: the reader computes none.
 */
export function entropyFace(model: string): DepthFace {
  const spec = EEG_DEVICES.entropy.spec;
  const k = spec.constants;
  const disp = createEegDisplay(spec.id, EEG_FS_HZ);
  const rawUv = 100; // ±100 µV over the trace's height, as the generic face [ENG: display]
  const histS = k.dsaHistoryS.value; // the trends over the same hour the generic face keeps [ENG: display]
  const trend: Array<{ t: number; se: number | null; re: number | null }> = [];
  const canvas = (cls: string, label: string) => h('canvas', { class: cls, role: 'img', 'aria-label': label });
  const raw = canvas('depth-raw', 'Raw EEG');
  const tr = canvas('depth-trend', 'SE and RE trends');
  const tile = (id: string, label: string, unit: string, big = false) => {
    const v = h('span', { class: 'v' }, DEPTH_WORDS.noValue);
    return { v, el: h('div', { class: `depth-tile${big ? ' big' : ''}`, 'data-id': id }, h('span', { class: 'l' }, label), v, h('span', { class: 'u' }, unit)) };
  };
  const se = tile('se', 'SE', '0–100', true);
  const re = tile('re', 'RE', '0–100', true);
  const diff = tile('reSe', 'RE − SE', 'EMG');
  const imp = tile('eegImp', 'Impedance', 'kΩ');
  const q = h('span', { class: 'depth-sqi', role: 'status' }, '');
  const cap = (text: string) => h('span', { class: 'depth-cap' }, text);
  const el = h('div', { class: 'depth-face', 'data-face': 'entropy' },
    h('header', { class: 'depth-head' }, h('h2', { class: 'depth-label' }, spec.label), h('span', { class: 'depth-sim', role: 'note' }, SIM_LINE), q,
      h('p', { class: 'depth-note' }, DEPTH_WORDS.entropyNote)),
    h('div', { class: 'depth-waves' },
      h('figure', { class: 'depth-lane raw' }, cap(`EEG · ${k.rawWindowS.value} s · ±${rawUv} µV`), raw),
      h('figure', { class: 'depth-lane trend' }, cap(`SE (solid) and RE (dashed) · 0–100 · ${Math.round(histS / 60)} min`), tr)),
    h('div', { class: 'depth-nums' }, se.el, re.el, diff.el, imp.el));
  const line = (g: { ctx: CanvasRenderingContext2D; w: number; h: number }, t: number, key: 'se' | 're') => {
    g.ctx.beginPath();
    let open = false;
    for (const p of trend) {
      const v = p[key];
      if (v === null) {
        open = false;
        continue;
      }
      const x = ((p.t - (t - histS)) / histS) * g.w;
      const y = g.h - (v / 100) * g.h;
      if (!open) g.ctx.moveTo(x, y);
      else g.ctx.lineTo(x, y);
      open = true;
    }
    g.ctx.stroke();
  };
  const draw = (t: number) => {
    const r = sized(raw);
    if (r) {
      r.ctx.strokeStyle = trace(el);
      r.ctx.lineWidth = r.k;
      drawEegRaw(r.ctx, disp.raw, r.w, r.h, disp.rawN, rawUv);
    }
    const g = sized(tr);
    if (g) {
      g.ctx.clearRect(0, 0, g.w, g.h);
      g.ctx.strokeStyle = trace(el);
      g.ctx.lineWidth = 1.5 * g.k;
      g.ctx.setLineDash([]);
      line(g, t, 'se');
      g.ctx.setLineDash([4 * g.k, 3 * g.k]);
      line(g, t, 're');
      g.ctx.setLineDash([]);
    }
  };
  const val = (m: Measured | undefined) => (m && m.value !== null && m.flag !== 'invalid' ? m.value : null);
  return {
    el,
    model,
    show(e) {
      pushEegDisplay(disp, e);
      trend.push({ t: e.t, se: val(e.values.se), re: val(e.values.re) });
      while (trend.length && (trend[0] as { t: number }).t < e.t - histS) trend.shift();
      setText(se.v, fmt(e.values.se, 0));
      setText(re.v, fmt(e.values.re, 0));
      setText(diff.v, fmt(e.values.reSe, 0));
      setText(imp.v, fmt(e.values.eegImp, 1));
      const quality = e.flags.invalid ? 'invalid' : e.flags.questionable ? 'questionable' : 'good';
      q.dataset.q = quality;
      setText(q, DEPTH_WORDS.quality[quality]);
      draw(e.t);
    },
  };
}

/** One face per EEG model of the registry; a model without its own face wears the generic one. */
export const DEPTH_FACES: Readonly<Record<string, (model: string) => DepthFace>> = { generic: genericFace, bisType: bisTypeFace, entropy: entropyFace };

/** The window in `parent` (the follower's stage, over its monitor): a face once the device reads, else "no device". */
export function mountDepthWindow(parent: HTMLElement): DepthWindow {
  const offEl = h('div', { class: 'depth-off', role: 'status' }, h('p', {}, DEPTH_WORDS.off), h('p', { class: 'muted' }, DEPTH_WORDS.offSub), h('p', { class: 'depth-sim' }, SIM_LINE));
  const el = h('section', { class: 'depth-window', 'aria-label': 'Depth of anaesthesia', 'data-theme': 'dark' }, offEl);
  parent.append(el);
  let face: DepthFace | null = null;
  let last: DepthReading | null = null;
  let src: DepthSource | null = null;
  let values: { t: number; v: Partial<Record<NumericId, Measured>> } = { t: NaN, v: {} };
  let unsub = () => {};
  const onEvent = (e: EngineEvent) => {
    if (e.type === 'measurement') {
      // a device's numerics come in the measurement stamped with its reading's time, just before the reading
      values = e.t === values.t ? { t: e.t, v: { ...values.v, ...e.values } } : { t: e.t, v: { ...e.values } };
      return;
    }
    if (e.type !== 'eegReading') return;
    const r: DepthReading = { ...e, values: e.t === values.t ? values.v : {} };
    if (!face || face.model !== r.model) {
      face?.el.remove();
      face = (DEPTH_FACES[r.model] ?? genericFace)(r.model);
      el.append(face.el);
    }
    last = r;
    el.dataset.model = r.model;
    el.dataset.t = String(r.t);
    face.show(r);
    check();
  };
  /** "No device" while nothing has read for DEPTH_STALE_S of sim time (a held window's clock stops, so it stays). */
  const check = () => {
    const on = !!last && !!src && src.renderT() - last.t <= DEPTH_STALE_S;
    offEl.hidden = on;
    if (face) face.el.hidden = !on;
    el.dataset.on = String(on);
  };
  const poll = setInterval(check, 500);
  check();
  return {
    el,
    get last() {
      return last;
    },
    attach(s) {
      unsub();
      src = s;
      unsub = s.on(onEvent, ['measurement', 'eegReading']);
    },
    setTheme(theme) {
      el.dataset.theme = theme === 'projector-light' ? 'light' : 'dark';
    },
    destroy() {
      unsub();
      clearInterval(poll);
      el.remove();
    },
  };
}
