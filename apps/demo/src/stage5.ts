import { ecgVocabulary, type Command, type EngineEvent, type ModifiersPatch, type RhythmId } from '@pme/engine-core';
import { mountMonitor } from '@pme/renderer';
import { CATALOGUE, type CatalogueItem } from './stage5-catalogue.ts';
import { renderStrip } from './strip.ts';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const params = new URLSearchParams(location.search);

// --- Screenshot mode: ?strip=<catalogue key> renders one labelled strip and nothing else --------------------
const stripKey = params.get('strip');
if (stripKey !== null) {
  const item = CATALOGUE.find((c) => c.key === stripKey);
  $('app').classList.add('hidden');
  $('single').classList.remove('hidden');
  if (item) renderStrip($<HTMLCanvasElement>('strip'), item.spec, item.label);
  document.body.dataset.ready = item ? 'yes' : 'unknown-strip';
} else {
  startApp();
}

function startApp(): void {
  // --- Live monitor + rhythm / modifier playground ------------------------------------------------------
  const pm = mountMonitor($('monitor'), { skin: 'philips-like', engine: { seed: 5 }, lanes: ['ecgII', 'V1'] });
  let n = 0;
  let simNow = 0;
  pm.on((e: EngineEvent) => {
    if ('t' in e && typeof e.t === 'number') simNow = Math.max(simNow, e.t);
  });
  const send = (c: Record<string, unknown>) =>
    pm.dispatch({ id: `s5-${++n}`, issuedBy: 'stage5', ...c } as Command).then((r) => {
      if (!r.accepted) console.warn('rejected', c, r.reason);
      return r;
    });
  const mods = (m: ModifiersPatch) => void send({ type: 'setModifiers', modifiers: m });

  const live = $('live');
  const vocab = ecgVocabulary();
  const rhythmSel = document.createElement('select');
  for (const g of vocab.groups) {
    const og = document.createElement('optgroup');
    og.label = g;
    for (const r of vocab.rhythms.filter((x) => x.group === g)) og.append(new Option(r.id, r.id));
    rhythmSel.append(og);
  }
  rhythmSel.value = 'sinus';
  rhythmSel.addEventListener('change', () => void send({ type: 'setRhythm', rhythm: rhythmSel.value as RhythmId, when: 'now' }));
  const pea = document.createElement('input');
  pea.type = 'checkbox';
  pea.addEventListener('change', () => void send({ type: 'setRhythm', rhythm: rhythmSel.value as RhythmId, opts: { pulseless: pea.checked }, when: 'now' }));
  const hr = document.createElement('input');
  hr.type = 'number';
  hr.value = '75';
  hr.addEventListener('change', () => void send({ type: 'setTarget', variable: 'hr', value: Number(hr.value) }));
  live.append(label('Rhythm', rhythmSel), label('PEA (pulseless)', pea), label('HR target', hr));

  const m = $('mods');
  const sel = (name: string, options: Array<[string, ModifiersPatch]>) => {
    const s = document.createElement('select');
    options.forEach(([l], i) => s.add(new Option(l, String(i))));
    s.addEventListener('change', () => mods(options[Number(s.value)]![1]));
    m.append(label(name, s));
  };
  const range = (name: string, min: number, max: number, step: number, value: number, to: (v: number) => ModifiersPatch) => {
    const r = document.createElement('input');
    r.type = 'range';
    Object.assign(r, { min: String(min), max: String(max), step: String(step), value: String(value) });
    const out = document.createElement('span');
    out.textContent = String(value);
    r.addEventListener('input', () => (out.textContent = r.value));
    r.addEventListener('change', () => mods(to(Number(r.value))));
    m.append(label(name, r, out));
  };
  sel('Ectopy', [
    ['none', { pvc: null, pac: null, pjc: null }],
    ['PVC bigeminy', { pvc: { pattern: 'bigeminy', probability: 0 } }],
    ['PVC trigeminy', { pvc: { pattern: 'trigeminy', probability: 0 } }],
    ['PVC couplets', { pvc: { pattern: 'couplet', probability: 0.2 } }],
    ['PVC runs of 5', { pvc: { pattern: 'run', probability: 0.1, runLength: 5 } }],
    ['multifocal PVCs', { pvc: { pattern: 'single', probability: 0.3, multifocal: true } }],
    ['R-on-T', { pvc: { pattern: 'trigeminy', probability: 0, rOnT: true } }],
    ['PACs', { pac: { probability: 0.2 } }],
    ['blocked PACs', { pac: { probability: 0.2, blocked: true } }],
    ['aberrant PACs', { pac: { probability: 0.2, aberrant: true } }],
    ['PJCs', { pjc: { probability: 0.15 } }],
  ]);
  sel('ST', [
    ['none', { st: null, ischaemicDepressionMv: 0 }],
    ...(['anterior', 'septal', 'lateral', 'anterolateral', 'inferior', 'posterior'] as const).map((t): [string, ModifiersPatch] => [`STEMI ${t} 3 mm`, { st: { territory: t, mm: 3 } }]),
    ['ischaemic depression −0.2', { ischaemicDepressionMv: -0.2 }],
  ]);
  sel('Conduction', [['none', { bbb: 'none' }], ['RBBB', { bbb: 'rbbb' }], ['LBBB', { bbb: 'lbbb' }]]);
  sel('Pattern', [
    ['none', { brugada1: false, digoxin: false, longQT: false, lvh: false, alternans: 0, tInversion: 0 }],
    ['Brugada 1', { brugada1: true }],
    ['digoxin', { digoxin: true }],
    ['long QT', { longQT: true }],
    ['LVH', { lvh: true }],
    ['alternans', { alternans: 0.35 }],
    ['T inversion', { tInversion: 1 }],
  ]);
  range('K⁺', 2, 9, 0.1, 4.2, (v) => ({ k: v }));
  range('Temp °C', 26, 38, 0.5, 37, (v) => ({ tempC: v }));
  range('Axis °', -90, 180, 15, 60, (v) => ({ axisDeg: v }));
  range('Low voltage', 0.4, 1, 0.1, 1, (v) => ({ lowVoltage: v }));
  range('Mains', 0, 1, 0.1, 0, (v) => ({ artefact: { mains: v } }));
  range('EMG', 0, 1, 0.1, 0, (v) => ({ artefact: { emg: v } }));
  range('Shiver', 0, 1, 0.1, 0, (v) => ({ artefact: { shiver: v } }));
  range('Motion', 0, 1, 0.1, 0, (v) => ({ artefact: { motion: v } }));
  range('Wander', 0, 1, 0.1, 0, (v) => ({ artefact: { wander: v } }));
  range('Morph. variation', 0, 1, 0.1, 0, (v) => ({ morphologyVariation: v, patientSeed: 11 }));
  const button = (text: string, on: () => void) => {
    const b = document.createElement('button');
    b.textContent = text;
    b.addEventListener('click', on);
    m.append(b);
    return b;
  };
  let cpr = false;
  const cprBtn = button('CPR', () => {
    cpr = !cpr;
    cprBtn.setAttribute('aria-pressed', String(cpr));
    mods({ artefact: { cpr: cpr ? { rateCpm: 110, depth: 0.6 } : null } });
  });
  button('Shock 200 J', () => mods({ artefact: { shock: { atS: simNow + 0.3, energyJ: 200 } } }));
  button('Diathermy 3 s', () => mods({ artefact: { electrosurgery: { atS: simNow + 0.3, durationS: 3 } } }));
  button('Epinephrine', () => mods({ epinephrineAtS: simNow }));
  let leadsOff = false;
  const loBtn = button('Leads off', () => {
    leadsOff = !leadsOff;
    loBtn.setAttribute('aria-pressed', String(leadsOff));
    mods({ artefact: { leadOff: leadsOff } });
  });
  let tcp = false;
  const tcpBtn = button('TCP 70/min 90 mA', () => {
    tcp = !tcp;
    tcpBtn.setAttribute('aria-pressed', String(tcp));
    mods({ tcp: tcp ? { mode: 'demand', ratePpm: 70, mA: 90, thresholdMa: 70 } : null });
  });

  // --- ACLS strip sequencer (BUILD-PLAN Stage 5 demo): sinus → VT → VF coarse → CPR → shock → asystole → ROSC --
  const steps: Array<[number, string, () => void]> = [
    [0, 'sinus', () => void send({ type: 'setRhythm', rhythm: 'sinus', when: 'now' })],
    [8, 'VT', () => void send({ type: 'setRhythm', rhythm: 'vtMono', when: 'now' })],
    [16, 'VF coarse', () => void send({ type: 'setRhythm', rhythm: 'vfCoarse', opts: { autoAsystole: false }, when: 'now' })],
    [26, 'CPR', () => mods({ artefact: { cpr: { rateCpm: 110, depth: 0.6 } } })],
    [40, 'shock', () => mods({ artefact: { cpr: null, shock: { atS: simNow + 0.2, energyJ: 200 } } })],
    [41, 'asystole', () => void send({ type: 'setRhythm', rhythm: 'asystole', when: 'now' })],
    [50, 'ROSC', () => void send({ type: 'setRhythm', rhythm: 'sinusTachy', opts: { rateBpm: 105 }, when: 'now' })],
  ];
  $('acls').addEventListener('click', () => {
    const t0 = performance.now();
    for (const [at, name, fn] of steps)
      setTimeout(() => {
        $('aclsState').textContent = `${name} (+${Math.round((performance.now() - t0) / 1000)} s)`;
        fn();
      }, at * 1000);
  });

  // --- Gallery (filterable by group) and blind check ------------------------------------------------------
  const groupSel = $<HTMLSelectElement>('group');
  const groups = ['all', ...new Set(CATALOGUE.map((c) => c.group))];
  groups.forEach((g) => groupSel.add(new Option(g, g)));
  const gallery = $('gallery');
  const show = (items: CatalogueItem[], labelled: boolean) => {
    gallery.replaceChildren();
    for (const it of items) {
      const c = document.createElement('canvas');
      gallery.append(c);
      renderStrip(c, it.spec, labelled ? it.label : null);
    }
  };
  groupSel.addEventListener('change', () => {
    $('answers').textContent = '';
    show(groupSel.value === 'all' ? CATALOGUE : CATALOGUE.filter((c) => c.group === groupSel.value), true);
  });
  $('blind').addEventListener('click', () => {
    const pool = CATALOGUE.filter((c) => c.group !== 'modifier' && c.group !== 'artefact');
    const pick = Array.from({ length: 30 }, () => pool[Math.floor(Math.random() * pool.length)]!);
    show(pick.map((p, i) => ({ ...p, spec: { ...p.spec, seed: 100 + i } })), false);
    $('answers').textContent = 'Name each strip (1–30, left to right, top to bottom), then press Reveal.';
    const rev = $('reveal');
    rev.classList.remove('hidden');
    rev.onclick = () => ($('answers').textContent = pick.map((p, i) => `${i + 1}. ${p.label}`).join('\n'));
  });
  show(CATALOGUE.filter((c) => c.group === 'sinus'), true);
  groupSel.value = 'sinus';
}

function label(text: string, ...els: HTMLElement[]): HTMLLabelElement {
  const l = document.createElement('label');
  l.append(text, ...els);
  return l;
}
