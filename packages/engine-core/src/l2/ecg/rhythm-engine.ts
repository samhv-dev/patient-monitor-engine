// Rhythm engine (brief §4.1 "Rhythm engine", §4.8 k_rhythm; research 03 §1.5). Separate atrial and
// ventricular clocks with an AV-node state machine, after Squiggler's atria × cadence × ventricle layering.
// It is a discrete-event planner: planUntil(T) processes every internal event up to T and appends kernel
// events (for the sample generator) and beat/atrial records (for the event stream). Atrial modes live in
// atria.ts, foci in foci.ts, ectopy in ectopy.ts, k_rhythm in mech.ts, morphology modifiers in morphology/.
import { normal } from '../../rng/sfc32.ts';
import type { BeatOrigin, EngineEvent, RhythmId, RhythmOpts } from '../../types.ts';
import { lvetMs, qtFridericiaMs } from './intervals.ts';
import { makeEvent, qrsSpanMs } from './kernels.ts';
import { respSin } from './hrv.ts';
import { FLUTTER_DIR, FWAVE_DIR, flutterHarmonics, kernelQtMs } from './templates.ts';
import { beatKernels, fiducialOf, rotateZ, tPeakS, type BeatTemplateId } from './beat-templates.ts';
import { RHYTHMS, type RhythmDef } from './rhythms.ts';
import { afterSupraBeat } from './ectopy.ts';
import { atrialRate, fireJunction, flutterRatio, junctionSpontT, onAtrial } from './atria.ts';
import { onFocus } from './foci.ts';
import { BASE_SV_ML, kRhythm } from './mech.ts';
import { applyMorphology } from './morphology/index.ts';
import { HOOKS, NEVER, clamp, rhythmRate, type FWave, type PendingV, type RhythmCtx, type RhythmState } from './rhythm-state.ts';
import { uniform, type Sfc32State } from '../../rng/sfc32.ts';

export { NEVER, type FWave, type PendingV, type RhythmCtx, type RhythmState } from './rhythm-state.ts';
export { afCommandBpm, afRefractoryS, afThresholdMv } from './atria.ts';

const ESCAPE_JITTER_SD_S = 0.01; // [ENG]
const LONG_QT_QTC_MS = 520; // long QT: QTc 480–600 (research 03 §1.6) [ENG value]
const REFRACTORY_QT_FRACTION = 0.8; // refractoryUntil = t + QRS + 0.8·QT (brief §4.1) [ENG]
const QRS_AMP_RESP_MOD = 0.08; // respiration modulates R by ±5–15% (brief §4.1)
const WIDE_TEMPLATES: ReadonlySet<BeatTemplateId> = new Set(['wide', 'pacedV', 'pvc2', 'pvc3', 'agonal']);

export function isWide(t: BeatTemplateId): boolean {
  return WIDE_TEMPLATES.has(t);
}

export function createRhythmState(id: RhythmId, opts: RhythmOpts, t0: number, ctx: RhythmCtx): RhythmState {
  const st: RhythmState = {
    id: 'asystole',
    opts: {},
    respectRefractory: true,
    planT: t0,
    atria: { nextT: NEVER, groupPos: 0, groupRatio: 2, lastT: -NEVER, pac: null },
    junction: { refUntil: t0, v: 0, vT: t0 },
    pending: [],
    focusNextT: NEVER,
    focusN: 0,
    startT: t0,
    focusAxis: 0,
    escapeNextT: NEVER,
    refractoryUntil: -NEVER,
    avRefUntil: -NEVER,
    lastConducted: false,
    lastVT: -NEVER,
    lastSupraT: -NEVER,
    lastWasPvc: false,
    ectopyCount: 0,
    fwaves: [],
    events: [],
    records: [],
    beatSeq: 0,
    pendingSwitch: null,
  };
  applyRhythm(st, id, opts, t0, true, ctx);
  return st;
}

export function escapeRate(st: RhythmState, d: RhythmDef, t: number, ctx: RhythmCtx): number {
  if (d.escape === 'none') return 0;
  return d.rateDrives === 'escape' ? rhythmRate(st, t, ctx) : d.backupEscapeBpm;
}

function drawFWave(t0: number, s: Sfc32State): FWave {
  // 3 random-phase sinusoids at 5–9 Hz, 0.03–0.05 mV each (brief §4.1: 2–4 at 5–9 Hz, 0.02–0.15 mV) [ENG]
  const f: number[] = [];
  const ph: number[] = [];
  const a: number[] = [];
  for (let i = 0; i < 3; i++) {
    f.push(5 + 4 * uniform(s));
    ph.push(2 * Math.PI * uniform(s));
    a.push(0.03 + 0.02 * uniform(s));
  }
  return { kind: 'fib', start: t0, end: NEVER, f, ph, a, dir: [...FWAVE_DIR] };
}

/** End every open atrial wave of this kind at t. */
function endFWaves(st: RhythmState, kind: FWave['kind'], t: number): void {
  for (const fw of st.fwaves) if (fw.kind === kind && fw.end >= NEVER) fw.end = t;
}

/**
 * Switch rhythm at time `at` (clamped to the planning frontier, so already-planned beats are kept).
 * Called by createRhythmState, by the engine's setRhythm, and by a deferred 'nextBeat' switch.
 */
export function applyRhythm(st: RhythmState, id: RhythmId, opts: RhythmOpts, at: number, respectRefractory: boolean, ctx: RhythmCtx): void {
  const prev = RHYTHMS[st.id];
  const d = RHYTHMS[id];
  const t0 = Math.max(at, st.planT);
  const wasFib = prev.atria === 'fib';
  st.id = id;
  st.opts = { ...opts };
  st.respectRefractory = respectRefractory;
  st.pendingSwitch = null;

  // Atria. A new sinus rhythm's first P comes 100 ms after the switch (so it is never inside the switch tick) [ENG];
  // flutter/AF atria start at once.
  if (d.atria === 'none') st.atria.nextT = NEVER;
  else if (d.atria !== prev.atria || st.atria.nextT >= NEVER) st.atria.nextT = t0 + (d.atria === 'sinus' ? 0.1 : 0);
  st.atria.groupPos = 0;
  st.atria.groupRatio = d.atria === 'flutter' ? flutterRatio(st, ctx.rng.conduction) : 2;
  st.atria.pac = null;

  // AF: f-waves and the integrate-and-fire junction
  if (d.atria === 'fib' && !wasFib) {
    const fw = drawFWave(t0, ctx.rng.conduction);
    st.fwaves.push(fw);
    st.junction = { refUntil: t0, v: 0, vT: t0 };
  }
  if (d.atria !== 'fib' && wasFib) endFWaves(st, 'fib', t0);

  // Flutter: a continuous sawtooth phase-locked to the F events (ruling R18); rebuilt only if the rate changes
  if (d.atria === 'flutter') {
    const rate = atrialRate(st, d, t0, ctx);
    const open = st.fwaves.find((fw) => fw.kind === 'flutter' && fw.end >= NEVER);
    if (!open || open.rateBpm !== rate) {
      const anchor = st.atria.nextT;
      endFWaves(st, 'flutter', anchor);
      st.fwaves.push({ kind: 'flutter', start: anchor, end: NEVER, ...flutterHarmonics(anchor, rate), dir: [...FLUTTER_DIR], rateBpm: rate });
    }
  } else endFWaves(st, 'flutter', t0);

  // Ventricular / junctional focus. The first focus beat fires 50 ms after the switch, or 10 ms after the ventricle
  // recovers [ENG].
  st.focusNextT = d.focus === 'none' ? NEVER : Math.max(t0 + 0.05, st.refractoryUntil + 0.01);
  st.focusN = 0;
  st.startT = t0;

  // Escape timer
  const er = escapeRate(st, d, t0, ctx);
  st.escapeNextT = er > 0 ? Math.max(t0, st.lastVT) + 60 / er : NEVER;
  const prevId = prevIdOf(prev);
  for (const h of HOOKS.onApply) h(st, prevId, t0, ctx);
}

function prevIdOf(d: RhythmDef): RhythmId {
  return (Object.keys(RHYTHMS) as RhythmId[]).find((k) => RHYTHMS[k] === d) ?? 'asystole';
}

/** A beat conducted from the atria (sinus P, flutter F, AF junction, PAC) rather than a ventricular or junctional pacemaker. */
function isConducted(p: PendingV): boolean {
  return !p.pvc && (p.origin === 'sinus' || p.origin === 'atrial');
}

/** Activate the ventricles for pending beat p. Returns false when the beat is concealed (refractory). */
export function activateVentricle(st: RhythmState, p: PendingV, ctx: RhythmCtx): boolean {
  const t = p.t;
  // Concealed if the ventricle is refractory (brief §4.1). Primary pacemakers (p.bypass) are exempt: foci, the AF
  // junction and PVC runs set their own cycle [ENG]. A conducted beat after a conducted beat is exempt too: the AV
  // node (AV_NODE_ERP_S in atria.ts) limits supraventricular conduction (Stage 1.1, review H1).
  const afterConducted = isConducted(p) && st.lastConducted;
  if (st.respectRefractory && !p.bypass && !afterConducted && t < st.refractoryUntil) return false;
  const d = RHYTHMS[st.id];
  const rate = rhythmRate(st, t, ctx);
  const rr = st.lastVT > -NEVER / 2 ? t - st.lastVT : 60 / Math.max(30, rate || 60);
  const qtc = ctx.mods.longQT ? Math.max(ctx.mods.qtc, LONG_QT_QTC_MS) : ctx.mods.qtc;
  const qtBase = ctx.mods.overrides.qtMs ?? qtFridericiaMs(clamp(rr, 0.25, 2), qtc);
  const wide = isWide(p.template);
  const scale = p.scale ?? (wide ? 1 : 1 + QRS_AMP_RESP_MOD * respSin(t, ctx.hrv));
  const supra = !p.pvc && !wide && p.origin !== 'ventricular' && p.origin !== 'paced';
  const raw = beatKernels(p.template, qtBase, scale, p.pre ?? 1);
  if (p.twistRad) rotateZ(raw, p.twistRad);
  const k = applyMorphology(raw, { template: p.template, supra, qtMs: qtBase, seq: st.beatSeq }, ctx.mods);
  st.events.push(makeEvent(t, k));
  const qrsMs = qrsSpanMs(k);
  const qtDrawn = kernelQtMs(k);
  const kSV = kRhythm(st, p, rr);
  const beat: EngineEvent = {
    type: 'beat',
    t: t + fiducialOf(k),
    seq: st.beatSeq++,
    origin: p.origin,
    template: p.pvc ? 'pvc' : p.template,
    qrsMs,
    qtMs: Math.round(qtDrawn),
    mech: { perfused: kSV > 0, kSV, svMl: Math.round(BASE_SV_ML * kSV), lvetMs: Math.round(Math.max(150, lvetMs(60 / rr))) },
  };
  if (p.prMs !== null) beat.prMs = Math.round(p.prMs);
  st.records.push(beat);
  st.refractoryUntil = t + qrsMs / 1000 + (REFRACTORY_QT_FRACTION * qtDrawn) / 1000;
  st.lastVT = t;
  // A beat that is not the focus's own (a sinus capture during VT) depolarises the ventricle and resets the focus,
  // so the focus cannot fire 15–40 ms later on top of it (Stage 1.1, review M2) [ENG].
  if (d.focus !== 'none' && !p.bypass) st.focusNextT = t + 60 / rate;
  const er = escapeRate(st, d, t, ctx);
  st.escapeNextT = er > 0 ? t + 60 / er + (d.rateDrives === 'escape' ? ESCAPE_JITTER_SD_S * ctx.mods.hrvScale * normal(ctx.rng.hrv) : 0) : NEVER;

  if (supra) {
    st.lastSupraT = t;
    afterSupraBeat(st, p, t, ctx, tPeakS(k));
  }
  st.lastWasPvc = p.pvc;
  st.lastConducted = isConducted(p);
  for (const h of HOOKS.onBeat) h(st, p, ctx);

  if (st.pendingSwitch) {
    const sw = st.pendingSwitch;
    applyRhythm(st, sw.id, sw.opts, t + 0.001, sw.respectRefractory, ctx);
  }
  return true;
}

function onEscape(st: RhythmState, t: number, ctx: RhythmCtx): void {
  const d = RHYTHMS[st.id];
  const origin: BeatOrigin = d.escape === 'ventricular' ? 'ventricular' : 'junctional';
  const ok = activateVentricle(st, { t, origin, template: d.escapeTemplate, prMs: null, pvc: false, coupling: 0, bypass: false }, ctx);
  if (!ok) {
    const er = escapeRate(st, d, t, ctx);
    st.escapeNextT = er > 0 ? Math.max(t, st.refractoryUntil) + 60 / er : NEVER;
  }
}

/** Extra event sources (pacing, TCP, VF bookkeeping, lead-off): the time of their next event and its handler. */
export interface ClockSource {
  next(st: RhythmState, ctx: RhythmCtx): number;
  fire(st: RhythmState, t: number, ctx: RhythmCtx): void;
}
const EXTRA_CLOCKS: ClockSource[] = [];

HOOKS.activate = activateVentricle;
HOOKS.apply = applyRhythm;

/** Process every internal rhythm event with time ≤ T. */
export function planUntil(st: RhythmState, T: number, ctx: RhythmCtx): void {
  for (let guard = 0; guard < 1_000_000; guard++) {
    const d = RHYTHMS[st.id];
    const tA = d.atria === 'none' ? NEVER : st.atria.nextT;
    const tP = st.pending.length > 0 ? (st.pending[0] as PendingV).t : NEVER;
    const tF = d.focus === 'none' ? NEVER : st.focusNextT;
    const tE = d.escape === 'none' ? NEVER : st.escapeNextT;
    const tJ = d.av === 'integrateFire' ? junctionSpontT(st, ctx) : NEVER;
    let tX = NEVER;
    let src: ClockSource | null = null;
    for (const c of EXTRA_CLOCKS) {
      const tc = c.next(st, ctx);
      if (tc < tX) {
        tX = tc;
        src = c;
      }
    }
    const t = Math.min(tA, tP, tF, tE, tJ, tX);
    // A NaN/Infinity rate would otherwise make every clock NaN and spin to the guard on every tick (review M5).
    if (!Number.isFinite(t)) throw new RangeError(`rhythm ${st.id}: next event time is ${t}`);
    if (t > T) break;
    if (t === tA) onAtrial(st, t, ctx);
    else if (t === tJ) fireJunction(st, t, ctx);
    else if (t === tP) activateVentricle(st, st.pending.shift() as PendingV, ctx);
    else if (t === tF) onFocus(st, t, ctx);
    else if (t === tE) onEscape(st, t, ctx);
    else if (src) src.fire(st, t, ctx);
  }
  st.planT = Math.max(st.planT, T);
}

export { atrialRate };
