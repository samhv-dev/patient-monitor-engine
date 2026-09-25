// ResolvedSkin → RenderPlan (renderer requests RR-1, RR-2, RR-3): the plain-data lane layout the worker draws from.
// It runs on the main thread (where @pme/skins is resolved) and crosses to the worker as JSON. A plan built from
// the Stage 1/2 options (`legacyPlan`) reproduces the old hard-coded look exactly, so pages without a skin keep it.
import { engineFilterFor, type LaneId, type ResolvedSkin, type Skin } from '@pme/skins';
import type { ChannelId, EcgFilterMode, LeadId } from '@pme/engine-core';
import { WAVE_STYLE, type WaveLaneId } from './wave-lanes.ts';

export interface PlanLane {
  id: LaneId | 'ECG' | WaveLaneId;
  kind: 'ecg' | 'wave';
  /** Engine channel; null for a lane with no signal yet (IBP4). */
  channel: ChannelId | null;
  color: string;
  mmPerS: number;
  gainMmPerMv: number;
  autoGain: boolean;
  /** ECG gain multipliers (of 10 mm/mV) auto-gain may choose from. */
  gainOptions: number[];
  /** Wave scale [lo, hi] (mmHg; CO2 mmHg); null = auto-scale (pleth, impedance resp). */
  range: [number, number] | null;
  /** Static label (waves) or the template for ECG lanes: '{lead}  X{gain}  {FILTER}'. */
  label: string;
}

export interface RenderPlan {
  skin: string;
  background: string;
  foreground: string;
  lineWidth: number;
  eraseGapPx: number;
  cursorLine: boolean;
  grid: { minorMm: number; majorMm: number; minor: string; major: string } | null;
  font: string;
  gainLabel: Skin['ecg']['gainLabel'];
  /** Engine filter mode → the name the lane label shows ('M', 'NORMAL', …). */
  filterNames: Record<string, string>;
  paceMarker: Skin['ecg']['paceMarker'];
  /** Draw implanted-pacemaker spikes (skin `ecg.paceDetectDefault`, brief §6.5 saadat-like PACE DETECT). */
  paceDetect: boolean;
  /** The skin is a defibrillator/pacer, so its own TCP pulses are always marked (research/05 §2.6 LIFEPAK 15). */
  devicePacer: boolean;
  syncMarker: Skin['syncMarker'];
  hideScaleNumbers: boolean;
  lanes: PlanLane[];
}

const LEAD_OF: Record<string, LeadId> = {
  I: 'ecgI', II: 'ecgII', III: 'ecgIII', aVR: 'aVR', aVL: 'aVL', aVF: 'aVF', V: 'V1', V1: 'V1', V2: 'V2', V3: 'V3', V4: 'V4', V5: 'V5', V6: 'V6',
};
export const LEAD_LABEL: Record<LeadId, string> = {
  ecgI: 'I', ecgII: 'II', ecgIII: 'III', aVR: 'aVR', aVL: 'aVL', aVF: 'aVF', V1: 'V1', V2: 'V2', V3: 'V3', V4: 'V4', V5: 'V5', V6: 'V6',
};
/** Skin wave lanes → engine channels (IBP1–3 are the ART/CVP/PAP lines of Stage 2; IBP4 has no line yet). */
const WAVE_CHANNEL: Partial<Record<LaneId, ChannelId | null>> = {
  PLETH: 'pleth', ART: 'abp', CVP: 'cvp', PAP: 'pap', IBP1: 'abp', IBP2: 'cvp', IBP3: 'pap', IBP4: null, RESP: 'resp', CO2: 'co2',
};
const IBP_SCALE_KEY: Partial<Record<LaneId, string>> = { ART: 'ART', IBP1: 'ART', CVP: 'CVP', IBP2: 'CVP', PAP: 'PAP', IBP3: 'PAP', IBP4: 'IBP' };
/** Engine filter-command value for a skin band: the exact engine mode, else 'band:<lo>-<hi>' (E-4a-1). */
export function filterModeFor(band: readonly [number, number]): EcgFilterMode {
  const f = engineFilterFor(band);
  return f.exact ? f.engineMode : `band:${band[0]}-${band[1]}`;
}

export function leadOf(skinLead: string): LeadId {
  return LEAD_OF[skinLead] ?? 'ecgII';
}

/** Gain as the lane label prints it (brief §3.8 `ecg.gainLabel`): X2, 20 (mm/mV) or 2 (cm/mV). */
export function formatGain(mult: number, gainLabel: Skin['ecg']['gainLabel']): string {
  const v = gainLabel === 'mm-per-mV' ? mult * 10 : mult;
  return String(Number(v.toFixed(3)));
}

/** Fill an ECG lane template. */
export function ecgLabel(template: string, lead: LeadId, gainMult: number, gainLabel: Skin['ecg']['gainLabel'], filterName: string): string {
  return template.replace('{lead}', LEAD_LABEL[lead]).replace('{gain}', formatGain(gainMult, gainLabel)).replace('{FILTER}', filterName);
}

export function renderPlan(r: ResolvedSkin, page?: string): RenderPlan {
  const s = r.skin;
  const pg = s.pages.find((p) => p.id === (page ?? s.defaultPage));
  const laneIds = pg?.lanes ?? s.layout.lanes;
  const gainOptions = s.ecg.gainOptions.filter((g): g is number => typeof g === 'number');
  const filterNames: Record<string, string> = {};
  for (const [name, band] of Object.entries(s.ecg.filters)) filterNames[filterModeFor(band)] = s.ecg.filterLabel === 'letter' ? name.charAt(0) : name;
  let ecgIndex = 0;
  const lanes = laneIds.map((id): PlanLane => {
    const rl = r.render.lanes.find((l) => l.lane === id);
    const color = rl?.color ?? s.foreground;
    const mmPerS = rl?.mmPerS ?? s.sweep.ibp.default;
    if (id.startsWith('ECG')) {
      const lead = leadOf(s.ecg.laneLeads[ecgIndex++] ?? s.ecg.laneLeads[0] ?? 'II');
      return { id, kind: 'ecg', channel: lead, color, mmPerS, gainMmPerMv: rl?.gainMmPerMv ?? 10, autoGain: rl?.autoGain ?? false, gainOptions, range: null, label: s.ecg.laneLabel };
    }
    const scaleKey = IBP_SCALE_KEY[id];
    const sc = scaleKey ? s.ibp.scales[scaleKey] : undefined;
    const range: [number, number] | null =
      id === 'PLETH' || id === 'RESP' ? null : id === 'CO2' ? [0, s.co2.scaleUnit === '%' ? (s.co2.scale * 760) / 100 : s.co2.scale] : sc ? [sc[0], sc[2]] : [0, 150];
    return { id, kind: 'wave', channel: WAVE_CHANNEL[id] ?? null, color, mmPerS, gainMmPerMv: 10, autoGain: false, gainOptions: [], range, label: id === 'PLETH' ? 'PLETH' : id };
  });
  return {
    skin: r.id,
    background: r.render.background,
    foreground: r.render.foreground,
    lineWidth: r.render.lineWidth,
    eraseGapPx: r.render.eraseGapPx,
    cursorLine: r.render.cursorLine,
    grid: r.render.grid,
    font: r.render.fontStack,
    gainLabel: s.ecg.gainLabel,
    filterNames,
    paceMarker: s.ecg.paceMarker,
    paceDetect: s.ecg.paceDetectDefault,
    devicePacer: s.pacer !== null,
    syncMarker: s.syncMarker,
    hideScaleNumbers: pg?.pump?.hideScaleNumbers ?? false,
    lanes,
  };
}

/** Stage 1/2 look (monitor-core THEME, WAVE_STYLE) for pages that pass `lanes`/`waves` and no skin. */
export function legacyPlan(leads: readonly LeadId[], waves: readonly WaveLaneId[]): RenderPlan {
  const ecg = leads.map((lead): PlanLane => ({
    id: 'ECG', kind: 'ecg', channel: lead, color: '#00ff66', mmPerS: 25, gainMmPerMv: 10, autoGain: false, gainOptions: [], range: null, label: '{lead}  {FILTER}',
  }));
  const wv = waves.map((w): PlanLane => ({
    id: w, kind: 'wave', channel: w, color: WAVE_STYLE[w].color, mmPerS: 25, gainMmPerMv: 10, autoGain: false, gainOptions: [],
    range: WAVE_STYLE[w].range ? [WAVE_STYLE[w].range[0], WAVE_STYLE[w].range[1]] : null, label: WAVE_STYLE[w].label,
  }));
  return {
    skin: 'legacy', background: '#000', foreground: '#00ff66', lineWidth: 1.75, eraseGapPx: 16, cursorLine: false, grid: null,
    font: 'system-ui, sans-serif', gainLabel: 'mm-per-mV', filterNames: { monitor: 'M', diagnostic: 'D' },
    paceMarker: { style: 'marker-above', heightMm: 2 }, paceDetect: false, devicePacer: false, syncMarker: null, hideScaleNumbers: false,
    lanes: [...ecg, ...wv],
  };
}
