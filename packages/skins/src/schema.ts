// JSON Schemas (draft-07, validated with ajv) for skins, themes and presets (brief §3.8). Built from small helpers
// so the schema and src/types.ts read side by side. Every object is closed (additionalProperties: false) and every
// property is required unless listed in `opt`: a shipped skin can neither miss a field nor carry an unknown one.
import { COLOR_KEYS, HEADER_ITEMS, LAMP_STYLES, LANE_IDS, PAGE_KINDS, PITCH_MAPS, REQUIRED_COLOR_KEYS, SOUND_PROFILES, TILE_PARAMS } from './types.ts';

export type JsonSchema = Record<string, unknown>;

/** Closed object: every key of `req` is required, keys of `opt` are optional. */
export const obj = (req: Record<string, JsonSchema>, opt: Record<string, JsonSchema> = {}): JsonSchema => ({
  type: 'object',
  properties: { ...req, ...opt },
  required: Object.keys(req),
  additionalProperties: false,
});
const str: JsonSchema = { type: 'string', minLength: 1 };
const bool: JsonSchema = { type: 'boolean' };
const num = (minimum?: number, maximum?: number): JsonSchema => ({ type: 'number', ...(minimum !== undefined ? { minimum } : {}), ...(maximum !== undefined ? { maximum } : {}) });
const int = (minimum: number, maximum: number): JsonSchema => ({ type: 'integer', minimum, maximum });
const en = (values: readonly (string | number)[]): JsonSchema => ({ enum: [...values] });
const arr = (items: JsonSchema, minItems = 0): JsonSchema => ({ type: 'array', items, minItems });
const nullable = (s: JsonSchema): JsonSchema => ({ anyOf: [s, { type: 'null' }] });
const pair: JsonSchema = { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 };
const triple: JsonSchema = { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 };
export const hex: JsonSchema = { type: 'string', pattern: '^#[0-9A-F]{6}$' };
const record = (value: JsonSchema, keyPattern = '^[A-Za-z0-9_]+$'): JsonSchema => ({
  type: 'object',
  patternProperties: { [keyPattern]: value },
  additionalProperties: false,
});
const barColors = obj({ bg: hex, fg: hex });
const sweepChannel = obj({ options: arr(num(0.5, 100), 1), default: num(0.5, 100) });
const limitValue = { anyOf: [pair, { type: 'number' }, { type: 'null' }] };

export const provenanceSchema: JsonSchema = record(
  obj(
    { tag: en(['documented', 'measured', 'assumed', 'unverified', 'conflict', 'inferred', 'eng']), source: { type: 'string', minLength: 3 } },
    { note: str },
  ),
  '^[A-Za-z0-9_]+(\\.[A-Za-z0-9_]+)*$',
);

const chrome = obj({
  divider: hex,
  windowFrame: hex,
  focusFill: hex,
  softkeyFrame: hex,
  pageBox: barColors,
  patientCategoryColor: hex,
  grid: nullable(obj({ minorMm: num(0.5, 10), majorMm: num(1, 50), minor: hex, major: hex })),
});

const colors: JsonSchema = {
  type: 'object',
  properties: Object.fromEntries(COLOR_KEYS.map((k) => [k, hex])),
  required: [...REQUIRED_COLOR_KEYS],
  additionalProperties: false,
};

const tile = obj({ param: en(TILE_PARAMS) }, { size: en(['large', 'normal']), extras: arr({ type: 'string', pattern: '^[A-Za-z0-9%]+$' }) });
const page = obj(
  { id: { type: 'string', pattern: '^P[0-9]{1,2}$' }, kind: en(PAGE_KINDS), label: str },
  {
    lanes: arr(en(LANE_IDS), 1),
    ecgTraces: int(1, 12),
    bigNumbers: arr(en(TILE_PARAMS), 1),
    pump: obj({ watermark: str, ibpAutoScale: bool, hideScaleNumbers: bool, asystoleMessagePersistsThroughSilence: bool }),
  },
);

const lamp = en(LAMP_STYLES);
const alarms = obj(
  {
    levels: { const: 3 },
    levelNames: { type: 'array', items: str, minItems: 3, maxItems: 3 },
    soundProfile: en(SOUND_PROFILES),
    volume: obj({ min: int(0, 10), max: int(1, 10), default: int(0, 10) }),
    lamp: obj({ L1: lamp, L2: lamp, L3: lamp, flashHz: obj({ L1: num(0.1, 5), L2: num(0.1, 5) }), duty: num(0.2, 0.6) }),
    messageBar: obj({ L1: barColors, L2: barColors, L3: barColors, idle: barColors, acknowledged: barColors, prefix: en(['asterisks', 'none']), rotate: bool }),
    numericFlash: bool,
    factoryEnabled: bool,
    alwaysOn: arr(str),
    alarmOffIcon: en(['crossed-bell-red', 'bell-off']),
    silence: obj({ durationS: num(10, 600), suppressesVisual: bool, cancelOnNewAlarm: bool, headerCountdown: bool, technicalActsAsAck: bool }),
    pause: nullable(obj({ durationS: num(10, 900) })),
    latching: bool,
    delayS: num(0, 30),
    spo2DelayS: nullable(num(0, 60)),
    alarmFreezeOption: bool,
    recall: nullable(obj({ count: int(1, 1000), windowS: pair })),
  },
  { repeatS: obj({}, { L1: nullable(num(1, 60)), L2: nullable(num(1, 60)), L3: nullable(num(1, 60)) }), lowPulses: en([1, 2]) },
);

const limitBand = nullable(obj({ values: record(limitValue) }, { inherit: en(['adult', 'paed', 'neo']) }));

export const skinSchema: JsonSchema = {
  ...obj({
    schema: { const: 'pme-skin/1' },
    kind: { const: 'skin' },
    id: { type: 'string', pattern: '^[a-z0-9]+(-[a-z0-9]+)*-like$' },
    label: str,
    scheme: en(['dark', 'projector-light', 'ecg-grid']),
    background: hex,
    foreground: hex,
    chrome,
    font: obj({ stack: str, numericWeight: int(100, 900), labelCase: en(['upper', 'as-is']) }),
    colors,
    colorBinding: en(['byLabel', 'byChannel']),
    ecgColorLocked: bool,
    layout: obj({
      waveAreaFraction: num(0.3, 0.85),
      lanes: arr(en(LANE_IDS), 1),
      tiles: arr(arr(tile, 1), 1),
      menuRegion: en(['popup', 'wave-area-bottom']),
      header: arr(en(HEADER_ITEMS), 1),
      messageBars: en(['single-under-header', 'split-technical-physiological']),
    }),
    pages: arr(page, 1),
    defaultPage: { type: 'string', pattern: '^P[0-9]{1,2}$' },
    calendar: obj({
      default: en(['gregorian', 'solar']),
      options: arr(en(['gregorian', 'solar']), 1),
      gregorianFormat: en(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']),
    }),
    language: str,
    sweep: obj({
      ecg: sweepChannel, pleth: sweepChannel, ibp: sweepChannel, resp: sweepChannel, co2: sweepChannel,
      style: { const: 'erase-bar' }, gapPx: num(2, 24), cursorLine: bool, lineWidthPx: num(1, 3),
    }),
    ecg: obj({
      gainOptions: arr({ anyOf: [num(0.1, 8), { const: 'AUTO' }] }, 1),
      gainDefault: { anyOf: [num(0.1, 8), { const: 'AUTO' }] },
      gainLabel: en(['multiplier', 'mm-per-mV', 'cm-per-mV']),
      filters: record(pair, '^[A-Z][A-Za-z. ]*$'),
      filterDefault: str,
      filterLabel: en(['letter', 'name']),
      laneLeads: arr(en(['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6']), 1),
      cableDefault: en(['3-wire', '5-wire', '10-wire']),
      calPulse: obj({ mV: num(0.1, 2), ms: num(50, 1000), defaultOn: bool }),
      paceDetectDefault: bool,
      paceMarker: obj({ style: en(['vertical-line', 'marker-above']), heightMm: num(1, 20) }),
      laneLabel: str,
    }),
    hr: obj({
      method: en(['trimmed-mean-12rr', 'mean-12rr', 'moving-average-seconds']),
      windowOptions: arr(num(1, 60)),
      windowDefault: nullable(num(1, 60)),
      updateHz: num(0.1, 10),
      source: str,
      autoPriority: arr(str),
      relabelNonEcgAs: nullable(str),
    }),
    spo2: obj({
      avgOptions: arr({ anyOf: [num(1, 30), str] }, 1),
      avgDefault: num(1, 30),
      sensitivity: arr(str, 1),
      sensitivityDefault: str,
      plethNormalized: bool,
      updateHz: num(0.1, 10),
    }),
    nibp: obj({
      modeDefault: en(['MANUAL', 'AUTO']),
      autoIntervalMin: nullable(num(1, 1440)),
      autoIntervalsMin: arr(num(1, 1440), 1),
      stat: obj({ count: int(1, 20), spacingS: num(0, 120), windowS: num(60, 900) }),
      initialInflation: obj({ adult: num(50, 300), paed: num(50, 300), neo: num(40, 200) }),
      nextInflation: en(['prevSys+30', 'prevSys+10']),
      doneTone: bool,
    }),
    ibp: obj({
      filterOptionsHz: arr(num(1, 100), 1),
      filterDefaultHz: num(1, 100),
      gridDefault: bool,
      scaleLines: en(['dotted-upper-mid-lower', 'none']),
      meanOnlyLabels: arr(str),
      scales: record(triple),
    }),
    co2: obj({ unit: en(['mmHg', 'kPa', '%']), scale: num(1, 100), scaleUnit: en(['mmHg', '%']) }),
    alarms,
    limits: obj({ adult: limitBand, paed: limitBand, neo: limitBand }),
    arrhythmia: obj({
      defaultOn: bool,
      asystoleS: obj({ adult: num(1, 20), neo: num(1, 20) }),
      asystoleAltS: nullable(num(1, 20)),
      pause: { anyOf: [obj({ adultS: num(0.5, 10), neoS: num(0.5, 10) }), obj({ ratio: num(1, 5) })] },
      vtac: obj({ rate: num(60, 250), count: int(3, 20) }),
      tachy: nullable(num(60, 300)),
      brady: nullable(num(20, 120)),
      freqPvcPerMin: num(1, 60),
    }),
    st: obj({ defaultOn: bool, isoMs: num(-200, 0), stMs: num(0, 400), updateS: num(1, 60) }),
    beep: obj({
      source: en(['ECG', 'PLETH', 'HR_SOURCE']),
      defaultOn: bool,
      volume: obj({ min: int(0, 10), max: int(1, 10), default: int(0, 10) }),
      pitchMap: en(PITCH_MAPS),
      baseHz: num(150, 2000),
    }),
    syncMarker: nullable(en(['line', 'triangle-mid-qrs', 'r-above'])),
    defib: nullable(
      obj({
        energyAdultJ: num(1, 360),
        energyPaedJ: num(1, 360),
        aedSequenceJ: nullable(arr(num(1, 360), 1)),
        chargeTimeS: nullable(record(num(0.5, 20))),
        readyTimeoutS: num(5, 120),
        toneSet: en(['zoll-like', 'lifepak-like']),
      }),
    ),
    pacer: nullable(
      obj({
        rateDefault: num(30, 180),
        rateRange: pair,
        mADefault: num(0, 200),
        mARange: pair,
        mAStep: obj({ up: num(1, 20), down: num(1, 20) }),
        modeDefault: en(['demand', 'fixed']),
        pausePct: nullable(num(1, 100)),
      }),
    ),
    trend: obj({ style: en(['line', 'filled-area']), hours: num(1, 168) }),
    glyphs: obj({ noValue: str, hrUnavailable: str, nibpFail: str, outOfRange: str, ibpPrUnavailable: str }),
    provenance: provenanceSchema,
  }),
  allOf: [
    {
      if: { properties: { colorBinding: { const: 'byChannel' } } },
      then: { properties: { colors: { required: ['IBP1', 'IBP2', 'IBP3', 'IBP4'] } } },
      else: { properties: { colors: { required: ['ART', 'CVP', 'PAP'] } } },
    },
  ],
};

/** The same schema with every `required` removed (recursively): a skin source file that `extends` a base. */
export function partialOf(schema: JsonSchema): JsonSchema {
  if (Array.isArray(schema)) return schema.map((s) => partialOf(s as JsonSchema)) as unknown as JsonSchema;
  if (schema === null || typeof schema !== 'object') return schema;
  const out: JsonSchema = {};
  for (const [k, v] of Object.entries(schema)) {
    if (k === 'required' || k === 'allOf') continue;
    out[k] = v !== null && typeof v === 'object' ? partialOf(v as JsonSchema) : v;
  }
  return out;
}

/** Skin source files: identity fields required, the rest optional when `extends` names a base. */
export const skinSourceSchema: JsonSchema = {
  ...partialOf(skinSchema),
  properties: {
    ...(partialOf(skinSchema).properties as JsonSchema),
    id: { type: 'string', pattern: '^[a-z0-9]+(-[a-z0-9]+)*$' }, // bases ('iec-defaults') are not '-like'
    extends: { type: 'string', pattern: '^[a-z0-9-]+$' },
  },
  required: ['schema', 'kind', 'id', 'label', 'provenance'],
};

export const themeSchema: JsonSchema = obj({
  schema: { const: 'pme-theme/1' },
  kind: { const: 'theme' },
  id: { type: 'string', pattern: '^[a-z0-9]+(-[a-z0-9]+)*$' },
  label: str,
  scheme: en(['projector-light', 'ecg-grid']),
  background: hex,
  foreground: hex,
  chrome: partialOf(chrome),
  colorTransform: obj({ kind: { const: 'darken-to-contrast' }, minRatio: num(3, 21) }),
  messageBarIdle: barColors,
  provenance: provenanceSchema,
});

export const presetSchema: JsonSchema = obj(
  {
    schema: { const: 'pme-preset/1' },
    kind: { const: 'preset' },
    id: { type: 'string', pattern: '^[a-z0-9]+(-[a-z0-9]+)*$' },
    label: str,
    base: { type: 'string', pattern: '^[a-z0-9-]+-like$' },
    overrides: (() => {
      const p = partialOf(skinSchema);
      const props = { ...(p.properties as Record<string, JsonSchema>) };
      for (const k of ['schema', 'kind', 'id', 'label', 'provenance']) delete props[k];
      return { ...p, properties: props };
    })(),
    provenance: provenanceSchema,
  },
  {
    alarmSwitches: record(bool),
    startState: obj({}, { apneaLimit: { anyOf: [{ const: 'OFF' }, num(10, 60)] } }),
  },
);
