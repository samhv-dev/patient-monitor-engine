// Plan pump-rack-tci.md D12, piece S1: the reference pumps' device profiles (`packages/controller/pump-devices/`), as
// sourced data. Every number sits in an object whose `src` is a row id of research/50-pump-reference-devices.md (the
// catalogue and its page), or the field is a `gap` naming what the operator manual must give. The host (piece C2) checks
// every pump command against these profiles and resolves the bolus and purge rates the engine needs; the pump face (A1)
// draws its ranges from them. This module reads no file, so it runs in the browser as in Node; the CI check
// (test/formulary/sources.test.ts) runs it on the shipped folder, with the JSON Schema and the rows of research/50.

/** The three reference devices (the owner's ruling PQ2 = B): a syringe channel uses `sp-500`, a drip channel
 *  `ot-701`, a TCI channel `sp5-tci` for its TCI numbers and `sp-500` for the rest (D12). */
export const PUMP_DEVICE_IDS = ['sp-500', 'ot-701', 'sp5-tci'] as const;
export type PumpDeviceId = (typeof PUMP_DEVICE_IDS)[number];
/** Each device's rows in research/50: SP-nn, OT-nn, TC-nn. */
const ROW_PREFIX: Record<PumpDeviceId, string> = { 'sp-500': 'SP', 'ot-701': 'OT', 'sp5-tci': 'TC' };
/** A string in a profile is our words or a few printed ones, never a copied catalogue passage [ENG: test; as the formulary's MAX_STATEMENT]. */
export const MAX_DEVICE_TEXT = 200;

/** A research/50 row id, e.g. "SP-04". */
export interface RowSourced {
  src: string;
}
/** A field no source gives: what the operator manual must give, with its research/50 row. */
export interface DeviceGap {
  gap: string;
}
export interface MlHRange extends RowSourced {
  min: number;
  max: number;
  unit?: 'mL/h';
}
export interface RateStep extends RowSourced {
  step: number;
  unit: 'mL/h';
}
export interface Names extends RowSourced {
  names: string[];
}
export interface VolumeRange extends RowSourced {
  min: number;
  max: number;
  unit: 'mL';
}

/** JMS SP-500 syringe pump. */
export interface Sp500Profile {
  deviceId: 'sp-500';
  maker: string;
  model: string;
  kind: 'syringe';
  /** Per syringe size: its flow-rate range and its rapid flow rate ("Approx."), the catalogue's own per-size figures. */
  syringes: Array<RowSourced & { ml: number; rate: MlHRange; rapid: RowSourced & { rate: number; unit: 'mL/h'; approx: boolean } }>;
  rateStep: RateStep;
  /** Bolus and purge run at the syringe size's rapid flow rate (plan D2 item 5, D7); their volume limits are gaps. */
  bolus: RowSourced & { rate: 'rapid'; volume: DeviceGap };
  purge: RowSourced & { rate: 'rapid'; volume: DeviceGap };
  kvo: DeviceGap;
  accuracy: RowSourced & { drivePct: number; withMakerSyringesPct: number; afterH: number; atLeastMlH: number };
  volumeDisplay: VolumeRange;
  occlusion: { levels: Array<RowSourced & { level: 'L' | 'M' | 'H'; kgfCm2: [number, number]; mmHg: [number, number]; kPa: [number, number] }>; alarmTime: DeviceGap };
  nearEnd: DeviceGap;
  syringeBrands: DeviceGap;
  doseRate: DeviceGap;
  alarms: Names;
}

/** One IV set type of the OT-701, with its standard and narrow ranges in mL/h and drops/min. */
export interface DripSet extends RowSourced {
  dropsPerMl: number;
  standard: { mlH: MlHRange; dropsMin: MlHRange };
  narrow: { mlH: MlHRange; dropsMin: MlHRange };
}

/** JMS OT-701 peristaltic (drip-rate) infusion pump. */
export interface Ot701Profile {
  deviceId: 'ot-701';
  maker: string;
  model: string;
  kind: 'drip';
  sets: DripSet[];
  factory: RowSourced & { unit: 'mL/h' | 'drops/min'; range: 'standard' | 'narrow' };
  narrowRange: DeviceGap;
  rateStep: RateStep;
  dropsStep: DeviceGap;
  accuracy: { flow: RowSourced & { pct: number }; drip: RowSourced & { pct: number; afterDrops: number } };
  volumeDisplay: VolumeRange;
  /** 1–9999 mL, or no limit (`none`). */
  volumeLimit: VolumeRange & { none: boolean };
  /** "more than 450 ml/hr": the stated floor (plan D7 carries it as the purge rate). */
  purge: RowSourced & { rateMoreThan: number; unit: 'mL/h'; volume: DeviceGap };
  bolus: RowSourced & { available: false };
  tci: RowSourced & { available: false };
  kvo: RowSourced & { rate: number; unit: 'mL/h'; after: DeviceGap };
  occlusion: { pressure: RowSourced & { kgfCm2: number; plusMinus: number }; alarmTime: DeviceGap };
  airInLine: RowSourced & { method: string; threshold: DeviceGap };
  alarms: Names;
}

/** Mindray BeneFusion SP5 TCI: the maker's page gives its TCI features; every mechanical number is a gap. */
export interface Sp5TciProfile {
  deviceId: 'sp5-tci';
  maker: string;
  model: string;
  kind: 'syringe';
  tci: {
    modes: Names;
    targets: Names;
    drugs: RowSourced & { count: number; which: DeviceGap };
    protocols: RowSourced & { count: number; which: DeviceGap };
    maxRate: DeviceGap;
    patient: DeviceGap;
    targetRange: DeviceGap;
  };
  syringes: DeviceGap;
  rate: DeviceGap;
  bolus: DeviceGap;
  purge: DeviceGap;
  kvo: DeviceGap;
  occlusion: DeviceGap;
  alarms: DeviceGap;
}

export interface PumpDevices {
  'sp-500': Sp500Profile;
  'ot-701': Ot701Profile;
  'sp5-tci': Sp5TciProfile;
}
/** The folder as files: file name → parsed JSON (the JSON Schema left out). */
export type PumpDeviceFiles = Record<string, unknown>;
export interface PumpDeviceProblem {
  file: string;
  path: string;
  why: string;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isDevice = (s: string): s is PumpDeviceId => (PUMP_DEVICE_IDS as readonly string[]).includes(s);

/** Every number in `v` with its path and the nearest object holding it. */
function* numbers(v: unknown, path = '', owner: Obj | null = null): Generator<{ path: string; owner: Obj | null }> {
  if (typeof v === 'number') yield { path, owner };
  else if (Array.isArray(v)) for (let i = 0; i < v.length; i++) yield* numbers(v[i], `${path}/${i}`, owner);
  else if (isObj(v)) for (const [k, x] of Object.entries(v)) yield* numbers(x, `${path}/${k}`, v);
}
function* objects(v: unknown, path = ''): Generator<{ o: Obj; path: string }> {
  if (Array.isArray(v)) for (let i = 0; i < v.length; i++) yield* objects(v[i], `${path}/${i}`);
  else if (isObj(v)) {
    yield { o: v, path };
    for (const [k, x] of Object.entries(v)) yield* objects(x, `${path}/${k}`);
  }
}
function* strings(v: unknown, path = ''): Generator<{ path: string; s: string }> {
  if (typeof v === 'string') yield { path, s: v };
  else if (Array.isArray(v)) for (let i = 0; i < v.length; i++) yield* strings(v[i], `${path}/${i}`);
  else if (isObj(v)) for (const [k, x] of Object.entries(v)) yield* strings(x, `${path}/${k}`);
}

/**
 * The profiles' source rules: each of the three devices has its file, named after its id, and no other device is
 * filed; every number sits in an object with a `src` that is one of this device's research/50 rows; a gap holds no
 * number and no `src` and names what the manual must give; every string is short. An empty list may ship.
 */
export function checkPumpDevices(files: PumpDeviceFiles): PumpDeviceProblem[] {
  const out: PumpDeviceProblem[] = [];
  const no = (file: string, path: string, why: string) => void out.push({ file, path, why });
  for (const id of PUMP_DEVICE_IDS) if (!(`${id}.json` in files)) no(`${id}.json`, '/', 'the profile of a reference device is missing');
  for (const [file, data] of Object.entries(files)) {
    const stem = file.replace(/\.json$/, '');
    if (!isDevice(stem)) {
      no(file, '/', `not a reference device (${PUMP_DEVICE_IDS.join(', ')})`);
      continue;
    }
    if (!isObj(data)) {
      no(file, '/', 'not a JSON object');
      continue;
    }
    if (data.deviceId !== stem) no(file, '/deviceId', `the file's id "${String(data.deviceId)}" is not its name "${stem}"`);
    const row = new RegExp(`^${ROW_PREFIX[stem]}-\\d{2}$`);
    for (const n of numbers(data)) if (!n.owner || (!('src' in n.owner) && !('gap' in n.owner))) no(file, n.path, 'a number with no src beside it (a gap holds none)');
    for (const { o, path } of objects(data)) {
      if ('gap' in o) {
        if ([...numbers(o)].length || 'src' in o) no(file, path, 'a gap holds no number and no src: a number needs its row');
        if (typeof o.gap !== 'string' || o.gap.trim() === '' || o.gap.length > MAX_DEVICE_TEXT) no(file, `${path}/gap`, `a gap names what the manual must give (1–${MAX_DEVICE_TEXT} characters)`);
      }
      if ('src' in o && (typeof o.src !== 'string' || !row.test(o.src))) no(file, `${path}/src`, `"${String(o.src)}" is not a row of this device in research/50 (${ROW_PREFIX[stem]}-nn)`);
    }
    for (const { path, s } of strings(data)) if (s.length > MAX_DEVICE_TEXT && !path.endsWith('/gap')) no(file, path, `${s.length} characters: at most ${MAX_DEVICE_TEXT}, our words or a few printed ones`);
  }
  return out;
}

/** The typed profiles, when every rule holds; else the broken rules. */
export function loadPumpDevices(files: PumpDeviceFiles): { ok: true; devices: PumpDevices } | { ok: false; problems: PumpDeviceProblem[] } {
  const problems = checkPumpDevices(files);
  if (problems.length) return { ok: false, problems };
  return { ok: true, devices: Object.fromEntries(PUMP_DEVICE_IDS.map((id) => [id, files[`${id}.json`]])) as unknown as PumpDevices };
}
