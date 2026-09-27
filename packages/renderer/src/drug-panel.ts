// Stage 7g drug panel: a compact table (drug, Cp, Ce, pump/TCI, total, 50 % decrement) plus a 10-minute Ce sparkline
// per drug on one canvas, and the volatile line (FI/FA/brain, MAC). Plain DOM; theme via CSS variables.
import type { DrugsEvent } from '@pme/engine-core';

export interface DrugPanel {
  update(e: DrugsEvent): void;
  destroy(): void;
}

const HISTORY_S = 600;
const COLORS = ['#e8c547', '#4fc3f7', '#ef5350', '#66bb6a', '#ab47bc', '#ffa726'];

export function createDrugPanel(host: HTMLElement): DrugPanel {
  const root = document.createElement('div');
  root.className = 'pme-drug-panel';
  root.style.cssText = 'font: 12px/1.4 system-ui, sans-serif; color: var(--pme-fg, #ddd); background: var(--pme-bg, #111); padding: 6px;';
  const table = document.createElement('table');
  table.style.cssText = 'border-collapse: collapse; width: 100%;';
  const vol = document.createElement('div');
  const canvas = document.createElement('canvas');
  canvas.width = 360;
  canvas.height = 90;
  canvas.style.cssText = 'width: 100%; height: 90px; display: block; margin-top: 4px;';
  root.append(table, vol, canvas);
  host.append(root);
  const hist = new Map<string, { t: number; ce: number }[]>();
  const f = (x: number) => (x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2));
  return {
    update(e) {
      const rows = e.drugs.map((d) => {
        const pump = d.tci ? `TCI ${d.tci.model} ${d.tci.mode === 'effect' ? 'Ce' : 'Cp'} ${d.tci.target}` : d.rate !== null ? `${f(d.rate)} ${d.rateUnit}` : '';
        const dec = d.decrement50Min !== null ? `${f(d.decrement50Min)} min` : '';
        return `<tr><td>${d.name}</td><td>Cp ${f(d.cp)}</td><td>Ce ${f(d.ce)} ${d.unit}</td><td>${pump}</td><td>${f(d.totalAmount)} ${d.amountUnit}</td><td>${dec}</td></tr>`;
      });
      table.innerHTML = rows.join('');
      const v = e.volatile;
      vol.textContent = v ? `${v.agent} dial ${v.dialPct} % FGF ${v.fgfLpm} L/min · FI ${f(v.fi)} FA ${f(v.fa)} brain ${f(v.brain)} % · ${v.macFrac.toFixed(2)} MAC (age MAC ${v.macAge.toFixed(2)} %)` : '';
      for (const d of e.drugs) {
        const h = hist.get(d.id) ?? [];
        h.push({ t: e.t, ce: d.ce });
        while (h.length && (h[0] as { t: number }).t < e.t - HISTORY_S) h.shift();
        hist.set(d.id, h);
      }
      const g = canvas.getContext('2d');
      if (!g) return;
      g.clearRect(0, 0, canvas.width, canvas.height);
      let i = 0;
      for (const [, h] of hist) {
        const max = Math.max(1e-9, ...h.map((p) => p.ce));
        g.strokeStyle = COLORS[i++ % COLORS.length] as string;
        g.beginPath();
        h.forEach((p, k) => {
          const x = ((p.t - (e.t - HISTORY_S)) / HISTORY_S) * canvas.width;
          const y = canvas.height - 4 - (p.ce / max) * (canvas.height - 8);
          if (k === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        });
        g.stroke();
      }
    },
    destroy() {
      root.remove();
    },
  };
}
