#!/usr/bin/env node
// Persian (Farsi) handout of the Debrief report: reads the report's own JSON export ("Download the record (JSON)",
// schema pme-debrief/1 or pme-debrief/2, Stage 13 Q3; /2 adds `version` and the redesign's verdict words) and prints a
// right-to-left A4 PDF with the English report's sections in its order: the case, objectives with their verdicts,
// measured facts (the labs row included), trends, drugs and fluids, the timeline (the undone course struck through),
// bookmarks, the talking points (/2 only), the take-home points (the learner handout's section: the card's lines, else
// ruled lines), notes and the one-row-per-minute appendix; the footer (the release wording of views/debrief.ts FOOT,
// with the version and the build) and "page n of N" on every page. A handout
// script, NOT an app feature: the app and its tests are untouched (the in-app translation is planned for a later
// release). Words come from docs/showcase/i18n/fa-debrief.json; a string the table does not cover is printed in English
// and listed at the end of the run. Clinical values (vital signs, doses, times) keep Western digits and their units;
// prose counts and dates use Persian digits. Rendering: headless Chromium through Playwright, the path the
// Stage 13 print checks already use (no new dependency); the Vazirmatn font (SIL OFL) is embedded from local TTFs.
//   node scripts/showcase/debrief-fa.mjs <debrief.json>... --version X.Y.Z [--out-dir DIR] [--fonts DIR] [--html] [--text]
//   --version: the version the build printed on its Start screen (e.g. 1.0.0-rc.1). pme-debrief/1 carries the build but
//            not the version, so it is given here; pme-debrief/2 carries its own "version", which wins.
//   --fonts: a folder with Vazirmatn-Regular.ttf and Vazirmatn-Bold.ttf (or the variable Vazirmatn[wght].ttf); else
//            $PME_FA_FONTS, ~/Library/Fonts, ~/.fonts, /Library/Fonts, /usr/share/fonts/truetype/vazirmatn
//   --html / --text: also write the HTML, and the printed Persian text one string per line (for a spelling pass)
import { existsSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(import.meta.dirname, '../..');
const TABLE_PATH = join(REPO, 'docs/showcase/i18n/fa-debrief.json');

// ---------------------------------------------------------------------------------------------------- the table
const TABLE = JSON.parse(readFileSync(TABLE_PATH, 'utf8'));
const lcFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const GROUPS = new Map(Object.entries(TABLE.groups).map(([g, es]) => [g, new Map(es.map((e) => [e.en, e]))]));
const EXACT = new Map(TABLE.strings.map((e) => [e.en, e]));
const parse = (en) => {
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
const TEMPLATES = TABLE.templates.map((e) => ({ e, kind: e.kind ?? 'top', parts: parse(e.en) }));
/** Placeholders read with a fixed pattern; every other placeholder is free text checked by its own lookup. */
const TYPED = { t: /\d{2,}:\d{2}/y, span: /\d+ s|\d+ min \d{2} s/y, n: /-?\d+(?:\.\d+)?/y, c: /\d+/y, u: /\S+/y, code: /[A-Za-z0-9](?:[\w.+-]*[\w+-])?(?: \d(?:[\w.+-]*[\w+-])?)?/y };

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const faDigits = (s) => String(s).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
/** "12 s" → "12 ثانیه", "2 min 05 s" → "2 دقیقه و 05 ثانیه" (a duration is a clinical time: Western digits). */
const spanFa = (s) => {
  const m = /^(\d+) min (\d{2}) s$/.exec(s);
  return m ? `${m[1]} دقیقه و ${m[2]} ثانیه` : s.replace(/^(\d+) s$/, '$1 ثانیه');
};

/** Every way the template's parts can cover `s` (a free placeholder tries each end, shortest first). */
function* match(parts, i, s, pos, caps) {
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

// ---------------------------------------------------------------------------------------------------- HTML
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** Latin and Western-digit runs ("250 µg", "RR 12 /min", "O₂ 100 %") kept whole and left-to-right inside the Persian line. */
const LTR_RUN = /[A-Za-z0-9µ°×+][A-Za-z0-9µ°×₀-₉⁰-⁹⁺⁻%.,:/·–+\- ]*[A-Za-z0-9µ°₀-₉⁰-⁹⁺⁻%]|[A-Za-z0-9µ°]/g;
const bidi = (s) => {
  let out = '';
  let last = 0;
  for (const m of s.matchAll(LTR_RUN)) {
    out += esc(s.slice(last, m.index)) + `<bdi dir="ltr">${esc(m[0])}</bdi>`;
    last = m.index + m[0].length;
  }
  // Vazirmatn has no subscript two or superscript plus (O₂, K⁺): drawn as sub/sup of its own digits, never a fallback font
  return (out + esc(s.slice(last))).replace(/₂/g, '<sub>2</sub>').replace(/⁺/g, '<sup>+</sup>');
};

class Doc {
  constructor() {
    this.used = new Set();
    this.missing = new Map(); // English → times printed
    this.printed = []; // every Persian string printed (for --text)
  }
  /** The Persian of `en` as HTML; an untranslated string in English, marked and counted. */
  t(en) {
    const used = [];
    const missing = new Set();
    const fa = tr(en, used, missing);
    for (const e of used) this.used.add(e);
    for (const m of missing) this.missing.set(m, (this.missing.get(m) ?? 0) + 1);
    if (fa === null) {
      this.missing.set(en, (this.missing.get(en) ?? 0) + 1);
      return `<bdi dir="ltr" class="en">${esc(en)}</bdi>`;
    }
    this.printed.push(fa);
    return bidi(fa);
  }
  /** The Persian of `en` from one group only (exact English: a take-home line), else the English, marked and counted. */
  group(g, en) {
    const used = [];
    const fa = inGroup(g, en, used);
    for (const e of used) this.used.add(e);
    if (fa === null) {
      this.missing.set(en, (this.missing.get(en) ?? 0) + 1);
      return `<bdi dir="ltr" class="en">${esc(en)}</bdi>`;
    }
    this.printed.push(fa);
    return bidi(fa);
  }
  /** Plain Persian text (CSS strings, the title). */
  plain(en) {
    const used = [];
    const fa = tr(en, used, new Set());
    for (const e of used) this.used.add(e);
    if (fa === null) this.missing.set(en, (this.missing.get(en) ?? 0) + 1);
    else this.printed.push(fa);
    return fa ?? en;
  }
}

// --- the English report's arithmetic (apps/demo/src/app/debrief.ts and views/debrief.ts), ported for the JSON's record
const mmss = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const span = (s) => {
  const t = Math.round(s); // whole seconds before the split: 119.7 s is "2 min 00 s", never "1 min 60 s" (FX-13)
  return t < 60 ? `${t} s` : `${Math.floor(t / 60)} min ${String(t % 60).padStart(2, '0')} s`;
};
const kept = (d) => d.rows.filter((r) => r.undone === undefined);
const endOf = (d) => Math.max(0, ...kept(d).map((r) => r.t), ...d.samples.map((s) => s.t));
/** Trend and lab labels and units (debrief.ts trendMeta, from the R56 glossary). */
const META = {
  hr: ['HR', 'bpm', 0], map: ['ART M / NIBP M', 'mmHg', 0], spo2: ['SpO₂', '%', 0], etco2: ['EtCO₂', 'mmHg', 0], rr: ['awRR / RR', '/min', 0], temp: ['T1 / T2', '°C', 1],
  k: ['K⁺', 'mmol/L', 1], lactate: ['Lactate', 'mmol/L', 1], ph: ['pH', '', 2], glucose: ['Glucose', 'mmol/L', 1], tcore: ['Tcore', '°C', 1],
};
const TREND_KEYS = ['hr', 'map', 'spo2', 'etco2', 'rr', 'temp'];
const LAB_KEYS = ['k', 'lactate', 'ph', 'glucose', 'tcore'];
const AXIS_FLOOR = { spo2: 20, hr: 40, map: 40, etco2: 20, temp: 2 };
function axisRange(k, lo, hi) {
  const floor = AXIS_FLOOR[k];
  if (floor === undefined) return hi - lo < 2 ? [lo - 1, hi + 1] : [lo, hi];
  if (hi - lo >= floor) return [lo, hi];
  let a = (lo + hi) / 2 - floor / 2;
  if (k === 'spo2' && a + floor > 100) a = 100 - floor;
  if (a < 0 && lo >= 0) a = 0;
  return [a, a + floor];
}
const DRUG_BY_ID = new Map(TABLE.groups.drug.filter((e) => e.id).map((e) => [e.id, e.en]));
function drugTotals(d) {
  const by = new Map();
  for (const r of kept(d)) {
    if (!r.dose) continue;
    const x = by.get(r.dose.drugId) ?? { n: 0, mg: 0, other: new Map() };
    const mg = { mg: 1, mcg: 1e-3, 'mg/kg': d.weightKg, 'mcg/kg': d.weightKg * 1e-3 }[r.dose.unit];
    if (mg !== undefined) x.mg += r.dose.dose * mg;
    else x.other.set(r.dose.unit, (x.other.get(r.dose.unit) ?? 0) + r.dose.dose);
    x.n++;
    by.set(r.dose.drugId, x);
  }
  const round = (v) => String(+v.toPrecision(3));
  return [...by].map(([drugId, x]) => ({
    drugId, n: x.n,
    total: [x.mg > 0 ? (x.mg < 1 ? `${round(x.mg * 1000)} µg` : `${round(x.mg)} mg`) : '', ...[...x.other].map(([u, v]) => `${round(v)} ${u}`)].filter(Boolean).join(' + '),
  }));
}

const ICON = {
  met: '<svg class="ic" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6.5 5 9.5 10 2.5" fill="none" stroke="#000" stroke-width="1.8"/></svg>',
  'not met': '<svg class="ic" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 2.5 9.5 9.5M9.5 2.5 2.5 9.5" fill="none" stroke="#000" stroke-width="1.8"/></svg>',
  'not assessable': '<svg class="ic" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6h7" fill="none" stroke="#000" stroke-width="1.8"/></svg>',
};
const MARK = { met: 'Met', 'not met': 'Not met', 'not assessable': 'Not assessable' };
const DIAMOND = '<svg class="ic" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1 11 6 6 11 1 6Z" fill="#000"/></svg>';
/** The verdict's mark, icon, words and reason line. /1: today's MARK and ICON. /2: the redesign's words (views/debrief.ts
 *  markOf): ✓ Observed (a rule-less objective the instructor ticked too, with the tick's time as its reason),
 *  ✗ Not observed, – Not assessable, and ◆ Discuss for a discuss objective not met. */
function markOf(o, schema) {
  const v = o.verdict;
  if (schema === 'pme-debrief/1') return { mark: null, icon: ICON[v.status] ?? '', words: MARK[v.status], why: v.why };
  if (v.status === 'met') return { mark: 'observed', icon: ICON.met, words: 'Observed', why: v.why };
  if (v.status === 'not met') return o.discuss ? { mark: 'discuss', icon: DIAMOND, words: 'Discuss', why: v.why } : { mark: 'not-observed', icon: ICON['not met'], words: 'Not observed', why: v.why };
  if (v.tickedT !== undefined) return { mark: 'observed', icon: ICON.met, words: 'Observed', why: `Observed by the instructor at ${mmss(v.tickedT)}.` };
  return { mark: 'not-assessable', icon: ICON['not assessable'], words: 'Not assessable', why: v.why };
}
/** The talking points (views/debrief.ts PEARLS): fixed text, each phase and its prompt from the table. */
const PEARLS = [
  ['Reactions', 'How did that feel? What stands out for you?'],
  ['Description', 'In a sentence or two: what was the problem, and when did you know?'],
  ['Analysis', 'Take one key moment: what did you see, what did you think, what did you do?'],
  ['Summary', 'One thing to keep doing, one thing to do differently next time.'],
];
const KIND = { action: 'Action', remote: 'Remote', scenario: 'Scenario', alarm: 'Alarm', bookmark: 'Bookmark', restore: 'Return', patient: 'Patient', note: 'Note' };

/** One trend as inline SVG (views/debrief.ts chart()): time runs left to right as on the monitor; a dashed line at each return. */
function chart(D, d, k, end) {
  const [label, unit, digits] = META[k];
  const cap = `<figcaption>${D.t(label)}${unit ? ` <span class="unit"><bdi dir="ltr">${esc(unit)}</bdi></span>` : ''}</figcaption>`;
  const pts = d.samples.filter((s) => s[k] !== null);
  if (!pts.length) return `<figure class="chart">${cap}<p class="muted">${D.t('Not measured during the run.')}</p></figure>`;
  const vals = pts.map((s) => s[k]);
  const [lo, hi] = axisRange(k, Math.min(...vals), Math.max(...vals));
  const W = 640, H = 130, L = 44, R = 10, T = 8, B = 20;
  const x = (t) => L + (t / Math.max(end, 1)) * (W - L - R);
  const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  let path = '';
  let prev = null;
  for (const s of d.samples) {
    if (s[k] === null) {
      prev = null;
      continue;
    }
    path += `${prev === null || s.t - prev > 5 ? 'M' : 'L'}${x(s.t).toFixed(1)} ${y(s[k]).toFixed(1)}`;
    prev = s.t;
  }
  const step = [60, 120, 300, 600, 900, 1800, 3600].find((st) => end / st <= 8) ?? 3600;
  let ticks = '';
  for (let t = 0; t <= end; t += step) ticks += `<line x1="${x(t)}" x2="${x(t)}" y1="${H - B}" y2="${H - B + 4}"/><text x="${x(t)}" y="${H - 4}" text-anchor="middle">${mmss(t)}</text>`;
  const rets = d.rows.filter((r) => r.kind === 'restore' && r.undone === undefined).map((r) => `<line class="ret" x1="${x(r.t)}" x2="${x(r.t)}" y1="${T}" y2="${H - B}"/>`).join('');
  const f = (v) => v.toFixed(digits);
  return `<figure class="chart">${cap}<svg dir="ltr" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img">
<line class="axis" x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}"/><line class="axis" x1="${L}" x2="${L}" y1="${T}" y2="${H - B}"/>
<line class="grid" x1="${L}" x2="${W - R}" y1="${T}" y2="${T}"/>
<text x="${L - 4}" y="${T + 4}" text-anchor="end">${f(hi)}</text><text x="${L - 4}" y="${H - B}" text-anchor="end">${f(lo)}</text>
<g class="ticks">${ticks}</g>${rets}<path d="${path}"/></svg></figure>`;
}

const section = (id, title, body) => `<section id="${id}"><h2>${title}</h2>${body}</section>`;

function fontFaces(dir) {
  const files = readdirSync(dir).filter((f) => /^Vazirmatn.*\.(ttf|woff2)$/i.test(f));
  const data = (f) => `url(data:font/${f.endsWith('.woff2') ? 'woff2' : 'ttf'};base64,${readFileSync(join(dir, f)).toString('base64')}) format("${f.endsWith('.woff2') ? 'woff2' : 'truetype'}")`;
  const reg = files.find((f) => /-Regular\./.test(f));
  const bold = files.find((f) => /-Bold\./.test(f));
  if (reg && bold) return `@font-face{font-family:"Vazirmatn";src:${data(reg)};font-weight:400}@font-face{font-family:"Vazirmatn";src:${data(bold)};font-weight:700}`;
  const vf = files.find((f) => /wght/i.test(f)) ?? files[0];
  return `@font-face{font-family:"Vazirmatn";src:${data(vf)};font-weight:100 900}`;
}
function findFonts(arg) {
  const dirs = [arg, process.env.PME_FA_FONTS, join(homedir(), 'Library/Fonts'), join(homedir(), '.fonts'), '/Library/Fonts', '/usr/share/fonts/truetype/vazirmatn'].filter(Boolean);
  const dir = dirs.find((d) => existsSync(d) && readdirSync(d).some((f) => /^Vazirmatn.*\.(ttf|woff2)$/i.test(f)));
  if (!dir) {
    console.error('No Vazirmatn font found. Download it (SIL OFL) from https://github.com/rastikerdar/vazirmatn/releases or Google Fonts, then pass --fonts <folder with Vazirmatn-Regular.ttf and Vazirmatn-Bold.ttf>.');
    process.exit(2);
  }
  return dir;
}

const CSS = `
@page { size: A4 portrait; margin: 14mm 14mm 18mm; }
html { direction: rtl; }
body { font-family: "Vazirmatn", sans-serif; font-size: 10pt; line-height: 1.75; color: #000; background: #fff; margin: 0; letter-spacing: 0; }
bdi[dir=ltr] { unicode-bidi: isolate; white-space: nowrap; } /* a clinical value never breaks across lines */
h1 { font-size: 17pt; line-height: 1.5; margin: 0 0 2mm; }
h2 { font-size: 12.5pt; line-height: 1.5; border-bottom: 0.8pt solid #000; padding-bottom: 1mm; margin: 6mm 0 2mm; break-after: avoid; }
.notice { font-size: 8.5pt; border: 0.6pt solid #000; padding: 1mm 2.5mm; margin: 0 0 3mm; }
dl.meta, dl.facts { display: grid; grid-template-columns: max-content 1fr; gap: 0.6mm 6mm; margin: 2mm 0; }
dt { font-weight: 700; }
dd { margin: 0; }
.runby { margin: 3mm 0; }
.runby span { display: inline-block; min-width: 90mm; border-bottom: 0.6pt solid #000; }
ol.obj { padding-inline-start: 6mm; margin: 0; list-style-type: persian; }
ol.obj li { margin-bottom: 2.5mm; break-inside: avoid; }
.mark { display: inline-block; min-width: 30mm; font-weight: 700; }
.ic { width: 2.6mm; height: 2.6mm; vertical-align: -0.2mm; margin-inline-end: 1mm; }
li[data-status="not met"]:not([data-mark]) .mark { text-decoration: underline; } /* /1 only */
.pearls { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm; }
.pearl { border: 0.6pt solid #000; min-height: 20mm; padding: 1.5mm 2mm; }
.pearl p { margin: 1mm 0 0; font-size: 9pt; }
.why { font-size: 9pt; color: #222; }
.en { font-family: "Vazirmatn", sans-serif; font-style: italic; }
.chart { margin: 0 0 4mm; break-inside: avoid; }
.chart figcaption { font-weight: 700; }
.unit { font-weight: 400; color: #333; }
.chart svg { display: block; width: 100%; height: 34mm; direction: ltr; } /* SVG text-anchor follows the CSS direction */
.chart path { fill: none; stroke: #000; stroke-width: 1.6; vector-effect: non-scaling-stroke; }
.chart .axis, .chart .ticks line { stroke: #555; stroke-width: 1; vector-effect: non-scaling-stroke; }
.chart .grid { stroke: #555; stroke-dasharray: 2 3; vector-effect: non-scaling-stroke; }
.chart .ret { stroke: #000; stroke-dasharray: 5 3; vector-effect: non-scaling-stroke; }
.chart text { font-size: 11px; fill: #000; font-family: "Vazirmatn", sans-serif; }
table { border-collapse: collapse; width: 100%; font-size: 9pt; }
thead { display: table-header-group; }
th, td { text-align: start; padding: 1mm 0 1mm 2.5mm; border-bottom: 0.5pt solid #000; vertical-align: top; }
tr { break-inside: avoid; }
td.num { white-space: nowrap; width: 13mm; direction: ltr; text-align: end; unicode-bidi: isolate; }
tr.undone td, li.undone { color: #444; text-decoration: line-through; }
table.minutes { font-size: 8pt; }
table.minutes th, table.minutes td { text-align: center; padding: 0.6mm 1mm; }
table.minutes td { direction: ltr; unicode-bidi: isolate; font-variant-numeric: tabular-nums; }
table.minutes th .unit { display: block; font-weight: 400; }
.notes { border: 0.6pt solid #000; min-height: 30mm; }
#trends, #timeline, #minutes { break-before: page; }
ol.take { padding-inline-start: 6mm; margin: 0; list-style-type: persian; }
.ruled { border-bottom: 0.6pt solid #000; height: 8mm; }
#objectives, #facts, #bookmarks, #pearls, #takehome, #notes { break-inside: avoid; }
.muted { color: #333; }
.totals { margin: 2mm 0 0; padding-inline-start: 5mm; }
p { orphans: 2; widows: 2; }
sub, sup { font-size: 70%; line-height: 0; }
`;

export function render(j, fontsCss, version) {
  const D = new Doc();
  const d = j.record;
  const end = endOf(d);
  const title = d.doc?.title?.replace(/^\[draft\]\s*/i, '');
  const started = new Date(d.startedAt);
  // both calendars, in prose (Persian digits); the parts are assembled here so no Latin comma enters the line
  const part = (cal, o) => Object.fromEntries(new Intl.DateTimeFormat(`fa-IR-u-ca-${cal}`, o).formatToParts(started).map((x) => [x.type, x.value]));
  const sh = part('persian', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const gr = part('gregory', { day: 'numeric', month: 'long', year: 'numeric' });
  const solar = `${sh.weekday} ${sh.day} ${sh.month} ${sh.year}، ساعت ${sh.hour}:${sh.minute}`;
  const greg = `${gr.day} ${gr.month} ${gr.year} میلادی`;
  const wall = Math.max(0, (d.lastWall - d.startedAt) / 1000);
  // the English footer's words and arithmetic (views/debrief.ts FOOT): "(pre-release)" when the version has a suffix
  const foot = D.plain(`For education only. Not a medical device and not clinically validated: never use it for patient care. Version ${version}${version.includes('-') ? ' (pre-release)' : ''}, build ${j.build}.`);
  const pageT = TABLE.templates.find((e) => e.en === 'Page {c} of {c}');
  D.used.add(pageT);
  const [pa, , pb] = pageT.fa.split(/(\{c\})/);

  const meta = `<dl class="meta">
<dt>${D.t('Scenario')}</dt><dd>${title ? D.t(title) : D.t('No scenario (free run)')}</dd>
<dt>${D.t('Patient')}</dt><dd>${D.t(d.patient)}</dd>
<dt>${D.t('Started')}</dt><dd>${esc(solar)} (${esc(greg)})</dd>
<dt>${D.t('Duration')}</dt><dd>${D.t(`${mmss(end)} simulated · ${span(wall)} on the clock`)}</dd></dl>
<p class="runby">${D.t('Run by')}: <span></span></p>`;
  const obj = j.objectives.length
    ? `<ol class="obj">${j.objectives.map((o) => {
      const m = markOf(o, j.schema);
      return `<li data-status="${esc(o.verdict.status)}"${m.mark ? ` data-mark="${m.mark}"` : ''}><span class="mark">${m.icon}${D.t(m.words)}</span> ${D.t(o.text)}<div class="why">${D.t(m.why)}</div></li>`;
    }).join('')}</ol>`
    : `<p class="muted">${D.t('This run has no objectives.')}</p>`;
  const facts = j.facts.length
    ? `<dl class="facts">${j.facts.map((x) => `<dt>${D.t(x.label)}</dt><dd>${x.value.split(' · ').map((v) => D.t(v)).join('<br>')}</dd>`).join('')}</dl>`
    : `<p class="muted">${D.t('Nothing was measured yet.')}</p>`;
  const undone = (r) => (r.undone ? ` ${D.t(` — undone by return ${r.undone}`)}` : '');
  const meds = d.rows.filter((r) => r.ev?.startsWith('drug:') || r.ev === 'fluid');
  const totals = drugTotals(d);
  const drugs = (meds.length
    ? `<table><thead><tr><th>${D.t('Time')}</th><th>${D.t('Given')}</th></tr></thead><tbody>${meds.map((r) => `<tr${r.undone ? ' class="undone"' : ''}><td class="num">${mmss(r.t)}</td><td>${D.t(r.text)}${undone(r)}</td></tr>`).join('')}</tbody></table>`
    : `<p class="muted">${D.t('No drugs or fluids were given.')}</p>`)
    + (totals.length ? `<ul class="totals">${totals.map((x) => `<li>${D.t(`${DRUG_BY_ID.get(x.drugId) ?? 'Drug'}: ${x.total} in ${x.n} ${x.n === 1 ? 'bolus' : 'boluses'}`)}</li>`).join('')}</ul>` : '');
  const timeline = `<table class="timeline"><thead><tr><th>${D.t('Time')}</th><th>${D.t('Kind')}</th><th>${D.t('Event')}</th></tr></thead><tbody>${d.rows.map((r) => `<tr${r.undone ? ' class="undone"' : ''}><td class="num">${mmss(r.t)}</td><td>${D.t(KIND[r.kind])}</td><td>${D.t(r.text)}${undone(r)}</td></tr>`).join('')}</tbody></table>`;
  const marks = d.rows.filter((r) => r.kind === 'bookmark' || r.kind === 'restore');
  const bookmarks = marks.length ? `<ul>${marks.map((r) => `<li${r.undone ? ' class="undone"' : ''}><bdi dir="ltr">${mmss(r.t)}</bdi> ${D.t(r.text)}${undone(r)}</li>`).join('')}</ul>` : `<p class="muted">${D.t('No bookmarks.')}</p>`;
  const keys = [...TREND_KEYS, ...LAB_KEYS];
  const minutes = `<table class="minutes"><thead><tr><th>${D.t('Time')}</th>${keys.map((k) => `<th>${D.t(META[k][0])}${META[k][1] ? `<span class="unit"><bdi dir="ltr">${esc(META[k][1])}</bdi></span>` : ''}</th>`).join('')}</tr></thead><tbody>${j.minutes
    .map((r) => `<tr><td>${mmss(r.t)}</td>${keys.map((k) => `<td>${r.values[k] === null || r.values[k] === undefined ? '–' : r.values[k].toFixed(META[k][2])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  // the card's take-home lines (views/debrief.ts takeHomeSection): the export's record carries the card, so a card with
  // `takeHome` brings its lines; each prints through the takeHome group, else three ruled lines to write on
  const take = d.doc?.takeHome ?? [];
  const takeHome = take.length
    ? `<ol class="take">${take.map((x) => `<li>${D.group('takeHome', x)}</li>`).join('')}</ol>`
    : `<p>${D.t('Your take-home points')}</p>${'<div class="ruled"></div>'.repeat(3)}`;

  const body = [
    section('objectives', D.t('Objectives'), obj),
    section('facts', D.t('Measured facts'), facts),
    section('trends', D.t('Trends'), TREND_KEYS.map((k) => chart(D, d, k, end)).join('')),
    section('drugs', D.t('Drugs and fluids'), drugs),
    section('timeline', D.t('Timeline'), timeline),
    section('bookmarks', D.t('Bookmarks'), bookmarks),
    j.schema === 'pme-debrief/2' ? section('pearls', D.t('Talking points'), `<div class="pearls">${PEARLS.map(([ph, pr]) => `<div class="pearl"><b>${D.t(ph)}</b><p>${D.t(pr)}</p></div>`).join('')}</div>`) : '',
    section('takehome', D.t('Take-home points'), takeHome),
    section('notes', D.t('Notes'), '<div class="notes"></div>'),
    section('minutes', D.t('Appendix: one row per minute'), minutes),
  ].join('\n');
  // while a printed entry is unreviewed, the handout says so on its first page
  const unreviewed = [...D.used].some((e) => !e.reviewed);
  const notice = unreviewed ? `<p class="notice">ترجمه‌ی فارسی این گزارش هنوز به تأیید بالینی نرسیده است. متن مرجع، گزارش انگلیسی همین اجراست.</p>` : '';
  if (unreviewed) D.printed.push('ترجمه‌ی فارسی این گزارش هنوز به تأیید بالینی نرسیده است. متن مرجع، گزارش انگلیسی همین اجراست.');
  // LRI … PDI: the version and the build id each stay one left-to-right run; no-break spaces keep each run, and the word
  // before it («نسخه‌ی», «ساخت»), on one line when the two-line footer wraps
  const iso = (s) => s.replace(LTR_RUN, (m) => `\u2066${m.replace(/ /g, '\u00a0')}\u2069`).replace(/ \u2066/g, '\u00a0\u2066');
  const cssStr = (s) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  const pageCss = `@page { @bottom-right { content: ${cssStr(iso(foot))}; font: 7pt "Vazirmatn", sans-serif; direction: rtl; text-align: right; vertical-align: top; padding-top: 2mm; border-top: 0.5pt solid #000; }
@bottom-left { content: ${cssStr(pa)} counter(page, persian) ${cssStr(pb)} counter(pages, persian); font: 7pt "Vazirmatn", sans-serif; direction: rtl; white-space: nowrap; vertical-align: top; padding-top: 2mm; border-top: 0.5pt solid #000; } }`;
  const docTitle = `${D.plain('Debrief')}: ${title ? D.plain(title) : ''} ${new Date(d.startedAt).toISOString().slice(0, 10)}`;
  const html = `<!doctype html><html dir="rtl" lang="fa"><head><meta charset="utf-8"><title>${esc(docTitle)}</title>
<style>${fontsCss}${CSS}${pageCss}</style></head><body>
<h1>${D.t('Debrief')}</h1>${notice}${meta}
${body}
</body></html>`;
  return { html, D };
}

// ---------------------------------------------------------------------------------------------------- run
// run only as a command: a test imports render() without printing anything
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args.splice(i, 2)[1] : undefined;
  };
  const flag = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? (args.splice(i, 1), true) : false;
  };
  const outDir = opt('--out-dir');
  const fontsDir = findFonts(opt('--fonts'));
  const wantHtml = flag('--html');
  const wantText = flag('--text');
  const versionArg = opt('--version');
  const USAGE = 'usage: node scripts/showcase/debrief-fa.mjs <debrief.json>... --version X.Y.Z [--out-dir DIR] [--fonts DIR] [--html] [--text]';
  if (!args.length) {
    console.error(USAGE);
    process.exit(1);
  }
  const inputs = args.map((file) => {
    const j = JSON.parse(readFileSync(file, 'utf8'));
    if (j.schema !== 'pme-debrief/1' && j.schema !== 'pme-debrief/2') throw new Error(`${file}: not a Debrief export (schema ${j.schema}; pme-debrief/1 or pme-debrief/2 expected)`);
    const version = j.version ?? versionArg;
    if (!version) {
      console.error(`${file}: the Debrief JSON carries the build (${j.build}) but not the version. Pass --version with the version that build printed on its Start screen and in the English Debrief footer (e.g. --version 1.0.0-rc.1).\n${USAGE}`);
      process.exit(1);
    }
    return { file, j, version };
  });
  const fontsCss = fontFaces(fontsDir);
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  try {
    for (const { file, j, version } of inputs) {
      const { html, D } = render(j, fontsCss, version);
      const base = join(outDir ?? dirname(file), basename(file).replace(/\.json$/, '') + '.fa');
      if (wantHtml) writeFileSync(`${base}.html`, html);
      if (wantText) writeFileSync(`${base}.txt`, [...new Set(D.printed)].join('\n') + '\n');
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: false });
      await page.close();
      writeFileSync(`${base}.pdf`, pdf);
      const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page\b(?!s)/g) ?? []).length;
      const entries = [...D.used];
      console.log(`${base}.pdf: ${pages} A4 pages; ${entries.length} table entries used (${entries.filter((e) => !e.reviewed).length} unreviewed)`);
      console.log(`${D.missing.size} strings without translation${D.missing.size ? ':' : ''}`);
      for (const [en, n] of D.missing) console.log(`  ${n}× ${en}`);
    }
  } finally {
    await browser.close();
  }
}
