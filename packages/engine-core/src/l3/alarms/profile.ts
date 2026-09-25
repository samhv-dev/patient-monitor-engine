// The device layer's view of a skin (brief §3.8, §6.4, §6.4.1, §6.5, §6.8): everything the alarm manager, the
// defibrillator and the pacer need, as plain JSON-safe data built once per skin/age-band switch from @pme/skins.
import { resolveSkin, type LimitTable, type ResolvedSkin, type Skin } from '@pme/skins';
import type { AgeBand, AlarmLevel } from '../../types-device.ts';
import type { NumericId } from '../../types.ts';

/** Skin limit key → the measured numeric it watches and its display labels (IEC-style / Saadat-like). */
export const LIMIT_KEYS: Readonly<Record<string, { numeric: NumericId; label: string; upper: string; gas?: boolean }>> = {
  HR: { numeric: 'hr', label: 'HR', upper: 'HR' },
  SpO2: { numeric: 'spo2', label: 'SpO2', upper: '%SPO2' }, // "%SPO2 LOW" (brief §6.4.1)
  NIBP_S: { numeric: 'nibpSys', label: 'NBPs', upper: 'NIBP SYS' },
  NIBP_D: { numeric: 'nibpDia', label: 'NBPd', upper: 'NIBP DIA' },
  NIBP_M: { numeric: 'nibpMean', label: 'NBPm', upper: 'NIBP MEAN' },
  ART_S: { numeric: 'abpSys', label: 'ABPs', upper: 'ART SYS' },
  ART_D: { numeric: 'abpDia', label: 'ABPd', upper: 'ART DIA' },
  ART_M: { numeric: 'abpMean', label: 'ABPm', upper: 'ART MEAN' },
  CVP_M: { numeric: 'cvpMean', label: 'CVP', upper: 'CVP MEAN' },
  PAP_S: { numeric: 'papSys', label: 'PAPs', upper: 'PAP SYS' },
  PAP_D: { numeric: 'papDia', label: 'PAPd', upper: 'PAP DIA' },
  PAP_M: { numeric: 'papMean', label: 'PAPm', upper: 'PAP MEAN' },
  RR: { numeric: 'rr', label: 'RR', upper: 'RR' },
  AWRR: { numeric: 'awrr', label: 'awRR', upper: 'AWRR', gas: true },
  EtCO2: { numeric: 'etco2', label: 'etCO2', upper: 'ETCO2', gas: true },
  EtCO2_pctV: { numeric: 'etco2', label: 'etCO2', upper: 'ETCO2', gas: true },
  TEMP: { numeric: 'tempCore', label: 'Temp', upper: 'TEMP' },
  T1: { numeric: 'tempCore', label: 'T1', upper: 'T1' },
  T2: { numeric: 'tempSite', label: 'T2', upper: 'T2' },
  ST_mV: { numeric: 'stII', label: 'ST-II', upper: 'ST-II' },
};

/** %V → mmHg at the simulated barometric pressure (brief §6.8: the engine shows CO2 in mmHg, R12) [ENG 760 mmHg]. */
export const BAROMETRIC_MMHG = 760;
/** Skins whose HR reads dashes and whose HR alarms are off while the pacer runs (research/05 §2.6, LIFEPAK 15). */
export const PACING_HR_DASHES: ReadonlySet<string> = new Set(['lifepak-like']);
/** Apnoea time when the skin's limit table has none (brief §6.4 "apnoea (20 s)"). */
export const APNEA_DEFAULT_S = 20;

export interface LimitDef {
  numeric: NumericId;
  label: string;
  upper: string;
  low: number | null;
  high: number | null;
  level: AlarmLevel;
  approximate: boolean;
}

export interface DeviceProfile {
  skin: string;
  ageBand: AgeBand;
  /** 'asterisks' → IEC-style `***HR 130>120`; 'none' → Saadat-like `HR TOO HIGH` (brief §6.4, §6.4.1). */
  prefix: 'asterisks' | 'none';
  factoryEnabled: boolean;
  /** Preset per-parameter switches by limit-key group ('HR', 'NIBP', 'SpO2', …) over factoryEnabled (brief §6.9). */
  switches: Record<string, boolean>;
  alwaysOn: string[];
  latching: boolean;
  delayS: number;
  spo2DelayS: number;
  silence: { durationS: number; suppressesVisual: boolean; cancelOnNewAlarm: boolean; technicalActsAsAck: boolean };
  pauseS: number | null;
  volume: { min: number; max: number; default: number };
  limits: Record<string, LimitDef>;
  /** APNEA after this long without a breath (skin `apneaS`, brief §6.4 / §6.4.1); null = APNEA LIMIT OFF (preset). */
  apneaS: number | null;
  /** SpO2 desaturation threshold (%), level 1 (brief §6.4), or null. */
  desat: number | null;
  arrhythmia: {
    defaultOn: boolean;
    asystoleS: number;
    pause: { s: number } | { ratio: number };
    vtacRate: number;
    vtacCount: number;
    tachy: number | null;
    brady: number | null;
  };
  /** PVCs/min alarm threshold (brief §6.4 "PVCs/min (10)"). */
  arrhythmiaPvcPerMin: number;
  defib: Skin['defib'];
  pacer: Skin['pacer'];
  syncMarker: Skin['syncMarker'];
  nibpDoneTone: boolean;
  hrDashesWhilePacing: boolean;
}

/** Limit-key group a per-parameter switch acts on: 'NIBP_S' → 'NIBP', 'ART_M' → 'ART', 'HR' → 'HR'. */
export const limitGroup = (key: string): string => key.split('_')[0] as string;

/** Engine age bands (brief §7.1 EngineOptions.device.ageBand) → skin bands. */
export function skinBand(b: 'adult' | 'paediatric' | 'neonatal' | AgeBand | undefined): AgeBand {
  return b === 'paediatric' || b === 'paed' ? 'paed' : b === 'neonatal' || b === 'neo' ? 'neo' : 'adult';
}

/** Limit alarm level: Saadat-like parameter alarms default to 1, gas alarms 2 (brief §6.4.1); IEC-style limit
 * alarms are yellow (2) as on the Philips-like `**` messages (research/05 §2.4) [ENG for the IEC mapping]. */
function limitLevel(skin: Skin, gas: boolean): AlarmLevel {
  if (skin.alarms.soundProfile === 'saadat') return gas ? 2 : 1;
  return 2;
}

function limitsFor(r: ResolvedSkin, band: AgeBand): Record<string, LimitDef> {
  const table: LimitTable = r.limits[band] ?? {};
  const out: Record<string, LimitDef> = {};
  for (const [key, v] of Object.entries(table)) {
    const k = LIMIT_KEYS[key];
    if (!k || !Array.isArray(v)) continue;
    const scale = key.endsWith('_pctV') ? BAROMETRIC_MMHG / 100 : 1;
    out[key] = {
      numeric: k.numeric,
      label: k.label,
      upper: k.upper,
      low: v[0] * scale,
      high: v[1] * scale,
      level: limitLevel(r.skin, k.gas === true),
      approximate: r.approximateLimits[band].includes(key),
    };
  }
  return out;
}

/** Build the profile for a skin (or preset) id and an age band. Throws for an unknown id (resolveSkin does). */
export function deviceProfile(id: string, band: AgeBand = 'adult'): DeviceProfile {
  const r = resolveSkin(id);
  const s = r.skin;
  const a = s.alarms;
  const ar = s.arrhythmia;
  const desat = r.limits[band]?.SpO2_desat;
  const apnea = r.limits[band]?.apneaS;
  const apneaLimit = r.preset?.startState?.apneaLimit; // research/06 §3.1 F7: a real ICU had APNEA LIMIT OFF
  return {
    skin: id,
    ageBand: band,
    prefix: a.messageBar.prefix,
    factoryEnabled: a.factoryEnabled,
    switches: { ...(r.preset?.alarmSwitches ?? {}) },
    alwaysOn: [...a.alwaysOn],
    latching: a.latching,
    delayS: a.delayS,
    spo2DelayS: a.spo2DelayS ?? a.delayS,
    silence: { durationS: a.silence.durationS, suppressesVisual: a.silence.suppressesVisual, cancelOnNewAlarm: a.silence.cancelOnNewAlarm, technicalActsAsAck: a.silence.technicalActsAsAck },
    pauseS: a.pause ? a.pause.durationS : null,
    volume: { ...a.volume },
    limits: limitsFor(r, band),
    desat: typeof desat === 'number' ? desat : null,
    apneaS: apneaLimit === 'OFF' ? null : typeof apneaLimit === 'number' ? apneaLimit : typeof apnea === 'number' ? apnea : APNEA_DEFAULT_S,
    arrhythmia: {
      defaultOn: ar.defaultOn,
      asystoleS: band === 'neo' ? ar.asystoleS.neo : ar.asystoleS.adult,
      pause: 'ratio' in ar.pause ? { ratio: ar.pause.ratio } : { s: band === 'neo' ? ar.pause.neoS : ar.pause.adultS },
      vtacRate: ar.vtac.rate,
      vtacCount: ar.vtac.count,
      tachy: ar.tachy,
      brady: ar.brady,
    },
    arrhythmiaPvcPerMin: ar.freqPvcPerMin,
    defib: s.defib ? structuredClone(s.defib) : null,
    pacer: s.pacer ? structuredClone(s.pacer) : null,
    syncMarker: s.syncMarker,
    nibpDoneTone: s.nibp.doneTone,
    hrDashesWhilePacing: PACING_HR_DASHES.has(r.skinId),
  };
}
