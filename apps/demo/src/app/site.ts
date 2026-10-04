// The site profile (research/13 P11, Laerdal's profile vs scenario split): which monitor the room shows, its theme and
// alarm defaults, and the shell's units and speed. It belongs to the room, not to a case, so loading a scenario never
// changes it. Stored per browser (a convenience, research/13 brief §5) and exportable as one JSON file.
import { store } from './store.ts';

export interface SiteProfile {
  schema: 'pme-site/1';
  /** A skin or preset id (resolveSkin): 'saadat-like', 'iran-icu-as-found' (alarms off, as found in the ICU), … */
  skin: string;
  /** '' = the skin's own dark look; 'projector-light' | 'ecg-grid'. */
  theme: '' | 'projector-light' | 'ecg-grid';
  /** Frame rate cap: 30 for projectors and tablets on battery. */
  fps: 60 | 30;
  /** Where the instructor works by default on a wide screen: beside the monitor or in a drawer over it. */
  panel: 'split' | 'drawer';
  /** Gas partial pressures in the shell's tables (the monitor keeps its skin's unit). */
  gasUnit: 'mmHg' | 'kPa';
  /** New patients start with the sensors off: the learner attaches them and traces appear only then (Laerdal). */
  sensorsOff: boolean;
  /** Drug names on every screen (orchestrator ruling 5; Ali's open question Q13): 'us' "epinephrine / norepinephrine"
   *  (default), 'uk' "adrenaline / noradrenaline". */
  drugNames: 'us' | 'uk';
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
/** The drug-name sets, in the words the Settings screen uses (orchestrator ruling 5). */
export const DRUG_NAME_SETS: ReadonlyArray<[SiteProfile['drugNames'], string]> = [['us', 'Epinephrine, norepinephrine'], ['uk', 'Adrenaline, noradrenaline']];
export const THEMES: ReadonlyArray<[SiteProfile['theme'], string]> = [['', 'Dark'], ['projector-light', 'Projector (light)'], ['ecg-grid', 'ECG paper grid']];

export const DEFAULT_SITE: SiteProfile = { schema: 'pme-site/1', skin: 'saadat-like', theme: '', fps: 60, panel: 'split', gasUnit: 'mmHg', sensorsOff: false, drugNames: 'us' };

export function parseSite(raw: unknown): SiteProfile {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Partial<SiteProfile>;
  const d = DEFAULT_SITE;
  return {
    schema: 'pme-site/1',
    skin: MONITORS.some((m) => m.id === o.skin) ? (o.skin as string) : d.skin,
    theme: THEMES.some(([t]) => t === o.theme) ? (o.theme as SiteProfile['theme']) : d.theme,
    fps: o.fps === 30 ? 30 : 60,
    panel: o.panel === 'drawer' ? 'drawer' : 'split',
    gasUnit: o.gasUnit === 'kPa' ? 'kPa' : 'mmHg',
    sensorsOff: o.sensorsOff === true,
    drugNames: o.drugNames === 'uk' ? 'uk' : 'us',
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

/** mmHg → the site's gas unit (1 kPa = 7.50062 mmHg). */
export const gas = (mmHg: number, unit: SiteProfile['gasUnit']): number => (unit === 'kPa' ? mmHg / 7.50062 : mmHg);
