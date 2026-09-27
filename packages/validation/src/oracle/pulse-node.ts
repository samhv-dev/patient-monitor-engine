// The Pulse Physiology Engine 4.3.2 wasm build (research/pulse-spike/web, Apache-2.0, Kitware) loaded in Node as a
// differential-test ORACLE (R34). Run time only: pulse.js/pulse.wasm/pulse.data come from PME_PULSE_DIR and are
// never committed or bundled (annex §E). The build is web/worker-only, so Node gets three shims and a fetch that
// reads local files (decision 13). The data package holds /bench/drm.json (the 45 data requests below, in order)
// and /states/StandardMale.json (pre-stabilised). One engine per scenario.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

/** research/pulse-spike/bench/drm_names.json, in PullData order (value i+1; value 0 is sim time). */
export const PULSE_REQUESTS = [
  'HeartRate(1/min)', 'ArterialPressure(mmHg)', 'SystolicArterialPressure(mmHg)', 'DiastolicArterialPressure(mmHg)', 'MeanArterialPressure(mmHg)',
  'CardiacOutput(L/min)', 'HeartStrokeVolume(mL)', 'SystemicVascularResistance(mmHg_s/mL)', 'CentralVenousPressure(mmHg)', 'MeanCentralVenousPressure(mmHg)',
  'PulmonaryArterialPressure(mmHg)', 'PulmonarySystolicArterialPressure(mmHg)', 'PulmonaryDiastolicArterialPressure(mmHg)', 'PulmonaryCapillariesWedgePressure(mmHg)',
  'OxygenSaturation', 'PulseOximetry', 'ArterialOxygenPressure(mmHg)', 'ArterialCarbonDioxidePressure(mmHg)', 'EndTidalCarbonDioxidePressure(mmHg)',
  'RespirationRate(1/min)', 'TidalVolume(mL)', 'TotalLungVolume(mL)', 'CoreTemperature(degC)', 'IntracranialPressure(mmHg)', 'CerebralPerfusionPressure(mmHg)',
  'CerebralBloodFlow(mL/min)', 'UrineProductionRate(mL/min)', 'BloodPH', 'BloodVolume(mL)', 'Hematocrit', 'BaseExcess(mmol/L)', 'PeripheralPerfusionIndex',
  'SedationLevel', 'NeuromuscularBlockLevel', 'AirwayPressure(cmH2O)', 'Carina-CarbonDioxide-PartialPressure(mmHg)', 'ECG-Lead3ElectricPotential(mV)',
  'Lactate-BloodConcentration(mg/dL)', 'Potassium-BloodConcentration(mg/dL)', 'Sodium-BloodConcentration(mg/dL)', 'Calcium-BloodConcentration(mg/dL)',
  'Bicarbonate-BloodConcentration(mg/dL)', 'Glucose-BloodConcentration(mg/dL)', 'Hemoglobin-BloodConcentration(g/dL)', 'Propofol-PlasmaConcentration(ug/mL)',
] as const;
export type PulseRequest = (typeof PULSE_REQUESTS)[number];

export interface PulseOracle {
  /** SHA-256 of pulse.wasm (every oracle record carries it, spike §3.7). */
  buildHash: string;
  /** Advance n × 20 ms. */
  step(n: number): void;
  pull(): Record<PulseRequest | 't', number>;
  /** Process one action document ({"AnyAction":[…]}, the act_*.json shape); false when Pulse rejects it. */
  act(json: string): boolean;
}

export function pulseDir(): string | null {
  const d = process.env.PME_PULSE_DIR;
  return d && ['pulse.wasm', 'pulse.js', 'pulse.data'].every((f) => existsSync(join(d, f))) ? d : null;
}

type Cwrap = (name: string, ret: string | null, args: string[]) => (...a: unknown[]) => unknown;
interface PulseModule { cwrap: Cwrap; HEAPF64: Float64Array; FS: { readFile(p: string, o: { encoding: 'utf8' }): string } }

export async function loadPulse(dir: string): Promise<PulseOracle> {
  const g = globalThis as Record<string, unknown>;
  g.WorkerGlobalScope ??= class {};
  g.self ??= globalThis;
  g.location ??= { href: `file://${dir}/`, pathname: `${dir}/` };
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (u: string | URL | Request, o?: RequestInit) =>
    typeof u === 'string' && !/^https?:/.test(u) ? new Response(readFileSync(u.replace(/^file:\/\//, ''))) : realFetch(u, o)) as typeof fetch;
  const wasm = readFileSync(join(dir, 'pulse.wasm'));
  const createPulse = createRequire(import.meta.url)(join(dir, 'pulse.js')) as (m: Record<string, unknown>) => Promise<PulseModule>;
  const M = await createPulse({ wasmBinary: wasm, locateFile: (f: string) => join(dir, f), print: () => {}, printErr: () => {} });
  globalThis.fetch = realFetch;
  M.cwrap('PulseInitialize', null, [])();
  const e = M.cwrap('Allocate', 'number', ['number', 'string'])(0, '/') as number;
  const drm = M.FS.readFile('/bench/drm.json', { encoding: 'utf8' });
  if (!M.cwrap('SerializeFromFile', 'boolean', ['number', 'string', 'string', 'number'])(e, '/states/StandardMale.json', drm, 0)) throw new Error('Pulse: StandardMale state did not load');
  const stepFn = M.cwrap('AdvanceTimeStep', 'boolean', ['number']);
  const pullFn = M.cwrap('PullData', 'number', ['number']);
  const actFn = M.cwrap('ProcessActions', 'boolean', ['number', 'string', 'number']);
  return {
    buildHash: createHash('sha256').update(wasm).digest('hex'),
    step: (n) => { for (let i = 0; i < n; i++) stepFn(e); },
    pull: () => {
      const p = (pullFn(e) as number) >> 3;
      const out: Record<string, number> = { t: M.HEAPF64[p] as number };
      PULSE_REQUESTS.forEach((k, i) => { out[k] = M.HEAPF64[p + 1 + i] as number; });
      return out as Record<PulseRequest | 't', number>;
    },
    act: (json) => Boolean(actFn(e, json, 0)),
  };
}
