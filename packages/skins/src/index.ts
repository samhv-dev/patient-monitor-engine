// @pme/skins: skins as data (brief §3.8). Validation (ajv) lives in '@pme/skins/validate' so renderer bundles stay small.
export const version = '0.0.0';
export * from './types.ts';
export { contrastRatio, darkenToContrast, luminance, parseHex, toHex } from './color.ts';
export { deepMerge } from './merge.ts';
export { coveringKey, leafPaths, provenanceGaps } from './provenance.ts';
export { BASES, PRESETS, PRESET_IDS, SKINS, SKIN_IDS, THEMES, THEME_IDS, type SkinSource } from './registry.ts';
export {
  BASE_GAIN_MM_PER_MV, ENGINE_FILTER_BANDS, engineFilterFor, formatLaneLabel, laneColor, mergeSkinSource, resolveSkin,
  type AudioContract, type EngineFilterMode, type LaneRender, type RenderContract, type ResolveOptions, type ResolvedSkin,
} from './resolve.ts';
