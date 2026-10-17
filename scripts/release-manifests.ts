// Stage 8b: sets the publish fields of the six library manifests (packages/<dir>/package.json) in place and keeps
// every other key, and its order (orchestrator ruling, 8b review: head-of-file find blocks break on any key a sibling
// stage adds, and JSON has no comments to re-anchor on). Idempotent; re-run with another version if Q8 changes it.
// Usage: node --experimental-strip-types scripts/release-manifests.ts [version]     (default 1.0.0-rc.1)
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Json = Record<string, unknown>;
type Entry = string | { types: string; import: string };
interface Release {
  description: string;
  sideEffects?: false | string[];
  exports: Record<string, Entry>;
  files?: string[];
  noBin?: true;
  devOnly?: string[];
}

const BUILD_TAIL = ' && tsc -p tsconfig.build.json && node --experimental-strip-types ../../scripts/finish-dist.ts';
const entry = (dts: string, js: string): Entry => ({ types: `./dist/types/src/${dts}.d.ts`, import: `./dist/${js}.js` });

/** What each published package gets; everything else in its manifest is kept as it is. */
export const RELEASE: Record<string, Release> = {
  'engine-core': {
    description: 'Patient-monitor simulation engine core: rhythm engine, haemodynamics, gas exchange, device layer, MANUAL and MODELED physiology (no DOM).',
    // the two modules that register ECG hooks at top level must survive tree-shaking (8b review finding 10)
    sideEffects: ['./src/l2/ecg/pacing.ts', './src/l2/ecg/arrest/vf.ts'],
    exports: { '.': entry('index', 'index') },
  },
  renderer: {
    description: 'Canvas2D sweep renderer, numerics and mountMonitor() for the patient-monitor engine; also ships the single-file IIFE (window.PatientMonitor).',
    exports: { '.': entry('index', 'index'), './iife': './dist/patient-monitor.iife.js' },
    files: ['dist', '!dist/assets'], // dist/assets holds only the inline worker's orphan source map (1.9 MB)
  },
  audio: {
    description: 'Web Audio QRS beep and IEC-style / traditional / Saadat alarm tones for the patient-monitor engine.',
    exports: { '.': entry('index', 'index') },
  },
  controller: {
    description: 'Command protocol, transports (in-process, postMessage, BroadcastChannel, WebSocket, WebRTC), instructor panel and the pme-scenario/1 runner for the patient-monitor engine.',
    exports: { '.': entry('index', 'index'), './scenario': entry('scenario/index', 'scenario') },
    noBin: true, // the .ts relay bin cannot run from node_modules (Node will not strip types there): a later release (Q7)
    devOnly: ['ws'], // the relay's WebSocket server: needed in the repo only
  },
  skins: {
    description: 'Data-only monitor skins and themes (saadat-like, philips-like, zoll-like, ge-like, mindray-like, lifepak-like) with JSON Schemas and provenance.',
    sideEffects: false,
    exports: { '.': entry('index', 'index'), './validate': entry('validate', 'validate') },
  },
  ventilator: {
    description: "Hamilton-style mechanical ventilator simulation (forked from the author's ventilator simulator) and its two-way link (VentFrame in, lungState out) to the patient-monitor engine.",
    sideEffects: false,
    exports: { '.': entry('index', 'index') },
  },
};

// Each set key goes right after the key it follows in the released layout.
const AFTER: Record<string, string[]> = { version: ['description', 'license', 'author', 'repository'], type: ['sideEffects'], exports: ['files', 'publishConfig'] };

/** The released form of one manifest: `private` dropped, the publish fields set, every other key kept in place. */
export function releaseManifest(dir: string, m: Json, version: string): Json {
  const r = RELEASE[dir];
  if (!r) throw new Error(`release-manifests: unknown package ${dir}`);
  const set: Json = {
    version,
    description: r.description,
    license: 'MIT',
    author: 'Ali Mahdavi',
    repository: { type: 'git', url: 'git+https://github.com/samhv-dev/patient-monitor-engine.git', directory: `packages/${dir}` },
    ...(r.sideEffects === undefined ? {} : { sideEffects: r.sideEffects }),
    files: r.files ?? ['dist'],
    publishConfig: { access: 'public', exports: r.exports, types: './dist/types/src/index.d.ts', ...(r.noBin ? { bin: {} } : {}) },
  };
  const out: Json = {};
  const put = (k: string) => {
    if (k in set) out[k] = set[k];
  };
  for (const [k, v] of Object.entries(m)) {
    if (k === 'private' || (k in set && k !== 'version')) continue;
    if (k === 'version') put(k);
    else out[k] = v;
    for (const a of AFTER[k] ?? []) put(a);
  }
  for (const k of Object.keys(set)) if (!(k in out)) out[k] = set[k]; // an anchor key was missing: append
  const scripts = { ...(out.scripts as Record<string, string> | undefined) };
  if (!scripts.build?.includes('finish-dist.ts')) scripts.build = `${scripts.build ?? 'vite build'}${BUILD_TAIL}`;
  out.scripts = scripts;
  for (const d of r.devOnly ?? []) {
    const deps = { ...(out.dependencies as Record<string, string> | undefined) };
    const v = deps[d];
    if (v === undefined) continue;
    delete deps[d];
    out.dependencies = deps;
    out.devDependencies = { ...(out.devDependencies as Record<string, string> | undefined), [d]: v };
  }
  return out;
}

const invokedDirectly = process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(import.meta.filename);
if (invokedDirectly) {
  const version = process.argv[2] ?? '1.0.0-rc.1';
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?$/.test(version)) throw new Error(`release-manifests: bad version ${version}`);
  const root = resolve(import.meta.dirname, '..');
  for (const dir of Object.keys(RELEASE)) {
    const file = resolve(root, 'packages', dir, 'package.json');
    const released = releaseManifest(dir, JSON.parse(readFileSync(file, 'utf8')) as Json, version);
    writeFileSync(file, `${JSON.stringify(released, null, 2)}\n`);
    console.log(`release-manifests: packages/${dir}/package.json → ${version}`);
  }
}
