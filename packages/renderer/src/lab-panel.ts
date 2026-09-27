// Stage 7c: the lab / ABG panel (a DOM widget, like numerics-dom.ts). Shows the latest `labs` truth (or a frozen
// `labResult`), each value flagged against its reference range (tables §5b normal rows).
import type { LabPanel } from '@pme/engine-core';

type Row = { key: keyof LabPanel; label: string; unit: string; lo: number; hi: number };
export const LAB_ROWS: readonly Row[] = [
  { key: 'ph', label: 'pH', unit: '', lo: 7.35, hi: 7.45 },
  { key: 'pco2', label: 'PCO2', unit: 'mmHg', lo: 35, hi: 45 },
  { key: 'po2', label: 'PO2', unit: 'mmHg', lo: 80, hi: 500 },
  { key: 'hco3', label: 'HCO3', unit: 'mmol/L', lo: 22, hi: 26 },
  { key: 'be', label: 'BE', unit: 'mmol/L', lo: -2, hi: 2 },
  { key: 'so2', label: 'SO2', unit: '%', lo: 94, hi: 100 },
  { key: 'cohb', label: 'COHb', unit: '%', lo: 0, hi: 3 },
  { key: 'methb', label: 'MetHb', unit: '%', lo: 0, hi: 1.5 },
  { key: 'lactate', label: 'Lactate', unit: 'mmol/L', lo: 0.3, hi: 2 },
  { key: 'na', label: 'Na', unit: 'mmol/L', lo: 135, hi: 145 },
  { key: 'k', label: 'K', unit: 'mmol/L', lo: 3.5, hi: 5 },
  { key: 'cl', label: 'Cl', unit: 'mmol/L', lo: 98, hi: 107 },
  { key: 'iCa', label: 'iCa', unit: 'mmol/L', lo: 1.15, hi: 1.33 },
  { key: 'hb', label: 'Hb', unit: 'g/dL', lo: 12, hi: 17 },
  { key: 'glucose', label: 'Glucose', unit: 'mg/dL', lo: 70, hi: 180 },
  { key: 'ag', label: 'AG', unit: 'mmol/L', lo: 8, hi: 16 },
];

export function labFlag(r: Row, v: number): 'low' | 'high' | 'ok' {
  return v < r.lo ? 'low' : v > r.hi ? 'high' : 'ok';
}

/** Mount a panel into `el`; returns `update(values, title)`. */
export function mountLabPanel(el: HTMLElement): (values: LabPanel, title: string) => void {
  el.classList.add('pme-lab-panel');
  return (values, title) => {
    const rows = LAB_ROWS.map((r) => {
      const v = values[r.key];
      const f = labFlag(r, v);
      const mark = f === 'high' ? ' ↑' : f === 'low' ? ' ↓' : '';
      return `<tr class="${f}"><th>${r.label}</th><td>${v}${mark}</td><td>${r.unit}</td></tr>`;
    }).join('');
    el.innerHTML = `<table><caption>${title}</caption>${rows}</table>`;
  };
}
