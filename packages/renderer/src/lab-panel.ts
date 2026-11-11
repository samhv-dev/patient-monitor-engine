// The lab / ABG panel (a DOM widget, like numerics-dom.ts). Shows the latest `labs` truth (or a frozen `labResult`),
// each value flagged against its reference range and marked when it reaches a critical limit (plan
// learner-action-remote.md L11; LQ2: the hospital's critical list when given, else the Kost list). Every range and every
// limit carries its source in its row; an analyte with no sourced range in the repository is shown unflagged (`range:
// null`), never against an invented one. The ranges are the app's adult normals (apps/demo/src/app/glossary-data.ts, the
// glossary's `normal` column, research/11 §5.7), its entry number named in each row.
import type { LabPanelId, LabValues } from '@pme/engine-core';

/** A sourced interval: `lo`, `hi` or both (a limit the source does not give is absent). */
export interface LabLimits {
  lo?: number;
  hi?: number;
  src: string;
}
export interface LabRow {
  key: keyof LabValues;
  label: string;
  unit: string;
  /** The reference range flagged against (null: no sourced range for this analyte here; shown unflagged). */
  range: LabLimits | null;
  /** The critical limits (null: no critical limit in the list). */
  crit: LabLimits | null;
  /** A venous gas's own range and limits, where the site changes them (absent: the same as `range` and `crit`). */
  venous?: { range: LabLimits | null; crit: LabLimits | null };
}

const G = (n: number, text: string) => `apps/demo/src/app/glossary-data.ts entry ${n} (adult normal "${text}", research/11 §5.7)`;
/** The Kost critical-limits list, its current edition (research note lab-critical-values-2026-10-29 §3; LQ2 ruled). */
const KOST = (table: 1 | 2 | 3) => `Shah A, Dohner J, Cheng K, Garcia M, Kost GJ, Diagnostics (Basel) 2025;15(5):604, Table ${table}, adult 2024 median (the Kost list)`;

export const LAB_ROWS: readonly LabRow[] = [
  {
    key: 'ph', label: 'pH', unit: '', range: { lo: 7.35, hi: 7.45, src: G(178, '7.35–7.45 (venous ≈ 0.03 lower)') }, crit: { lo: 7.2, hi: 7.6, src: KOST(2) },
    venous: { range: null, crit: { lo: 7.2, hi: 7.6, src: `${KOST(2)}, venous pH` } },
  },
  {
    key: 'pco2', label: 'PCO2', unit: 'mmHg', range: { lo: 35, hi: 45, src: G(179, '35–45') }, crit: { lo: 20, hi: 70, src: `${KOST(2)}, PaCO2` },
    venous: { range: null, crit: { lo: 20, hi: 68, src: `${KOST(2)}, venous PCO2` } },
  },
  {
    // "80–100 on air": the arterial range depends on the inspired oxygen, which the panel does not know, so it is not flagged
    key: 'po2', label: 'PO2', unit: 'mmHg', range: null, crit: { lo: 40, src: `${KOST(2)}, PaO2 (no high limit listed)` },
    venous: { range: { lo: 35, hi: 45, src: G(180, '80–100 on air; venous 35–45') }, crit: null },
  },
  { key: 'hco3', label: 'HCO3', unit: 'mmol/L', range: { lo: 22, hi: 26, src: G(181, '22–26') }, crit: { lo: 10, hi: 40, src: `${KOST(1)}, CO2 content (total CO2 / bicarbonate)` } },
  { key: 'be', label: 'BE', unit: 'mmol/L', range: { lo: -2, hi: 2, src: G(182, '−2 to +2') }, crit: null },
  // the engine's so2 is FO2Hb (types-blood.ts LabPanel)
  { key: 'so2', label: 'FO2Hb', unit: '%', range: { lo: 94, hi: 98, src: G(183, 'FO₂Hb 94–98; sO₂ 95–99') }, crit: null, venous: { range: null, crit: null } },
  { key: 'cohb', label: 'COHb', unit: '%', range: { hi: 1.5, src: G(184, '< 1.5 (smokers up to 10)') }, crit: { hi: 17, src: KOST(2) } },
  { key: 'methb', label: 'MetHb', unit: '%', range: { hi: 1.5, src: G(185, '< 1.5') }, crit: { hi: 5.1, src: KOST(2) } },
  { key: 'lactate', label: 'Lactate', unit: 'mmol/L', range: { lo: 0.5, hi: 2, src: G(186, '0.5–2.0') }, crit: { hi: 4, src: `${KOST(1)} (high limit only)` } },
  { key: 'na', label: 'Na', unit: 'mmol/L', range: { lo: 135, hi: 145, src: G(187, '135–145') }, crit: { lo: 120, hi: 160, src: KOST(1) } },
  { key: 'k', label: 'K', unit: 'mmol/L', range: { lo: 3.5, hi: 5, src: G(188, '3.5–5.0') }, crit: { lo: 2.8, hi: 6, src: KOST(1) } },
  { key: 'cl', label: 'Cl', unit: 'mmol/L', range: { lo: 98, hi: 107, src: G(189, '98–107') }, crit: { lo: 75, hi: 125, src: KOST(1) } },
  { key: 'iCa', label: 'iCa', unit: 'mmol/L', range: { lo: 1.15, hi: 1.3, src: G(190, '1.15–1.30') }, crit: { lo: 0.8, hi: 1.58, src: KOST(1) } },
  { key: 'mg', label: 'Mg', unit: 'mmol/L', range: { lo: 0.7, hi: 1, src: G(191, '0.7–1.0') }, crit: { lo: 0.41, hi: 2.02, src: KOST(1) } },
  // "M 13.5–17.5; F 12–15.5": the range depends on the patient's sex, which the panel does not know, so it is not flagged
  { key: 'hb', label: 'Hb', unit: 'g/dL', range: null, crit: { lo: 6, hi: 20, src: KOST(3) } },
  { key: 'glucose', label: 'Glucose', unit: 'mg/dL', range: { lo: 70, hi: 140, src: G(193, '3.9–7.8 (70–140 mg/dL)') }, crit: { lo: 50, hi: 500, src: `${KOST(1)}, mg/dL` } },
  { key: 'ag', label: 'AG', unit: 'mmol/L', range: { lo: 8, hi: 12, src: G(194, '8–12 (without K)') }, crit: null },
  { key: 'osm', label: 'Osm', unit: 'mOsm/kg', range: { lo: 275, hi: 295, src: G(195, '275–295') }, crit: { lo: 250, hi: 330, src: KOST(1) } },
  { key: 'inr', label: 'INR', unit: '', range: { lo: 0.8, hi: 1.2, src: G(210, '0.8–1.2') }, crit: { hi: 5, src: `${KOST(3)} (high limit only)` } },
];

const isVenous = (panel?: LabPanelId) => panel === 'vbg';
const rangeOf = (r: LabRow, panel?: LabPanelId) => (isVenous(panel) && r.venous ? r.venous.range : r.range);
const critOf = (r: LabRow, panel?: LabPanelId) => (isVenous(panel) && r.venous ? r.venous.crit : r.crit);

/** `v` against the row's reference range (a venous gas against its venous range); 'ok' when the row has none. */
export function labFlag(r: LabRow, v: number, panel?: LabPanelId): 'low' | 'high' | 'ok' {
  const x = rangeOf(r, panel);
  return x?.lo !== undefined && v < x.lo ? 'low' : x?.hi !== undefined && v > x.hi ? 'high' : 'ok';
}

/**
 * True when `v` is at or beyond a critical limit. The list does not say whether its limits are inclusive (research note
 * §3: hospitals differ); the panel marks the limit itself as critical, as the RCPath list does.
 */
export function labCritical(r: LabRow, v: number, panel?: LabPanelId): boolean {
  const c = critOf(r, panel);
  return (c?.lo !== undefined && v <= c.lo) || (c?.hi !== undefined && v >= c.hi);
}

const num = (x: number) => String(x).replace('-', '−');
/** The range as shown beside the value: "135–145", "−2 to 2", "< 1.5", "> 0.5", or "—" when none is sourced. */
export function rangeText(x: LabLimits | null): string {
  if (!x) return '—';
  if (x.lo !== undefined && x.hi !== undefined) return x.lo < 0 ? `${num(x.lo)} to ${num(x.hi)}` : `${num(x.lo)}–${num(x.hi)}`;
  return x.hi !== undefined ? `< ${num(x.hi)}` : `> ${num(x.lo as number)}`;
}

/**
 * Mount a panel into `el`; returns `update(values, title, panel?)`. A drawn sample's result (`labResult`) holds only its
 * panel's analytes (engine-core analysers.ts, L10a): a row it does not hold is not drawn. `panel` 'vbg' reads the venous
 * ranges and limits; any other (or none) the arterial ones.
 */
export function mountLabPanel(el: HTMLElement): (values: LabValues, title: string, panel?: LabPanelId) => void {
  el.classList.add('pme-lab-panel');
  return (values, title, panel) => {
    const rows = LAB_ROWS.flatMap((r) => {
      const v = values[r.key];
      if (v === undefined) return [];
      const f = labFlag(r, v, panel);
      const crit = labCritical(r, v, panel);
      const mark = `${f === 'high' ? ' ↑' : f === 'low' ? ' ↓' : ''}${crit ? ' <strong class="crit-mark">critical</strong>' : ''}`;
      const x = rangeOf(r, panel);
      return [`<tr class="${f}${crit ? ' crit' : ''}" data-key="${r.key}"><th scope="row">${r.label}</th><td class="v">${num(v)}${mark}</td><td class="u">${r.unit}</td><td class="range"${x ? ` title="${x.src.replace(/"/g, '&quot;')}"` : ''}>${rangeText(x)}</td></tr>`];
    }).join('');
    el.innerHTML = `<table><caption>${title}</caption><thead><tr><th scope="col">Test</th><th scope="col">Result</th><th scope="col">Unit</th><th scope="col">Range</th></tr></thead><tbody>${rows}</tbody></table>`;
  };
}
