// Stage 7e endo panel: glucose for everyone; the stress/hormone block for the instructor view only (plan decision 15).
import type { EndoEvent } from '@pme/engine-core';

export function mountEndoPanel(host: HTMLElement, opts: { instructor: boolean }): { update(e: EndoEvent): void; destroy(): void } {
  const root = document.createElement('div');
  root.className = 'pme-endo';
  const glu = document.createElement('div');
  root.append(glu);
  const inst = document.createElement('div');
  if (opts.instructor) root.append(inst);
  host.append(root);
  return {
    update(e) {
      const level = e.glucoseMmolL < 3.0 ? 'red' : e.glucoseMmolL < 3.9 || e.glucoseMmolL > 10 ? 'amber' : 'normal';
      glu.dataset.level = level;
      glu.textContent = `GLU ${e.glucoseMmolL.toFixed(1)} mmol/L (${e.glucoseMgDl} mg/dL)`;
      if (opts.instructor) {
        const flags = [e.shivering && 'shivering', e.sweating && 'sweating', e.vasoconstricted && 'vasoconstricted'].filter(Boolean).join(', ');
        inst.textContent = `stress ${e.stressIndex} · epi ${e.epinephrinePgMl} pg/mL · cortisol ${e.cortisolNmolL} nmol/L · MH ${e.mhActivity} · Tp ${e.tempPeriphC} °C${flags ? ' · ' + flags : ''}`;
      }
    },
    destroy() {
      root.remove();
    },
  };
}
