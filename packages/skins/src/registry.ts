// Every shipped skin, base, theme and preset (brief §3.8; build order R14: saadat-like → philips-like → zoll-like,
// then mindray-like, ge-like, lifepak-like). JSON imports are typed loosely, so they are cast once here; the
// schema tests are what guarantee the shapes.
import iecDefaults from './data/base/iec-defaults.json';
import philipsLike from './data/skins/philips-like.json';
import saadatLike from './data/skins/saadat-like.json';
import type { DeepPartial, Preset, Skin, Theme } from './types.ts';

/** A skin file as stored: complete (no `extends`) or a partial over a base. */
export type SkinSource = DeepPartial<Skin> & Pick<Skin, 'schema' | 'kind' | 'id' | 'label' | 'provenance'> & { extends?: string };

export const BASES: Readonly<Record<string, SkinSource>> = { 'iec-defaults': iecDefaults as unknown as SkinSource };

export const SKINS: Readonly<Record<string, SkinSource>> = {
  'saadat-like': saadatLike as unknown as SkinSource,
  'philips-like': philipsLike as unknown as SkinSource,
};

export const THEMES: Readonly<Record<string, Theme>> = {};

export const PRESETS: Readonly<Record<string, Preset>> = {};

/** Skin and preset ids in build order, then presets (the demo's switcher order). */
export const SKIN_IDS = Object.keys(SKINS);
export const PRESET_IDS = Object.keys(PRESETS);
export const THEME_IDS = Object.keys(THEMES);
