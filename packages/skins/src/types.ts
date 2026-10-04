// Skin data model (brief §3.8; research 06 §5 is the reference instance). A skin is DATA: every field below is
// validated by src/schema.ts, and every leaf value is covered by a `provenance` entry (tag + report/section).
// Levels are numbered 1..3 everywhere (1 = highest); `alarms.levelNames` gives the display names.

export type Hex = string; // '#RRGGBB'
export type Level = 'L1' | 'L2' | 'L3';
export type AgeBand = 'adult' | 'paed' | 'neo';

/** Confidence tags: research 06's own (measured … inferred), brief/research-cited `documented`, and `eng` choices. */
export type ProvTag = 'documented' | 'measured' | 'assumed' | 'unverified' | 'conflict' | 'inferred' | 'eng';
export interface ProvEntry {
  tag: ProvTag;
  /** Where the value comes from: 'research/06 §3.2', 'brief §6.8', … ('ENG' only with tag 'eng'). */
  source: string;
  note?: string;
}
/** Keys are dotted paths into the skin ('colors.IBP3', 'alarms.sound'); an entry covers that path and below. */
export type Provenance = Record<string, ProvEntry>;

export const COLOR_KEYS = [
  'ECG', 'HR', 'ST', 'PVC', 'SpO2', 'PLETH', 'PR', 'PI', 'NIBP', 'ART', 'CVP', 'PAP', 'ICP',
  'PbtO2', 'UO', // Stage 7d
  'IBP1', 'IBP2', 'IBP3', 'IBP4', 'RESP', 'CO2', 'AWRR', 'TEMP', 'BFA', 'AGENTS',
  'NMT', // Stage 7f: neuromuscular transmission (TOF) tile
] as const;
export type ColorKey = (typeof COLOR_KEYS)[number];
/** Colour keys every skin must define (the rest are optional). */
export const REQUIRED_COLOR_KEYS = ['ECG', 'HR', 'SpO2', 'PLETH', 'NIBP', 'RESP', 'CO2', 'TEMP'] as const;

export const LANE_IDS = ['ECG1', 'ECG2', 'ECG3', 'PLETH', 'ART', 'CVP', 'PAP', 'IBP1', 'IBP2', 'IBP3', 'IBP4', 'RESP', 'CO2', 'ICP'] as const; // Stage 7d: ICP
export type LaneId = (typeof LANE_IDS)[number];
export const TILE_PARAMS = ['HR', 'NIBP', 'ART', 'CVP', 'PAP', 'IBP1', 'IBP2', 'IBP3', 'IBP4', 'SpO2', 'TEMP', 'RR', 'CO2', 'ST', 'NMT', 'BFA', 'ICP', 'PbtO2', 'UO', 'AGENTS'] as const; // Stage 7f: NMT, BFA; Stage 7d: ICP, PbtO2, UO; FU-8 (A10-E5): AGENTS
export type TileParam = (typeof TILE_PARAMS)[number];
export const PAGE_KINDS = ['standard', 'multiEcg', 'dualSpo2', 'ibp', 'bigNumber', 'pump'] as const;
export type PageKind = (typeof PAGE_KINDS)[number];
export const HEADER_ITEMS = ['page', 'bed', 'category', 'alarmState', 'silenceCountdown', 'battery', 'recorder', 'network', 'datetime'] as const;
export type HeaderItem = (typeof HEADER_ITEMS)[number];
export const LAMP_STYLES = ['red-flash', 'yellow-flash', 'yellow-steady', 'cyan-steady', 'off'] as const;
export type LampStyle = (typeof LAMP_STYLES)[number];
export const SOUND_PROFILES = ['iec-style', 'traditional', 'saadat'] as const;
export type SoundProfileId = (typeof SOUND_PROFILES)[number];
export const PITCH_MAPS = ['none', 'nellcor-like', 'enhanced'] as const;
export type PitchMapId = (typeof PITCH_MAPS)[number];

export interface TileSpec {
  param: TileParam;
  size?: 'large' | 'normal';
  /** Secondary values drawn in the tile ('PI', 'PR', 'T2', 'DT', 'EtCO2', 'FiCO2', 'AWRR', 'PPV', 'MEAN'; FU-8: 'IMCO2' — the
   * inspired minimum CO2 under the vendor's word, imCO2 on Philips, FiCO2 elsewhere, research/11 glossary #16). */
  extras?: string[];
}
/** Sensors whose attachment can swap a lane and a tile (showcase hotfix item 4: the Saadat-style capnogram). */
export const SWAP_SENSORS = ['co2'] as const;
export type SwapSensor = (typeof SWAP_SENSORS)[number];
/**
 * What a sensor takes over while it is attached: `lanes` maps a lane to the lane drawn in its place (same position),
 * `tiles` a tile to the tile drawn in its place. Applied in one place, resolveSkin's `sensors` option; a skin without
 * the rule resolves identically whatever the sensors.
 */
export interface SensorSwap {
  lanes?: Partial<Record<LaneId, LaneId>>;
  tiles?: Partial<Record<TileParam, TileSpec>>;
}
export interface PumpPage {
  watermark: string;
  ibpAutoScale: boolean;
  hideScaleNumbers: boolean;
  asystoleMessagePersistsThroughSilence: boolean;
}
export interface PageSpec {
  id: string;
  kind: PageKind;
  label: string;
  /** Lanes on this page; omitted = layout.lanes. */
  lanes?: LaneId[];
  /** multiEcg pages: number of ECG traces (2, 4, 7 or 12 on the B9). */
  ecgTraces?: number;
  /** bigNumber pages: which numerics are drawn large, in order. */
  bigNumbers?: TileParam[];
  pump?: PumpPage;
}
export type Colors = Partial<Record<ColorKey, Hex>>;
export interface SweepChannel {
  options: number[];
  default: number;
}
export interface MessageBarColors {
  bg: Hex;
  fg: Hex;
}
export type LimitPair = [number, number];
/** Values are [low, high], a single threshold (seconds, %V), or null = not published (never invented). */
export type LimitTable = Record<string, LimitPair | number | null>;
export interface LimitBand {
  /** Band inherits every key it does not define from this band (research 06 §5 `_inherit`). */
  inherit?: AgeBand;
  values: LimitTable;
}

export interface Skin {
  schema: 'pme-skin/1';
  kind: 'skin';
  id: string;
  label: string;
  /** Base defaults file this skin is merged over ('iec-defaults'); omitted = the file is complete on its own. */
  extends?: string;
  scheme: 'dark' | 'projector-light' | 'ecg-grid';
  background: Hex;
  foreground: Hex;
  chrome: {
    divider: Hex;
    windowFrame: Hex;
    focusFill: Hex;
    softkeyFrame: Hex;
    pageBox: MessageBarColors;
    patientCategoryColor: Hex;
    grid: { minorMm: number; majorMm: number; minor: Hex; major: Hex } | null;
  };
  font: { stack: string; numericWeight: number; labelCase: 'upper' | 'as-is' };
  colors: Colors;
  colorBinding: 'byLabel' | 'byChannel';
  ecgColorLocked: boolean;
  layout: {
    waveAreaFraction: number;
    lanes: LaneId[];
    tiles: TileSpec[][];
    menuRegion: 'popup' | 'wave-area-bottom';
    header: HeaderItem[];
    messageBars: 'single-under-header' | 'split-technical-physiological';
    /** Text drawn in the header when the layout is not taken from the vendor's manual (Stage 4b, gate G4a). */
    badge?: string;
    /** Lanes and tiles a sensor takes over while it is attached (saadat-like: CO2 replaces RESP and RR). */
    whenAttached?: Partial<Record<SwapSensor, SensorSwap>>;
  };
  pages: PageSpec[];
  defaultPage: string;
  calendar: { default: 'gregorian' | 'solar'; options: Array<'gregorian' | 'solar'>; gregorianFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' };
  language: string;
  sweep: {
    ecg: SweepChannel;
    pleth: SweepChannel;
    ibp: SweepChannel;
    resp: SweepChannel;
    co2: SweepChannel;
    style: 'erase-bar';
    gapPx: number;
    cursorLine: boolean;
    lineWidthPx: number;
  };
  ecg: {
    /** Multipliers of 10 mm/mV (×1 = 10 mm/mV), plus 'AUTO'. */
    gainOptions: Array<number | 'AUTO'>;
    gainDefault: number | 'AUTO';
    gainLabel: 'multiplier' | 'mm-per-mV' | 'cm-per-mV';
    /** Display name → [low Hz, high Hz]. */
    filters: Record<string, LimitPair>;
    filterDefault: string;
    filterLabel: 'letter' | 'name';
    laneLeads: string[];
    cableDefault: '3-wire' | '5-wire' | '10-wire';
    calPulse: { mV: number; ms: number; defaultOn: boolean };
    paceDetectDefault: boolean;
    paceMarker: { style: 'vertical-line' | 'marker-above'; heightMm: number };
    laneLabel: string;
  };
  hr: {
    method: 'trimmed-mean-12rr' | 'mean-12rr' | 'moving-average-seconds';
    windowOptions: number[];
    windowDefault: number | null;
    updateHz: number;
    source: string;
    autoPriority: string[];
    relabelNonEcgAs: string | null;
    /** FU-1 (E-4a-2): optional HR averaging; absent = the `method` default. */
    averaging?: { kind: 'beats' | 'seconds'; n: number };
  };
  spo2: {
    avgOptions: Array<number | string>;
    avgDefault: number;
    sensitivity: string[];
    sensitivityDefault: string;
    plethNormalized: boolean;
    updateHz: number;
  };
  nibp: {
    /** Recorded, not modelled (FU-5): the engine's NIBP is command-driven and idle at power-on on every skin. */
    modeDefault: 'MANUAL' | 'AUTO';
    autoIntervalMin: number | null;
    autoIntervalsMin: number[];
    stat: { count: number; spacingS: number; windowS: number };
    initialInflation: Record<AgeBand, number>;
    nextInflation: 'prevSys+30' | 'prevSys+10';
    doneTone: boolean;
  };
  ibp: {
    filterOptionsHz: number[];
    filterDefaultHz: number;
    gridDefault: boolean;
    scaleLines: 'dotted-upper-mid-lower' | 'none';
    meanOnlyLabels: string[];
    /** Label → [low, mid, high] mmHg. */
    scales: Record<string, [number, number, number]>;
    /**
     * FU-5: a STATIC (non-pulsatile) pressure is shown with its systolic/diastolic/mean kept and only the pulse "-?-"
     * ('keep', Philips IFU [S2] p. 57) or with the mean only ('mean-only', Saadat, research/06 §4.1).
     */
    staticDisplay: 'keep' | 'mean-only';
  };
  co2: {
    unit: 'mmHg' | 'kPa' | '%';
    scale: number;
    scaleUnit: 'mmHg' | '%';
    /** Sidestream transport delay (s) of this vendor's CO2 module (R39-5, research 09 §5); mainstream stays 0. */
    sidestreamDelayS: number;
    /** Sidestream 10–90 % rise time (ms), adult (R39-5); the engine keeps its own neonatal rise. */
    riseTimeMs: number;
  };
  alarms: {
    levels: 3;
    levelNames: [string, string, string];
    soundProfile: SoundProfileId;
    /** Per-level repeat override (s); null = not repeated. Omitted levels keep the profile's cadence. */
    repeatS?: Partial<Record<Level, number | null>>;
    /** Pulses in the low-priority burst when the skin differs from its profile (Philips-like INOP: 2). */
    lowPulses?: 1 | 2;
    volume: { min: number; max: number; default: number };
    lamp: { L1: LampStyle; L2: LampStyle; L3: LampStyle; flashHz: { L1: number; L2: number }; duty: number };
    messageBar: { L1: MessageBarColors; L2: MessageBarColors; L3: MessageBarColors; idle: MessageBarColors; acknowledged: MessageBarColors; prefix: 'asterisks' | 'none'; rotate: boolean; /** FU-5: rotate EVERY unacknowledged message (live or latched), not only the top level (Philips [S2] p. 29–30). */ rotateAll: boolean };
    /**
     * Stage 9 (E-S9-4, FU-5 R-FU5-6): the vendor's own words for alarm texts, where they differ from the IEC table's
     * Philips aliases — `texts` by fixed alarm id ('abpNonPulsatile', 'tempProbeOff', …), `limitLabels` by limit key
     * ('ART_S', 'TEMP', …). Wording only: levels, timing and latching are unchanged. Absent = the IEC table.
     */
    wording?: { texts?: Partial<Record<string, string>>; limitLabels?: Partial<Record<string, string>> };
    numericFlash: boolean;
    /** How an alarmed numeric flashes: the text ('flash-text', default) or a level-coloured box ('flash-box', Mindray-like). */
    numericStyle?: 'flash-text' | 'flash-box';
    factoryEnabled: boolean;
    alwaysOn: string[];
    alarmOffIcon: 'crossed-bell-red' | 'bell-off';
    /**
     * FU-5: `mode` 'mute' = Silence mutes for `durationS` (ZOLL, Saadat); 'acknowledge' = Silence acknowledges every
     * active alarm and INOP, new alarms sound at once, no timer (`durationS` null; research/05 §6 [S2] Philips IntelliVue IFU p. 32, Mindray
     * Alarm Reset [S4] §10.8).
     */
    silence: { mode: 'mute' | 'acknowledge'; durationS: number | null; suppressesVisual: boolean; cancelOnNewAlarm: boolean; headerCountdown: boolean; technicalActsAsAck: boolean };
    pause: { durationS: number } | null;
    /**
     * FU-5: what stays on screen (visual) and sounding (audible) after the condition ends, until acknowledged.
     * 'lethal' = ASYSTOLE, VFIB, VTAC, EXTREME BRADY/TACHY; 'red' = every level-1 alarm; 'redYellow' = levels 1–2.
     * Technical alarms (INOPs) never latch (research/05 §6 [S2] Philips IntelliVue IFU p. 40).
     */
    latching: { visual: 'off' | 'lethal' | 'red' | 'redYellow'; audible: 'off' | 'red' | 'redYellow' };
    /** FU-5: the arterial-line disconnect alarm (static, mean < 10 mmHg) is ON by default (Philips [S2] p. 44; Saadat OFF). */
    abpDisconnectDefault: boolean;
    delayS: number;
    spo2DelayS: number | null;
    alarmFreezeOption: boolean;
    recall: { count: number; windowS: LimitPair } | null;
  };
  limits: Record<AgeBand, LimitBand | null>;
  arrhythmia: {
    defaultOn: boolean;
    asystoleS: { adult: number; neo: number };
    asystoleAltS: number | null;
    pause: { adultS: number; neoS: number } | { ratio: number };
    vtac: { rate: number; count: number };
    tachy: number | null;
    brady: number | null;
    freqPvcPerMin: number;
    /** FU-5: the PAUSE alarm's factory switch (Mindray: Off, [S4] App. C.1.1.2). */
    pauseAlarm: boolean;
  };
  st: { defaultOn: boolean; isoMs: number; stMs: number; updateS: number };
  beep: { source: 'ECG' | 'PLETH' | 'HR_SOURCE'; defaultOn: boolean; volume: { min: number; max: number; default: number }; pitchMap: PitchMapId; baseHz: number };
  syncMarker: 'line' | 'triangle-mid-qrs' | 'r-above' | null;
  defib: {
    energyAdultJ: number;
    energyPaedJ: number;
    aedSequenceJ: number[] | null;
    chargeTimeS: Record<string, number> | null;
    readyTimeoutS: number;
    toneSet: 'zoll-like' | 'lifepak-like';
  } | null;
  pacer: { rateDefault: number; rateRange: LimitPair; mADefault: number; mARange: LimitPair; mAStep: { up: number; down: number }; modeDefault: 'demand' | 'fixed'; pausePct: number | null } | null;
  trend: { style: 'line' | 'filled-area'; hours: number };
  /**
   * FU-5: `questionable` is appended to a questionable numeric ("97?"); `inop` replaces a numeric whose technical alarm
   * is active ("-?-" on the research/05 §6 [S2] Philips IntelliVue IFU p. 55–62).
   */
  glyphs: { noValue: string; hrUnavailable: string; nibpFail: string; questionable: string; inop: string };
  provenance: Provenance;
}

/** A theme is applied over any resolved skin (brief §3.8 schemes). */
export interface Theme {
  schema: 'pme-theme/1';
  kind: 'theme';
  id: string;
  label: string;
  scheme: 'projector-light' | 'ecg-grid';
  background: Hex;
  foreground: Hex;
  chrome: Partial<Skin['chrome']>;
  /** Every parameter colour is darkened (HSL lightness only) until it reaches this contrast on `background`. */
  colorTransform: { kind: 'darken-to-contrast'; minRatio: number };
  messageBarIdle: MessageBarColors;
  provenance: Provenance;
}

/** A preset is a named partial skin merged over its base skin (brief §3.8 `presets`, §6.9). */
export interface Preset {
  schema: 'pme-preset/1';
  kind: 'preset';
  id: string;
  label: string;
  base: string;
  /** Partial skin; arrays replace, objects merge. */
  overrides: DeepPartial<Omit<Skin, 'schema' | 'kind' | 'id' | 'label' | 'extends' | 'provenance'>>;
  /** Per-parameter alarm switches the preset turns ON/OFF (the base's factoryEnabled applies to the rest). */
  alarmSwitches?: Record<string, boolean>;
  /** Monitor states the preset starts in that are not skin defaults (research 06 §3.1 F7 'APNEA LIMIT: OFF'). */
  startState?: { apneaLimit?: 'OFF' | number };
  provenance: Provenance;
}

export type DeepPartial<T> = T extends unknown[] ? T : T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;
