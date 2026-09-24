// resolveSkin: the renderer/audio-facing contract (packages/skins/CONTRACT.md). It merges base ← skin ← preset ←
// theme, applies age-band limit inheritance, and derives the option blocks that map onto what the renderer and
// audio packages accept TODAY (LaneConfig, NumericTile colours, ToneScheduler/alarm profiles).
import { darkenToContrast } from './color.ts';
import { deepMerge } from './merge.ts';
import { BASES, PRESETS, SKINS, THEMES } from './registry.ts';
import type { AgeBand, LaneId, Level, LimitTable, PitchMapId, Preset, Provenance, Skin, SoundProfileId, TileParam } from './types.ts';

/** The engine's two ECG filter modes (packages/engine-core/src/l3/ecg-filter.ts FILTER_BANDS; a test keeps them equal). */
export const ENGINE_FILTER_BANDS = { monitor: [0.5, 40], diagnostic: [0.05, 150] } as const;
export type EngineFilterMode = keyof typeof ENGINE_FILTER_BANDS;
/** Base ECG gain the skins' multipliers refer to (×1 = 10 mm/mV, brief §3.5). */
export const BASE_GAIN_MM_PER_MV = 10;

export interface LaneRender {
  lane: LaneId;
  color: string;
  mmPerS: number;
  /** LaneConfig.gainMmPerMv; with autoGain the renderer starts here and rescales (Stage 4b). */
  gainMmPerMv: number;
  autoGain: boolean;
  label: string;
}

export interface RenderContract {
  background: string;
  foreground: string;
  grid: Skin['chrome']['grid'];
  lineWidth: number;
  eraseGapPx: number;
  cursorLine: boolean;
  fontStack: string;
  numericWeight: number;
  lanes: LaneRender[];
  tileColors: Partial<Record<TileParam, string>>;
  ecgFilter: { name: string; band: [number, number]; engineMode: EngineFilterMode; exact: boolean };
  hrMethod: { skin: Skin['hr']['method']; engine: 'dropMaxMin' | 'mean12' | null };
}

export interface AudioContract {
  beep: { enabled: boolean; source: Skin['beep']['source']; baseHz: number; pitchMap: PitchMapId; volume: Skin['beep']['volume'] };
  alarm: {
    profile: SoundProfileId;
    repeatS: Partial<Record<Level, number | null>>;
    lowPulses: 1 | 2 | null;
    volume: Skin['alarms']['volume'];
    silence: { durationS: number; cancelOnNewAlarm: boolean };
  };
}

export interface ResolvedSkin {
  /** The id asked for (a skin or a preset). */
  id: string;
  skinId: string;
  presetId: string | null;
  themeId: string | null;
  skin: Skin;
  provenance: Provenance;
  /** Age-band limits with `inherit` applied (null = not published for that band). */
  limits: Record<AgeBand, LimitTable | null>;
  /** Limit keys a band took from another band (shown as approximate in the UI, brief §6.8). */
  approximateLimits: Record<AgeBand, string[]>;
  preset: Pick<Preset, 'alarmSwitches' | 'startState'> | null;
  render: RenderContract;
  audio: AudioContract;
}

export interface ResolveOptions {
  theme?: string;
}

/** Merge a skin source over its base (if any); provenance merges the same way. */
export function mergeSkinSource(id: string): Skin {
  const src = SKINS[id];
  if (!src) throw new Error(`unknown skin: ${id}`);
  if (!src.extends) return structuredClone(src) as unknown as Skin;
  const base = BASES[src.extends];
  if (!base) throw new Error(`skin ${id} extends unknown base ${src.extends}`);
  const merged = deepMerge(base, src) as unknown as Skin;
  // A skin's own entries win; base entries under a path the skin re-sourced are dropped.
  const prov: Provenance = {};
  for (const [k, v] of Object.entries(base.provenance)) {
    if (!Object.keys(src.provenance).some((s) => k === s || k.startsWith(`${s}.`))) prov[k] = v;
  }
  merged.provenance = { ...prov, ...src.provenance };
  delete (merged as { extends?: string }).extends;
  return merged;
}

function applyPreset(skin: Skin, preset: Preset): Skin {
  const out = deepMerge(skin, preset.overrides);
  for (const [k, v] of Object.entries(preset.provenance)) {
    if (!k.startsWith('overrides.')) continue;
    const path = k.slice('overrides.'.length);
    for (const old of Object.keys(out.provenance)) if (old.startsWith(`${path}.`)) delete out.provenance[old];
    out.provenance[path] = v;
  }
  return out;
}

function applyTheme(skin: Skin, themeId: string): Skin {
  const theme = THEMES[themeId];
  if (!theme) throw new Error(`unknown theme: ${themeId}`);
  const out = deepMerge(skin, { scheme: theme.scheme, background: theme.background, foreground: theme.foreground, chrome: theme.chrome });
  const min = theme.colorTransform.minRatio;
  for (const [k, v] of Object.entries(out.colors)) if (v) (out.colors as Record<string, string>)[k] = darkenToContrast(v, theme.background, min);
  out.alarms.messageBar.idle = { ...theme.messageBarIdle };
  out.alarms.messageBar.acknowledged = { ...theme.messageBarIdle };
  for (const k of Object.keys(out.provenance)) if (k.startsWith('colors.')) delete out.provenance[k];
  out.provenance.colors = { tag: 'eng', source: `ENG: theme ${themeId} darkens the skin colours to ${min}:1` };
  for (const [k, v] of Object.entries(theme.provenance)) if (k !== 'colorTransform') out.provenance[k] = v;
  return out;
}

function resolveLimits(skin: Skin): { limits: ResolvedSkin['limits']; approximate: ResolvedSkin['approximateLimits'] } {
  const limits = { adult: null, paed: null, neo: null } as ResolvedSkin['limits'];
  const approximate: ResolvedSkin['approximateLimits'] = { adult: [], paed: [], neo: [] };
  for (const band of ['adult', 'paed', 'neo'] as const) {
    const b = skin.limits[band];
    if (!b) continue;
    const parent = b.inherit ? skin.limits[b.inherit]?.values ?? {} : {};
    limits[band] = { ...parent, ...b.values };
    approximate[band] = Object.keys(parent).filter((k) => !(k in b.values));
  }
  return { limits, approximate };
}

const sameBand = (a: readonly number[], b: readonly number[]) => a[0] === b[0] && a[1] === b[1];

/** Nearest engine filter mode for a skin band (log distance of the corners); exact when the bands are equal. */
export function engineFilterFor(band: readonly [number, number]): { engineMode: EngineFilterMode; exact: boolean } {
  let best: EngineFilterMode = 'monitor';
  let bestD = Infinity;
  for (const mode of Object.keys(ENGINE_FILTER_BANDS) as EngineFilterMode[]) {
    const ref = ENGINE_FILTER_BANDS[mode];
    if (sameBand(ref, band)) return { engineMode: mode, exact: true };
    const d = Math.abs(Math.log(band[0] / ref[0])) + Math.abs(Math.log(band[1] / ref[1]));
    if (d < bestD) [best, bestD] = [mode, d];
  }
  return { engineMode: best, exact: false };
}

const IBP_LABEL_FALLBACK: Record<string, 'ART' | 'CVP' | 'PAP'> = { IBP1: 'ART', IBP2: 'CVP', IBP3: 'PAP', IBP4: 'CVP' };

export function laneColor(skin: Skin, lane: LaneId): string {
  const c = skin.colors;
  const pick = (...keys: string[]) => keys.map((k) => (c as Record<string, string | undefined>)[k]).find(Boolean) ?? skin.foreground;
  if (lane.startsWith('ECG')) return pick('ECG');
  if (lane.startsWith('IBP')) return pick(lane, IBP_LABEL_FALLBACK[lane] ?? 'ART');
  return pick(lane);
}

const TILE_COLOR_KEY: Record<TileParam, string> = {
  HR: 'HR', NIBP: 'NIBP', ART: 'ART', CVP: 'CVP', PAP: 'PAP', IBP1: 'IBP1', IBP2: 'IBP2', IBP3: 'IBP3', IBP4: 'IBP4',
  SpO2: 'SpO2', TEMP: 'TEMP', RR: 'RESP', CO2: 'CO2', ST: 'ST',
};

function laneSweep(skin: Skin, lane: LaneId): number {
  if (lane.startsWith('ECG')) return skin.sweep.ecg.default;
  if (lane === 'PLETH') return skin.sweep.pleth.default;
  if (lane === 'RESP') return skin.sweep.resp.default;
  if (lane === 'CO2') return skin.sweep.co2.default;
  return skin.sweep.ibp.default;
}

/** Lane label from the skin template: '{lead}  X{gain}  {FILTER}' → 'II  X1  NORMAL'. */
export function formatLaneLabel(skin: Skin, lane: LaneId, ecgIndex: number): string {
  if (!lane.startsWith('ECG')) return lane;
  const lead = skin.ecg.laneLeads[ecgIndex] ?? skin.ecg.laneLeads[0] ?? 'II';
  const g = skin.ecg.gainDefault;
  const gain = g === 'AUTO' ? '1' : String(skin.ecg.gainLabel === 'mm-per-mV' ? g * BASE_GAIN_MM_PER_MV : g);
  const f = skin.ecg.filterDefault;
  return skin.ecg.laneLabel.replace('{lead}', lead).replace('{gain}', gain).replace('{FILTER}', skin.ecg.filterLabel === 'letter' ? f.charAt(0) : f);
}

function renderContract(skin: Skin): RenderContract {
  let ecgIndex = 0;
  const lanes = skin.layout.lanes.map((lane): LaneRender => {
    const isEcg = lane.startsWith('ECG');
    const g = skin.ecg.gainDefault;
    const r: LaneRender = {
      lane,
      color: laneColor(skin, lane),
      mmPerS: laneSweep(skin, lane),
      gainMmPerMv: isEcg && g !== 'AUTO' ? g * BASE_GAIN_MM_PER_MV : BASE_GAIN_MM_PER_MV,
      autoGain: isEcg && g === 'AUTO',
      label: formatLaneLabel(skin, lane, ecgIndex),
    };
    if (isEcg) ecgIndex++;
    return r;
  });
  const band = skin.ecg.filters[skin.ecg.filterDefault];
  if (!band) throw new Error(`skin ${skin.id}: filterDefault ${skin.ecg.filterDefault} is not in ecg.filters`);
  const tileColors: Partial<Record<TileParam, string>> = {};
  for (const col of skin.layout.tiles) for (const t of col) tileColors[t.param] = (skin.colors as Record<string, string | undefined>)[TILE_COLOR_KEY[t.param]] ?? skin.foreground;
  const hrEngine = skin.hr.method === 'trimmed-mean-12rr' ? 'dropMaxMin' : skin.hr.method === 'mean-12rr' ? 'mean12' : null;
  return {
    background: skin.background,
    foreground: skin.foreground,
    grid: skin.chrome.grid,
    lineWidth: skin.sweep.lineWidthPx,
    eraseGapPx: skin.sweep.gapPx,
    cursorLine: skin.sweep.cursorLine,
    fontStack: skin.font.stack,
    numericWeight: skin.font.numericWeight,
    lanes,
    tileColors,
    ecgFilter: { name: skin.ecg.filterDefault, band: [band[0], band[1]], ...engineFilterFor(band) },
    hrMethod: { skin: skin.hr.method, engine: hrEngine },
  };
}

function audioContract(skin: Skin): AudioContract {
  return {
    beep: { enabled: skin.beep.defaultOn, source: skin.beep.source, baseHz: skin.beep.baseHz, pitchMap: skin.beep.pitchMap, volume: { ...skin.beep.volume } },
    alarm: {
      profile: skin.alarms.soundProfile,
      repeatS: { ...(skin.alarms.repeatS ?? {}) },
      lowPulses: skin.alarms.lowPulses ?? null,
      volume: { ...skin.alarms.volume },
      silence: { durationS: skin.alarms.silence.durationS, cancelOnNewAlarm: skin.alarms.silence.cancelOnNewAlarm },
    },
  };
}

/** Resolve a skin or preset id (optionally with a theme) into the complete skin plus the renderer/audio contract. */
export function resolveSkin(id: string, opts: ResolveOptions = {}): ResolvedSkin {
  const preset = PRESETS[id] ?? null;
  const skinId = preset ? preset.base : id;
  let skin = mergeSkinSource(skinId);
  if (preset) skin = applyPreset(skin, preset);
  if (opts.theme) skin = applyTheme(skin, opts.theme);
  const { limits, approximate } = resolveLimits(skin);
  const { provenance } = skin;
  return {
    id,
    skinId,
    presetId: preset ? preset.id : null,
    themeId: opts.theme ?? null,
    skin,
    provenance,
    limits,
    approximateLimits: approximate,
    preset: preset ? { ...(preset.alarmSwitches ? { alarmSwitches: preset.alarmSwitches } : {}), ...(preset.startState ? { startState: preset.startState } : {}) } : null,
    render: renderContract(skin),
    audio: audioContract(skin),
  };
}
