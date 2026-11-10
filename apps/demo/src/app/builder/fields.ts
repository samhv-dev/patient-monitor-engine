// The path → field map (docs/plans/scenario-builder.md §5.1, piece B1): the validator reports `<json path>: <what is
// wrong>` (validate.ts), and the builder shows each line at the field the path names, found by prefix:
// `/phases/2/next/0` is phase 3, its "may be followed by" list, row 1. A path that names no field (a schema error on a
// whole block or entry) shows at that block's or entry's heading. Pure, no DOM; it reads the path only, so it holds for the
// form being edited (the validator runs on docOf(form), whose arrays are the form's own).
//
// A rule is walked by its combinators only (all, any, not): any other key is a leaf, whatever its name. The leaves the
// schema lists today and those the format adds later (DC1's concentration variables) land on their node with no change
// here.
import { sectionOf, type Section } from './form.ts';

export interface FieldRef {
  /** The builder's section; `handout` is debriefHints' handout questions (§5.2's own row); `document` the whole card. */
  section: Section | 'handout' | 'document';
  /** The top-level key. */
  block?: string;
  /** The entry of a list section (phases, actions, outcomes, script): 2 is the third. */
  entry?: number;
  /** The entry's field, a block's field, or a header key. */
  field?: string;
  /** The row of a list field (`next`, `phases`, `give`, `contraindications`, `takeHome`, a debrief list). */
  row?: number;
  /** A rule field: its root's path, the node the message names (relative to the root: `/all/1`), and that node's leaf. */
  rule?: { root: string; node: string; leaf?: string };
  /** What is left under the field, row or rule leaf (`var`, `match/drugId`, `anchor`), decoded. */
  part?: string;
  /** Where the message shows: the row, the rule node, the field, or the heading's block or entry. */
  path: string;
  /** No field matched: show at the heading of `path`. */
  heading: boolean;
}

/** The sections that are lists of entries; the blocks whose keys are fields. Every other /2 key is a header field. */
const LISTS = new Set(['phases', 'actions', 'outcomes', 'script']);
const BLOCKS = new Set(['patient', 'device', 'briefing', 'debriefHints']);
/** Where a rule sits in an entry: the places validateV2 walks a phase rule (`rule()`) or a display rule (`display()`). */
const RULE_AT = /^(enter|rule|anchor\/rule|precondition|repeatWhile\/rule|window\/anchor\/(?:first\/\d+\/)?(?:rule|display)|contraindications\/\d+\/when)(?:\/|$)/;
const INDEX = /^\d+$/;
const decode = (s: string) => s.replace(/~1/g, '/').replace(/~0/g, '~');

/** The field a validator path lands on. */
export function fieldOf(path: string): FieldRef {
  const raw = path.split('/').slice(1).filter((s, i, a) => !(i === a.length - 1 && s === ''));
  if (!raw.length) return { section: 'document', path: '/', heading: true };
  const at = (n: number) => `/${raw.slice(0, n).join('/')}`;
  const block = decode(raw[0]!);
  const section = sectionOf(block);
  if (section === 'carried') return { section, block, path: at(1), heading: true };
  let i = 0;
  let entry: number | undefined;
  if (LISTS.has(block)) {
    if (raw.length < 2 || !INDEX.test(raw[1]!)) return { section, block, path: at(1), heading: true };
    entry = Number(raw[1]);
    if (raw.length < 3) return { section, block, entry, path: at(2), heading: true };
    i = 2;
  } else if (BLOCKS.has(block)) {
    if (raw.length < 2) return { section, block, path: at(1), heading: true };
    i = 1;
  }
  const field = decode(raw[i]!);
  const ref: FieldRef = { section: block === 'debriefHints' && field === 'handoutQuestions' ? 'handout' : section, block, ...(entry !== undefined && { entry }), field, path: '', heading: false };
  let n = i + 1;
  if (n < raw.length && INDEX.test(raw[n]!)) ref.row = Number(raw[n++]);
  const m = entry !== undefined ? RULE_AT.exec(raw.slice(2).join('/')) : null;
  if (m) {
    n = 2 + m[1]!.split('/').length;
    const root = at(n);
    let node = '';
    let leaf: string | undefined;
    while (n < raw.length) {
      const s = raw[n]!;
      if ((s === 'all' || s === 'any') && INDEX.test(raw[n + 1] ?? '')) { node += `/${s}/${raw[n + 1]}`; n += 2; }
      else if (s === 'not') { node += '/not'; n += 1; }
      else if (s === 'all' || s === 'any') break;
      else { leaf = decode(s); n += 1; break; }
    }
    ref.rule = { root, node, ...(leaf !== undefined && { leaf }) };
    ref.path = root + node;
  } else ref.path = at(n);
  if (n < raw.length) ref.part = raw.slice(n).map(decode).join('/');
  return ref;
}
