// The site profile (research/13 P11, Laerdal's profile vs scenario split): which monitor the room shows, its theme and
// alarm defaults, and the shell's units and speed. It belongs to the room, not to a case, so loading a scenario never
// changes it. Stored per browser (a convenience, research/13 brief §5) and exportable as one JSON file.
import { EEG_DEVICES, EEG_MODEL_IDS } from '@pme/engine-core';
import { resolveSkin, type Skin } from '@pme/skins';
import { store } from './store.ts';

export interface SiteProfile {
  schema: 'pme-site/1';
  /** A skin or preset id (resolveSkin): 'saadat-like', 'iran-icu-as-found' (alarms off, as found in the ICU), … */
  skin: string;
  /** '' = the skin's own dark look; 'projector-light' | 'ecg-grid'. */
  theme: '' | 'projector-light' | 'ecg-grid';
  /** Frame rate cap: 30 for projectors and tablets on battery. */
  fps: 60 | 30;
  /** Gas partial pressures in the shell's tables (the monitor keeps its skin's unit). */
  gasUnit: 'mmHg' | 'kPa';
  /** New patients start with the sensors off: the learner attaches them and traces appear only then (Laerdal). */
  sensorsOff: boolean;
  /** Drug names on every screen (the owner's open question Q13): 'us' "epinephrine / norepinephrine"
   *  (default), 'uk' "adrenaline / noradrenaline". */
  drugNames: 'us' | 'uk';
  /** The room's defibrillator model (Room plan R5b; owner's Q6 ruling of 5 November), apart from the monitor style: a
   *  `DEFIB_CHOICES` id, which the host sends to the engine at every patient mount, or null (not chosen: the monitor
   *  style's own defibrillator values, as before). */
  defibModel: string | null;
  /** The room's depth-of-anaesthesia device (EEG plan E12): an `EEG_CHOICES` id (the engine's EEG registry), which the
   *  host switches on (`device eeg on`, then `device eeg model <id>`) at every patient mount, or null (no EEG device:
   *  the engine computes no EEG, D4, as before). */
  eegModel: string | null;
}

/** Monitor choices, in the words the Settings and Start screens use. */
export const MONITORS: ReadonlyArray<{ id: string; label: string; hint: string }> = [
  { id: 'saadat-like', label: 'Saadat-style (factory settings)', hint: 'The monitor residents meet in Iranian theatres' },
  { id: 'iran-icu-as-found', label: 'Saadat-style, as found in the ICU', hint: 'Alarms off at power-on: turning them on is step one' },
  { id: 'philips-like', label: 'Philips-style', hint: 'IntelliVue layout and alarm grammar' },
  { id: 'mindray-like', label: 'Mindray-style', hint: 'BeneVision layout, separate technical alarm field' },
  { id: 'ge-like', label: 'GE-style', hint: 'CARESCAPE layout' },
  { id: 'zoll-like', label: 'Zoll-style defibrillator', hint: 'Monitor-defibrillator' },
  { id: 'lifepak-like', label: 'LIFEPAK-style defibrillator', hint: 'Monitor-defibrillator' },
];
/**
 * The defibrillator models a room can choose, the engine's `DEFIB_MODELS` keys (R5a), each with the skin that is its
 * look: that skin's defibrillator block is the model's spec (the generic model's is zoll-like.json's, equal to the
 * engine's fallback). Only the generic model ships (Q6's second half); the department's own machine joins later as a skin
 * with its own sourced block, and one line here.
 */
export const DEFIB_CHOICES: ReadonlyArray<{ id: string; label: string; look: string }> = [{ id: 'generic', label: 'Generic defibrillator', look: 'zoll-like' }];
/**
 * The depth-of-anaesthesia devices a room can choose (EEG plan E12): the engine's EEG registry, which holds the built
 * readers only (l3/eeg-devices/registry.ts; today the generic one), each with its own screen label. A new reader joins
 * here by joining the registry.
 */
export const EEG_CHOICES: ReadonlyArray<{ id: string; label: string }> = EEG_MODEL_IDS.map((id) => ({ id, label: EEG_DEVICES[id].spec.label }));
/** The Defib tab's energy before R5b (panel/defib.ts), kept when no model is chosen. */
const NO_MODEL_ENERGY_J = 200;
/** A model's energies as the panel offers them; no model chosen = the panel's energy as before. */
export function defibDefaults(model: string | null): { energyAdultJ: number; energyPaedJ: number | null; ladderJ: number[] } {
  const look = DEFIB_CHOICES.find((c) => c.id === model)?.look;
  const d: Skin['defib'] = look ? resolveSkin(look).skin.defib : null;
  return d ? { energyAdultJ: d.energyAdultJ, energyPaedJ: d.energyPaedJ, ladderJ: [...(d.aedSequenceJ ?? [])] } : { energyAdultJ: NO_MODEL_ENERGY_J, energyPaedJ: null, ladderJ: [] };
}
/** The Room card's view of a model's pacer (row 58, the pacer following the model too), null with no model chosen. */
export function pacerDefaults(model: string | null): { ratePpm: number; pausePct: number | null } | null {
  const look = DEFIB_CHOICES.find((c) => c.id === model)?.look;
  const p: Skin['pacer'] = look ? resolveSkin(look).skin.pacer : null;
  return p ? { ratePpm: p.rateDefault, pausePct: p.pausePct } : null;
}
/** The drug-name sets, in the words the Settings screen uses. */
export const DRUG_NAME_SETS: ReadonlyArray<[SiteProfile['drugNames'], string]> = [['us', 'Epinephrine, norepinephrine'], ['uk', 'Adrenaline, noradrenaline']];
export const THEMES: ReadonlyArray<[SiteProfile['theme'], string]> = [['', 'Dark'], ['projector-light', 'Projector (light)'], ['ecg-grid', 'ECG paper grid']];

export const DEFAULT_SITE: SiteProfile = { schema: 'pme-site/1', skin: 'saadat-like', theme: '', fps: 60, gasUnit: 'mmHg', sensorsOff: false, drugNames: 'us', defibModel: null, eegModel: null };

/** A stored or imported profile; the keys the profile no longer has (`instructor` and `panel`, the two-view choices
 *  retired on 6 November 2026) are ignored, so an older site file still imports. */
export function parseSite(raw: unknown): SiteProfile {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Partial<SiteProfile>;
  const d = DEFAULT_SITE;
  return {
    schema: 'pme-site/1',
    skin: MONITORS.some((m) => m.id === o.skin) ? (o.skin as string) : d.skin,
    theme: THEMES.some(([t]) => t === o.theme) ? (o.theme as SiteProfile['theme']) : d.theme,
    fps: o.fps === 30 ? 30 : 60,
    gasUnit: o.gasUnit === 'kPa' ? 'kPa' : 'mmHg',
    sensorsOff: o.sensorsOff === true,
    drugNames: o.drugNames === 'uk' ? 'uk' : 'us',
    defibModel: DEFIB_CHOICES.some((c) => c.id === o.defibModel) ? (o.defibModel as string) : d.defibModel,
    eegModel: EEG_CHOICES.some((c) => c.id === o.eegModel) ? (o.eegModel as string) : d.eegModel,
  };
}

export function loadSite(): SiteProfile {
  try {
    return parseSite(JSON.parse(store.get('site') ?? '{}'));
  } catch {
    return { ...DEFAULT_SITE };
  }
}

export function saveSite(s: SiteProfile): void {
  store.set('site', JSON.stringify(s));
}

/** The rail's light/dark switch (E125): the Screen theme dark ('') or projector-light, saved for this browser and
 *  applied to the shell; the caller restyles the monitor (the session's setSkin). */
export function setLightScreen(site: SiteProfile, light: boolean, root: HTMLElement = document.documentElement): void {
  site.theme = light ? 'projector-light' : '';
  saveSite(site);
  root.dataset.theme = light ? 'bench' : '';
}

/** mmHg → the site's gas unit (1 kPa = 7.50062 mmHg). */
export const gas = (mmHg: number, unit: SiteProfile['gasUnit']): number => (unit === 'kPa' ? mmHg / 7.50062 : mmHg);
