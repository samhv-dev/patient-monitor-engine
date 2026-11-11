// The anchors of the builder's last sections (docs/plans/scenario-builder.md §5.2; piece B5): where a script entry fires
// (`on`), where an outcome's window opens (`anchor`), and the run event a debrief opener or a handout question is timed
// from (`at`). One list of anchor kinds, each section offering the forms its block's schema accepts; every target is this
// card's own phase or action. Pure, no DOM (anchor-picker.ts draws it).
import { labelOf } from './phases.ts';

type Rec = Record<string, unknown>;

/** The three places an anchor is written. */
export type AnchorUse = 'script' | 'outcome' | 'debrief';
/** An anchor's form: the run's start, the model's pulse loss or ROSC, a phase's first entry, an action's taking, the nth
 *  taking of an action (`action:<id>#<n>`), a time from the start (`{ atScenarioS }`), the first second a truth rule
 *  holds (`{ rule }`). */
export type AnchorPick = 'start' | 'pulseLoss' | 'rosc' | 'phase' | 'action' | 'taking' | 'atScenarioS' | 'rule';

/** The forms each place accepts, in the order offered: the schema's own (`scriptEntry.on`, `anchor`, the debrief's `at`
 *  pattern). [ENG: ui] */
export const ANCHOR_USES: Readonly<Record<AnchorUse, readonly AnchorPick[]>> = {
  script: ['phase', 'taking', 'atScenarioS'],
  outcome: ['start', 'phase', 'action', 'pulseLoss', 'rosc', 'rule'],
  debrief: ['start', 'phase', 'action', 'pulseLoss', 'rosc'],
};
/** Each form in words. [ENG: ui] */
export const PICK_WORDS: Readonly<Record<AnchorPick, string>> = {
  start: 'the start of the case', pulseLoss: 'the model’s pulse loss', rosc: 'the return of circulation', phase: 'a phase’s first entry',
  action: 'an action’s taking', taking: 'a given taking of an action', atScenarioS: 'a time after the start', rule: 'the first second a truth rule holds',
};

/** An anchor read: its form, and the phase or action it names, the taking's number, the time. Null: no form this place
 *  accepts (the card's own value, kept). */
export interface Anchor { pick: AnchorPick; id?: string; n?: number; s?: number }
export function readAnchor(v: unknown, use: AnchorUse): Anchor | null {
  let a: Anchor | null = null;
  if (typeof v === 'string') {
    if (v === 'start' || v === 'pulseLoss' || v === 'rosc') a = { pick: v };
    else if (v.startsWith('phase:')) a = { pick: 'phase', id: v.slice(6) };
    else if (/^action:[^#]+#\d+$/.test(v)) a = { pick: 'taking', id: v.slice(7, v.indexOf('#')), n: Number(v.slice(v.indexOf('#') + 1)) };
    else if (v.startsWith('action:')) a = { pick: 'action', id: v.slice(7) };
  } else if (v && typeof v === 'object' && !Array.isArray(v)) {
    if ('atScenarioS' in v) a = { pick: 'atScenarioS', s: (v as Rec).atScenarioS as number };
    else if ('rule' in v) a = { pick: 'rule' };
  }
  return a && ANCHOR_USES[use].includes(a.pick) ? a : null;
}

/** The anchor a form writes (a rule anchor is written by its own form: null here). */
export function writeAnchor(a: Anchor): unknown {
  switch (a.pick) {
    case 'phase':
      return `phase:${a.id ?? ''}`;
    case 'action':
      return `action:${a.id ?? ''}`;
    case 'taking':
      return `action:${a.id ?? ''}#${a.n ?? 1}`;
    case 'atScenarioS':
      return { atScenarioS: a.s ?? 0 };
    case 'rule':
      return null;
    default:
      return a.pick;
  }
}

const list = (F: Rec, k: 'phases' | 'actions'): Rec[] => (Array.isArray(F[k]) ? (F[k] as Rec[]) : []);
/** The targets a form names: this card's phases (by label) or actions (by row title), nothing else. */
export function anchorTargets(F: Rec, pick: AnchorPick): Array<[id: string, words: string]> {
  if (pick === 'phase') return list(F, 'phases').map((p) => [String(p.id), labelOf(p as never)]);
  if (pick === 'action' || pick === 'taking') return list(F, 'actions').map((a) => [String(a.id), String(a.label || a.id)]);
  return [];
}

/** The forms this place can offer on this card: a phase or action form only when the card has one. */
export function anchorPicks(F: Rec, use: AnchorUse): AnchorPick[] {
  return ANCHOR_USES[use].filter((p) => (p !== 'phase' && p !== 'action' && p !== 'taking') || anchorTargets(F, p).length > 0);
}

/** The anchor a form starts with when the author picks it: its first target, the first taking, 0 s. */
export function firstAnchor(F: Rec, pick: AnchorPick): Anchor {
  const t = anchorTargets(F, pick)[0]?.[0];
  return pick === 'taking' ? { pick, id: t, n: 1 } : pick === 'atScenarioS' ? { pick, s: 0 } : t !== undefined ? { pick, id: t } : { pick };
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
/** An anchor in words ("Early signs entered", "the 2nd taking of Dantrolene", "3:00 after the start"). */
export function anchorWords(F: Rec, v: unknown, use: AnchorUse): string {
  const a = readAnchor(v, use);
  if (!a) return typeof v === 'string' ? v : 'an anchor this place does not take';
  const name = (pick: AnchorPick) => anchorTargets(F, pick).find(([id]) => id === a.id)?.[1] ?? a.id ?? '';
  switch (a.pick) {
    case 'phase':
      return `${name('phase')} entered`;
    case 'action':
      return `${name('action')} taken`;
    case 'taking':
      return `the ${ordinal(a.n ?? 1)} taking of ${name('taking')}`;
    case 'atScenarioS':
      return `${mmss(a.s ?? 0)} after the start`;
    case 'rule':
      return 'the first second its rule holds';
    default:
      return PICK_WORDS[a.pick];
  }
}

const ID = /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/;
/** Why `id` cannot be entry `i`'s id in `list` (the script's or the outcomes'), or null. */
export function entryIdProblem(xs: readonly Rec[], i: number, id: string): string | null {
  if (!ID.test(id)) return 'an id starts with a letter, then letters, digits, “.”, “_” or “-”, at most 64';
  if (xs.some((x, k) => k !== i && x.id === id)) return 'another entry has this id';
  return null;
}
/** An id from words ("Temperature down" → "temperatureDown"), unique in `xs` with a number. */
export function entryIdFrom(xs: readonly Rec[], words: string, fallback: string): string {
  const parts = words.normalize('NFKD').replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/).filter(Boolean).slice(0, 4);
  let base = parts.map((w, k) => (k ? w[0]!.toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase())).join('');
  if (!/^[A-Za-z]/.test(base)) base = fallback;
  base = base.slice(0, 60);
  let id = base;
  for (let n = 2; xs.some((x) => x.id === id); n++) id = `${base}${n}`;
  return id;
}
