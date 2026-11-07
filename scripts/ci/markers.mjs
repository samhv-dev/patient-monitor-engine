// The engineered-value markers (docs/DESIGN-BRIEF.md, "Confidence tags"; research/44 L2-61). A number that is not
// cited carries one of two tags:
//   [ENG: <kind>]            not physiology; <kind> says which (numerics, device, display, …), an optional "; note" follows
//   [FIT: <target>; <ref>]   a value fitted to a physiological target; <ref> is `src <citation>` or `brief <id>` (or both)
// This rule fails on a bare or variant [ENG] ("[ENG]", "[ENG, fit …]", "[ENG; …]", "[TXT; ENG size]"), on an
// [ENG: …] whose kind is not in KINDS, and on a [FIT …] that names neither a source nor a brief id. A tag written
// inside backticks (`[ENG]`) is a mention, not a marker, and is skipped. It reports the counts.
//   node scripts/ci/markers.mjs          → the counts; exit 1 with the offending lines when any marker breaks the rule
//   node scripts/ci/markers.mjs --json   → the counts as JSON
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** What an [ENG: kind] may say it is. */
export const KINDS = ['numerics', 'device', 'display', 'ui', 'network', 'scenario', 'control', 'conversion', 'measurement', 'texture', 'unused', 'test'];
/** A brief id: a research/44 row (`research/44 L2-09`), another research note's item (`research/20 V6`), a brief number or a plan path. */
const BRIEF = /^brief (research\/\d+ [A-Z][\w-]*\d\b|\d+\b|docs\/plans\/\S+)/;
/** A source names a year, a section, a chapter or page, a PMID/DOI, the parameter tables or a research note. */
const SOURCE = /^src .*((1[89]|20)\d\d|§|\bch\. ?\d|\bp\. ?\d|PMID|doi|tables|research\/\d+)/i;
const TAG = /\[(ENG|FIT)\b([^\]]*)\]?/g;
const MIXED = /\[(?:P|TXT|VERIFY)\b[^\]\[]*\bENG\b[^\]]*\]/g;

/** Masks `…` spans (a mention of a tag, not a tag) with spaces so offsets stay put. */
const unquote = (text) => text.replace(/`[^`\n]*`/g, (m) => ' '.repeat(m.length));

/**
 * Scans one file's text. A tag may run over several comment lines; its body ends at the first `]`.
 * @returns {{ eng: Record<string, number>, fit: number, fitSource: number, fitBrief: number, errors: { line: number, tag: string, why: string }[] }}
 */
export function scanText(text) {
  const t = unquote(text);
  const out = { eng: {}, fit: 0, fitSource: 0, fitBrief: 0, errors: [] };
  const lineOf = (i) => t.slice(0, i).split('\n').length;
  for (const m of t.matchAll(TAG)) {
    const [whole, kind, body] = m;
    const err = (why) => out.errors.push({ line: lineOf(m.index), tag: whole.slice(0, 80), why });
    if (!whole.endsWith(']')) { err('unclosed'); continue; }
    if (kind === 'ENG') {
      const k = /^: ([a-z]+)(;|$)/.exec(body);
      if (!k) err('a bare or variant [ENG]: write [ENG: <kind>] or [FIT: <target>; src … | brief …]');
      else if (!KINDS.includes(k[1])) err(`[ENG: ${k[1]}] is not one of ${KINDS.join(', ')}`);
      else out.eng[k[1]] = (out.eng[k[1]] ?? 0) + 1;
      continue;
    }
    if (!body.startsWith(': ')) { err('a bare [FIT]: write [FIT: <target>; src … | brief …]'); continue; }
    const parts = body.slice(2).split(';').map((s) => s.replace(/\s+/g, ' ').trim());
    const brief = parts.some((p) => BRIEF.test(p));
    const src = parts.some((p) => SOURCE.test(p));
    if (!brief && !src) err('a [FIT] must name a source (`src …`) or a mechanism-brief id (`brief research/44 L2-09`)');
    else out.fit++;
    if (src) out.fitSource++;
    if (brief) out.fitBrief++;
  }
  for (const m of t.matchAll(MIXED)) out.errors.push({ line: lineOf(m.index), tag: m[0].slice(0, 80), why: 'ENG inside another tag: split it into [TXT …] [FIT: …]' });
  return out;
}

/** The tracked text files under packages/ and apps/. */
export function markerFiles(root) {
  const ls = execFileSync('git', ['ls-files', '--', 'packages', 'apps'], { cwd: root, encoding: 'utf8' });
  return ls.split('\n').filter((f) => /\.(ts|mts|mjs|js|json|md|html|css)$/.test(f) && !/(^|\/)(dist|node_modules)\//.test(f));
}

export function scanTree(root) {
  const total = { eng: {}, fit: 0, fitSource: 0, fitBrief: 0, errors: [] };
  for (const f of markerFiles(root)) {
    const r = scanText(readFileSync(resolve(root, f), 'utf8'));
    for (const [k, n] of Object.entries(r.eng)) total.eng[k] = (total.eng[k] ?? 0) + n;
    total.fit += r.fit;
    total.fitSource += r.fitSource;
    total.fitBrief += r.fitBrief;
    for (const e of r.errors) total.errors.push({ file: f, ...e });
  }
  return total;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
  const r = scanTree(root);
  const eng = Object.values(r.eng).reduce((a, b) => a + b, 0);
  if (process.argv.includes('--json')) console.log(JSON.stringify({ eng, engByKind: r.eng, fit: r.fit, fitWithSource: r.fitSource, fitWithBrief: r.fitBrief, errors: r.errors.length }));
  else {
    console.log(`markers: ENG ${eng} (${Object.entries(r.eng).sort().map(([k, n]) => `${k} ${n}`).join(', ')}); FIT ${r.fit}: with a source ${r.fitSource}, with a brief id ${r.fitBrief} (a FIT naming both counts in both)`);
    for (const e of r.errors) console.log(`${e.file}:${e.line}: ${e.why}\n    ${e.tag}`);
  }
  if (r.errors.length) {
    console.error(`${r.errors.length} marker(s) break the rule (docs/DESIGN-BRIEF.md, "Confidence tags")`);
    process.exit(1);
  }
}
