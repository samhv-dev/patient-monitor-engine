// The model's modules: which source each owns, and which module owns a test file. The single map docs/model/ and
// docs/validation/known-misses.md are generated from (scripts/model-docs.ts, scripts/known-misses.ts). It keys on
// DIRECTORIES and on what a test imports — never on stage names in file names, comments or titles.
// Ownership of a test file, first rule that answers wins:
//   0. listed: a module's `tests` names the file (exceptions only);
//   1. mirror: packages/engine-core/test/<dir>/… or test/l2|l3/<dir>/… → the module owning the same directory under
//      src/; packages/<pkg>/test/** and apps/demo/e2e/** → the module owning that package's src/;
//   2. name: the first domain word of the file name (NAME_WORDS), for test/engine/** and the top-level test files.
// No import-based rule: measured on 90c8ca7b it misattributes through the shared test helpers.

export interface ModelModule {
  id: string; // the page: docs/model/<id>.md
  title: string;
  /** source owned: directories end with '/', files are exact (paths from the repo root) */
  src: string[];
  /** integration tests owned by name (rule 3), paths from the repo root */
  tests?: string[];
}

const E = 'packages/engine-core/src/';
export const MODULES: ModelModule[] = [
  { id: 'patient-state', title: 'Patient state and the two modes', src: [E + 'l1/', E + 'truth.ts', E + 'types-truth.ts', E + 'modifiers.ts'] },
  { id: 'rhythms-ecg', title: 'Rhythms and the ECG', src: [E + 'l2/ecg/', 'packages/engine-core/templates/'] },
  { id: 'circulation', title: 'Circulation', src: [E + 'l2/circ/', E + 'l2/body-size.ts', E + 'types-circ.ts'] },
  { id: 'pressure-waveforms', title: 'Pressure waveforms and pleth', src: [E + 'l2/hemo/', E + 'l2/pleth/', E + 'types-hemo.ts'] },
  { id: 'lungs', title: 'Lungs: mechanics, ventilation–perfusion, pathology', src: [E + 'l2/lung/', 'packages/engine-core/data/', E + 'types-lung.ts'] },
  { id: 'gas-exchange', title: 'Gas exchange and capnography', src: [E + 'l2/gas/', E + 'l2/co2/'] },
  { id: 'breathing', title: 'Breathing, airway and the ventilator coupling', src: [E + 'l2/resp/', E + 'types-resp.ts', E + 'types-vent-link.ts'] },
  { id: 'blood', title: 'Blood, acid–base, electrolytes and fluids', src: [E + 'l2/blood/', E + 'types-blood.ts'] },
  { id: 'organs', title: 'Brain, kidney and liver', src: [E + 'l2/brain/', E + 'l2/organs/', E + 'l2/renal/', E + 'l2/liver/', E + 'types-organs.ts'] },
  { id: 'endocrine-thermal', title: 'Endocrine, metabolism and temperature', src: [E + 'l2/endo/', E + 'l2/thermal/', E + 'l2/temp/', E + 'types-endo.ts'] },
  { id: 'neuro', title: 'Anaesthetic depth, ventilatory drive and neuromuscular block', src: [E + 'l2/neuro/', E + 'types-neuro.ts'] },
  { id: 'pharmacology', title: 'Pharmacology: PK, PD and the drug rows', src: [E + 'l2/pk/', E + 'types-pk.ts'] },
  { id: 'monitor', title: 'Monitor measurements (device layer)', src: [E + 'l3/', E + 'types-device.ts'] },
  { id: 'alarms', title: 'Alarms', src: [E + 'l3/alarms/'] },
  { id: 'defib-pacer', title: 'Defibrillator and pacer', src: [E + 'l3/defib-pacer/'] },
  { id: 'ventilator', title: 'Ventilator', src: ['packages/ventilator/src/'] },
  { id: 'engine-runtime', title: 'Engine runtime: loop, clock, commands, snapshots', src: [E] },
  { id: 'control', title: 'Control: commands, transports, scenarios', src: ['packages/controller/src/', 'packages/controller/scenarios/', 'packages/controller/relay/'] },
  { id: 'presentation', title: 'Presentation: renderer, audio, skins, the app', src: ['packages/renderer/src/', 'packages/audio/src/', 'packages/skins/src/', 'apps/demo/src/'] },
  { id: 'validation-harness', title: 'Validation harness', src: ['packages/validation/src/'] },
  { id: 'integration', title: 'Whole-patient scenario suites', src: [] },
];

/** The module owning a source path: the LONGEST matching prefix wins (l3/alarms/ before l3/, l2/ecg/ before src/). */
export function moduleOfSource(path: string): ModelModule | undefined {
  let best: ModelModule | undefined;
  let len = -1;
  for (const m of MODULES)
    for (const s of m.src)
      if ((s.endsWith('/') ? path.startsWith(s) : path === s) && s.length > len) {
        best = m;
        len = s.length;
      }
  return best;
}

/**
 * Rule 2: a test file outside the mirrored directories is owned through the FIRST word of its file name that names a
 * domain (`circ-pulsus.test.ts` → circulation; `abdominal-pressure` style names need their word here). Words that
 * are not domains (stage labels, "fidelity" is a domain: monitor fidelity) are skipped, so a rename that drops a
 * stage prefix does not change the owner. The guard test fails on a test file no rule owns.
 */
export const NAME_WORDS: Record<string, string> = {
  af: 'rhythms-ecg', agonal: 'rhythms-ecg', ecg: 'rhythms-ecg', rhythm: 'rhythms-ecg', setrhythm: 'rhythms-ecg',
  arrest: 'circulation', circ: 'circulation', coronary: 'circulation', cpr: 'circulation', iabp: 'circulation',
  lvad: 'circulation', pe: 'circulation', pea: 'circulation', ph: 'circulation', pulseless: 'circulation',
  rosc: 'circulation', tamponade: 'circulation', tension: 'circulation', tonic: 'circulation', vagal: 'circulation',
  body: 'circulation', iap: 'circulation', negative: 'circulation',
  hemo: 'pressure-waveforms', motion: 'pressure-waveforms',
  lung: 'lungs', copd: 'lungs', obstructive: 'lungs',
  co2: 'gas-exchange', oxygen: 'gas-exchange',
  resp: 'breathing', breath: 'breathing', vent: 'breathing',
  blood: 'blood', alkalosis: 'blood', kcl: 'blood', kinetics: 'blood', leak: 'blood', osmolality: 'blood',
  potassium: 'blood', transfusion: 'blood',
  organs: 'organs', oliguria: 'organs', mannitol: 'organs',
  endo: 'endocrine-thermal', thermal: 'endocrine-thermal', adrenal: 'endocrine-thermal', fever: 'endocrine-thermal',
  insulin: 'endocrine-thermal', mh: 'endocrine-thermal', thresholds: 'endocrine-thermal', cat: 'endocrine-thermal',
  stimulus: 'endocrine-thermal',
  neuro: 'neuro', nmb: 'neuro', roc: 'neuro', rocuronium: 'neuro',
  pk: 'pharmacology', drug: 'pharmacology', volatile: 'pharmacology', induction: 'pharmacology', propofol: 'pharmacology',
  hr: 'monitor', nibp: 'monitor', device: 'monitor', sensor: 'monitor', fidelity: 'monitor', capture12: 'monitor', qrs: 'monitor',
  alarms: 'alarms', alarm: 'alarms',
  defib: 'defib-pacer', pacer: 'defib-pacer', tcp: 'defib-pacer', shock: 'defib-pacer',
  truth: 'patient-state', release: 'patient-state', manual: 'patient-state',
  engine: 'engine-runtime', command: 'engine-runtime', intent: 'engine-runtime', read: 'engine-runtime',
  snapshot: 'engine-runtime', version: 'engine-runtime',
  clinical: 'integration',
};

export type OwnerRule = 'mirror' | 'name' | 'listed' | 'none';

const byId = (id: string) => MODULES.find((m) => m.id === id)!;

/** The module owning a test file, and the rule that decided (`none`: no rule owns it — the guard test fails). */
export function ownerOfTest(file: string): { module: ModelModule | undefined; rule: OwnerRule } {
  const listed = MODULES.find((m) => m.tests?.includes(file));
  if (listed) return { module: listed, rule: 'listed' };
  const dir = file.match(/^packages\/engine-core\/test\/((?:l[123]\/)?[^/]+)\//);
  if (dir && dir[1] !== 'engine' && dir[1] !== 'helpers') {
    const owner = moduleOfSource(`${E}${dir[1]}/x.ts`);
    if (owner) return { module: owner, rule: 'mirror' };
  }
  const pkg = file.match(/^(packages\/(?!engine-core\/)[^/]+|apps\/demo)\/(?:test|e2e|src)\//);
  if (pkg) {
    const owner = moduleOfSource(`${pkg[1]}/src/x.ts`);
    if (owner) return { module: owner, rule: 'mirror' };
  }
  const words = (file.split('/').pop() ?? '').replace(/\.(test|e2e)\.ts$/, '').split(/[-.]/);
  if (/^packages\/engine-core\/test\/(l3\/)?[^/]+\.test\.ts$/.test(file) || file.startsWith('packages/engine-core/test/engine/')) {
    if (words[0] === 'types' && words[1]) words.shift(); // types-circ.test.ts → circ
    const w = words.find((x) => NAME_WORDS[x]);
    if (w) return { module: byId(NAME_WORDS[w]!), rule: 'name' };
  }
  return { module: undefined, rule: 'none' };
}
