// The one Persian matcher (Debrief 2, plan D11): the handout script (scripts/showcase/debrief-fa.mjs) and the app's
// Persian Debrief and Briefing read docs/showcase/i18n/fa-debrief.json through this module, so both print the same
// Persian for the same English. Plain JavaScript (an .mjs with its types in fa-match.d.mts) so the script imports it under
// a plain `node`, as it is documented and as CI's Node 22 runs it, and vite and vitest import it unchanged; no file reading
// here: each caller hands over the parsed table (the script reads the file, the app imports the JSON).
// Moved from debrief-fa.mjs without a change of behaviour: its output on the D0 fixtures is byte-identical.

export const lcFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);
export const parse = (en) => {
  const parts = [];
  let last = 0;
  for (const m of en.matchAll(/\{(\w+)\}/g)) {
    if (m.index > last) parts.push({ lit: en.slice(last, m.index) });
    parts.push({ ph: m[1] });
    last = m.index + m[0].length;
  }
  if (last < en.length) parts.push({ lit: en.slice(last) });
  return parts;
};
/** Placeholders read with a fixed pattern; every other placeholder is free text checked by its own lookup. */
export const TYPED = { t: /\d{2,}:\d{2}/y, span: /\d+ s|\d+ min \d{2} s/y, n: /-?\d+(?:\.\d+)?/y, c: /\d+/y, u: /\S+/y, code: /[A-Za-z0-9](?:[\w.+-]*[\w+-])?(?: \d(?:[\w.+-]*[\w+-])?)?/y };

export const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
export const faDigits = (s) => String(s).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
/** "12 s" → "12 ثانیه", "2 min 05 s" → "2 دقیقه و 05 ثانیه" (a duration is a clinical time: Western digits). */
export const spanFa = (s) => {
  const m = /^(\d+) min (\d{2}) s$/.exec(s);
  return m ? `${m[1]} دقیقه و ${m[2]} ثانیه` : s.replace(/^(\d+) s$/, '$1 ثانیه');
};

/** Latin and Western-digit runs ("250 µg", "RR 12 /min", "O₂ 100 %") kept whole and left-to-right inside the Persian line. */
export const LTR_RUN = /[A-Za-z0-9µ°×+][A-Za-z0-9µ°×₀-₉⁰-⁹⁺⁻%.,:/·–+\- ]*[A-Za-z0-9µ°₀-₉⁰-⁹⁺⁻%]|[A-Za-z0-9µ°]/g;

/** Every way the template's parts can cover `s` (a free placeholder tries each end, shortest first). */
export function* match(parts, i, s, pos, caps) {
  if (i === parts.length) {
    if (pos === s.length) yield caps;
    return;
  }
  const p = parts[i];
  if (p.lit !== undefined) {
    if (s.startsWith(p.lit, pos)) yield* match(parts, i + 1, s, pos + p.lit.length, caps);
    return;
  }
  const re = TYPED[p.ph];
  if (re) {
    re.lastIndex = pos;
    const m = re.exec(s);
    if (m) yield* match(parts, i + 1, s, pos + m[0].length, [...caps, [p.ph, m[0]]]);
    return;
  }
  for (let end = pos + 1; end <= s.length; end++) yield* match(parts, i + 1, s, end, [...caps, [p.ph, s.slice(pos, end)]]);
}

/** The table's lookups: `tr` (exact string, a group's word, a template) and `inGroup` (one group's exact word). Each pushes
 *  the entries it used onto `used`; a bookmark label it could not translate goes into `missing`. */
export function faMatcher(TABLE) {
  const GROUPS = new Map(Object.entries(TABLE.groups).map(([g, es]) => [g, new Map(es.map((e) => [e.en, e]))]));
  const EXACT = new Map(TABLE.strings.map((e) => [e.en, e]));
  // a template without its Persian yet (`fa: null`, e.g. the /3 words awaiting F7.6) is skipped: its line prints in English
  const TEMPLATES = TABLE.templates.filter((e) => e.fa).map((e) => ({ e, kind: e.kind ?? 'top', parts: parse(e.en) }));
  /** A group's Persian for `en` (also with its first letter lowered: "The state" / "Salbutamol" at a sentence start). */
  function inGroup(g, en, used) {
    const map = GROUPS.get(g);
    const e = map?.get(en) ?? map?.get(lcFirst(en));
    if (!e) return null;
    used.push(e);
    return e.fa;
  }
  const EV_GROUPS = ['ev', 'drug', 'condition'];
  /** One placeholder's Persian, or null (the template does not fit). */
  function fill(ph, val, used, missing) {
    if (ph in TYPED) return ph === 'c' ? faDigits(val) : ph === 'span' ? spanFa(val) : val;
    // a value with its unit ("95 %", "36.8 °C", "250 µg + 2 U"), never a phrase that merely holds a number
    if (ph === 'v') return /^-?\d/.test(val) && !/[\u0600-\u06FF]/.test(val) && !/\b(?:at|in|all|first|lost|after|before|the|of|and|or|not|none|asked|within)\b/.test(val) ? val : null;
    if (ph === 's') return tr(val, used, missing, 'top');
    if (ph === 'ev') return EV_GROUPS.map((g) => inGroup(g, val, used)).find((x) => x !== null) ?? tr(val, used, missing, 'ev');
    if (ph === 'limit') return tr(val, used, missing, 'limit');
    if (ph === 'lab') return labs(val, used);
    if (ph === 'mark') {
      const x = tr(val, used, missing, 'top');
      if (x !== null) return x;
      missing.add(val); // a bookmark's own label (typed by the instructor) is printed as it is
      return val;
    }
    return GROUPS.has(ph) ? inGroup(ph, val, used) : null;
  }
  /** "K⁺ 4.2 mmol/L (4.2–4.2) · Lactate 1.0 mmol/L (1.0–1.0) · …": each lab's label translated, its values kept. */
  function labs(val, used) {
    const items = val.split(' · ').map((x) => /^(.+?) (-?\d.*)$/.exec(x));
    if (items.some((m) => !m)) return null;
    const out = items.map((m) => {
      const l = inGroup('label', m[1], used);
      return l === null ? null : `${l} ${m[2]}`;
    });
    return out.includes(null) ? null : out.join(' · ');
  }
  /** The Persian of `en` from the table (exact string, a group's word, a template), or null. */
  function tr(en, used, missing, kind = 'top') {
    if (kind === 'top') {
      const e = EXACT.get(en);
      if (e) return used.push(e), e.fa;
      for (const g of GROUPS.keys()) {
        const x = inGroup(g, en, used);
        if (x !== null) return x;
      }
    }
    // a reason line capitalises its first event ("The state …"): an event phrase is also tried with a lower-case start
    const forms = kind === 'ev' && en !== lcFirst(en) ? [en, lcFirst(en)] : [en];
    for (const t of TEMPLATES) {
      if (t.kind !== kind) continue;
      for (const caps of forms.flatMap((f) => [...match(t.parts, 0, f, 0, [])])) {
        const u = [];
        const vals = caps.map(([ph, v]) => [ph, fill(ph, v, u, missing)]);
        if (vals.some(([, v]) => v === null)) continue;
        const seen = {};
        const fa = t.e.fa.replace(/\{(\w+)\}/g, (_, ph) => {
          const k = (seen[ph] = (seen[ph] ?? -1) + 1);
          return vals.filter(([p]) => p === ph)[k]?.[1] ?? `{${ph}}`;
        });
        used.push(t.e, ...u);
        return fa;
      }
    }
    return null;
  }
  return { tr, inGroup };
}
