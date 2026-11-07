// The Persian Debrief in the app (plan D13): the English page is built as it always is, then each text node of the
// report, the learner handout and the footer is put through THE matcher the handout script uses (fa-match.mjs, D11) on
// the same table (docs/showcase/i18n/fa-debrief.json), so the page and the script print the same Persian. A string the
// table does not hold prints in English, marked (`bdi.en`, lang="en"), and is counted, as the script prints and lists
// it; a line joined with " · " is matched whole first, then part by part. Latin and Western-digit runs (values, units,
// times, monitor labels) stay left to right inside the Persian line. SVG text, typed fields and the instructor's
// notes are never touched.
import TABLE from '../../../../../docs/showcase/i18n/fa-debrief.json';
import { faMatcher, LTR_RUN, type FaEntry, type FaTable } from './fa-match.mjs';

const M = faMatcher(TABLE as unknown as FaTable);
/** DQ10 (ruled 5 November, option A): stands under the switch and on every printed page while any entry printed is
 *  unread by the clinical owner. */
export const DRAFT_LINE = 'Persian draft: not yet read by the clinical owner';

/** What one Persian pass printed: the table entries it used, and the English it printed for want of an entry. */
export interface FaPass {
  used: Set<FaEntry>;
  missing: Map<string, number>;
}
export const faPass = (): FaPass => ({ used: new Set(), missing: new Map() });
/** Any entry the pass printed still unread by the owner. */
export const unreviewed = (p: FaPass): boolean => [...p.used].some((e) => !e.reviewed);

const look = (en: string): { fa: string | null; used: FaEntry[]; missing: Set<string> } => {
  const used: FaEntry[] = [];
  const missing = new Set<string>();
  return { fa: M.tr(en, used, missing), used, missing };
};
const keep = (p: FaPass, r: ReturnType<typeof look>): void => {
  for (const e of r.used) p.used.add(e);
  for (const m of r.missing) p.missing.set(m, (p.missing.get(m) ?? 0) + 1);
};
const miss = (p: FaPass, en: string): void => void p.missing.set(en, (p.missing.get(en) ?? 0) + 1);

/** The Persian of `en`, or null (counted as missing). */
export function faText(en: string, p: FaPass): string | null {
  const r = look(en);
  if (r.fa === null) return miss(p, en), null;
  keep(p, r);
  return r.fa;
}

const LATIN = /[A-Za-z]/;
const JOIN = ' · ';
const SKIP = 'svg, script, style, input, textarea, [contenteditable], .db-runby, [data-fa-skip]';

/** A Persian string as nodes: each Latin or Western-digit run isolated left to right. */
function faNodes(fa: string): Node[] {
  const out: Node[] = [];
  let last = 0;
  for (const m of fa.matchAll(LTR_RUN)) {
    if ((m.index ?? 0) > last) out.push(document.createTextNode(fa.slice(last, m.index)));
    const b = document.createElement('bdi');
    b.dir = 'ltr';
    b.textContent = m[0];
    out.push(b);
    last = (m.index ?? 0) + m[0].length;
  }
  if (last < fa.length) out.push(document.createTextNode(fa.slice(last)));
  return out;
}
/** An English string the table does not hold, printed as it is and marked. */
function enNode(en: string): Node {
  const b = document.createElement('bdi');
  b.dir = 'ltr';
  b.lang = 'en';
  b.className = 'en';
  b.textContent = en;
  return b;
}

/** One text's Persian nodes, or null: the whole string; with the space it opens with in the English (" — undone by
 *  return 1" is in the table with it); a verdict or grade with its glyph ("✓ Observed", "! overdue": the glyph kept);
 *  a legend's piece with its separators ("team action ·", "(✓ met": the "·", brackets and spaces kept). */
function tryNodes(core: string, lead: string, p: FaPass): Node[] | null {
  let whole = look(core);
  if (whole.fa === null && /^\s/.test(lead)) whole = look(` ${core}`);
  if (whole.fa !== null) return keep(p, whole), faNodes(whole.fa);
  const g = /^([^\p{L}\p{N}\s]+) (\p{L}[\s\S]*)$/u.exec(core);
  if (g) {
    const words = look(g[2] as string);
    if (words.fa !== null) return keep(p, words), [document.createTextNode(`${g[1]} `), ...faNodes(words.fa)];
  }
  const peel = /^([\s·(]*)([\s\S]*?)([\s·)]*)$/.exec(core) as RegExpExecArray;
  if ((peel[1] || peel[3]) && peel[2]) {
    const inner = tryNodes(peel[2] as string, '', p);
    if (inner) return [...(peel[1] ? [document.createTextNode(peel[1])] : []), ...inner, ...(peel[3] ? [document.createTextNode(peel[3])] : [])];
  }
  return null;
}

/** A text with no word to translate: values, times, dates and clock times ("10/17/2026, 11:49:20 PM"), glyphs. */
const wordless = (s: string): boolean => !LATIN.test(s.replace(/\b[AP]M\b/g, ''));

/** One text's nodes in Persian: whole (tryNodes), else its " · " parts; what the table lacks in English, counted. */
function translated(core: string, lead: string, p: FaPass): Node[] {
  const whole = tryNodes(core, lead, p);
  if (whole) return whole;
  const parts = core.split(JOIN);
  if (parts.length === 1) return miss(p, core), [enNode(core)];
  return parts.flatMap((part, i) => {
    const sep = i ? [document.createTextNode(JOIN)] : [];
    if (wordless(part)) return [...sep, document.createTextNode(part)];
    const nodes = tryNodes(part, '', p);
    if (!nodes) miss(p, part);
    return [...sep, ...(nodes ?? [enNode(part)])];
  });
}

/** Put every text node under `root` into Persian (in place); `p` collects what was used and what is missing. */
export function translateTree(root: Element, p: FaPass): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n as Text);
  for (const t of nodes) {
    if (t.parentElement?.closest(SKIP)) continue;
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(t.data) as RegExpExecArray;
    const core = m[2] as string;
    if (wordless(core)) continue;
    t.replaceWith(...[m[1] ? document.createTextNode(m[1]) : null, ...translated(core, m[1] as string, p), m[3] ? document.createTextNode(m[3]) : null].filter((x): x is Node => x !== null));
  }
}
