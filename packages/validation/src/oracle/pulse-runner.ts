// Pulse 4.3.2 wasm as a DIFFERENTIAL-TEST ORACLE (R34; annex §D). Loads the spike's emscripten build in Node, starts
// from the pre-stabilised StandardMale state, steps at 20 ms, and reads the data requests of bench/drm.json by the
// index order of bench/drm_names.json. Never used to set our defaults (audit §4 "validation circularity").
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface PulseHandle {
  step(n: number): void;
  read(): Record<string, number>;
  act(json: string): boolean;
}

export const DRM_NAMES_FALLBACK = [
  'HeartRate(1/min)', 'ArterialPressure(mmHg)', 'SystolicArterialPressure(mmHg)', 'DiastolicArterialPressure(mmHg)', 'MeanArterialPressure(mmHg)',
  'CardiacOutput(L/min)', 'HeartStrokeVolume(mL)', 'SystemicVascularResistance(mmHg_s/mL)', 'CentralVenousPressure(mmHg)', 'MeanCentralVenousPressure(mmHg)',
  'PulmonaryArterialPressure(mmHg)', 'PulmonarySystolicArterialPressure(mmHg)', 'PulmonaryDiastolicArterialPressure(mmHg)', 'PulmonaryCapillariesWedgePressure(mmHg)',
];

export async function loadPulse(dir: string, namesPath?: string): Promise<PulseHandle> {
  const req = createRequire(import.meta.url);
  const createPulse = req(join(dir, 'pulse.js')) as (o: Record<string, unknown>) => Promise<{
    cwrap: (n: string, r: string | null, a: string[]) => (...x: unknown[]) => unknown;
    FS: { readFile: (p: string, o: { encoding: 'utf8' }) => string };
    HEAPF64: Float64Array;
  }>;
  // Node has no fetch() for local files: hand emscripten the data package directly (getPreloadedPackage hook)
  const M = await createPulse({
    locateFile: (f: string) => join(dir, f),
    // …and the wasm itself (the build is web-only: no Node file reader is compiled in)
    instantiateWasm: (imports: WebAssembly.Imports, done: (i: WebAssembly.Instance, m: WebAssembly.Module) => void) => {
      void WebAssembly.instantiate(readFileSync(join(dir, 'pulse.wasm')), imports).then((r) => done(r.instance, r.module));
      return {};
    },
    getPreloadedPackage: (name: string) => {
      const b = readFileSync(name);
      return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
    },
    print: () => {},
    printErr: () => {},
  });
  const c = (n: string, r: string | null, a: string[]) => M.cwrap(n, r, a);
  c('PulseInitialize', null, [])();
  const drm = M.FS.readFile('/bench/drm.json', { encoding: 'utf8' });
  const e = c('Allocate', 'number', ['number', 'string'])(0, '/') as number;
  c('LogToConsole', null, ['number', 'boolean'])(e, false);
  if (!c('SerializeFromFile', 'boolean', ['number', 'string', 'string', 'number'])(e, '/states/StandardMale.json', drm, 0)) throw new Error('Pulse state load failed');
  const Step = c('AdvanceTimeStep', 'boolean', ['number']);
  const Pull = c('PullData', 'number', ['number']);
  const Act = c('ProcessActions', 'boolean', ['number', 'string', 'number']);
  const names: string[] = namesPath ? (JSON.parse(readFileSync(namesPath, 'utf8')) as string[]) : DRM_NAMES_FALLBACK;
  return {
    step: (n) => {
      for (let i = 0; i < n; i++) Step(e);
    },
    read: () => {
      const p = (Pull(e) as number) >> 3;
      const out: Record<string, number> = { t: M.HEAPF64[p] as number };
      names.forEach((nm, i) => (out[nm] = M.HEAPF64[p + 1 + i] as number));
      return out;
    },
    act: (json) => Act(e, json, 0) as boolean,
  };
}
