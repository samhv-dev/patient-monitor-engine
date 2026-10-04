// The R56 glossary at run time: engine key → clinical label, long name, unit and adult normal range. Every label the app
// shows for a physiological quantity comes from here (research/11 §5.16 rule 1); engine keys never reach the DOM of a
// clinical view. `#` in a key is a side index (0 = L, 1 = R), `*` and `<id>` stand for any one path segment.
import { DRUGS, type StateVar } from '@pme/engine-core';
import { DRUG_NAMES, GLOSSARY, GLOSSARY_S9, KEY_LABELS, LUNG_LABELS, SAME_AS, SHORT, type GlossaryEntry } from './glossary-data.ts';

export type { GlossaryEntry } from './glossary-data.ts';
export const ALL_ENTRIES: readonly GlossaryEntry[] = [...GLOSSARY_S9, ...GLOSSARY]; // S9 first: its split rows win the exact keys

const byN = new Map(ALL_ENTRIES.map((e) => [e.n, e]));
const exact = new Map<string, GlossaryEntry>();
const patterns: Array<{ re: RegExp; e: GlossaryEntry; key: string; kinds: string[] }> = [];
for (const e of ALL_ENTRIES) {
  for (const k of e.keys) {
    if (/[#*<]/.test(k)) {
      // one capture per wildcard, in order: '#' a side index, '*' any segment, '<id>'/'<agent>' a drug or agent id
      const kinds = [...k.matchAll(/#|\*|<[a-z]+>/g)].map((m) => m[0]);
      patterns.push({ re: new RegExp(`^${k.replace(/\./g, '\\.').replace(/#/g, '(\\d+)').replace(/\*|<[a-z]+>/g, '([^.]+)')}$`), e, key: k, kinds });
    } else if (!exact.has(k)) exact.set(k, e);
  }
}

/** The entry number a quantity is filed under: a truth copy of a monitor value counts as the monitor entry (F1). */
export const canon = (n: number): number => SAME_AS[n] ?? n;

/** The glossary entry by its research/11 number. Throws on an unknown number (a typo is a bug). */
export function entry(n: number): GlossaryEntry {
  const e = byN.get(n);
  if (!e) throw new Error(`no glossary entry ${n}`);
  return e;
}

const strip = (label: string): string => label.replace(/\s*\(.*$/, '').trim() || label;
/** Shortened label → the distinct quantities (canonical entry numbers) that would show it. */
const byShort = new Map<string, Set<number>>();
for (const e of ALL_ENTRIES) {
  const s = SHORT[e.n] ?? strip(e.label);
  byShort.set(s, (byShort.get(s) ?? new Set()).add(canon(e.n)));
}

/**
 * The label a screen shows. The glossary label loses its parenthesis only when what is left names one quantity
 * ("T1 (Tcore)" → "T1", "ART M (MAP)" → "ART M"); a qualifier that tells two quantities apart stays ("SVR (model)",
 * "EtCO₂ (true)", "RR (spont)"); SHORT overrides where research/11's own label is shared ("TOF T1"). Review F1.
 */
export function shortLabel(e: GlossaryEntry): string {
  const fixed = SHORT[e.n];
  if (fixed) return drugWords(fixed);
  const s = strip(e.label);
  return drugWords((byShort.get(s)?.size ?? 1) > 1 ? e.label : s);
}

export interface Lookup {
  e: GlossaryEntry;
  /** "L " / "R " for per-side keys, else "". */
  side: string;
  /** The key as written in the glossary (a pattern key keeps its wildcards). */
  key: string;
  /** The segments the wildcards matched, in order ('' for an exact key). */
  caps: string[];
  /** The drug or agent a '<id>'/'<agent>' wildcard matched, when the 7g library knows it. */
  drug: string | null;
}

/** Glossary entry for a truth path, or null (then the path is a model internal and stays out of clinical views). */
export function lookup(path: string): Lookup | null {
  const e = exact.get(path);
  if (e) return { e, side: '', key: path, caps: [], drug: null };
  for (const p of patterns) {
    const m = p.re.exec(path);
    if (!m) continue;
    const caps = m.slice(1).map((x) => x ?? '');
    const sideAt = p.kinds.indexOf('#');
    const idAt = p.kinds.findIndex((k) => k.startsWith('<'));
    const side = sideAt >= 0 ? `${caps[sideAt] === '0' ? 'L' : 'R'} ` : '';
    const id = idAt >= 0 ? (caps[idAt] ?? '') : '';
    return { e: p.e, side, key: p.key, caps, drug: id && DRUGS[id] ? id : null };
  }
  return null;
}

/**
 * The label for a truth path ("R CL", "SvO₂", "NIBP D", "Cp (Propofol)"), or null. A multi-quantity entry uses its
 * per-key label; a per-drug path names the drug, so two drugs' concentrations never share a label (review F1).
 */
export function labelOf(path: string): string | null {
  const l = lookup(path);
  if (!l) return null;
  // a '*' wildcard cannot tell its quantities apart: without a per-path label the path stays a model internal
  if (l.key.includes('*') && KEY_LABELS[path] === undefined) return null;
  const base = KEY_LABELS[path] ?? KEY_LABELS[l.key] ?? shortLabel(l.e);
  return `${l.side}${base}${l.drug ? ` (${drugName(l.drug)})` : ''}`;
}

/**
 * One key per distinct quantity for a list that must not repeat a value (Explore): the canonical entry, the per-key
 * label and the wildcard segments. Two copies of one quantity (monitor and truth) share a key; two quantities never do.
 */
export function rowKey(path: string): string | null {
  const l = lookup(path);
  return l && labelOf(path) !== null ? `${canon(l.e.n)}|${l.side}${KEY_LABELS[path] ?? KEY_LABELS[l.key] ?? ''}|${l.caps.join('.')}` : null;
}

// ---- drug names (orchestrator ruling 5): one display set for the whole app, chosen in the site profile ----
export type DrugNameSet = 'us' | 'uk';
let nameSet: DrugNameSet = 'us';
/** Choose the display set: 'us' = "epinephrine / norepinephrine" (default), 'uk' = "adrenaline / noradrenaline". */
export const setDrugNames = (set: DrugNameSet): void => void (nameSet = set);
export const drugNameSet = (): DrugNameSet => nameSet;

/** A drug's display name in the site's set (glossary `DRUG_NAMES`; the 7g library's name for a drug without a row). */
export function drugName(id: string): string {
  const row = DRUG_NAMES[id];
  if (row) return nameSet === 'uk' && row.uk ? row.uk : row.name;
  return DRUGS[id]?.name ?? 'Drug';
}

/** The two names of each drug that has a second one, in both directions, case kept ("adrenaline" ↔ "epinephrine"). */
const PAIRS: Array<[string, string]> = Object.values(DRUG_NAMES).filter((r) => r.uk).map((r) => [r.name, r.uk as string]);
/** Free text (a scenario objective, a learner button, a glossary label) in the site's set of drug names. */
export function drugWords(text: string): string {
  let out = text;
  for (const [us, uk] of PAIRS) {
    const [from, to] = nameSet === 'uk' ? [us, uk] : [uk, us];
    out = out.replace(new RegExp(`\\b${from}\\b`, 'g'), to).replace(new RegExp(`\\b${from.toLowerCase()}\\b`, 'g'), to.toLowerCase());
  }
  return out;
}

/** research/11 annotates some cells for the model's authors ("(engine fraction)", "engine 552 mL/min…: check the
 *  definition"); a screen shows the clinical part only. */
const authorNote = /\s*\([^)]*\bengine\b[^)]*\)/g;
/** The unit a screen prints after a value: the glossary unit without its notes ("/min (skins may show rpm)" → "/min"). */
export const unitOf = (e: GlossaryEntry): string => (e.unit === '—' ? '' : e.unit.replace(/\s*\([^)]*\)/g, '').trim());
/** The unit with its clinical notes, for the tooltip (author notes about the model removed). */
export const unitNoteOf = (e: GlossaryEntry): string => (e.unit === '—' ? '' : e.unit.replace(authorNote, '').trim());
export const nameOf = (e: GlossaryEntry): string => drugWords(e.name.replace(authorNote, '').trim());

/** Tooltip text: long name, unit and normal range. */
export function describeEntry(e: GlossaryEntry): string {
  const unit = unitNoteOf(e);
  return [nameOf(e), unit ? `Unit: ${unit}` : '', e.normal && e.normal !== '—' ? `Adult normal: ${e.normal}` : '', e.other ? `Child / pregnancy: ${e.other}` : '']
    .filter(Boolean)
    .join('\n');
}

/** Instructor targets (StateVar) → glossary entry numbers. `sbp`/`dbp` share the S9 "BP" entry. */
export const STATE_VAR_ENTRY: Readonly<Record<StateVar, number>> = {
  hr: 1, sbp: 295, dbp: 295, cvp: 8, papSys: 9, papDia: 10, pawp: 12, spo2: 3, pi: 4, rr: 18, vt: 125, etco2: 15, fio2: 130,
  shunt: 119, tempCore: 19, contractility: 298, svr: 61, k: 188, qtc: 23, volumeStatus: 299, paceThresholdMa: 282,
};

/** Display scale from the engine's unit into the glossary unit (research/11 §5.16 rule 4), where the console's own
 *  metadata does not already convert. Fractions → %, CaO2/CvO2 mL/L → mL/dL, relative brain/liver values → absolute. */
export const DISPLAY_SCALE: Readonly<Record<string, number>> = {
  'blood.core.o2.svo2': 100, 'blood.core.o2.er': 100, 'blood.core.o2.cao2': 0.1, 'resp.lung.o2.cv': 0.1, 'ev.organs.brain.sjvo2': 100,
  'ev.organs.brain.cbf': 50, 'ev.organs.brain.cmro2': 3.3, 'ev.organs.liver.hbfRel': 1.5, 'ev.state.values.fio2': 100, 'l1.coupled.fio2': 100,
  'ev.lungState.atelectasisFrac': 100, 'ev.lungState.vqAdmixture': 100, 'mon.tofRatio': 1,
};

/** Task 26: the short screen name of a 7b lung condition (the catalogue's full text belongs in its tooltip). */
export function lungLabel(id: string, catalogueLabel = ''): string {
  return LUNG_LABELS[id] ?? (catalogueLabel.split(/ \(| \//)[0] || 'Lung condition');
}

