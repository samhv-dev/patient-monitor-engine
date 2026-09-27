// Stage 7x: the curated path → organ map. Longest matching prefix wins (whole path segments); anything unmatched
// lands in "other", so fields of stages not merged yet appear without editing this page. Prefixes for 7b–7g paths
// are taken from their plans (resp.lung, blood, organs.brain/renal|kidney/liver, endo, neuro, pk, and their events;
// 7d's published kidney key is `kidney`, its internal module `renal` — R51 addendum 13).
export const GROUPS = [
  { id: 'monitor', title: 'Monitor output' },
  { id: 'circulation', title: 'Circulation' },
  { id: 'ecg', title: 'Rhythm & ECG' },
  { id: 'lungs', title: 'Lungs & gas exchange' },
  { id: 'blood', title: 'Blood, acid–base & temperature' },
  { id: 'brain', title: 'Brain' },
  { id: 'kidney', title: 'Kidney' },
  { id: 'liver', title: 'Liver' },
  { id: 'endocrine', title: 'Endocrine' },
  { id: 'neuro', title: 'Neuro, depth & NMB' },
  { id: 'drugs', title: 'Drugs' },
  { id: 'devices', title: 'Devices' },
  { id: 'controls', title: 'Controls & targets (L1)' },
  { id: 'other', title: 'Other' },
] as const;
export type GroupId = (typeof GROUPS)[number]['id'];

export const GROUP_BY_PREFIX: Readonly<Record<string, GroupId>> = {
  // monitor output: the numerics the monitor shows, and the measurement machinery behind them
  mon: 'monitor', 'ev.nibp': 'monitor', 'hemo.nibp': 'monitor', 'hemo.num': 'monitor', 'hemo.lines': 'monitor',
  'hemo.abpSite': 'monitor', 'hemo.lastSite': 'monitor', 'resp.num': 'monitor', 'resp.sampler': 'monitor',
  'resp.co2Sensor': 'monitor', 'resp.tempSensor': 'monitor', 'resp.tempSite': 'monitor', 'resp.shownCo2': 'monitor',
  // circulation (Stage 2 + 7a)
  hemo: 'circulation', 'ev.circ': 'circulation',
  // rhythm and ECG
  hr: 'ecg', mods: 'ecg', rhythm: 'ecg', 'ev.beat': 'ecg', 'ev.rhythmSegment': 'ecg',
  // lungs (Stage 3 + 7b)
  resp: 'lungs', 'ev.lungState': 'lungs', 'ev.breath': 'lungs',
  // blood (7c) and temperature (Stage 3 thermal lives in resp.temp)
  blood: 'blood', 'resp.temp': 'blood', 'ev.labs': 'blood', 'ev.labResult': 'blood',
  // organs (7d): the `organs` event's summaries are brain/kidney/liver; the ICP sensor state and the interim
  // `brain { anaesthesia }` input belong to the brain
  'organs.brain': 'brain', 'organs.renal': 'kidney', 'organs.kidney': 'kidney', 'organs.liver': 'liver',
  'organs.sensors.icp': 'brain', 'organs.sensors.pbto2': 'brain', 'organs.sensors.urometer': 'kidney', 'organs.anaesEvent': 'brain',
  'ev.organs.brain': 'brain', 'ev.organs.renal': 'kidney', 'ev.organs.kidney': 'kidney', 'ev.organs.liver': 'liver',
  // endocrine (7e): its own tree and event, its seams into 7c's blood and 7a's circulation multipliers
  endo: 'endocrine', 'ev.endo': 'endocrine', 'blood.endo': 'endocrine',
  'hemo.circ.ext.endoHrF': 'endocrine', 'hemo.circ.ext.endoSvrF': 'endocrine', 'hemo.circ.ext.endoEesF': 'endocrine', 'hemo.circ.ext.endoDV0Frac': 'endocrine',
  'blood.core.endoKShift': 'endocrine', 'blood.core.endoGlucoseMgDl': 'endocrine', cond: 'endocrine', // Stage 7e seams (R51 addendum 16)
  // neuro (7f), drugs (7g)
  neuro: 'neuro', 'ev.anaesthesia': 'neuro', 'ev.tof': 'neuro', 'ev.neuroMark': 'neuro',
  pk: 'drugs', pkHooks: 'drugs', 'ev.drugs': 'drugs',
  // devices: ventilator settings, IABP, LVAD, CPR, defibrillator/pacer (future ECMO lands in "other" until mapped)
  dev: 'devices', 'ev.deviceStatus': 'devices', 'resp.driver.vent': 'devices', 'hemo.iabp': 'devices', 'hemo.iabpAug': 'devices',
  'hemo.lvad': 'devices', 'hemo.cpr': 'devices', 'ev.circ.iabp': 'devices', 'ev.circ.lvad': 'devices',
  // controls: the L1 targets and the 1 Hz state event
  l1: 'controls', 'ev.state': 'controls',
};

const cache = new Map<string, GroupId>();
export function groupOf(path: string): GroupId {
  const hit = cache.get(path);
  if (hit) return hit;
  let g: GroupId = 'other';
  const segs = path.split('.');
  for (let n = segs.length; n > 0; n--) {
    const m = GROUP_BY_PREFIX[segs.slice(0, n).join('.')];
    if (m) {
      g = m;
      break;
    }
  }
  cache.set(path, g);
  return g;
}

/** Bookkeeping leaves (step indices, accumulators, ramp internals): shown only with "internals" ticked. */
const INTERNAL_LAST = /^(t|t0|seq|tick|from|curve|delayS|durationS)$|Seq$|Sum$|Next$|^next|^last[A-Z]|^prev|Until$/;
const INTERNAL_MID = /\.(acc|det|hist|ring)\./;
/** Sub-stage step/sample indices (`blood.k`, `organs.m`); `mods.k` is potassium and stays visible. */
const INTERNAL_STEP = /^(hemo|resp|blood|organs|endo|neuro|pk)\.(k|m|n)$/;
/**
 * Machinery sub-trees (measurement pipelines, beat schedulers, alarm state, PK compartments and dose logs). `*` stands
 * for one path segment. Paths of later stages are visible by default; add their machinery here when it lands. (7a's
 * reference copies `hemo.circ.prof|base|ref` and the alarm profile never reach the page: the engine prunes them.)
 */
export const INTERNAL_PREFIXES: readonly string[] = [
  // Stage 2/3 monitor machinery and waveform generators
  'hemo.num', 'hemo.nibp', 'hemo.lines', 'hemo.lastSite', 'hemo.siteBeats', 'hemo.manHold', 'hemo.cvp', 'hemo.pleth', 'hemo.sys',
  'hemo.pul', 'hemo.wedge', 'hemo.stPatch', 'hemo.stApplied', 'hemo.pv', 'hemo.pla', 'hemo.pvOn', 'hemo.beatT', 'hemo.abpSite',
  'resp.num', 'resp.sampler', 'resp.beats', 'resp.delay', 'resp.seen', 'resp.gasK', 'resp.lungKey', 'resp.co2Sensor', 'resp.tempSensor',
  'resp.tempSite', 'resp.shownCo2',
  // 7a circulation: activation schedules and the coronary reference copy (the live parameters are hemo.circ.p)
  'hemo.circ.vent', 'hemo.circ.atria', 'hemo.circ.beats', 'hemo.circ.opens', 'hemo.circ.cor.ref',
  // rhythm scheduler internals (the rhythm id stays visible)
  'rhythm.events', 'rhythm.records', 'rhythm.atria', 'rhythm.junction', 'rhythm.focusAxis', 'rhythm.focusN', 'rhythm.pendingSwitch',
  // device layer: alarm configuration and the copies of the measurements it reads
  'dev.alarms', 'dev.inputs', 'dev.sync', 'dev.pending', 'dev.tcpKey', 'dev.lastBeat',
  // 7g PK machinery: compartment amounts, gamma doses and bolus times per drug, the per-tick dose log, the pending
  // and grid-due boluses, the last PD concentrations and the desflurane MAC history (the bus concentrations stay visible)
  'pk.drugs.*.x', 'pk.drugs.*.doses', 'pk.drugs.*.bolusTimes', 'pk.bus.doses', 'pk.lastC', 'pk.due', 'pk.pending', 'pk.macPrev',
  // 7e machinery: ECG-delta and seam bookkeeping, integrator internals, the heat model's calibration and effector state
  'endo.ecg', 'endo.kfMult', 'endo.lungSev', 'endo.core.hormones.cortDrive', 'endo.core.glucose.x', 'endo.core.glucose.gutMg',
  'endo.core.glucose.gut2Mg', 'endo.core.glucose.egpDef', 'endo.core.glucose.basalExoUuMin', 'endo.core.cond.sepsis.tauS',
  'resp.temp.capCore', 'resp.temp.capPer', 'resp.temp.k0', 'resp.temp.h', 'resp.temp.warmLag', 'resp.temp.vent', 'resp.temp.shiverShift',
  // 7c blood machinery: solute AMOUNTS and set points (the concentrations are blood.out), the profile scaling and the
  // compartments' reference copy, running infusions/bleeds, pH-solver scratch, the Stage 3 view (a copy of core.odc),
  // what the engine already pushed into Modifiers, the resting-CO latch, volume bookkeeping, queues and the test seam
  'blood.core.so', 'blood.core.pat', 'blood.core.fl.ref', 'blood.core.fl.flows', 'blood.core.ab.iter', 'blood.core.ab.residual',
  'blood.core.k1Hz', 'blood.core.ecf0', 'blood.core.phNonOrg', 'blood.core.doses', 'blood.view', 'blood.ecg', 'blood.rest',
  'blood.circNetMl', 'blood.labs', 'blood.cold', 'blood.keto', 'blood.events', 'blood.lung.pCap', 'blood.pinHbfRel',
  // Stage 7f neuro machinery: the TOF stimulator's schedule/PRNG, the last step's inputs and PD scratch, flags, dose
  // bookkeeping and the fasciculation save (the published antinoc/nmb/thermoDepth, resp hook and outputs stay visible)
  'neuro.tof', 'neuro.last', 'neuro.flags', 'neuro.fasc', 'neuro.emgBase', 'neuro.doseSeenT', 'neuro.diShown', 'resp.spont.nextT',
  // 7d organ machinery: the ICP beat times, 1 s numeric accumulators, the last organ view (a copy of other stages'
  // truths), the effects bookkeeping, the event queue, the 4 s MAP/CVP means and the reference CO; the brain's osmotic
  // dose list and herniation timer; the kidney's 10 min urine bins, its calibration constants and the TGF state
  'organs.beats', 'organs.num', 'organs.view', 'organs.fx', 'organs.out', 'organs.lp', 'organs.co0', 'organs.weightKg',
  'organs.brain.osm', 'organs.brain.lowCppS', 'organs.brain.p', 'organs.renal.bins', 'organs.renal.binAcc', 'organs.renal.binT', 'organs.renal.p',
  'organs.renal.oliguriaS', 'organs.renal.rAff', 'organs.liver.weightKg',
];
const prefixRe = (list: readonly string[]) =>
  new RegExp(`^(${list.map((p) => p.replace(/\./g, '\\.').replace(/\*/g, '[^.]+')).join('|')})(\\.|$)`);
const PREFIX_RE = prefixRe(INTERNAL_PREFIXES);
export function isInternal(path: string): boolean {
  const last = path.slice(path.lastIndexOf('.') + 1);
  return INTERNAL_LAST.test(last) || INTERNAL_MID.test(`${path}.`) || INTERNAL_STEP.test(path) || PREFIX_RE.test(path);
}

/**
 * Within-beat / within-breath values (instantaneous chamber pressures and flows, breath-phase bookkeeping): sampled
 * once a second they alias, so they are shown but never highlighted as changed.
 */
export const PHASE_PREFIXES: readonly string[] = ['hemo.circOut', 'resp.lung.tidal', 'resp.lung.inInsp', 'resp.lung.pInsp', 'resp.lung.v0'];
const PHASE_RE = prefixRe(PHASE_PREFIXES);
export function isPhase(path: string): boolean {
  return PHASE_RE.test(path);
}
